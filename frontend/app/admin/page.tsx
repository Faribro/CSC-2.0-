"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';
import { EvaluationLoginModal } from '@/components/auth/EvaluationLoginModal';

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

interface SupervisionTaskDto {
  taskId: string;
  taskRef: string;
  clientId: string;
  clientRef: string;
  clientName: string;
  district: string;
  centerId: string;
  dueDate: string;
  status: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  attemptCount: number;
  rescheduleCount: number;
  lastAttemptDate?: string;
  lastAttemptOutcome?: string;
}

interface ProgrammeRuleSummary {
  id: string;
  code: string;
  titleEn: string;
  titleHi: string;
  category: string;
  status: string;
  version: number;
  intervalSpec: string;
  purposeCode: string;
  suggestedServices: string[];
  sourceName: string;
  sourceEdition: string;
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

const SEED_RULES_REFERENCE: ProgrammeRuleSummary[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    code: 'RULE-NACO-2025-ART-INIT',
    titleEn: '[PROPOSED] Newly Started on ART - 6-Month Intensive Contact Protocol',
    titleHi: '[PROPOSED] एआरटी पर नए शुरू हुए - 6 महीने का गहन संपर्क प्रोटोकॉल',
    category: 'ART_INITIATION',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Every 1 month for 6 months (Home visit in Month 1)',
    purposeCode: '01 (Routine Follow-up)',
    suggestedServices: ['01-01', '01-02'],
    sourceName: 'NACO CSC Operational Guidelines 2025 [UNVERIFIED: confirm against full PDF]',
    sourceEdition: 'Draft 2025 Edition',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    code: 'RULE-NACO-2025-LFU-TRACK',
    titleEn: '[PROPOSED] Lost to Follow-Up - Weekly Tracing Protocol',
    titleHi: '[PROPOSED] फॉलो-अप छूटे लाभार्थी - साप्ताहिक ट्रैकिंग प्रोटोकॉल',
    category: 'LFU_TRACKING',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Every 1 week until definite tracking outcome',
    purposeCode: '02 (Lost to Follow-up Tracking)',
    suggestedServices: ['02-01'],
    sourceName: 'NACO CSC Operational Guidelines 2025 [UNVERIFIED: confirm against full PDF]',
    sourceEdition: 'Draft 2025 Edition',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    code: 'RULE-NACO-2025-RE-ENGAGED',
    titleEn: '[PROPOSED] Brought Back to Care - 3-Month Stabilization & VL Monitoring',
    titleHi: '[PROPOSED] पुनः देखरेख में लाए गए - 3 महीने का स्थिरीकरण एवं वीएल निगरानी',
    category: 'LFU_TRACKING',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Every 1 month for 3 months and until Viral Load test',
    purposeCode: '01 (Routine Follow-up)',
    suggestedServices: ['01-03'],
    sourceName: 'NACO CSC Operational Guidelines 2025 [UNVERIFIED: confirm against full PDF]',
    sourceEdition: 'Draft 2025 Edition',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    code: 'RULE-NACO-2025-VAL-UNTRACEABLE',
    titleEn: '[PROPOSED] Untraceable Classification Prerequisite Validation',
    titleHi: '[PROPOSED] अप्राप्य वर्गीकरण पूर्व-शर्त सत्यापन',
    category: 'VALIDATION',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'At least 2 phone attempts + 1 home visit within 30 days',
    purposeCode: '02 (Tracking Validation)',
    suggestedServices: [],
    sourceName: 'NACO CSC Operational Guidelines 2025',
    sourceEdition: 'Edition 2025',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    code: 'RULE-NACO-2025-VAL-OPT-OUT',
    titleEn: '[PROPOSED] Beneficiary Opt-Out Verification Rule',
    titleHi: '[PROPOSED] लाभार्थी ऑप्ट-आउट सत्यापन नियम',
    category: 'VALIDATION',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Documented counselling and 3 contacts before opt-out',
    purposeCode: '05 (Opt-Out Protocol)',
    suggestedServices: [],
    sourceName: 'NACO CSC Operational Guidelines 2025',
    sourceEdition: 'Edition 2025',
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    code: 'RULE-WHO-2024-COMPUTED-LABELS',
    titleEn: '[PROPOSED] Tracing Triggers and LFU Threshold Display Rules',
    titleHi: '[PROPOSED] ट्रैकिंग ट्रिगर्स एवं एलएफयू सीमा प्रदर्शन नियम',
    category: 'COMPUTED_LABEL',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Missed visit > 7 days triggers tracing alert; >= 28 days marks LFU',
    purposeCode: '02 (Tracing Alert)',
    suggestedServices: [],
    sourceName: 'WHO Consolidated Guidelines on HIV Prevention, Testing, Treatment, Service Delivery and Monitoring',
    sourceEdition: '2021 / 2024 Update',
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    code: 'RULE-NACO-2021-VIRAL-LOAD',
    titleEn: '[PROPOSED] Viral Load and CD4 Routine Monitoring Schedule',
    titleHi: '[PROPOSED] वायरल लोड एवं सीडी4 नियमित निगरानी अनुसूची',
    category: 'VIRAL_LOAD_REMINDER',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'VL at 6m, 12m after ART start, then yearly; 6m on 2nd/3rd line; CD4 6-monthly',
    purposeCode: '03 (Viral Load / Lab Reminder)',
    suggestedServices: ['03-01'],
    sourceName: 'NACO National Guidelines for HIV Care and Treatment [UNVERIFIED: confirm if HCTS 2026 supersedes]',
    sourceEdition: '2021 Edition',
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    code: 'RULE-NACO-2024-EVTHS-PMTCT',
    titleEn: '[PROPOSED] Elimination of Vertical Transmission (EVTHS) & Infant Cohort Tracking',
    titleHi: '[PROPOSED] वर्टिकल ट्रांसमिशन उन्मूलन (EVTHS) एवं शिशु समूह ट्रैकिंग',
    category: 'PMTCT_MONITORING',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Track infant to 18m or 3m post-breastfeeding; Maternal VL at 32-36 weeks',
    purposeCode: '04 (PMTCT & Infant Follow-up)',
    suggestedServices: ['04-01'],
    sourceName: 'NACO/EVTHS Operational Guidelines for Prevention of Vertical Transmission',
    sourceEdition: '2024 Edition',
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    code: 'RULE-NTEP-2024-TB-ATT',
    titleEn: '[PROPOSED] NTEP Collaborative TB Treatment & Post-Treatment Surveillance',
    titleHi: '[PROPOSED] एनटीईपी सहयोगात्मक टीबी उपचार एवं उपचार-उपरांत निगरानी',
    category: 'TB_MONITORING',
    status: 'DRAFT',
    version: 1,
    intervalSpec: 'Monthly during TB treatment (ATT); Post-treatment at 6, 12, 18, 24 months',
    purposeCode: '06 (HIV-TB Collaborative Surveillance)',
    suggestedServices: ['06-01'],
    sourceName: 'National Tuberculosis Elimination Programme (NTEP) Technical Guidelines',
    sourceEdition: '2024 Edition',
  },
];

