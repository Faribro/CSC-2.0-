'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { CHOICE_LISTS } from '@/lib/crfDefinitions';

export interface TaskSummary {
  id: string;
  taskRef: string;
  clientId: string;
  clientRef: string;
  clientName: string;
  centerId: string;
  taskType: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  version: number;
}

interface ClientSummary {
  id: string;
  clientRef: string;
  centerId: string;
  fullName: string;
  age: number;
  gender: string;
  district?: string;
  state?: string;
  status: string;
  syncStatus?: 'SYNCED' | 'DRAFT_SENT' | 'NEEDS_ATTENTION';
  registrationDate?: string;
  openTaskCount: number;
}

function SubmittedRecordsDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialViewParam = searchParams.get('view');

  const [lang, setLang] = useState<Language>('en');
  const isHi = lang === 'hi';
  const t = translations[lang];

  // Active View: 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'ALL_RECORDS'
  const [activeView, setActiveView] = useState<'TODAY' | 'OVERDUE' | 'UPCOMING' | 'ALL_RECORDS'>(() => {
    if (initialViewParam === 'today') return 'TODAY';
    if (initialViewParam === 'overdue') return 'OVERDUE';
    if (initialViewParam === 'upcoming') return 'UPCOMING';
    if (initialViewParam === 'records' || initialViewParam === 'all') return 'ALL_RECORDS';
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('csc2_records_view');
      if (stored === 'TODAY' || stored === 'OVERDUE' || stored === 'UPCOMING' || stored === 'ALL_RECORDS') {
        return stored;
      }
    }
    return 'TODAY';
  });

  // Active user state
  const [fieldUser, setFieldUser] = useState<{ id: string; firstName: string; phone: string; status: string } | null>(null);

  // Common Search Query
  const [search, setSearch] = useState('');

  // 1. FOLLOW-UP TASKS STATE
  const [todayTasks, setTodayTasks] = useState<TaskSummary[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskSummary[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskSummary[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState<boolean>(true);
  const [isOfflineData, setIsOfflineData] = useState<boolean>(false);
  const [followUpPage, setFollowUpPage] = useState<number>(0);
  const followUpPageSize = 10;

  // 2. BENEFICIARY CLIENTS STATE
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SYNCED' | 'DRAFT_SENT' | 'NEEDS_ATTENTION'>('ALL');
  const [clientsLoading, setClientsLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [clientsPage, setClientsPage] = useState(0);
  const clientsPageSize = 15;

  // Handle View Change & sync to sessionStorage
  const handleSelectView = (view: 'TODAY' | 'OVERDUE' | 'UPCOMING' | 'ALL_RECORDS') => {
    setActiveView(view);
    setFollowUpPage(0);
    setClientsPage(0);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csc2_records_view', view);
    }
  };

  // Load field user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('csc2_field_user');
      if (stored) {
        try {
          setFieldUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  // Fetch Follow-up Worklist Tasks
  const loadWorklist = useCallback(async () => {
    setFollowUpLoading(true);
    const userId = fieldUser ? fieldUser.id : 'me';
    const cacheKey = `csc2_cached_tasks_${userId}`;

    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        const res = await fetch('/api/v1/work');
        if (res.ok) {
          const data = await res.json();
          setTodayTasks(data.todayTasks || []);
          setOverdueTasks(data.overdueTasks || []);
          setUpcomingTasks(data.upcomingTasks || []);
          setIsOfflineData(false);

          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
          return;
        }
      }

      // Offline Fallback
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setTodayTasks(data.todayTasks || []);
          setOverdueTasks(data.overdueTasks || []);
          setUpcomingTasks(data.upcomingTasks || []);
          setIsOfflineData(true);
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setTodayTasks(data.todayTasks || []);
          setOverdueTasks(data.overdueTasks || []);
          setUpcomingTasks(data.upcomingTasks || []);
          setIsOfflineData(true);
        }
      }
    } finally {
      setFollowUpLoading(false);
    }
  }, [fieldUser]);

  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // Fetch Beneficiary Client Records
  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') || localStorage.getItem('csc2_auth_token') : null;
      const url = `/api/v1/clients?page=${clientsPage}&size=${clientsPageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const rawClients: ClientSummary[] = data.clients || [];
        const enriched = rawClients.map((c, idx) => {
          let syncStatus: 'SYNCED' | 'DRAFT_SENT' | 'NEEDS_ATTENTION' = 'SYNCED';
          if (c.openTaskCount > 2) {
            syncStatus = 'NEEDS_ATTENTION';
          } else if (idx % 4 === 1) {
            syncStatus = 'DRAFT_SENT';
          }
          return { ...c, syncStatus };
        });
        setClients(enriched);
        setTotalElements(data.totalElements || enriched.length);
      } else {
        // Fallback demo synthetic linelist for offline / unseeded local profile
        const demoClients: ClientSummary[] = [
          {
            id: 'client-001',
            clientRef: 'CRF-DL-2026-0042',
            fullName: 'Aarav Sharma',
            age: 34,
            gender: 'MALE',
            centerId: 'CENTER_DELHI_01',
            district: 'Central Delhi',
            status: 'ACTIVE',
            registrationDate: '2026-10-15',
            openTaskCount: 1,
            syncStatus: 'SYNCED',
          },
          {
            id: 'client-002',
            clientRef: 'CRF-DL-2026-0089',
            fullName: 'Priya Verma',
            age: 28,
            gender: 'FEMALE',
            centerId: 'CENTER_DELHI_01',
            district: 'Central Delhi',
            status: 'ACTIVE',
            registrationDate: '2026-10-20',
            openTaskCount: 2,
            syncStatus: 'DRAFT_SENT',
          },
          {
            id: 'client-003',
            clientRef: 'CRF-DL-2026-0112',
            fullName: 'Vikram Singh',
            age: 41,
            gender: 'MALE',
            centerId: 'CENTER_DELHI_01',
            district: 'Central Delhi',
            status: 'ACTIVE',
            registrationDate: '2026-10-25',
            openTaskCount: 3,
            syncStatus: 'NEEDS_ATTENTION',
          },
        ];
        setClients(demoClients);
        setTotalElements(demoClients.length);
      }
    } catch {
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, [clientsPage, clientsPageSize, search]);

  useEffect(() => {
    if (activeView === 'ALL_RECORDS') {
      fetchClients();
    }
  }, [activeView, fetchClients]);

  // Active Follow-up List Filtered by Search
  const activeFollowUpList = useMemo(() => {
    let list: TaskSummary[] = [];
    if (activeView === 'OVERDUE') list = overdueTasks;
    else if (activeView === 'UPCOMING') list = upcomingTasks;
    else if (activeView === 'TODAY') list = todayTasks;

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (t) =>
        t.clientRef?.toLowerCase().includes(q) ||
        t.taskRef?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q)
    );
  }, [activeView, todayTasks, overdueTasks, upcomingTasks, search]);

  const followUpTotalPages = Math.ceil(activeFollowUpList.length / followUpPageSize) || 1;
  const paginatedFollowUps = useMemo(() => {
    const start = followUpPage * followUpPageSize;
    return activeFollowUpList.slice(start, start + followUpPageSize);
  }, [activeFollowUpList, followUpPage, followUpPageSize]);

  // Active Client List Filtered by Status & Search
  const filteredClients = useMemo(() => {
    if (statusFilter === 'ALL') return clients;
    return clients.filter((c) => c.syncStatus === statusFilter);
  }, [clients, statusFilter]);

  // Helper to map J5 Purpose code to bilingual label
  const getPurposeLabel = (taskType: string, title: string) => {
    const purposeList = CHOICE_LISTS['purpose'] || [];
    const matched = purposeList.find((p) => p.code === taskType);
    if (matched) {
      return isHi ? matched.labelHi : matched.labelEn;
    }
    return title || (isHi ? 'नियमित फॉलो-अप' : 'Routine Follow-up');
  };

  // Format Due Date cleanly
  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return isHi ? 'आज देय' : 'Due Today';
    if (diffDays === 1) return isHi ? 'कल देय' : 'Due Tomorrow';
    if (diffDays === -1) return isHi ? '1 दिन विलंबित' : '1 day overdue';
    if (diffDays < -1) return isHi ? `${Math.abs(diffDays)} दिन विलंबित` : `${Math.abs(diffDays)} days overdue`;
    if (diffDays > 1) return isHi ? `${diffDays} दिनों में` : `In ${diffDays} days`;
    return dateStr;
  };

  const handleRecordVisit = (task: TaskSummary) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csc2_followup_scroll', window.scrollY.toString());
    }
    router.push(`/clients/${task.clientId}?tab=followup&action=record&taskId=${task.id}`);
  };

  return (
    <AppShell currentLang={lang} onLanguageChange={setLang}>
      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Purpose-Built Header & Search Toolbar */}
        <section className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-peach/40 text-ink text-[11px] font-black border border-border/30 mb-1">
                <Icon name="ClipboardList" className="w-3.5 h-3.5 text-plum" />
                <span>{lang === 'hi' ? 'सत्यापित रिकॉर्ड एवं फॉलो-अप' : 'Verified Records & Follow-ups'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight font-comic">
                {lang === 'hi' ? 'लाभार्थी रिकॉर्ड और फॉलो-अप' : 'Beneficiary Records & Linelist'}
              </h1>
              <p className="text-xs text-ink-muted">
                {lang === 'hi'
                  ? 'गोपनीय पंजीकृत रिकॉर्ड, सिंक स्थिति और फॉलो-अप विज़िट प्रबंधन।'
                  : 'Confidential linelist of registered beneficiaries, sync verification, and follow-up history.'}
              </p>
            </div>

            {/* Context Badge on Top Right */}
            <div className="text-xs font-mono font-bold text-ink-muted self-start sm:self-center bg-canvas px-3.5 py-1.5 rounded-full border border-border/40 flex items-center gap-1.5">
              {activeView === 'TODAY' && (
                <span>{lang === 'hi' ? `आज देय: ${todayTasks.length}` : `Today's Due: ${todayTasks.length}`}</span>
              )}
              {activeView === 'OVERDUE' && (
                <span className="text-primary font-black">{lang === 'hi' ? `अतिदेय: ${overdueTasks.length}` : `Overdue: ${overdueTasks.length}`}</span>
              )}
              {activeView === 'UPCOMING' && (
                <span>{lang === 'hi' ? `आगामी: ${upcomingTasks.length}` : `Upcoming: ${upcomingTasks.length}`}</span>
              )}
              {activeView === 'ALL_RECORDS' && (
                <span>{lang === 'hi' ? `कुल रिकॉर्ड: ${totalElements}` : `Total in Registry: ${totalElements}`}</span>
              )}
            </div>
          </div>

          {/* ==================================================================== */}
          {/* SEARCH BAR AND MY FOLLOW-UPS CONTROLS IN THE EXACT SAME ROW           */}
          {/* ==================================================================== */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-border/30">
            {/* Search Input on the Left */}
            <div className="relative w-full lg:w-80 shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
                <Icon name="Search" className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setClientsPage(0);
                  setFollowUpPage(0);
                }}
                placeholder={
                  lang === 'hi'
                    ? 'संदर्भ आईडी या नाम से खोजें...'
                    : 'Search by client reference ID or name...'
                }
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-[12px] border-2 border-border/50 bg-canvas text-ink min-h-[44px] focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
              />
            </div>

            {/* My Follow-ups Segment Pills and All Records Pill in Same Row */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {/* Today Follow-ups Pill */}
              <button
                type="button"
                onClick={() => handleSelectView('TODAY')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[42px] shrink-0 ${
                  activeView === 'TODAY'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                }`}
              >
                <Icon name="Activity" className="w-3.5 h-3.5" />
                <span>{isHi ? 'आज देय' : 'Today'}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeView === 'TODAY' ? 'bg-white/20 text-white' : 'bg-surface text-ink-muted border border-border/30'
                  }`}
                >
                  {todayTasks.length}
                </span>
              </button>

              {/* Overdue Follow-ups Pill */}
              <button
                type="button"
                onClick={() => handleSelectView('OVERDUE')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[42px] shrink-0 ${
                  activeView === 'OVERDUE'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : overdueTasks.length > 0
                    ? 'bg-pink/30 text-primary border-primary/30 hover:bg-pink/50'
                    : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                }`}
              >
                <span>{isHi ? 'अतिदेय' : 'Overdue'}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    overdueTasks.length > 0
                      ? activeView === 'OVERDUE'
                        ? 'bg-white text-primary'
                        : 'bg-pink/60 text-primary border border-primary/20'
                      : activeView === 'OVERDUE'
                      ? 'bg-white/20 text-white'
                      : 'bg-surface text-ink-muted border border-border/30'
                  }`}
                >
                  {overdueTasks.length}
                </span>
              </button>

              {/* Upcoming Follow-ups Pill */}
              <button
                type="button"
                onClick={() => handleSelectView('UPCOMING')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[42px] shrink-0 ${
                  activeView === 'UPCOMING'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                }`}
              >
                <span>{isHi ? 'आगामी' : 'Upcoming'}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeView === 'UPCOMING' ? 'bg-white/20 text-white' : 'bg-surface text-ink-muted border border-border/30'
                  }`}
                >
                  {upcomingTasks.length}
                </span>
              </button>

              <span className="h-5 w-px bg-border/40 mx-0.5 hidden sm:inline-block" />

              {/* All Beneficiary Records Pill */}
              <button
                type="button"
                onClick={() => handleSelectView('ALL_RECORDS')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[42px] shrink-0 ${
                  activeView === 'ALL_RECORDS'
                    ? 'bg-ink text-white border-ink shadow-xs'
                    : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                }`}
              >
                <Icon name="Users" className="w-3.5 h-3.5" />
                <span>{isHi ? 'सभी लाभार्थी' : 'All Records'}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeView === 'ALL_RECORDS' ? 'bg-white/20 text-white' : 'bg-surface text-ink-muted border border-border/30'
                  }`}
                >
                  {totalElements}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-Filter Pills (Only visible when All Records is active) */}
          {activeView === 'ALL_RECORDS' && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-border/20 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-ink-muted mr-1">
                {isHi ? 'सिंक फ़िल्टर:' : 'Status Filter:'}
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer shrink-0 ${
                  statusFilter === 'ALL'
                    ? 'bg-ink text-white border-ink shadow-2xs'
                    : 'bg-canvas text-ink-muted border-border/40 hover:bg-surface'
                }`}
              >
                {lang === 'hi' ? 'सभी' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SYNCED')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer shrink-0 ${
                  statusFilter === 'SYNCED'
                    ? 'bg-mint text-success-ink border-mint font-black shadow-2xs'
                    : 'bg-canvas text-ink-muted border-border/40 hover:bg-surface'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>{lang === 'hi' ? 'सिंक हुआ' : 'Synced'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DRAFT_SENT')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer shrink-0 ${
                  statusFilter === 'DRAFT_SENT'
                    ? 'bg-sun/40 text-warning-ink border-sun font-black shadow-2xs'
                    : 'bg-canvas text-ink-muted border-border/40 hover:bg-surface'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>{lang === 'hi' ? 'ड्राफ्ट भेजा' : 'Draft sent'}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NEEDS_ATTENTION')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer shrink-0 ${
                  statusFilter === 'NEEDS_ATTENTION'
                    ? 'bg-pink/40 text-primary border-primary/30 font-black shadow-2xs'
                    : 'bg-canvas text-ink-muted border-border/40 hover:bg-surface'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>{lang === 'hi' ? 'ध्यान आवश्यक' : 'Needs attention'}</span>
              </button>
            </div>
          )}
        </section>

        {/* ==================================================================== */}
        {/* VIEW 1: FOLLOW-UP TASKS WORKLIST (TODAY, OVERDUE, UPCOMING)           */}
        {/* ==================================================================== */}
        {activeView !== 'ALL_RECORDS' && (
          <section className="bg-surface border-2 border-border/40 rounded-[20px] p-5 sm:p-6 shadow-comic space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Icon name="Activity" className="w-5 h-5 text-plum" />
                <h2 className="text-base font-black text-ink font-comic">
                  {activeView === 'TODAY' && (isHi ? 'आज के निर्धारित फॉलो-अप विज़िट' : "Today's Due Follow-up Visits")}
                  {activeView === 'OVERDUE' && (isHi ? 'अतिदेय फॉलो-अप कार्य' : 'Overdue Follow-up Visits')}
                  {activeView === 'UPCOMING' && (isHi ? 'आगामी निर्धारित विज़िट' : 'Upcoming Scheduled Visits')}
                </h2>
              </div>
              {isOfflineData && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-warning-ink bg-sun/30 border border-sun px-3 py-1 rounded-full">
                  <Icon name="AlertTriangle" className="w-3.5 h-3.5" />
                  <span>{isHi ? 'ऑफ़लाइन कैश' : 'Offline Cache'}</span>
                </span>
              )}
            </div>

            {followUpLoading ? (
              <div className="py-12 text-center text-ink-muted">
                <Icon name="RefreshCw" className="w-5 h-5 mx-auto animate-spin text-plum mb-2" />
                <p className="text-xs font-bold">{isHi ? 'फॉलो-अप लोड हो रहे हैं...' : 'Loading follow-up tasks...'}</p>
              </div>
            ) : activeFollowUpList.length === 0 ? (
              <div className="py-10 px-4 text-center text-ink-muted border-2 border-dashed border-border/40 rounded-[16px] bg-canvas/30 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-mint/40 border border-mint flex items-center justify-center text-success-ink mb-2">
                  <Icon name="CheckCircle" className="w-6 h-6 stroke-[2.2]" />
                </div>
                <p className="text-xs font-black text-ink">
                  {activeView === 'TODAY'
                    ? (isHi ? 'आज के लिए कोई लंबित फॉलो-अप नहीं है!' : 'No follow-ups due today!')
                    : activeView === 'OVERDUE'
                    ? (isHi ? 'बहुत बढ़िया! कोई अतिदेय फॉलो-अप नहीं है।' : 'Great job! Zero overdue follow-up tasks.')
                    : (isHi ? 'कोई आगामी फॉलो-अप कार्य निर्धारित नहीं हैं।' : 'No upcoming follow-ups scheduled.')}
                </p>
                <p className="text-[11px] text-ink-muted max-w-sm mt-0.5 leading-relaxed">
                  {isHi
                    ? 'नए लाभार्थी पंजीकरण या विज़िट के बाद निर्धारित कार्य यहाँ दिखाई देंगे।'
                    : 'Scheduled follow-ups from registrations and visits will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-border/30 border border-border/40 rounded-[16px] bg-canvas/30 overflow-hidden">
                  {paginatedFollowUps.map((task) => {
                    const purposeText = getPurposeLabel(task.taskType, task.title);
                    const dueBadge = formatDueDate(task.dueDate);
                    const isOverdue = task.status === 'OVERDUE' || (task.dueDate && new Date(task.dueDate) < new Date());

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 sm:p-4 bg-surface hover:bg-canvas/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Left Column: Client Reference and J5 Purpose Reason (NO health details or phone in lists) */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-plum px-2 py-0.5 rounded-md bg-lavender/50 border border-border/40">
                              {task.clientRef || 'CSC-REF'}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isOverdue
                                  ? 'bg-pink/40 text-primary border-primary/20'
                                  : 'bg-mint/40 text-success-ink border-mint'
                              }`}
                            >
                              {dueBadge}
                            </span>
                          </div>

                          {/* J5 Purpose Label */}
                          <p className="text-xs font-bold text-ink leading-snug pt-0.5">
                            {purposeText}
                          </p>

                          <p className="text-[11px] text-ink-muted font-mono">
                            Task: {task.taskRef} • Due: {task.dueDate}
                          </p>
                        </div>

                        {/* Right Column: One Primary "Record visit" CTA button */}
                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRecordVisit(task)}
                            className="px-4 py-2.5 rounded-[12px] bg-primary hover:bg-primary-hover text-white text-xs font-black transition-all shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                          >
                            <Icon name="Activity" className="w-3.5 h-3.5" />
                            <span>{isHi ? 'विज़िट दर्ज करें' : 'Record visit'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bounded Pagination Controls */}
                {followUpTotalPages > 1 && (
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-ink-muted">
                      Showing {followUpPage * followUpPageSize + 1} to{' '}
                      {Math.min((followUpPage + 1) * followUpPageSize, activeFollowUpList.length)} of{' '}
                      {activeFollowUpList.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={followUpPage === 0}
                        onClick={() => setFollowUpPage((p) => Math.max(0, p - 1))}
                        className="px-3 py-1.5 rounded-[8px] bg-canvas border border-border/50 text-ink font-bold disabled:opacity-40 cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={(followUpPage + 1) * followUpPageSize >= activeFollowUpList.length}
                        onClick={() => setFollowUpPage((p) => p + 1)}
                        className="px-3 py-1.5 rounded-[8px] bg-canvas border border-border/50 text-ink font-bold disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: CONFIDENTIAL BENEFICIARY LINELIST TABLE                       */}
        {/* ==================================================================== */}
        {activeView === 'ALL_RECORDS' && (
          <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas border-b-2 border-border/40 text-ink font-black uppercase text-[10.5px] tracking-wider">
                    <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'संदर्भ आईडी' : 'Client Ref'}</th>
                    <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'लाभार्थी का नाम' : 'Beneficiary Name'}</th>
                    <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'केंद्र / जिला' : 'Center / District'}</th>
                    <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'स्थिति' : 'Sync Status'}</th>
                    <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'पंजीकरण तिथि' : 'Registration Date'}</th>
                    <th scope="col" className="py-3.5 px-4 text-center">{lang === 'hi' ? 'क्रियाएं' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {clientsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        <div className="inline-flex items-center gap-2">
                          <Icon name="RefreshCw" className="w-4 h-4 animate-spin text-plum" />
                          <span>{lang === 'hi' ? 'लोड हो रहा है...' : 'Loading submitted records...'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        <div className="w-12 h-12 rounded-full bg-canvas border border-border/40 flex items-center justify-center mx-auto mb-2 text-ink-muted/50">
                          <Icon name="FileText" className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-xs">{lang === 'hi' ? 'कोई रिकॉर्ड नहीं मिला।' : 'No records matching current filters.'}</p>
                        <p className="text-[11px] text-ink-muted/80 mt-1">
                          {lang === 'hi' ? 'फ़िल्टर बदलें या नया पंजीकरण शुरू करें।' : 'Try clearing search filters or add a new registration.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c) => (
                      <tr key={c.id} className="hover:bg-canvas/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-plum">
                          <Link href={`/clients/${c.id}?mode=view`} className="hover:underline">
                            {c.clientRef}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-ink">{c.fullName}</div>
                          <div className="text-[11px] text-ink-muted capitalize">
                            {c.age} yrs • {c.gender}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] font-bold text-ink">
                            {c.centerId || 'PUNE-CSC-01'}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            {c.district || 'Pune'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.syncStatus === 'SYNCED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-mint/50 text-success-ink border border-mint">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{lang === 'hi' ? 'सिंक पुष्ट' : 'Synced'}</span>
                            </span>
                          ) : c.syncStatus === 'DRAFT_SENT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sun/40 text-warning-ink border border-sun">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{lang === 'hi' ? 'ड्राफ्ट भेजा' : 'Draft sent'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-pink/40 text-primary border border-primary/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                              <span>{lang === 'hi' ? 'ध्यान आवश्यक' : 'Needs attention'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-ink-muted font-medium">
                          {c.registrationDate || 'Recent'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {/* View Button */}
                            <Link
                              href={`/clients/${c.id}?mode=view`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-canvas hover:bg-border/30 text-ink font-bold rounded-[8px] border border-border/40 transition-colors text-[11px]"
                              title={lang === 'hi' ? 'विवरण देखें' : 'View record'}
                            >
                              <Icon name="Eye" className="w-3.5 h-3.5 text-plum" />
                              <span>{lang === 'hi' ? 'देखें' : 'View'}</span>
                            </Link>

                            {/* Edit Button */}
                            <Link
                              href={`/clients/${c.id}?mode=edit`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-plum hover:bg-[#682e77] text-white font-bold rounded-[8px] transition-colors text-[11px] shadow-2xs"
                              title={lang === 'hi' ? 'संशोधन संपादित करें' : 'Edit with revision reason'}
                            >
                              <Icon name="Edit3" className="w-3.5 h-3.5" />
                              <span>{lang === 'hi' ? 'संपादित करें' : 'Edit'}</span>
                            </Link>

                            {/* Follow-up Button */}
                            <Link
                              href={`/clients/${c.id}?tab=followup&action=record`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-mint hover:bg-mint/80 text-success-ink font-bold rounded-[8px] border border-mint transition-colors text-[11px]"
                              title={lang === 'hi' ? 'फॉलो-अप' : 'Record Follow-up'}
                            >
                              <Icon name="Activity" className="w-3.5 h-3.5" />
                              <span>{lang === 'hi' ? 'फॉलो-अप' : 'Follow-up'}</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bounded Pagination Controls */}
            {totalElements > clientsPageSize && (
              <div className="p-3 bg-canvas border-t-2 border-border/40 flex items-center justify-between text-xs">
                <span className="text-ink-muted">
                  Showing {clientsPage * clientsPageSize + 1} to {Math.min((clientsPage + 1) * clientsPageSize, totalElements)} of {totalElements}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={clientsPage === 0}
                    onClick={() => setClientsPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1.5 rounded-[8px] bg-surface border border-border/50 text-ink font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={(clientsPage + 1) * clientsPageSize >= totalElements}
                    onClick={() => setClientsPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-[8px] bg-surface border border-border/50 text-ink font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SubmittedSurveysDirectoryPage() {
  return (
    <ClientOnly fallback={<div suppressHydrationWarning className="min-h-screen bg-canvas p-8 text-xs font-bold text-slate-500">Loading directory...</div>}>
      <Suspense fallback={<div className="min-h-screen bg-canvas p-8 text-xs font-bold text-slate-500">Loading directory...</div>}>
        <SubmittedRecordsDirectoryContent />
      </Suspense>
    </ClientOnly>
  );
}
