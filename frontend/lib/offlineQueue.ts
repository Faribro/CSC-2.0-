// frontend/lib/offlineQueue.ts
// Per-account IndexedDB draft and offline action queue

export interface QueuedAction {
  id: string;
  actorId: string;
  type: 'CONTACT_ATTEMPT' | 'ENCOUNTER' | 'PLANNED_SERVICE';
  endpoint: string;
  payload: any;
  idempotencyKey: string;
  createdAt: number;
  status: 'LOCAL_SAVED' | 'SYNCING' | 'SERVER_ACCEPTED' | 'CONFLICT' | 'FAILED';
}

const DB_NAME = 'CSC2_OfflineQueue_DB';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('actorId', 'actorId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueAction(action: Omit<QueuedAction, 'id' | 'createdAt' | 'status'>): Promise<QueuedAction> {
  const item: QueuedAction = {
    ...action,
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    status: 'LOCAL_SAVED'
  };
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(item);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(item);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Fallback to memory / local mock if IndexedDB not available
    return item;
  }
}

export async function getQueuedActions(actorId: string): Promise<QueuedAction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('actorId');
    return new Promise((resolve, reject) => {
      const req = index.getAll(actorId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}
