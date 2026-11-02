"use client";

import { UserRole } from '@/components/layout/AppShell';

export interface StoredUser {
  actorId: string;
  username: string;
  fullName: string;
  role: UserRole;
  authorizedCenters: string[];
  scope: string;
  token: string;
}

export interface SeededUserOption {
  username: string;
  fullName: string;
  role: UserRole;
  roleLabelEn: string;
  roleLabelHi: string;
  scope: string;
  scopeDescription: string;
  badgeColor: string;
}

export const SEEDED_TEST_USERS: SeededUserOption[] = [
  {
    username: 'fw_delhi_a',
    fullName: 'Ananya Sharma (Field Worker A)',
    role: 'field_worker',
    roleLabelEn: 'Field Worker',
    roleLabelHi: 'क्षेत्र कार्यकर्ता (फील्ड वर्कर)',
    scope: 'CENTER_DELHI_01',
    scopeDescription: 'LNJP Hospital CSC Centre Delhi',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    username: 'fw_delhi_b',
    fullName: 'Ravi Kumar (Field Worker B)',
    role: 'field_worker',
    roleLabelEn: 'Field Worker',
    roleLabelHi: 'क्षेत्र कार्यकर्ता (फील्ड वर्कर)',
    scope: 'CENTER_DELHI_01',
    scopeDescription: 'LNJP Hospital CSC Centre Delhi',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    username: 'sup_delhi',
    fullName: 'Dr. Sunita Rao (Supervisor)',
    role: 'supervisor',
    roleLabelEn: 'Supervisor',
    roleLabelHi: 'पर्यवेक्षक (सुपरवाइज़र)',
    scope: 'CENTER_DELHI_01',
    scopeDescription: 'LNJP Hospital Centre + Supervisory Worklist',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    username: 'state_rev_delhi',
    fullName: 'Vikram Mehta (State Reviewer)',
    role: 'state_reviewer',
    roleLabelEn: 'State Reviewer',
    roleLabelHi: 'राज्य समीक्षक',
    scope: 'STATE_DELHI',
    scopeDescription: 'Delhi State Jurisdiction (Multi-Center)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    username: 'admin_national',
    fullName: 'Pooja Verma (Administrator)',
    role: 'administrator',
    roleLabelEn: 'Administrator',
    roleLabelHi: 'प्रशासक (एडमिन)',
    scope: 'ALL',
    scopeDescription: 'National Center Scope & System Reconciliation',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  {
    username: 'lead_national',
    fullName: 'Director Rajesh Sen (Leadership)',
    role: 'leadership',
    roleLabelEn: 'Leadership (View Only)',
    roleLabelHi: 'नेतृत्व दल (केवल अवलोकन)',
    scope: 'ALL',
    scopeDescription: 'National Analytics & Executive Oversight',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
];

const TOKEN_KEY = 'csc_token';
const USER_KEY = 'csc_user';
const DRAFT_KEY = 'csc_crf_draft';

export function getStoredSession(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!raw || !token) return null;
    const parsed = JSON.parse(raw);
    return { ...parsed, token };
  } catch (e) {
    return null;
  }
}

export async function loginAsTestUser(username: string): Promise<StoredUser> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'TestPass123!' }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Login failed with status ${res.status}`);
  }

  const data = await res.json();
  const option = SEEDED_TEST_USERS.find((u) => u.username === username);
  const user: StoredUser = {
    actorId: data.actorId,
    username: data.username,
    fullName: data.fullName,
    role: data.role as UserRole,
    authorizedCenters: data.authorizedCenters || [],
    scope: option?.scope || (data.authorizedCenters?.[0] || 'ALL'),
    token: data.token,
  };

  localStorage.setItem(TOKEN_KEY, user.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Also set cookie for middleware if needed
  document.cookie = `csc_token=${user.token}; path=/; SameSite=Lax`;
  document.cookie = `csc_role=${user.role}; path=/; SameSite=Lax`;

  return user;
}

export function checkHasUnsentDrafts(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed.formData && (parsed.formData.a01_full_name || parsed.formData.c03_art_number)) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

export function clearSessionPreservingDrafts(): void {
  if (typeof window === 'undefined') return;
  // NEVER delete csc_crf_draft or offlineQueue!
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "csc_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "csc_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function isRouteAllowedForRole(role: UserRole, pathname: string): boolean {
  if (role === 'administrator') return true;
  if (pathname.startsWith('/admin')) {
    return false;
  }
  if (pathname.startsWith('/reports')) {
    return role === 'supervisor' || role === 'state_reviewer' || role === 'leadership';
  }
  if (pathname.startsWith('/work')) {
    return role === 'field_worker' || role === 'supervisor' || role === 'leadership';
  }
  return true;
}
