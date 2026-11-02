"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ContactAttemptModal } from '@/components/ContactAttemptModal';
import { EncounterModal } from '@/components/EncounterModal';
import { ServicePlanModal } from '@/components/ServicePlanModal';
import { Language, translations } from '@/lib/translations';

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

  // Synthetic Worklist Data for CSC-VS1
  const [tasks, setTasks] = useState<{
    today: TaskItem[];
    overdue: TaskItem[];
    upcoming: TaskItem[];
  }>({
    today: [
      {
        id: "task-001",
        taskRef: "TSK-DL-1001",
        clientId: "client-001",
        clientRef: "CSC-DL-0001",
        clientName: "Sunita Verma (Synthetic)",
        centerId: "CENTER_DELHI_01",
        taskType: "FOLLOW_UP_VISIT",
        title: "Monthly ART Adherence Follow-up",
        description: "Verify 30-day ART pill count and nutritional status",
        dueDate: new Date().toISOString().split('T')[0],
        status: "DUE",
        version: 0
      },
      {
        id: "task-002",
        taskRef: "TSK-DL-1002",
        clientId: "client-002",
        clientRef: "CSC-DL-0002",
        clientName: "Rajesh Kumar (Synthetic)",
        centerId: "CENTER_DELHI_01",
        taskType: "VIRAL_LOAD_DUE",
        title: "Routine Annual Viral Load Test",
        description: "Annual VL testing due at ART Center LNJP",
        dueDate: new Date().toISOString().split('T')[0],
        status: "DUE",
        version: 0
      }
    ],
    overdue: [
      {
        id: "task-003",
        taskRef: "TSK-DL-1003",
        clientId: "client-003",
        clientRef: "CSC-DL-0003",
        clientName: "Pooja Devi (Synthetic)",
        centerId: "CENTER_DELHI_01",
        taskType: "ART_REFILL_DUE",
        title: "Overdue ART Refill Contact",
        description: "Client missed ART pickup date 3 days ago. Phone contact required.",
        dueDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        status: "OVERDUE",
        version: 1
      }
    ],
    upcoming: [
      {
        id: "task-004",
        taskRef: "TSK-DL-1004",
        clientId: "client-004",
        clientRef: "CSC-DL-0004",
        clientName: "Amit Singh (Synthetic)",
        centerId: "CENTER_DELHI_01",
        taskType: "SOCIAL_PROTECTION",
        title: "Antyodaya Ration Scheme Facilitation",
        description: "Accompany client to food supply office for ration card renewal",
        dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        status: "PENDING",
        version: 0
      }
    ]
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentList = tasks[activeTab].filter(
    item =>
      item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.clientRef.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactAttemptSubmit = (data: any) => {
    if (!selectedTask) return;
    // Non-negotiable rule: Contact attempt keeps task open!
    // Task status remains DUE/OVERDUE/PENDING
    showToast(`${t.recordContactAttempt}: ${data.outcome.toUpperCase()}. ${t.serverAccepted}`);
    setActiveModal(null);
  };

  const handleEncounterSubmit = (data: any) => {
    if (!selectedTask) return;
    // Completing task completes that task only!
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(t =>
        t.id === selectedTask.id ? { ...t, status: 'DELIVERED', version: t.version + 1 } : t
      )
    }));
    showToast(`${t.recordEncounter}: ${t.serverAccepted}`);
    setActiveModal(null);
  };

  const handlePlanSubmit = (data: any) => {
    showToast(`${t.planService}: ${data.serviceName} registered as PLANNED.`);
    setActiveModal(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <Navbar
        currentLang={lang}
        onLanguageChange={setLang}
        centerId="CENTER_DELHI_01"
        offlineCount={offlineQueueCount}
      />

      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2 text-center" role="alert">
          {t.offlineNotice}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl border border-slate-700 animate-fade-in" role="status">
          ✓ {toastMessage}
        </div>
      )}

      {/* Conflict Error Banner */}
      {conflictError && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg text-xs" role="alert">
            <strong className="font-bold">HTTP 409 Conflict: </strong> {conflictError}
            <button onClick={() => setConflictError(null)} className="ml-3 underline font-bold">Dismiss</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header Title & Worklist Question */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.myWork}</h2>
          <p className="text-sm text-slate-600 mt-1">
            Core Question: <span className="font-semibold text-blue-900 italic">&ldquo;Who needs action today, why, who owns it, and what completes it?&rdquo;</span>
          </p>
        </div>

        {/* Tab Navigation with Accessibility ARIA Attributes */}
        <div className="flex border-b border-slate-200 mb-6" role="tablist" aria-label="Worklist Categories">
          {[
            { id: 'today', label: t.today, count: tasks.today.length, badge: 'bg-blue-100 text-blue-800' },
            { id: 'overdue', label: t.overdue, count: tasks.overdue.length, badge: 'bg-rose-100 text-rose-800' },
            { id: 'upcoming', label: t.upcoming, count: tasks.upcoming.length, badge: 'bg-slate-100 text-slate-800' }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-700 text-blue-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab.badge}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
          <div className="w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white shadow-sm"
              aria-label={t.searchPlaceholder}
            />
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsOffline(!isOffline)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                isOffline ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Simulate: {isOffline ? 'Offline Mode' : 'Online Mode'}
            </button>
          </div>
        </div>

        {/* Task List Panel */}
        <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {currentList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <p className="text-slate-500 text-sm font-medium">{t.noTasks}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {currentList.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/clients/${item.clientId}`}
                        className="text-base font-bold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {item.clientName}
                      </Link>
                      <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.clientRef}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          item.status === 'OVERDUE'
                            ? 'badge-overdue'
                            : item.status === 'DELIVERED'
                            ? 'badge-delivered'
                            : item.status === 'DUE'
                            ? 'badge-due'
                            : 'badge-pending'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                      <span>{t.dueDate}: <strong className="text-slate-700">{item.dueDate}</strong></span>
                      <span>Task Ref: <strong className="text-slate-700">{item.taskRef}</strong></span>
                      <span>v{item.version}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(item);
                        setActiveModal('attempt');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm"
                    >
                      {t.recordContactAttempt}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(item);
                        setActiveModal('encounter');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
                    >
                      {t.recordEncounter}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTask(item);
                        setActiveModal('plan');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
                    >
                      {t.planService}
                    </button>

                    <Link
                      href={`/clients/${item.clientId}`}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                    >
                      View Case →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}
