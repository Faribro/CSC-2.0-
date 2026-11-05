/**
 * CSC 2.0 Hardened IndexedDB Storage Layer
 *
 * Scoped strictly by Account ID (userId) and Device Session ID.
 * Stores:
 * 1. tasks: Cached task list for signed-in user (NO phone, NO clinical data).
 * 2. drafts: Client registration & follow-up visit drafts.
 * 3. outbox: Offline mutation queue pending sync.
 *
 * Invariants:
 * - Zero auth tokens or secrets stored in IndexedDB.
 * - Multi-account isolation: User B cannot view or replay User A's outbox or tasks.
 * - Quota & eviction handling: Explicit user-facing alerts, zero silent loss.
 */

const DB_NAME = 'csc2_offline_db';
const DB_VERSION = 1;

export interface CachedTask {
  id: string;
  taskRef: string;
  clientId: string;
  clientRef: string;
  purposeCode: string;
  purposeLabelEn: string;
  purposeLabelHi: string;
  dueDate: string;
  status: string;
  userId: string;
  storeKey: string; // `${userId}:${id}`
}

export interface VisitDraft {
  storeKey: string; // `${userId}:${clientId}`
  userId: string;
  clientId: string;
  draftData: any;
  updatedAt: string;
}

export interface OutboxItem {
  idempotencyKey: string;
  userId: string;
  deviceSessionId: string;
  url: string;
  method: string;
  payload: any;
  timestamp: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
}

export interface StorageQuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

// Get or create device session ID (ephemeral per browser session)
export function getDeviceSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  let sessionId = sessionStorage.getItem('csc2_device_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    sessionStorage.setItem('csc2_device_session_id', sessionId);
  }
  return sessionId;
}

// Open IndexedDB database with schema versioning
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Tasks Object Store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'storeKey' });
        taskStore.createIndex('userId', 'userId', { unique: false });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
      }

      // 2. Drafts Object Store
      if (!db.objectStoreNames.contains('drafts')) {
        const draftStore = db.createObjectStore('drafts', { keyPath: 'storeKey' });
        draftStore.createIndex('userId', 'userId', { unique: false });
        draftStore.createIndex('clientId', 'clientId', { unique: false });
      }

      // 3. Outbox Object Store
      if (!db.objectStoreNames.contains('outbox')) {
        const outboxStore = db.createObjectStore('outbox', { keyPath: 'idempotencyKey' });
        outboxStore.createIndex('userId', 'userId', { unique: false });
        outboxStore.createIndex('status', 'status', { unique: false });
        outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Check device storage quota
export async function getStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1;
      return {
        usageBytes: usage,
        quotaBytes: quota,
        percentUsed: Math.round((usage / quota) * 100),
      };
    } catch {
      return null;
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// TASKS OPERATIONS (Scoped strictly by userId, NO PHONE, NO CLINICAL DATA)
// -----------------------------------------------------------------------------

export async function saveUserTasks(userId: string, tasks: Array<{
  id: string;
  taskRef: string;
  clientId: string;
  clientRef: string;
  purposeCode: string;
  purposeLabelEn: string;
  purposeLabelHi: string;
  dueDate: string;
  status: string;
  [key: string]: any;
}>): Promise<void> {
  if (!userId) throw new Error('userId is mandatory to cache tasks');
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['tasks'], 'readwrite');
      const store = tx.objectStore('tasks');

      // Save stripped tasks ensuring NO phone and NO clinical attributes are cached
      for (const t of tasks) {
        const strippedTask: CachedTask = {
          storeKey: `${userId}:${t.id}`,
          id: t.id,
          taskRef: t.taskRef,
          clientId: t.clientId,
          clientRef: t.clientRef,
          purposeCode: t.purposeCode || '1',
          purposeLabelEn: t.purposeLabelEn || 'Routine follow-up',
          purposeLabelHi: t.purposeLabelHi || 'नियमित फॉलो-अप',
          dueDate: t.dueDate,
          status: t.status,
          userId,
        };
        store.put(strippedTask);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = (e) => {
        const error = tx.error;
        if (error && error.name === 'QuotaExceededError') {
          handleQuotaExceeded();
        }
        reject(error || new Error('Failed to save tasks'));
      };
    } catch (err: any) {
      if (err && err.name === 'QuotaExceededError') {
        handleQuotaExceeded();
      }
      reject(err);
    }
  });
}

