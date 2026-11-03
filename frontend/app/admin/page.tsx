"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

interface RosterEntry {
  id: string;
  phoneE164: string;
  state: string;
  district: string;
  status: string;
  addedBy: string;
  createdAt: string;
}

interface EvaluationStats {
  state: string;
  totalSurveys: number;
  activeCaseworkers: number;
  openFollowUps: number;
}

interface ClientRow {
  id: string;
  clientRef: string;
  fullName: string;
  state?: string;
  district?: string;
  centerId: string;
  status: string;
  createdAt: string;
}

interface AdminStatus {
  sheetsDeploymentId: string;
  sheetsSpreadsheetId: string;
  sheetsMirrorStatus: string;
  outboxPending: number;
  outboxFailed: number;
  outboxPublished: number;
  recentOutbox: Array<{
    id: string;
    eventType: string;
    aggregateType: string;
    status: string;
    attempts: number;
    createdAt: string;
  }>;
  recentAudits: Array<{
    id: string;
    action: string;
    resourceType: string;
    actorUsername: string;
    occurredAt: string;
  }>;
}

export default function EvaluationDashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Auth & Scope State
  const [evalUser, setEvalUser] = useState<{ role: string; fullName: string; state: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'surveys' | 'system'>('roster');

  // Stats & Data
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [surveys, setSurveys] = useState<ClientRow[]>([]);
  const [systemStatus, setSystemStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Single Add Caseworker Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Bulk CSV Upload Form
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkDistrict, setBulkDistrict] = useState('');
  const [bulkResult, setBulkResult] = useState<{ addedCount: number; errors: string[] } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Survey Search
  const [surveySearch, setSurveySearch] = useState('');

  // Authentication check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('csc2_eval_user');
    const token = localStorage.getItem('csc2_auth_token');

    if (!stored || !token) {
      // Evaluation is restricted; redirect to Forms tab
      router.push('/work');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setEvalUser(parsed);
      loadDashboardData(parsed.state, token);
    } catch {
      router.push('/work');
    }
  }, [router]);

  const loadDashboardData = async (stateScope: string, token: string) => {
    setLoading(true);
    setErrorMessage(null);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      // 1. Fetch Stats
      fetch(`/api/v1/evaluation/stats?state=${encodeURIComponent(stateScope)}`, { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setStats(data); })
        .catch(() => {});

      // 2. Fetch Roster
      fetch(`/api/v1/evaluation/roster?state=${encodeURIComponent(stateScope)}`, { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (Array.isArray(data)) setRoster(data); })
        .catch(() => {});

      // 3. Fetch Surveys Linelist
      fetch(`/api/v1/evaluation/surveys?state=${encodeURIComponent(stateScope)}&page=0&size=50`, { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.clients)) {
            setSurveys(data.clients);
          }
        })
        .catch(() => {});

      // 4. Fetch System status if available
      fetch('/api/v1/admin/status', { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setSystemStatus(data); })
        .catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load evaluation data.');
    } finally {
      setLoading(false);
    }
  };

  // Add Single Caseworker
  const handleAddCaseworker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalUser) return;
    setAddLoading(true);
    setErrorMessage(null);

    const token = localStorage.getItem('csc2_auth_token');
    try {
      const res = await fetch('/api/v1/evaluation/roster', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: newPhone.trim(),
          state: evalUser.state,
          district: newDistrict.trim() || 'Central',
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setRoster((prev) => [added, ...prev]);
        setShowAddModal(false);
        setNewPhone('');
        setNewDistrict('');
        setSuccessMessage(`Caseworker ${added.phoneE164} added to roster successfully.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Failed to add caseworker to roster.');
      }
    } catch {
      setErrorMessage('Network error while adding caseworker.');
    } finally {
      setAddLoading(false);
    }
  };

  // Bulk CSV Upload
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalUser) return;
    setBulkLoading(true);
    setBulkResult(null);

    const token = localStorage.getItem('csc2_auth_token');
    try {
      const res = await fetch('/api/v1/evaluation/roster/bulk', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csv: bulkCsv,
          state: evalUser.state,
          district: bulkDistrict.trim() || 'General',
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setBulkResult(result);
        // Refresh roster
        loadDashboardData(evalUser.state, token || '');
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Bulk upload failed.');
      }
    } catch {
      setErrorMessage('Network error during bulk roster import.');
    } finally {
      setBulkLoading(false);
    }
  };

  // Toggle Caseworker Status (ACTIVE <-> SUSPENDED)
  const handleToggleStatus = async (id: string) => {
    const token = localStorage.getItem('csc2_auth_token');
    try {
      const res = await fetch(`/api/v1/evaluation/roster/${id}/toggle-status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRoster((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? { ...entry, status: entry.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
              : entry
          )
        );
      }
    } catch {}
  };

  // Delete Caseworker from Roster
  const handleDeleteEntry = async (id: string, phone: string) => {
    if (!confirm(`Are you sure you want to remove ${phone} from the active roster?`)) return;
    const token = localStorage.getItem('csc2_auth_token');
    try {
      const res = await fetch(`/api/v1/evaluation/roster/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRoster((prev) => prev.filter((entry) => entry.id !== id));
        setSuccessMessage(`Caseworker ${phone} removed.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {}
  };

  // Exit Evaluation Session
  const handleExitEvaluation = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('csc2_eval_user');
      localStorage.removeItem('csc2_auth_token');
    }
    router.push('/work');
  };

  const filteredSurveys = surveys.filter((s) => {
    if (!surveySearch.trim()) return true;
    const q = surveySearch.toLowerCase();
    return (
      s.clientRef?.toLowerCase().includes(q) ||
      s.fullName?.toLowerCase().includes(q) ||
      s.district?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell currentLang={lang} onLanguageChange={setLang}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Scope Banner & Role Indicator */}
        <div className="bg-surface rounded-[20px] border-2 border-border/40 p-6 shadow-comic flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight font-comic">
                {lang === 'hi' ? 'मूल्यांकन और पर्यवेक्षण पोर्टल' : 'Evaluation & Supervision Portal'}
              </h1>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Scope:{' '}
              <strong className="text-plum uppercase">
                {evalUser?.role === 'leadership' ? 'National Leadership' : `State: ${evalUser?.state || 'MH'}`}
              </strong>{' '}
              • Authenticated as <strong className="text-ink">{evalUser?.fullName || 'State Officer'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExitEvaluation}
              className="px-3.5 py-2 text-xs font-bold text-ink-muted hover:text-ink bg-canvas border border-border/40 rounded-[12px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="logout" className="w-4 h-4" />
              <span>{lang === 'hi' ? 'मूल्यांकन बंद करें' : 'Exit Evaluation'}</span>
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {successMessage && (
          <div className="p-3 bg-mint/50 border border-mint text-success-ink rounded-[12px] text-xs font-bold flex items-center gap-2" role="status">
            <Icon name="check" className="w-4 h-4 shrink-0 text-success-ink" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-pink/50 border border-border text-error-ink rounded-[12px] text-xs font-bold flex items-center gap-2" role="alert">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0 text-primary" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* KPI Stat Cards (Calm Comic Palette Tints) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface rounded-[16px] border-2 border-border/40 p-5 shadow-comic-sm">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              {lang === 'hi' ? 'कुल पंजीकृत लाभार्थी' : 'State Beneficiaries'}
            </div>
            <div className="text-3xl font-black text-ink mt-2 font-comic">
              {loading ? '...' : stats?.totalSurveys ?? surveys.length}
            </div>
            <div className="text-[11px] text-plum font-semibold mt-1">
              Active in State Linelist
            </div>
          </div>

          <div className="bg-surface rounded-[16px] border-2 border-border/40 p-5 shadow-comic-sm">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              {lang === 'hi' ? 'सक्रिय फील्ड कार्यकर्ता' : 'Approved Caseworkers'}
            </div>
            <div className="text-3xl font-black text-ink mt-2 font-comic">
              {loading ? '...' : roster.filter((r) => r.status === 'ACTIVE').length}
            </div>
            <div className="text-[11px] text-success-ink font-semibold mt-1">
              Enrolled on Phone Roster
            </div>
          </div>

          <div className="bg-surface rounded-[16px] border-2 border-border/40 p-5 shadow-comic-sm">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
              {lang === 'hi' ? 'खुले फॉलो-अप कार्य' : 'Open Supervisions'}
            </div>
            <div className="text-3xl font-black text-warning-ink mt-2 font-comic">
              {loading ? '...' : stats?.openFollowUps ?? 4}
            </div>
            <div className="text-[11px] text-warning-ink font-semibold mt-1">
              Awaiting State Review
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b-2 border-border/40 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'text-plum border-b-3 border-plum'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon name="Users" className="w-4 h-4" />
            <span>{lang === 'hi' ? 'कार्यकर्ता रोस्टर प्रबंधन' : 'Caseworker Roster'}</span>
            <span className="text-[10px] font-mono bg-lavender text-plum px-2 py-0.5 rounded-full font-bold">
              {roster.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('surveys')}
            className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'surveys'
                ? 'text-plum border-b-3 border-plum'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon name="ClipboardList" className="w-4 h-4" />
            <span>{lang === 'hi' ? 'राज्य सर्वेक्षण लाइनलिस्ट' : 'State Linelist'}</span>
            <span className="text-[10px] font-mono bg-peach text-ink px-2 py-0.5 rounded-full font-bold">
              {surveys.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'system'
                ? 'text-plum border-b-3 border-plum'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon name="Activity" className="w-4 h-4" />
            <span>{lang === 'hi' ? 'सिस्टम एवं आउटबॉक्स' : 'System & Outbox'}</span>
          </button>
        </div>

        {/* TAB 1: CASEWORKER ROSTER MANAGEMENT */}
        {activeTab === 'roster' && (
          <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-ink font-comic">
                  {lang === 'hi' ? 'अधिकृत फील्ड कार्यकर्ता रोस्टर' : 'Approved Field Caseworker Roster'}
                </h2>
                <p className="text-xs text-ink-muted">
                  Caseworkers whose +91 numbers are listed below can verify and submit surveys to the server.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="Plus" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'कार्यकर्ता जोड़ें' : '+ Add Caseworker'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 py-2 bg-canvas hover:bg-surface text-ink text-xs font-bold rounded-[12px] border-2 border-border/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="Download" className="w-4 h-4 text-plum" />
                  <span>{lang === 'hi' ? 'बल्क CSV आयात' : 'Bulk CSV'}</span>
                </button>
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas border-b-2 border-border/30 text-ink font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Mobile Number (+91 E.164)</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">District</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Added By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono text-[11px]">
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-muted font-sans text-xs">
                        No caseworkers added to the state roster yet. Add one above or import via CSV.
                      </td>
                    </tr>
                  ) : (
                    roster.map((entry) => (
                      <tr key={entry.id} className="hover:bg-canvas/50">
                        <td className="py-3 px-4 font-bold text-ink">{entry.phoneE164}</td>
                        <td className="py-3 px-4 font-sans text-ink">{entry.state}</td>
                        <td className="py-3 px-4 font-sans text-ink">{entry.district}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.status === 'ACTIVE'
                                ? 'bg-mint text-success-ink border border-mint'
                                : 'bg-pink/60 text-error-ink border border-border'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink-muted font-sans">{entry.addedBy}</td>
                        <td className="py-3 px-4 text-right font-sans space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(entry.id)}
                            className="text-xs font-bold text-plum hover:underline cursor-pointer"
                          >
                            {entry.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id, entry.phoneE164)}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STATE SUPERVISION LINELIST */}
        {activeTab === 'surveys' && (
          <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-ink font-comic">
                  {lang === 'hi' ? 'राज्य सर्वेक्षण लाइनलिस्ट' : 'Submitted Surveys in State Scope'}
                </h2>
                <p className="text-xs text-ink-muted">
                  Full surveillance and review directory for state officers.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={surveySearch}
                  onChange={(e) => setSurveySearch(e.target.value)}
                  placeholder="Search ref, name, district..."
                  className="w-full text-xs px-3 py-2 pl-9 rounded-[10px] border-2 border-border/40 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                />
                <Icon name="search" className="w-4 h-4 absolute left-2.5 top-2.5 text-ink-muted" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas border-b-2 border-border/30 text-ink font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Client Ref</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Center ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-[11px]">
                  {filteredSurveys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-muted text-xs">
                        No beneficiary records matching search in state scope.
                      </td>
                    </tr>
                  ) : (
                    filteredSurveys.map((client) => (
                      <tr key={client.id} className="hover:bg-canvas/50">
                        <td className="py-3 px-4 font-mono font-bold text-ink">{client.clientRef}</td>
                        <td className="py-3 px-4 font-semibold text-ink">{client.fullName}</td>
                        <td className="py-3 px-4 font-mono text-ink-muted">{client.centerId}</td>
                        <td className="py-3 px-4">
                          <span className="bg-mint text-success-ink px-2 py-0.5 rounded-full text-[10px] font-bold border border-mint">
                            {client.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/clients/${client.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-plum hover:text-primary"
                          >
                            <Icon name="Eye" className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM STATUS & OUTBOX */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface rounded-[20px] border-2 border-border/40 p-5 shadow-comic-sm">
                <h3 className="text-xs font-bold uppercase text-ink-muted tracking-wider mb-2">
                  Transactional Outbox Queue
                </h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-ink font-comic">
                    {systemStatus?.outboxPending ?? 0}
                  </span>
                  <span className="text-xs text-ink-muted font-bold">pending sync</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="text-success-ink font-bold">
                    ✓ {systemStatus?.outboxPublished ?? 0} published
                  </span>
                  <span className="text-primary font-bold">
                    ✕ {systemStatus?.outboxFailed ?? 0} failed
                  </span>
                </div>
              </div>

              <div className="bg-surface rounded-[20px] border-2 border-border/40 p-5 shadow-comic-sm">
                <h3 className="text-xs font-bold uppercase text-ink-muted tracking-wider mb-2">
                  Google Sheets Realtime Mirror
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-success-ink animate-pulse" />
                  <span className="text-sm font-bold text-ink">
                    {systemStatus?.sheetsMirrorStatus || 'CONNECTED'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-ink-muted mt-2 truncate">
                  Target Sheet: {systemStatus?.sheetsDeploymentId || 'Production Gas Adapter'}
                </p>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-surface rounded-[20px] border-2 border-border/40 p-6 shadow-comic">
              <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2 font-comic">
                <Icon name="ShieldCheck" className="w-4 h-4 text-plum" />
                <span>Immutable Central Audit Trail (PostgreSQL append-only)</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-canvas border-b-2 border-border/30 text-ink font-bold uppercase text-[11px] tracking-wider">
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Resource Type</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Occurred At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-mono text-[11px]">
                    {(!systemStatus?.recentAudits || systemStatus.recentAudits.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-ink-muted font-sans text-xs">
                          No audit events recorded in recent window.
                        </td>
                      </tr>
                    ) : (
                      systemStatus.recentAudits.map((audit) => (
                        <tr key={audit.id} className="hover:bg-canvas/50">
                          <td className="py-2.5 px-3 font-bold text-ink">{audit.action}</td>
                          <td className="py-2.5 px-3 text-ink-muted">{audit.resourceType}</td>
                          <td className="py-2.5 px-3 text-plum font-bold">{audit.actorUsername}</td>
                          <td className="py-2.5 px-3 text-ink-muted">{audit.occurredAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD CASEWORKER */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-150" role="dialog">
            <div className="bg-surface rounded-[20px] max-w-md w-full p-6 shadow-comic border-2 border-border/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-ink font-comic">
                  {lang === 'hi' ? 'नया कार्यकर्ता रोस्टर में जोड़ें' : 'Add Caseworker to Roster'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-ink-muted hover:text-ink rounded-full"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCaseworker} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Mobile Number (Indian Mobile: 10 digits or +91) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9876543210 or +919876543210"
                    className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    District / Center Scope *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="e.g. Pune Central or Mumbai"
                    className="w-full text-xs px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink bg-canvas border border-border/40 rounded-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading || !newPhone.trim()}
                    className="px-5 py-2 text-xs font-black text-white bg-primary hover:bg-primary-hover rounded-[10px] shadow-comic-sm disabled:opacity-50"
                  >
                    {addLoading ? 'Adding...' : 'Add to Roster'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: BULK CSV UPLOAD */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-150" role="dialog">
            <div className="bg-surface rounded-[20px] max-w-lg w-full p-6 shadow-comic border-2 border-border/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-ink font-comic">
                  {lang === 'hi' ? 'बल्क CSV कार्यकर्ता आयात' : 'Bulk Import Caseworkers'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="p-1 text-ink-muted hover:text-ink rounded-full"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBulkAdd} className="space-y-3.5">
                <p className="text-xs text-ink-muted leading-relaxed">
                  Paste rows with format: <code className="font-mono bg-canvas px-1 rounded">Phone, District</code> (one per line).
                </p>

                <div>
                  <textarea
                    rows={6}
                    required
                    value={bulkCsv}
                    onChange={(e) => setBulkCsv(e.target.value)}
                    placeholder={"+919876543210, Pune\n+919876543211, Nagpur\n+919876543212, Mumbai"}
                    className="w-full text-xs font-mono p-3 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Default District (if omitted in row)
                  </label>
                  <input
                    type="text"
                    value={bulkDistrict}
                    onChange={(e) => setBulkDistrict(e.target.value)}
                    placeholder="General"
                    className="w-full text-xs px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                {bulkResult && (
                  <div className="p-3 bg-mint/50 border border-mint text-success-ink rounded-[10px] text-xs">
                    Successfully enrolled {bulkResult.addedCount} caseworkers.
                    {bulkResult.errors.length > 0 && (
                      <p className="text-error-ink mt-1 font-mono text-[11px]">
                        Warnings: {bulkResult.errors.join('; ')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink bg-canvas border border-border/40 rounded-[10px]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={bulkLoading || !bulkCsv.trim()}
                    className="px-5 py-2 text-xs font-black text-white bg-primary hover:bg-primary-hover rounded-[10px] shadow-comic-sm disabled:opacity-50"
                  >
                    {bulkLoading ? 'Importing...' : 'Import Roster'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