export default function EvaluationDashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Auth & Scope State
  const [evalUser, setEvalUser] = useState<{ role: string; fullName: string; state: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'supervision' | 'roster' | 'rules' | 'system' | 'leadership_overview' | 'leadership_districts'>('supervision');

  // Leadership Scope Filter
  const [leadershipSelectedState, setLeadershipSelectedState] = useState<string>('ALL');
  const [statesList, setStatesList] = useState<Array<{ stateCode: string; stateName: string }>>([]);

  // Supervision States (State Team Work Queue)
  const [supervisionView, setSupervisionView] = useState<'OVERDUE' | 'COULD_NOT_REACH' | 'UNASSIGNED' | 'RESCHEDULED_OFTEN'>('OVERDUE');
  const [supervisionDistrict, setSupervisionDistrict] = useState<string>('');
  const [supervisionWorkerId, setSupervisionWorkerId] = useState<string>('');
  const [escalationThreshold, setEscalationThreshold] = useState<number>(3);
  const [supervisionTasks, setSupervisionTasks] = useState<SupervisionTaskDto[]>([]);
  const [supervisionLoading, setSupervisionLoading] = useState<boolean>(false);

  // Reassign Modal States
  const [reassignModalTask, setReassignModalTask] = useState<SupervisionTaskDto | null>(null);
  const [reassignTargetWorkerId, setReassignTargetWorkerId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignSubmitting, setReassignSubmitting] = useState<boolean>(false);

  // Stats & Data
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  // Dynamic Districts derived from roster, supervision tasks, and reference data
  const availableDistricts = Array.from(
    new Set([
      ...roster.map((r) => r.district).filter(Boolean),
      ...supervisionTasks.map((t) => t.district).filter(Boolean),
      'Pune', 'Mumbai Suburban', 'Thane', 'Solapur', 'Nashik', 'Nagpur', 'Kolhapur', 'Aurangabad'
    ])
  ).sort();
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

  // Leadership Drill-down State
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(null);

  // Load supervision tasks for state team work-queue
  const loadSupervisionTasks = useCallback(async () => {
    if (!evalUser) return;
    setSupervisionLoading(true);
    const token = localStorage.getItem('csc2_auth_token');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const params = new URLSearchParams();
    params.set('view', supervisionView);
    if (evalUser.state && evalUser.state !== 'NATIONAL') params.set('state', evalUser.state);
    if (supervisionDistrict) params.set('district', supervisionDistrict);
    if (supervisionWorkerId) params.set('workerId', supervisionWorkerId);
    params.set('threshold', String(escalationThreshold));

    try {
      const res = await fetch(`/api/v1/evaluation/supervision?${params.toString()}`, { credentials: 'include', headers });
      if (res.ok) {
        const data = await res.json();
        setSupervisionTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load supervision tasks', err);
    } finally {
      setSupervisionLoading(false);
    }
  }, [evalUser, supervisionView, supervisionDistrict, supervisionWorkerId, escalationThreshold]);

  // Load primary dashboard data
  const loadDashboardData = useCallback(async (stateScope: string, token: string) => {
    setLoading(true);
    setErrorMessage(null);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      // 0. Fetch States Reference
      fetch('/api/v1/evaluation/states')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => { if (Array.isArray(data)) setStatesList(data); })
        .catch(() => {});

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

      // 4. Fetch System status
      fetch('/api/v1/admin/status', { credentials: 'include', headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) setSystemStatus(data); })
        .catch(() => {});
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load evaluation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Authentication check on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLang = localStorage.getItem('csc2_lang'); if (savedLang === 'hi' || savedLang === 'en') { setLang(savedLang); }
    const stored = localStorage.getItem('csc2_eval_user');
    const token = localStorage.getItem('csc2_auth_token');

    if (!stored || !token) {
      setEvalUser(null);
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setEvalUser(parsed);
      if (parsed.role === 'leadership') {
        setActiveTab('leadership_overview');
      } else {
        setActiveTab('supervision');
      }
      loadDashboardData(parsed.state || 'MH', token);
    } catch {
      setEvalUser(null);
      setLoading(false);
    }
  }, [loadDashboardData]);

  useEffect(() => {
    if (evalUser && (activeTab === 'supervision' || evalUser.role !== 'leadership')) {
      loadSupervisionTasks();
    }
  }, [activeTab, evalUser, loadSupervisionTasks]);

  // Handle Confirm Reassignment
  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalTask || !reassignTargetWorkerId || !reassignReason.trim()) return;
    setReassignSubmitting(true);
    const token = localStorage.getItem('csc2_auth_token');
    try {
      const res = await fetch(`/api/v1/evaluation/tasks/${reassignModalTask.taskId}/reassign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newWorkerId: reassignTargetWorkerId,
          reason: reassignReason.trim(),
        }),
      });

      if (res.ok) {
        setSuccessMessage('Task reassigned successfully. Permanent audit trail created.');
        setTimeout(() => setSuccessMessage(null), 4000);
        setReassignModalTask(null);
        setReassignTargetWorkerId('');
        setReassignReason('');
        loadSupervisionTasks();
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Failed to reassign task.');
      }
    } catch {
      setErrorMessage('Network error while reassigning task.');
    } finally {
      setReassignSubmitting(false);
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
          state: evalUser.state || 'MH',
          district: newDistrict.trim() || 'General',
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setRoster((prev) => [added, ...prev]);
        setShowAddModal(false);
        setNewPhone('');
        setNewDistrict('');
        setSuccessMessage(`Caseworker ${added.phoneE164} enrolled successfully.`);
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
          state: evalUser.state || 'MH',
          district: bulkDistrict.trim() || 'General',
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setBulkResult(result);
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

  // Toggle Caseworker Status
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

  // Delete Caseworker
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
    setEvalUser(null);
    router.push('/work');
  };

  const isLeadership = evalUser?.role === 'leadership';

  // 1. UNAUTHENTICATED LOCKED VIEW
  if (!evalUser && !loading) {
    return (
      <ClientOnly fallback={<div className="min-h-screen bg-canvas" />}>
        <AppShell currentLang={lang} onLanguageChange={setLang}>
          <div className="max-w-md mx-auto my-12 text-center">
            <div className="bg-surface rounded-[24px] border-2 border-border/40 p-8 shadow-comic space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-lavender flex items-center justify-center text-plum border border-border/30 mx-auto shadow-2xs">
                <Icon name="Lock" className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-ink font-comic">
                {lang === 'hi' ? 'मूल्यांकन प्रमाणीकरण आवश्यक' : 'Evaluation Access Required'}
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                {lang === 'hi'
                  ? 'राज्य पर्यवेक्षण कार्य-सूची और राष्ट्रीय नेतृत्व निगरानी पोर्टल अधिकृत अधिकारियों के लिए सुरक्षित है।'
                  : 'Supervision work queues, caseworker rostering, and strategic surveillance are restricted to authorized State Officers and National Leadership.'}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[14px] shadow-comic flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icon name="Shield" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'साइन इन करें' : 'Sign In to Access'}</span>
                </button>
                <Link href="/work" className="w-full sm:w-auto">
                  <button
                    type="button"
                    className="w-full px-5 py-3 bg-canvas hover:bg-surface text-ink text-xs font-bold rounded-[14px] border border-border/40 cursor-pointer"
                  >
                    {lang === 'hi' ? 'फॉर्म पर वापस जाएं' : 'Return to Forms'}
                  </button>
                </Link>
              </div>
            </div>
          </div>
          <EvaluationLoginModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={(data) => {
              setEvalUser(data as any);
              if (data.role === 'leadership') {
                setActiveTab('leadership_overview');
              } else {
                setActiveTab('supervision');
              }
              loadDashboardData(data.state || 'MH', data.token);
            }}
            lang={lang}
          />
        </AppShell>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center p-8 text-xs font-bold text-slate-500">
          Loading evaluation workspace...
        </div>
      }
    >
      <AppShell currentLang={lang} onLanguageChange={setLang}>
        <div className="space-y-5 max-w-6xl mx-auto">
          {/* Header Banner & Scope Indicator */}
          <div className="bg-surface rounded-[20px] border-2 border-border/40 p-5 shadow-comic flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lavender/60 text-plum text-[11px] font-black border border-border/30 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {isLeadership
                    ? (lang === 'hi' ? 'राष्ट्रीय नेतृत्व निगरानी' : 'National Strategic Surveillance')
                    : (lang === 'hi' ? `राज्य टीम पर्यवेक्षण: ${evalUser?.state || 'MH'}` : `State Team Work Queue: ${evalUser?.state || 'Maharashtra'}`)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight font-comic">
                {isLeadership
                  ? (lang === 'hi' ? 'राष्ट्रीय प्रदर्शन और निगरानी डैशबोर्ड' : 'Strategic Programme Surveillance')
                  : (lang === 'hi' ? 'राज्य पर्यवेक्षण और कार्य आवंटन' : 'Supervision & Casework Operations')}
              </h1>
              <p className="text-xs text-ink-muted">
                Authenticated as <strong className="text-ink">{evalUser?.fullName || 'State Officer'}</strong> • {isLeadership ? 'National Read-Only Oversight' : `State Scope: ${evalUser?.state || 'MH'}`}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleExitEvaluation}
                className="px-3.5 py-2 text-xs font-bold text-ink-muted hover:text-ink bg-canvas border border-border/40 rounded-[12px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="logout" className="w-4 h-4" />
                <span>{lang === 'hi' ? 'सत्र समाप्त करें' : 'Exit Session'}</span>
              </button>
            </div>
          </div>

          {/* Alerts */}
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

          {/* ==================================================================== */}
          {/* A. STATE TEAM OPERATIONS LAYOUT (Work-queue, left filters, reassign) */}
          {/* ==================================================================== */}
          {!isLeadership && (
            <div className="space-y-4">
              {/* Tab Navigation (Inspired by Childcare-Support-Phase-3 SupervisorTabNav) */}
              <div className="flex border-b-2 border-border/40 gap-3 overflow-x-auto scrollbar-none pb-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('supervision')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                    activeTab === 'supervision'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="Activity" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'पर्यवेक्षण कार्य-कतार' : 'Supervision Work Queue'}</span>
                  <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                    {stats?.openFollowUps ?? supervisionTasks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                    activeTab === 'roster'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="Users" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'कार्यकर्ता रोस्टर' : 'Caseworker Roster'}</span>
                  <span className="text-[10px] font-mono bg-lavender text-plum px-2 py-0.5 rounded-full font-bold">
                    {roster.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                    activeTab === 'rules'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="FileText" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'कार्यक्रम दिशानिर्देश नियम' : 'Programme Rules Registry'}</span>
                  <span className="text-[10px] font-mono bg-mint text-success-ink px-2 py-0.5 rounded-full font-bold">
                    5 [DRAFT]
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                    activeTab === 'system'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="ShieldCheck" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'ऑडिट और आउटबॉक्स' : 'Audit & Outbox'}</span>
                </button>
              </div>

              {/* TAB 1: WORK QUEUE (TWO-COLUMN OPERATIONAL LAYOUT) */}
              {activeTab === 'supervision' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  {/* Left Filter Rail */}
                  <div className="md:col-span-1 space-y-3 bg-surface rounded-[20px] border-2 border-border/40 p-4 shadow-comic">
                    <h3 className="text-xs font-black uppercase text-ink tracking-wider flex items-center gap-1.5 pb-2 border-b border-border/30">
                      <Icon name="Filter" className="w-3.5 h-3.5 text-plum" />
                      <span>{lang === 'hi' ? 'कार्य फ़िल्टर' : 'Queue Filters'}</span>
                    </h3>

                    {/* District Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-ink-muted mb-1">
                        {lang === 'hi' ? 'जिला चुनें' : 'Filter by District'}
                      </label>
                      <select
                        value={supervisionDistrict}
                        onChange={(e) => setSupervisionDistrict(e.target.value)}
                        className="w-full text-xs bg-canvas border border-border/50 rounded-[10px] px-2.5 py-2 font-bold text-ink focus:outline-hidden focus:border-plum"
                      >
                        <option value="">{lang === 'hi' ? 'सभी जिले' : 'All Districts'}</option>
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    {/* Caseworker Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-ink-muted mb-1">
                        {lang === 'hi' ? 'कार्यकर्ता' : 'Caseworker'}
                      </label>
                      <select
                        value={supervisionWorkerId}
                        onChange={(e) => setSupervisionWorkerId(e.target.value)}
                        className="w-full text-xs bg-canvas border border-border/50 rounded-[10px] px-2.5 py-2 font-bold text-ink focus:outline-hidden focus:border-plum"
                      >
                        <option value="">{lang === 'hi' ? 'सभी कार्यकर्ता' : 'All Caseworkers'}</option>
                        {roster.map((r) => (
                          <option key={r.id} value={r.id}>{r.phoneE164} ({r.district})</option>
                        ))}
                      </select>
                    </div>

                    {/* Escalation Threshold Stepper */}
                    <div>
                      <label className="block text-[11px] font-bold text-ink-muted mb-1">
                        {lang === 'hi' ? 'एस्केलेशन सीमा (प्रयास ≥)' : 'Escalation Threshold (Attempts ≥)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEscalationThreshold((t) => Math.max(1, t - 1))}
                          className="w-8 h-8 rounded-[8px] bg-canvas border border-border/50 font-bold text-xs hover:bg-surface cursor-pointer"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-mono font-bold text-sm bg-canvas py-1 rounded-[8px] border border-border/40">
                          {escalationThreshold}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEscalationThreshold((t) => t + 1)}
                          className="w-8 h-8 rounded-[8px] bg-canvas border border-border/50 font-bold text-xs hover:bg-surface cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Queue Segment Selector Buttons */}
                    <div className="pt-2 border-t border-border/30 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSupervisionView('OVERDUE')}
                        className={`w-full text-left p-2.5 rounded-[12px] text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          supervisionView === 'OVERDUE'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                        }`}
                      >
                        <span>{lang === 'hi' ? 'अतिदेय विज़िट' : 'Overdue Visits'}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${supervisionView === 'OVERDUE' ? 'bg-white/20 text-white' : 'bg-pink/40 text-primary'}`}>
                          {supervisionView === 'OVERDUE' ? supervisionTasks.length : '!'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSupervisionView('COULD_NOT_REACH')}
                        className={`w-full text-left p-2.5 rounded-[12px] text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          supervisionView === 'COULD_NOT_REACH'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                        }`}
                      >
                        <span>{lang === 'hi' ? 'संपर्क नहीं हो सका' : 'Could Not Reach'}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${supervisionView === 'COULD_NOT_REACH' ? 'bg-white/20 text-white' : 'bg-sun/40 text-warning-ink'}`}>
                          {supervisionView === 'COULD_NOT_REACH' ? supervisionTasks.length : `≥${escalationThreshold}`}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSupervisionView('UNASSIGNED')}
                        className={`w-full text-left p-2.5 rounded-[12px] text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          supervisionView === 'UNASSIGNED'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                        }`}
                      >
                        <span>{lang === 'hi' ? 'अनावंटित कार्य' : 'Unassigned Tasks'}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${supervisionView === 'UNASSIGNED' ? 'bg-white/20 text-white' : 'bg-lavender text-plum'}`}>
                          {supervisionView === 'UNASSIGNED' ? supervisionTasks.length : '0'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSupervisionView('RESCHEDULED_OFTEN')}
                        className={`w-full text-left p-2.5 rounded-[12px] text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          supervisionView === 'RESCHEDULED_OFTEN'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-canvas text-ink border-border/40 hover:bg-surface'
                        }`}
                      >
                        <span>{lang === 'hi' ? 'बार-बार पुनर्निर्धारित' : 'Rescheduled Often'}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${supervisionView === 'RESCHEDULED_OFTEN' ? 'bg-white/20 text-white' : 'bg-canvas text-ink-muted'}`}>
                          {supervisionView === 'RESCHEDULED_OFTEN' ? supervisionTasks.length : '3+'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Main Work Queue Table */}
                  <div className="md:col-span-3 bg-surface rounded-[20px] border-2 border-border/40 shadow-comic overflow-hidden">
                    <div className="p-4 border-b border-border/30 flex items-center justify-between bg-canvas/40">
                      <div>
                        <h2 className="text-sm font-black text-ink font-comic">
                          {supervisionView === 'OVERDUE' && (lang === 'hi' ? 'अतिदेय फॉलो-अप कार्य' : 'Overdue Follow-up Tasks')}
                          {supervisionView === 'COULD_NOT_REACH' && (lang === 'hi' ? 'बार-बार संपर्क विफल मामले' : 'Escalated Failed Contact Attempts')}
                          {supervisionView === 'UNASSIGNED' && (lang === 'hi' ? 'अनावंटित कार्य' : 'Unassigned Follow-up Tasks')}
                          {supervisionView === 'RESCHEDULED_OFTEN' && (lang === 'hi' ? 'बार-बार टाले गए फॉलो-अप' : 'Frequently Rescheduled Tasks')}
                        </h2>
                        <p className="text-[11px] text-ink-muted">
                          {supervisionTasks.length} {lang === 'hi' ? 'कार्य राज्य समीक्षा के लिए तैयार हैं।' : 'tasks require supervisor action or caseworker rebalance.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={loadSupervisionTasks}
                        className="p-2 text-ink-muted hover:text-ink bg-surface rounded-lg border border-border/40 cursor-pointer"
                        title="Refresh"
                      >
                        <Icon name="RefreshCw" className={`w-3.5 h-3.5 ${supervisionLoading ? 'animate-spin text-plum' : ''}`} />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-canvas border-b-2 border-border/40 text-ink font-black uppercase text-[10.5px] tracking-wider">
                            <th className="py-3 px-4">Task Ref</th>
                            <th className="py-3 px-4">Client Ref</th>
                            <th className="py-3 px-4">District</th>
                            <th className="py-3 px-4">Assigned Worker</th>
                            <th className="py-3 px-4">Escalation Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20 text-[11px]">
                          {supervisionLoading ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-ink-muted">
                                <Icon name="RefreshCw" className="w-5 h-5 mx-auto animate-spin text-plum mb-2" />
                                <span className="font-bold">Loading supervision queue...</span>
                              </td>
                            </tr>
                          ) : supervisionTasks.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-ink-muted">
                                <div className="w-10 h-10 rounded-full bg-mint/40 border border-mint flex items-center justify-center text-success-ink mx-auto mb-2">
                                  <Icon name="CheckCircle" className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-xs">
                                  {lang === 'hi' ? 'कोई कार्य समीक्षा के लिए लंबित नहीं है!' : 'No tasks in this supervision queue!'}
                                </p>
                                <p className="text-[11px] text-ink-muted mt-0.5">
                                  All field follow-ups are within normal SLA thresholds.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            supervisionTasks.map((t) => (
                              <tr key={t.taskId} className="hover:bg-canvas/50">
                                <td className="py-3 px-4 font-mono font-bold text-plum">{t.taskRef}</td>
                                <td className="py-3 px-4 font-mono font-bold text-ink">{t.clientRef}</td>
                                <td className="py-3 px-4 font-medium">{t.district || 'Pune'}</td>
                                <td className="py-3 px-4">
                                  <span className="font-bold text-ink">
                                    {t.assignedWorkerName || 'Unassigned'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {t.attemptCount >= escalationThreshold ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink/50 text-primary border border-primary/20">
                                      {t.attemptCount} failed attempts
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sun/40 text-warning-ink border border-sun">
                                      Due {t.dueDate}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReassignModalTask(t);
                                      setReassignTargetWorkerId('');
                                      setReassignReason('');
                                    }}
                                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[8px] transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Icon name="UserCheck" className="w-3.5 h-3.5" />
                                    <span>{lang === 'hi' ? 'पुनर्आवंटित करें' : 'Reassign'}</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CASEWORKER ROSTER MANAGEMENT */}
              {activeTab === 'roster' && (
                <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-ink font-comic">
                        {lang === 'hi' ? 'अधिकृत फील्ड कार्यकर्ता रोस्टर' : 'Approved Field Caseworker Roster'}
                      </h2>
                      <p className="text-xs text-ink-muted">
                        Caseworkers whose mobile numbers are active below can submit surveys and record visits.
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
                        <span>{lang === 'hi' ? 'बल्क CSV' : 'Bulk CSV'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Roster Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-canvas border-b-2 border-border/30 text-ink font-bold uppercase text-[11px] tracking-wider">
                          <th className="py-3 px-4">Mobile (+91 E.164)</th>
                          <th className="py-3 px-4">State</th>
                          <th className="py-3 px-4">District</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Enrolled By</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 text-[11px]">
                        {roster.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-ink-muted text-xs">
                              No caseworkers enrolled on this state roster yet.
                            </td>
                          </tr>
                        ) : (
                          roster.map((entry) => (
                            <tr key={entry.id} className="hover:bg-canvas/50">
                              <td className="py-3 px-4 font-mono font-bold text-ink">{entry.phoneE164}</td>
                              <td className="py-3 px-4 font-medium">{entry.state}</td>
                              <td className="py-3 px-4 font-medium">{entry.district}</td>
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
                              <td className="py-3 px-4 text-ink-muted">{entry.addedBy}</td>
                              <td className="py-3 px-4 text-right space-x-2">
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

              {/* TAB 3: PROGRAMME RULES REGISTRY */}
              {activeTab === 'rules' && (
                <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-black text-ink font-comic">
                      {lang === 'hi' ? 'दिशानिर्देश आधारित फॉलो-अप नियम (प्रस्तावित)' : 'Programme Follow-up Rules Registry (Versioned)'}
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      All rules are suggestions only. They never schedule clinical care automatically without caseworker confirmation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {SEED_RULES_REFERENCE.map((rule) => (
                      <div key={rule.id} className="p-4 rounded-[16px] border border-border/40 bg-canvas/40 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-plum px-2.5 py-0.5 rounded-md bg-lavender/50 border border-border/40">
                              {rule.code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sun/40 text-warning-ink border border-sun">
                              {rule.status} [PROPOSED]
                            </span>
                            <span className="text-[10px] font-mono font-bold text-ink-muted">
                              v{rule.version}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-ink-muted truncate">
                            Source: {rule.sourceName} ({rule.sourceEdition})
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-ink">
                          {lang === 'hi' ? rule.titleHi : rule.titleEn}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="bg-surface p-2 rounded-lg border border-border/30">
                            <span className="text-ink-muted block text-[10px] uppercase font-bold">Cadence / Interval</span>
                            <strong className="text-ink">{rule.intervalSpec}</strong>
                          </div>
                          <div className="bg-surface p-2 rounded-lg border border-border/30">
                            <span className="text-ink-muted block text-[10px] uppercase font-bold">Suggested Purpose & Code</span>
                            <strong className="text-ink">{rule.purposeCode}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SYSTEM AUDIT & OUTBOX */}
              {activeTab === 'system' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface rounded-[20px] border-2 border-border/40 p-5 shadow-comic-sm">
                      <h3 className="text-xs font-bold uppercase text-ink-muted tracking-wider mb-2">
                        Transactional Outbox Sync
                      </h3>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-ink font-comic">
                          {systemStatus?.outboxPending ?? 0}
                        </span>
                        <span className="text-xs text-ink-muted font-bold">pending sync</span>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <span className="text-success-ink font-bold flex items-center gap-1">
                          <Icon name="check" className="w-3.5 h-3.5" /> <span>{systemStatus?.outboxPublished ?? 0} published</span>
                        </span>
                        <span className="text-primary font-bold flex items-center gap-1">
                          <Icon name="AlertCircle" className="w-3.5 h-3.5" /> <span>{systemStatus?.outboxFailed ?? 0} failed</span>
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

                  {/* Audit Trail */}
                  <div className="bg-surface rounded-[20px] border-2 border-border/40 p-5 shadow-comic">
                    <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2 font-comic">
                      <Icon name="ShieldCheck" className="w-4 h-4 text-plum" />
                      <span>Immutable Central Audit Trail (PostgreSQL append-only)</span>
                    </h2>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-mono text-[11px]">
                        <thead>
                          <tr className="bg-canvas border-b border-border/30 text-ink font-bold uppercase text-[10px]">
                            <th className="py-2 px-3">Action</th>
                            <th className="py-2 px-3">Resource</th>
                            <th className="py-2 px-3">Actor</th>
                            <th className="py-2 px-3">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {(!systemStatus?.recentAudits || systemStatus.recentAudits.length === 0) ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-ink-muted font-sans text-xs">
                                No recent audit events recorded.
                              </td>
                            </tr>
                          ) : (
                            systemStatus.recentAudits.map((a) => (
                              <tr key={a.id} className="hover:bg-canvas/50">
                                <td className="py-2 px-3 font-bold text-ink">{a.action}</td>
                                <td className="py-2 px-3 text-ink-muted">{a.resourceType}</td>
                                <td className="py-2 px-3 text-plum font-bold">{a.actorUsername}</td>
                                <td className="py-2 px-3 text-ink-muted">{a.occurredAt}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================================== */}
          {/* B. NATIONAL LEADERSHIP STRATEGIC SURVEILLANCE LAYOUT (Zero client PII)*/}
          {/* ==================================================================== */}
          {isLeadership && (
            <div className="space-y-5">
              {/* Scope Selector Bar */}
              <div className="bg-surface rounded-[16px] border border-border/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Icon name="Building" className="w-4 h-4 text-plum" />
                  <span className="text-xs font-bold text-ink">
                    {lang === 'hi' ? 'निगरानी दायरा:' : 'Surveillance Scope:'}
                  </span>
                  <select
                    value={leadershipSelectedState}
                    onChange={(e) => setLeadershipSelectedState(e.target.value)}
                    className="text-xs font-bold bg-canvas border border-border/50 rounded-[8px] px-2.5 py-1 text-ink"
                  >
                    <option value="ALL">National Aggregate (All India)</option>
                    {statesList.map((st) => (
                      <option key={st.stateCode} value={st.stateCode}>
                        {st.stateName} ({st.stateCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] font-mono text-ink-muted">
                  Guidelines: NACO CSC Operational Edition 2025 • High-Confidence Cohort Metrics
                </div>
              </div>

              {/* Leadership Tabs */}
              <div className="flex border-b-2 border-border/40 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('leadership_overview')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'leadership_overview'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="Activity" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'रणनीतिक स्वास्थ्य संकेतक' : 'Key Programme Indicators'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('leadership_districts')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'leadership_districts'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="MapPin" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'जिला प्रदर्शन एवं कवरेज' : 'District Performance Rankings'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className={`pb-3 text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
                    activeTab === 'rules'
                      ? 'text-plum border-b-3 border-plum'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon name="FileText" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'लागू नियम' : 'Programme Rules in Force'}</span>
                </button>
              </div>

              {/* LEADERSHIP TAB 1: CALM STRATEGIC INDICATORS WITH EXPLICIT DENOMINATORS */}
              {activeTab === 'leadership_overview' && (
                <div className="space-y-4">
                  {/* Sample Demonstration Data Banner */}
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-[16px] p-4 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-200 border border-amber-400 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
                        <Icon name="AlertCircle" className="w-4 h-4 text-amber-800" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                            {lang === 'hi' ? 'नमूना प्रदर्शन डेटा • नाको अनुमोदन लंबित' : 'Sample Demonstration Data • Pending NACO Approval'}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                            Demo environment
                          </span>
                        </div>
                        <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                          {lang === 'hi'
                            ? 'यह रणनीतिक डैशबोर्ड अभी प्रारूप (DRAFT) स्थिति में है। वास्तविक नैदानिक निर्णय लेने से पहले संकेतकों की परिभाषाओं को नाको (NACO) द्वारा अनुमोदित किया जाना आवश्यक है। नीचे दिए गए आंकड़े प्रदर्शन नमूना डेटा हैं।'
                            : 'Strategic indicators displayed below reflect draft programmatic definitions pending formal NACO/SACS approval. Clinical and operational decisions must not be taken from these demonstration values until verified.'}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 whitespace-nowrap">
                      Status: DRAFT v1.0
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Indicator 1: Active Cohort */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Active Enrolled Cohort</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">
                            {stats?.totalSurveys ? stats.totalSurveys : '540'}
                          </span>
                          <span className="text-xs font-bold text-success-ink">
                            {stats?.totalSurveys ? 'Live Enrolled' : 'Active Individuals [Sample]'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Total active registered beneficiaries receiving CSC outreach services in scope.</div>
                        <div><strong>Numerator:</strong> {stats?.totalSurveys ? stats.totalSurveys : '540'} active clients in registry</div>
                        <div><strong>Denominator:</strong> {stats?.totalSurveys ? stats.totalSurveys : '540'} total registrations in scope</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Live DB Cache / Demo)</div>
                      </div>
                    </div>

                    {/* Indicator 2: 6-Month Retention Rate */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>6-Month Routine Retention</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">88.5%</span>
                          <span className="text-xs font-bold text-success-ink font-mono">478 / 540 [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Attended scheduled ART refills and care visits within ±7 days of due date over 6 months.</div>
                        <div><strong>Numerator:</strong> 478 attended on schedule</div>
                        <div><strong>Denominator:</strong> 540 total cohort due for 6-month check</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Demo Environment)</div>
                      </div>
                    </div>

                    {/* Indicator 3: Viral Load Suppression */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Viral Load Suppression</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-black text-ink font-comic">94.2%</span>
                          <span className="text-xs font-bold text-amber-800 font-mono">438 / 465 [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Documented undetectable or suppressed viral load (&lt;1000 copies/mL) among tested cohort.</div>
                        <div><strong>Numerator:</strong> 438 suppressed (&lt;1000 copies/mL)</div>
                        <div><strong>Denominator:</strong> 465 tested in 12-month cohort</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Demo Environment)</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Indicator 4: Routine Follow-up Completion */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Outreach Visit Completion</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink font-comic">91.6%</span>
                          <span className="text-xs font-bold text-ink-muted font-mono">1,210 of 1,321 visits completed [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Field outreach contacts completed vs total visits scheduled under Section J.2 protocol.</div>
                        <div><strong>Numerator:</strong> 1,210 completed contacts</div>
                        <div><strong>Denominator:</strong> 1,321 scheduled visits in period</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Demo Environment)</div>
                      </div>
                    </div>

                    {/* Indicator 5: LFU Tracing Recovery Rate */}
                    <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-muted font-bold">
                          <span>Lost-to-Follow-Up Recovery</span>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            DRAFT DEFINITION
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink font-comic">74.4%</span>
                          <span className="text-xs font-bold text-warning-ink font-mono">32 of 43 recovered [Sample]</span>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-[10.5px] text-ink-muted space-y-1">
                        <div><strong>Definition:</strong> Beneficiaries classified as LFU who were tracked by caseworkers and confirmed re-linked to ART Care within 90 days.</div>
                        <div><strong>Numerator:</strong> 32 confirmed re-linked to ART</div>
                        <div><strong>Denominator:</strong> 43 active LFU cases tracked</div>
                        <div className="text-[9.5px] text-ink-muted font-mono">Last calculated: Today at 10:00 IST (Demo Environment)</div>
                      </div>
                    </div>
                  </div>

                  {/* High-level service linkages */}
                  <div className="bg-surface rounded-[16px] border-2 border-border/40 p-4 shadow-comic space-y-2">
                    <h3 className="text-xs font-black uppercase text-ink">
                      Entitlement & Social Welfare Linkages Summary
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-canvas border border-border/30">
                        <span className="text-[11px] text-ink-muted block font-semibold">Social Welfare Linkages</span>
                        <strong className="text-base font-black text-ink">412 Households (86%)</strong>
                        <span className="text-[10px] text-ink-muted block mt-0.5">Enrolled in Antyodaya Anna, RSBY, or Pension</span>
                      </div>
                      <div className="p-3 rounded-xl bg-canvas border border-border/30">
                        <span className="text-[11px] text-ink-muted block font-semibold">Legal & DALSA Aid</span>
                        <strong className="text-base font-black text-ink">48 Linkages (100%)</strong>
                        <span className="text-[10px] text-ink-muted block mt-0.5">District Legal Services Authority representation</span>
                      </div>
                      <div className="p-3 rounded-xl bg-canvas border border-border/30">
                        <span className="text-[11px] text-ink-muted block font-semibold">Emergency Nutrition Kits</span>
                        <strong className="text-base font-black text-ink">389 Distributed</strong>
                        <span className="text-[10px] text-ink-muted block mt-0.5">Supplements & dry rations to high-vulnerability families</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LEADERSHIP TAB 2: DISTRICT PERFORMANCE RANKING TABLE */}
              {activeTab === 'leadership_districts' && (
                <div className="bg-surface rounded-[20px] border-2 border-border/40 shadow-comic overflow-hidden">
                  <div className="p-4 border-b border-border/30 bg-canvas/40">
                    <h2 className="text-sm font-black text-ink font-comic">
                      Aggregated District Performance & Retention Rankings
                    </h2>
                    <p className="text-[11px] text-ink-muted">
                      Evaluated across active CSC centers. Zero personal client information exposed.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-2">
                    <Icon name="AlertCircle" className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>[SYNTHETIC BENCHMARK: Demonstration district indicators from synthetic test registry. Zero personal client data is exposed.]</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-canvas border-b-2 border-border/40 text-ink font-black uppercase text-[10.5px] tracking-wider">
                          <th className="py-3 px-4">District</th>
                          <th className="py-3 px-4">Active Cohort</th>
                          <th className="py-3 px-4">Routine Follow-up Rate</th>
                          <th className="py-3 px-4">6-Mo Retention</th>
                          <th className="py-3 px-4">Open Escalations</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Drill-Down</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 text-[11px]">
                        {[
                          { dist: 'Pune', cohort: 180, followUpRate: '94.5%', retentionRate: '91.2%', escalations: 2, status: 'ON_TRACK' },
                          { dist: 'Mumbai Suburban', cohort: 140, followUpRate: '90.2%', retentionRate: '87.4%', escalations: 4, status: 'ON_TRACK' },
                          { dist: 'Thane', cohort: 95, followUpRate: '86.8%', retentionRate: '84.0%', escalations: 5, status: 'NEEDS_SUPPORT' },
                          { dist: 'Solapur', cohort: 75, followUpRate: '92.1%', retentionRate: '89.5%', escalations: 1, status: 'ON_TRACK' },
                          { dist: 'Nashik', cohort: 50, followUpRate: '88.0%', retentionRate: '86.2%', escalations: 3, status: 'ON_TRACK' },
                        ].map((row) => (
                          <React.Fragment key={row.dist}>
                            <tr className="hover:bg-canvas/50">
                              <td className="py-3 px-4 font-bold text-ink">{row.dist}</td>
                              <td className="py-3 px-4 font-mono font-bold text-ink">{row.cohort} beneficiaries</td>
                              <td className="py-3 px-4 font-mono text-success-ink font-bold">{row.followUpRate}</td>
                              <td className="py-3 px-4 font-mono font-bold">{row.retentionRate}</td>
                              <td className="py-3 px-4 font-mono">
                                {row.escalations > 0 ? (
                                  <span className="text-primary font-bold">{row.escalations} open</span>
                                ) : (
                                  <span className="text-ink-muted">0</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status === 'ON_TRACK'
                                    ? 'bg-mint text-success-ink border border-mint'
                                    : 'bg-pink/40 text-primary border border-primary/20'
                                }`}>
                                  {row.status === 'ON_TRACK' ? 'On Track' : 'Needs Support'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDistrict(expandedDistrict === row.dist ? null : row.dist)}
                                  className="text-xs font-bold text-plum hover:underline cursor-pointer"
                                >
                                  {expandedDistrict === row.dist ? 'Hide Details' : 'View Linkages'}
                                </button>
                              </td>
                            </tr>
                            {expandedDistrict === row.dist && (
                              <tr className="bg-canvas/60">
                                <td colSpan={7} className="p-4 text-xs space-y-2">
                                  <div className="font-bold text-ink font-comic">
                                    {row.dist} District Service Linkage Breakdown:
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="p-2.5 rounded-lg bg-surface border border-border/30">
                                      <span className="text-[10px] text-ink-muted uppercase font-bold block">Nutrition Support</span>
                                      <strong>92% coverage</strong> (Dry ration linkage active)
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-surface border border-border/30">
                                      <span className="text-[10px] text-ink-muted uppercase font-bold block">Social Welfare Schemes</span>
                                      <strong>88% linked</strong> (Antyodaya Anna & Pension)
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-surface border border-border/30">
                                      <span className="text-[10px] text-ink-muted uppercase font-bold block">Legal Aid Linkage</span>
                                      <strong>100% resolved</strong> (Zero pending DALSA grievances)
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================================== */}
          {/* REASSIGN TASK MODAL                                                  */}
          {/* ==================================================================== */}
          {reassignModalTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-150" role="dialog" aria-modal="true">
              <div className="bg-surface rounded-[20px] max-w-lg w-full p-6 shadow-comic border-2 border-border/40 space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div>
                    <h3 className="text-base font-black text-ink font-comic">
                      {lang === 'hi' ? 'फॉलो-अप कार्य पुनर्आवंटन' : 'Reassign Follow-up Task'}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Client: <strong className="font-mono text-plum">{reassignModalTask.clientRef}</strong> • District: <strong>{reassignModalTask.district || 'Pune'}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReassignModalTask(null)}
                    className="p-1 text-ink-muted hover:text-ink rounded-full cursor-pointer"
                  >
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleConfirmReassign} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      {lang === 'hi' ? 'नया फील्ड कार्यकर्ता चुनें *' : 'Select Target Field Worker *'}
                    </label>
                    <select
                      required
                      value={reassignTargetWorkerId}
                      onChange={(e) => setReassignTargetWorkerId(e.target.value)}
                      className="w-full text-xs bg-canvas border-2 border-border/50 rounded-[10px] px-3 py-2.5 font-bold text-ink focus:outline-hidden focus:border-plum min-h-[44px]"
                    >
                      <option value="">{lang === 'hi' ? '-- कार्यकर्ता चुनें --' : '-- Choose Worker from Active Roster --'}</option>
                      {roster
                        .filter((r) => r.status === 'ACTIVE')
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.phoneE164} — {r.district}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      {lang === 'hi' ? 'पुनर्आवंटन का कारण (अनिवार्य ऑडिट रिकॉर्ड) *' : 'Reason for Reassignment (Mandatory Audit Trail) *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder={lang === 'hi' ? 'उदा. कार्यकर्ता अवकाश पर है, केसलोड संतुलन, या क्षेत्र पुनर्संरेखण...' : 'e.g. Assigned worker on medical leave, caseload rebalance, or geographic district realignment...'}
                      className="w-full text-xs bg-canvas border-2 border-border/50 rounded-[10px] p-3 text-ink focus:outline-hidden focus:border-plum"
                    />
                    <p className="text-[10.5px] text-ink-muted mt-1">
                      Logged permanently in the append-only audit trail with officer username and timestamp.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                    <button
                      type="button"
                      onClick={() => setReassignModalTask(null)}
                      className="px-4 py-2 text-xs font-bold text-ink-muted hover:text-ink bg-canvas border border-border/40 rounded-[10px] min-h-[44px] cursor-pointer"
                    >
                      {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={reassignSubmitting || !reassignTargetWorkerId || !reassignReason.trim()}
                      className="px-5 py-2 text-xs font-black text-white bg-primary hover:bg-primary-hover rounded-[10px] shadow-comic-sm disabled:opacity-50 min-h-[44px] cursor-pointer flex items-center gap-1.5"
                    >
                      {reassignSubmitting && <Icon name="RefreshCw" className="w-3.5 h-3.5 animate-spin" />}
                      <span>{reassignSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ADD CASEWORKER MODAL                                                 */}
          {/* ==================================================================== */}
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
                      District Scope *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      placeholder="e.g. Pune Central or Solapur"
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

          {/* ==================================================================== */}
          {/* BULK CSV MODAL                                                       */}
          {/* ==================================================================== */}
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
                    Paste rows formatted as: <code className="font-mono bg-canvas px-1 rounded">Phone, District</code> (one per line).
                  </p>

                  <div>
                    <textarea
                      rows={5}
                      required
                      value={bulkCsv}
                      onChange={(e) => setBulkCsv(e.target.value)}
                      placeholder={"+919876543210, Pune\n+919876543211, Nagpur\n+919876543212, Mumbai"}
                      className="w-full text-xs font-mono p-3 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Default District (if omitted)
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
                      Enrolled {bulkResult.addedCount} caseworkers.
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
    </ClientOnly>
  );
}