export async function getUserTasks(userId: string): Promise<CachedTask[]> {
  if (!userId) return [];
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['tasks'], 'readonly');
      const store = tx.objectStore('tasks');
      const index = store.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

// -----------------------------------------------------------------------------
// DRAFTS OPERATIONS (Scoped strictly by userId and clientId)
// -----------------------------------------------------------------------------

export async function saveVisitDraft(userId: string, clientId: string, draftData: any): Promise<void> {
  if (!userId || !clientId) return;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['drafts'], 'readwrite');
      const store = tx.objectStore('drafts');

      const entry: VisitDraft = {
        storeKey: `${userId}:${clientId}`,
        userId,
        clientId,
        draftData,
        updatedAt: new Date().toISOString(),
      };

      store.put(entry);

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        if (tx.error && tx.error.name === 'QuotaExceededError') {
          handleQuotaExceeded();
        }
        reject(tx.error);
      };
    } catch (err: any) {
      if (err && err.name === 'QuotaExceededError') {
        handleQuotaExceeded();
      }
      reject(err);
    }
  });
}

export async function getVisitDraft(userId: string, clientId: string): Promise<any | null> {
  if (!userId || !clientId) return null;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['drafts'], 'readonly');
      const store = tx.objectStore('drafts');
      const request = store.get(`${userId}:${clientId}`);

      request.onsuccess = () => {
        const result = request.result as VisitDraft | undefined;
        resolve(result ? result.draftData : null);
      };
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function clearVisitDraft(userId: string, clientId: string): Promise<void> {
  if (!userId || !clientId) return;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['drafts'], 'readwrite');
      const store = tx.objectStore('drafts');
      store.delete(`${userId}:${clientId}`);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

// -----------------------------------------------------------------------------
// OUTBOX OPERATIONS (Scoped strictly by userId, Multi-Account Isolation)
// -----------------------------------------------------------------------------

export async function enqueueOutbox(userId: string, item: {
  idempotencyKey: string;
  url: string;
  method: string;
  payload: any;
}): Promise<void> {
  if (!userId) throw new Error('userId is mandatory to enqueue outbox mutation');
  const db = await openDatabase();
  const deviceSessionId = getDeviceSessionId();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['outbox'], 'readwrite');
      const store = tx.objectStore('outbox');

      const outboxEntry: OutboxItem = {
        idempotencyKey: item.idempotencyKey,
        userId,
        deviceSessionId,
        url: item.url,
        method: item.method,
        payload: item.payload,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      };

      store.put(outboxEntry);

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        if (tx.error && tx.error.name === 'QuotaExceededError') {
          handleQuotaExceeded();
        }
        reject(tx.error);
      };
    } catch (err: any) {
      if (err && err.name === 'QuotaExceededError') {
        handleQuotaExceeded();
      }
      reject(err);
    }
  });
}

export async function getUserOutbox(userId: string): Promise<OutboxItem[]> {
  if (!userId) return [];
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['outbox'], 'readonly');
      const store = tx.objectStore('outbox');
      const index = store.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));

      request.onsuccess = () => {
        const items = (request.result || []) as OutboxItem[];
        // Return only PENDING items
        resolve(items.filter((i) => i.status === 'PENDING'));
      };
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function removeOutboxItem(idempotencyKey: string): Promise<void> {
  if (!idempotencyKey) return;
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['outbox'], 'readwrite');
      const store = tx.objectStore('outbox');
      store.delete(idempotencyKey);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Check unsent items count on sign-out to warn user
export async function countUnsentItems(userId: string): Promise<number> {
  if (!userId) return 0;
  const items = await getUserOutbox(userId);
  return items.length;
}

// User-facing quota error handler (no silent loss)
function handleQuotaExceeded(): void {
  const msg = 'Device storage quota exceeded. Please reconnect to sync pending follow-ups before creating new records.';
  console.error('[IndexedDB Quota Error]', msg);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('csc2_storage_quota_exceeded', { detail: { message: msg } }));
  }
}
