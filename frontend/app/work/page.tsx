"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ContactAttemptModal } from '@/components/ContactAttemptModal';
import { EncounterModal } from '@/components/EncounterModal';
import { ServicePlanModal } from '@/components/ServicePlanModal';
import { Language, translations } from '@/lib/translations';
import { getStoredSession } from '@/lib/auth';

interface TaskItem {
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
  status: 'PENDING' | 'DUE' | 'OVERDUE' | 'DELIVERED';
  version: number;
}

export default function WorklistPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Modal states
  const [activeModal, setActiveModal] = useState<'attempt' | 'encounter' | 'plan' | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<{
    today: TaskItem[];
    overdue: TaskItem[];
    upcoming: TaskItem[];
  }>({
    today: [],
    overdue: [],
    upcoming: [],
  });

  const fetchWorklist = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;
      if (!token) {
        router.push('/sign-in');
        return;
      }

      const res = await fetch('/api/v1/work', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        router.push('/sign-in');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setTasks({
          today: (data.today || []).map((t: any) => ({
            id: t.id,
            taskRef: t.taskRef,
            clientId: t.clientId,
            clientRef: t.clientRef,
            clientName: t.clientName,
            centerId: t.centerId,
            taskType: t.taskType,
            title: t.title,
            description: t.description || '',
            dueDate: t.dueDate,
            status: t.status,
            version: t.version || 0,
          })),
          overdue: (data.overdue || []).map((t: any) => ({
            id: t.id,
            taskRef: t.taskRef,
            clientId: t.clientId,
            clientRef: t.clientRef,
            clientName: t.clientName,
            centerId: t.centerId,
            taskType: t.taskType,
            title: t.title,
            description: t.description || '',
            dueDate: t.dueDate,
            status: t.status,
            version: t.version || 0,
          })),
          upcoming: (data.upcoming || []).map((t: any) => ({
            id: t.id,
            taskRef: t.taskRef,
            clientId: t.clientId,
            clientRef: t.clientRef,
            clientName: t.clientName,
            centerId: t.centerId,
            taskType: t.taskType,
            title: t.title,
            description: t.description || '',
            dueDate: t.dueDate,
            status: t.status,
            version: t.version || 0,
          })),
        });
      }
    } catch (err) {
      console.error('Failed to load worklist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchWorklist();
  }, [fetchWorklist]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentList = tasks[activeTab].filter(
    (item) =>
      item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.clientRef.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactAttemptSubmit = async (data: any) => {
    if (!selectedTask) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;
      const res = await fetch('/api/v1/tasks/attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          attemptDate: data.attemptDate || new Date().toISOString().split('T')[0],
          attemptTime: '10:00:00',
          channel: data.channel || 'PHONE',
          outcome: data.outcome || 'reached',
          notes: data.notes || '',
          expectedTaskVersion: selectedTask.version,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          setConflictError('Task was modified concurrently. Refreshing worklist.');
          await fetchWorklist();
          return;
        }
        throw new Error(await res.text());
      }

      showToast(`${t.recordContactAttempt}: ${data.outcome?.toUpperCase()}. ${t.serverAccepted}`);
      setActiveModal(null);
      await fetchWorklist();
    } catch (e: any) {
      alert(`Contact attempt failed: ${e.message}`);
    }
  };

  const handleEncounterSubmit = async (data: any) => {
    if (!selectedTask) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;
      const res = await fetch('/api/v1/tasks/encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientId: selectedTask.clientId,
          taskId: selectedTask.id,
          observationDate: data.observationDate || new Date().toISOString().split('T')[0],
          encounterType: data.encounterType || 'CSC_VISIT',
          artAdherenceAssessment: data.artAdherence || 'GOOD (>95%)',
          nutritionAssessment: data.nutrition || 'NORMAL',
          mentalHealthNotes: data.mentalHealthNotes || null,
          generalNotes: data.generalNotes || 'Follow-up encounter conducted.',
          expectedTaskVersion: selectedTask.version,
          action: 'COMPLETE', // Explicit COMPLETE action
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          setConflictError('Version conflict on task. Please refresh.');
          await fetchWorklist();
          return;
        }
        throw new Error(await res.text());
      }

      showToast(`${t.recordEncounter}: Task COMPLETED. ${t.serverAccepted}`);
      setActiveModal(null);
      await fetchWorklist();
    } catch (e: any) {
      alert(`Encounter submission failed: ${e.message}`);
    }
  };

  const handlePlanSubmit = async (data: any) => {
    if (!selectedTask) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;
      const res = await fetch('/api/v1/tasks/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientId: selectedTask.clientId,
          taskId: selectedTask.id,
          serviceCode: data.serviceCode || '1',
          purposeCode: data.purposeCode || '1',
          serviceName: data.serviceName || 'Follow-up Consultation',
          targetDueDate: data.targetDueDate || new Date().toISOString().split('T')[0],
          notes: data.notes || '',
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      showToast(`${t.planService}: ${data.serviceName} registered as PLANNED.`);
      setActiveModal(null);
      await fetchWorklist();
    } catch (e: any) {
      alert(`Plan creation failed: ${e.message}`);
    }
  };

  return (
    <AppShell
      currentLang={lang}
      onLanguageChange={setLang}
      offlineCount={offlineQueueCount}
      isOffline={isOffline}
    >
      <div className="space-y-6">
        {/* Conflict Error Banner */}
        {conflictError && (
          <div
            className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-xl text-xs flex items-center justify-between shadow-xs"
            role="alert"
          >
            <div>
              <strong className="font-bold">HTTP 409 Conflict: </strong> {conflictError}
            </div>
            <button
              onClick={() => setConflictError(null)}
              className="text-xs font-bold text-rose-700 underline hover:text-rose-950"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Worklist Masthead */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.myWork}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Primary Workflow:{' '}
              <span className="font-semibold text-emerald-900 italic">
                &ldquo;Who needs action today, why, who owns it, and what completes it?&rdquo;
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/clients/new"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>+</span> {lang === 'hi' ? 'नया पंजीकरण (सीआरएफ)' : 'New Registration (CRF)'}
            </Link>
            <Link
              href="/clients"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              {lang === 'hi' ? 'सभी लाभार्थी देखें →' : 'All Beneficiaries →'}
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b border-slate-200 bg-white rounded-xl px-2 shadow-xs"
          role="tablist"
          aria-label="Worklist Categories"
        >
          {[
            {
              id: 'today',
              label: t.today,
              count: tasks.today.length,
              badge: 'bg-emerald-100 text-emerald-800',
            },
            {
              id: 'overdue',
              label: t.overdue,
              count: tasks.overdue.length,
              badge: 'bg-rose-100 text-rose-800',
            },
            {
              id: 'upcoming',
              label: t.upcoming,
              count: tasks.upcoming.length,
              badge: 'bg-slate-100 text-slate-800',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3.5 px-5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${tab.badge}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden bg-white shadow-xs"
              aria-label={t.searchPlaceholder}
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Showing:</span>
            <strong className="text-slate-800">{currentList.length} tasks</strong>
          </div>
        </div>

        {/* Task List Panel */}
        <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Loading follow-up worklist from server...
            </div>
          ) : currentList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <p className="text-slate-500 text-xs font-medium">{t.noTasks}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {currentList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Deep-link to Follow-up Tab */}
                      <Link
                        href={`/clients/${item.clientId}?tab=follow-up`}
                        className="text-sm font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                        title="Open Client Follow-up Tab"
                      >
                        {item.clientName}
                      </Link>
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {item.clientRef}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        • {item.centerId}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          item.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.status === 'DUE'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                    <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-0.5">
                      <span>
                        {t.dueDate}: <strong className="text-slate-700">{item.dueDate}</strong>
                      </span>
                      <span>
                        Ref: <strong className="text-slate-700">{item.taskRef}</strong>
                      </span>
                      <span>v{item.version}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(item);
                        setActiveModal('attempt');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg min-h-[38px]"
                    >
                      {t.recordContactAttempt}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(item);
                        setActiveModal('encounter');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs min-h-[38px]"
                    >
                      {t.recordEncounter}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(item);
                        setActiveModal('plan');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg min-h-[38px]"
                    >
                      {t.planService}
                    </button>

                    {/* Follow-up Tab Direct Deep-link */}
                    <Link
                      href={`/clients/${item.clientId}?tab=follow-up`}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center min-h-[38px]"
                    >
                      {lang === 'hi' ? 'फॉलो-अप खोलें →' : 'Open Follow-up →'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-2xl border border-slate-700 flex items-center gap-2"
            role="status"
          >
            <span className="text-emerald-400">✓</span> {toastMessage}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTask && (
        <>
          <ContactAttemptModal
            isOpen={activeModal === 'attempt'}
            onClose={() => setActiveModal(null)}
            onSubmit={handleContactAttemptSubmit}
            lang={lang}
            clientName={selectedTask.clientName}
            clientRef={selectedTask.clientRef}
          />
          <EncounterModal
            isOpen={activeModal === 'encounter'}
            onClose={() => setActiveModal(null)}
            onSubmit={handleEncounterSubmit}
            lang={lang}
            clientName={selectedTask.clientName}
            clientRef={selectedTask.clientRef}
          />
          <ServicePlanModal
            isOpen={activeModal === 'plan'}
            onClose={() => setActiveModal(null)}
            onSubmit={handlePlanSubmit}
            lang={lang}
            clientName={selectedTask.clientName}
            clientRef={selectedTask.clientRef}
          />
        </>
      )}
    </AppShell>
  );
}
