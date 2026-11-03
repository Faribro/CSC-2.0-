"use client";

import React, { useState } from 'react';
import { Language, translations } from '@/lib/translations';
import { CHOICE_LISTS } from '@/lib/crfDefinitions';
import { Icon } from '@/components/ui/Icon';

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

export interface ContactAttemptDto {
  id: string;
  taskId: string;
  attemptDate: string;
  channel: string;
  outcome: string;
  notes: string;
}

export interface EncounterDto {
  id: string;
  observationDate: string;
  recordedAt: string;
  encounterType: string;
  artAdherenceAssessment: string;
  nutritionAssessment: string;
  generalNotes: string;
}

export interface PlannedServiceDto {
  id: string;
  serviceCode: string;
  serviceName: string;
  targetDueDate: string;
  status: string;
  notes: string;
  version: number;
}

export interface DeliveredServiceDto {
  id: string;
  plannedServiceId: string;
  deliveryDate: string;
  recordedAt: string;
  serviceCode: string;
  facilityName: string;
  notes: string;
}

interface FollowUpTabProps {
  client: {
    id: string;
    clientRef: string;
    fullName: string;
    centerId: string;
    age: number;
    gender: string;
    primaryPhone?: string;
    hivStatus?: string;
    artNumber?: string;
    version: number;
  };
  tasks: TaskSummary[];
  contactAttempts: ContactAttemptDto[];
  encounters: EncounterDto[];
  plannedServices: PlannedServiceDto[];
  deliveredServices: DeliveredServiceDto[];
  lang: Language;
  token?: string | null;
  onActionCompleted: () => void;
  showToast: (msg: string) => void;
}

export const FollowUpTab: React.FC<FollowUpTabProps> = ({
  client,
  tasks,
  contactAttempts,
  encounters,
  plannedServices,
  deliveredServices,
  lang,
  token,
  onActionCompleted,
  showToast,
}) => {
  const t = translations[lang];

  // Active Modals: 'attempt' | 'encounter' | 'plan' | 'delivered' | 'reschedule' | 'correct' | null
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<{ type: string; id: string; title: string } | null>(null);

  // Filter States
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'DUE' | 'OVERDUE' | 'COMPLETED'>('ALL');
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'ENCOUNTER' | 'ATTEMPT' | 'SERVICE'>('ALL');

  // Form State: Attempt
  const [attemptDate, setAttemptDate] = useState(new Date().toISOString().split('T')[0]);
  const [attemptChannel, setAttemptChannel] = useState('PHONE');
  const [attemptOutcome, setAttemptOutcome] = useState('reached');
  const [attemptNotes, setAttemptNotes] = useState('');

  // Form State: Encounter (Section I)
  const [encDate, setEncDate] = useState(new Date().toISOString().split('T')[0]);
  const [encPlace, setEncPlace] = useState('2'); // Home Visit default
  const [encArtStatus, setEncArtStatus] = useState('2'); // On ART
  const [encRegimen, setEncRegimen] = useState('1'); // First line
  const [encCd4, setEncCd4] = useState('');
  const [encCd4Pct, setEncCd4Pct] = useState('');
  const [encViralLoad, setEncViralLoad] = useState('');
  const [encWeight, setEncWeight] = useState('');
  const [encHeight, setEncHeight] = useState('');
  const [encMuac, setEncMuac] = useState('');
  const [encSwsAny, setEncSwsAny] = useState('2'); // No
  const [encSws, setEncSws] = useState<string[]>([]);
  const [encStigma, setEncStigma] = useState('2'); // No
  const [encAtt, setEncAtt] = useState('2'); // No
  const [encNotes, setEncNotes] = useState('');
  const [encAction, setEncAction] = useState<'COMPLETE' | 'LEAVE_OPEN'>('COMPLETE');

  // Form State: Plan Next Action (J5)
  const [planPurpose, setPlanPurpose] = useState('1'); // Counselling
  const [planCategory, setPlanCategory] = useState('cc');
  const [planServiceCode, setPlanServiceCode] = useState('cc1');
  const [planDueDate, setPlanDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [planNotes, setPlanNotes] = useState('');

  // Form State: Delivered Service
  const [delivPlannedId, setDelivPlannedId] = useState('');
  const [delivDate, setDelivDate] = useState(new Date().toISOString().split('T')[0]);
  const [delivServiceCode, setDelivServiceCode] = useState('');
  const [delivFacility, setDelivFacility] = useState('LNJP ART Centre');
  const [delivNotes, setDelivNotes] = useState('');

  // Form State: Reschedule Task
  const [reschedDate, setReschedDate] = useState('');
  const [reschedReason, setReschedReason] = useState('');

  // Form State: Correct Record
  const [correctField, setCorrectField] = useState('notes');
  const [correctNewValue, setCorrectNewValue] = useState('');
  const [correctReason, setCorrectReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Helper for choice labels
  const getChoiceLabel = (listName: string, code: string) => {
    const list = CHOICE_LISTS[listName];
    if (!list) return code;
    const item = list.find((opt) => opt.code === code);
    if (!item) return code;
    return lang === 'hi' ? item.labelHi : item.labelEn;
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === 'ALL') return true;
    if (taskFilter === 'COMPLETED') return task.status === 'COMPLETED';
    if (taskFilter === 'OVERDUE') return task.status === 'OVERDUE';
    if (taskFilter === 'DUE') return task.status === 'DUE' || task.status === 'PENDING';
    return true;
  });

  // Build Chronological Timeline items
  const timelineItems: Array<{
    id: string;
    date: string;
    timestamp: string;
    type: 'ENCOUNTER' | 'ATTEMPT' | 'PLANNED_SERVICE' | 'DELIVERED_SERVICE';
    title: string;
    badge: string;
    badgeClass: string;
    notes: string;
    details: Record<string, string>;
  }> = [];

  encounters.forEach((e) => {
    timelineItems.push({
      id: e.id,
      date: e.observationDate,
      timestamp: e.recordedAt,
      type: 'ENCOUNTER',
      title: `${t.recordEncounter}: ${e.encounterType || 'Clinical Follow-Up'}`,
      badge: 'ENCOUNTER',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      notes: e.generalNotes || 'No specific notes recorded.',
      details: {
        'Observation Date': e.observationDate,
        'ART Adherence': e.artAdherenceAssessment || 'Not recorded',
        'Nutrition Status': e.nutritionAssessment || 'Adequate',
      },
    });
  });

  contactAttempts.forEach((a) => {
    timelineItems.push({
      id: a.id,
      date: a.attemptDate,
      timestamp: a.attemptDate,
      type: 'ATTEMPT',
      title: `${t.recordContactAttempt} (${a.channel})`,
      badge: a.outcome.toUpperCase(),
      badgeClass:
        a.outcome === 'reached'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : a.outcome === 'refused'
          ? 'bg-rose-100 text-rose-800 border-rose-200'
          : 'bg-amber-100 text-amber-800 border-amber-200',
      notes: a.notes || 'Contact attempt logged.',
      details: {
        Channel: a.channel,
        Outcome: a.outcome === 'reached' ? t.reached : a.outcome === 'refused' ? t.refused : t.not_reached,
      },
    });
  });

  plannedServices.forEach((p) => {
    timelineItems.push({
      id: p.id,
      date: p.targetDueDate,
      timestamp: p.targetDueDate,
      type: 'PLANNED_SERVICE',
      title: `${t.planService}: ${p.serviceName || p.serviceCode}`,
      badge: p.status,
      badgeClass:
        p.status === 'DELIVERED'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : 'bg-indigo-100 text-indigo-800 border-indigo-200',
      notes: p.notes || `Target Due: ${p.targetDueDate}`,
      details: {
        'Service Code': p.serviceCode,
        'Target Date': p.targetDueDate,
        Status: p.status,
      },
    });
  });

  deliveredServices.forEach((d) => {
    timelineItems.push({
      id: d.id,
      date: d.deliveryDate,
      timestamp: d.recordedAt,
      type: 'DELIVERED_SERVICE',
      title: `${t.recordDeliveredService}: ${d.serviceCode}`,
      badge: 'DELIVERED',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      notes: d.notes || `Delivered at ${d.facilityName}`,
      details: {
        Facility: d.facilityName,
        'Delivery Date': d.deliveryDate,
      },
    });
  });

  // Sort timeline newest first
  timelineItems.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const filteredTimeline = timelineItems.filter((item) => {
    if (timelineFilter === 'ALL') return true;
    if (timelineFilter === 'ENCOUNTER') return item.type === 'ENCOUNTER';
    if (timelineFilter === 'ATTEMPT') return item.type === 'ATTEMPT';
    if (timelineFilter === 'SERVICE') return item.type === 'PLANNED_SERVICE' || item.type === 'DELIVERED_SERVICE';
    return true;
  });

  // Action Submission Handlers
  const handleRecordAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        taskId: selectedTask?.id || (tasks[0] ? tasks[0].id : null),
        clientId: client.id,
        attemptDate,
        channel: attemptChannel,
        outcome: attemptOutcome,
        notes: attemptNotes,
        expectedTaskVersion: selectedTask?.version,
      };
      const res = await fetch('/api/v1/contact-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to record contact attempt');
      showToast(`${t.recordContactAttempt}: ${attemptOutcome.toUpperCase()}. ${t.serverAccepted}`);
      setActiveModal(null);
      setAttemptNotes('');
      onActionCompleted();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        clientId: client.id,
        taskId: selectedTask?.id || (tasks[0] ? tasks[0].id : null),
        observationDate: encDate,
        encounterType: encPlace === '1' ? 'CSC_VISIT' : encPlace === '2' ? 'HOME_VISIT' : 'FACILITY_VISIT',
        artAdherenceAssessment: encArtStatus === '2' ? 'Good (95%+)' : 'Not on ART',
        nutritionAssessment: encWeight ? `Weight: ${encWeight}kg` : 'Adequate',
        generalNotes: encNotes,
        cd4Count: encCd4 ? parseInt(encCd4, 10) : null,
        viralLoadCount: encViralLoad ? parseInt(encViralLoad, 10) : null,
        action: encAction === 'COMPLETE' ? 'COMPLETE' : null,
        expectedTaskVersion: selectedTask?.version,
      };
      const res = await fetch('/api/v1/encounters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to record encounter');
      showToast(`${t.recordEncounter}: ${t.serverAccepted}. Task status updated.`);
      setActiveModal(null);
      setEncNotes('');
      onActionCompleted();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        clientId: client.id,
        taskId: selectedTask?.id,
        purposeCode: planPurpose,
        serviceCategory: planCategory,
        serviceCode: planServiceCode,
        serviceName: getChoiceLabel('purpose', planPurpose),
        targetDueDate: planDueDate,
        notes: planNotes,
      };
      const res = await fetch('/api/v1/planned-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to plan service');
      showToast(`${t.planService}: Planned service recorded. Target: ${planDueDate}`);
      setActiveModal(null);
      setPlanNotes('');
      onActionCompleted();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const targetPlanned = plannedServices.find((p) => p.id === delivPlannedId);
      const payload = {
        clientId: client.id,
        plannedServiceId: delivPlannedId || null,
        taskId: selectedTask?.id,
        deliveryDate: delivDate,
        serviceCode: delivServiceCode || (targetPlanned ? targetPlanned.serviceCode : 'SVC-GEN'),
        facilityName: delivFacility,
        notes: delivNotes,
        expectedPlannedServiceVersion: targetPlanned?.version,
      };
      const res = await fetch('/api/v1/delivered-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to record delivered service');
      showToast(`${t.recordDeliveredService}: Marked DELIVERED. ${t.serverAccepted}`);
      setActiveModal(null);
      setDelivNotes('');
      onActionCompleted();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedReason.trim()) {
      alert(t.rescheduleReason + ' is mandatory');
      return;
    }
    if (!reschedDate) {
      alert(t.dueDate + ' is mandatory');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        newDueDate: reschedDate,
        reason: reschedReason.trim(),
        expectedTaskVersion: selectedTask?.version,
      };
      const res = await fetch(`/api/v1/tasks/${selectedTask?.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to reschedule task');
      showToast(`${t.reschedule}: Task rescheduled to ${reschedDate}`);
      setActiveModal(null);
      setReschedReason('');
      onActionCompleted();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctReason.trim()) {
      alert(t.correctionReason + ' is mandatory');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        recordType: correctionTarget?.type || 'ENCOUNTER',
        recordId: correctionTarget?.id,
        fieldName: correctField,
        newValue: correctNewValue,
        reason: correctReason.trim(),
        expectedVersion: 0,
      };
      const res = await fetch('/api/v1/records/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to log correction');
      showToast(`${t.correct}: Correction saved to immutable audit trail.`);
      setActiveModal(null);
      setCorrectReason('');
      setCorrectNewValue('');
      onActionCompleted();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Global Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.tabFollowUp}</h3>
          <p className="text-xs text-slate-500">
            Record client visits, attempts, planning, and delivered services.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedTask(tasks[0] || null);
              setActiveModal('attempt');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg min-h-[44px] transition-colors"
          >
            + {t.recordContactAttempt}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(tasks[0] || null);
              setActiveModal('encounter');
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm min-h-[44px] transition-colors"
          >
            + {t.recordEncounter}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(tasks[0] || null);
              setActiveModal('plan');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg min-h-[44px] transition-colors"
          >
            + {t.planService}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(tasks[0] || null);
              setActiveModal('delivered');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg min-h-[44px] transition-colors"
          >
            + {t.recordDeliveredService}
          </button>
        </div>
      </div>

      {/* 2. Sub-section: Open Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Icon name="file" className="w-4 h-4 text-emerald-800" />
              <span>{t.openTasksTitle} ({filteredTasks.length})</span>
            </h4>
            <p className="text-xs text-slate-500">
              Tasks derived from canonical purpose codes or administrator directives.
            </p>
          </div>
          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'DUE', 'OVERDUE', 'COMPLETED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTaskFilter(filter)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  taskFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL'
                  ? 'All'
                  : filter === 'DUE'
                  ? t.dueState
                  : filter === 'OVERDUE'
                  ? t.overdueState
                  : t.completedState}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
            {t.noTasks}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const isOverdue = task.status === 'OVERDUE';
              const isCompleted = task.status === 'COMPLETED';
              const isDue = task.status === 'DUE';

              return (
                <div
                  key={task.id}
                  className={`rounded-lg border p-4 space-y-3 transition-shadow hover:shadow-md ${
                    isOverdue
                      ? 'border-rose-300 bg-rose-50/30'
                      : isCompleted
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {task.taskRef}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isDue
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-sky-100 text-sky-800 border-sky-300'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 mt-1.5">{task.title}</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">{t.dueDate}</p>
                      <p
                        className={`text-xs font-bold ${
                          isOverdue ? 'text-rose-700' : 'text-slate-800'
                        }`}
                      >
                        {task.dueDate}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {task.description ||
                      `Purpose code ${task.taskType}: ${getChoiceLabel('purpose', task.taskType)}`}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>
                      Center: <strong>{task.centerId}</strong> • v{task.version}
                    </span>
                    {!isCompleted && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTask(task);
                            setActiveModal('attempt');
                          }}
                          className="px-2 py-1 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                        >
                          Attempt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTask(task);
                            setActiveModal('encounter');
                          }}
                          className="px-2 py-1 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                        >
                          Visit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTask(task);
                            setReschedDate(task.dueDate);
                            setActiveModal('reschedule');
                          }}
                          className="px-2 py-1 font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300"
                        >
                          Reschedule
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Sub-section: Chronological Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Icon name="Clock" className="w-4 h-4 text-emerald-800" />
              <span>{t.timelineTitle} ({filteredTimeline.length})</span>
            </h4>
            <p className="text-xs text-slate-500">
              Chronological log of visits, contact attempts, service plans, and deliveries.
            </p>
          </div>
          {/* Timeline Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'ENCOUNTER', 'ATTEMPT', 'SERVICE'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTimelineFilter(filter)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  timelineFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Events'
                  : filter === 'ENCOUNTER'
                  ? 'Visits'
                  : filter === 'ATTEMPT'
                  ? 'Attempts'
                  : 'Services'}
              </button>
            ))}
          </div>
        </div>

        {filteredTimeline.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No chronological events recorded yet for this client.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 pt-2 pb-2">
            {filteredTimeline.map((item) => (
              <div key={item.id} className="relative pl-6">
                {/* Node Dot */}
                <div
                  className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 bg-white ${
                    item.type === 'ENCOUNTER'
                      ? 'border-emerald-600'
                      : item.type === 'ATTEMPT'
                      ? 'border-blue-600'
                      : 'border-indigo-600'
                  }`}
                />
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 hover:bg-white hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {item.date}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${item.badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700">{item.notes}</p>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/60 gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      {Object.entries(item.details).map(([k, v]) => (
                        <span key={k}>
                          {k}: <strong className="text-slate-700">{v}</strong>
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectionTarget({
                          type: item.type,
                          id: item.id,
                          title: item.title,
                        });
                        setActiveModal('correct');
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      {t.correct}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: RECORD VISIT / ENCOUNTER (CRF SECTION I)        */}
      {/* ======================================================== */}
      {activeModal === 'encounter' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 text-left border border-slate-200 my-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.recordEncounter} (CRF Section I)
                </h3>
                <p className="text-xs text-slate-500">
                  {client.fullName} ({client.clientRef})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordEncounter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ia. {t.observationDate} *
                  </label>
                  <input
                    type="date"
                    required
                    value={encDate}
                    onChange={(e) => setEncDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ib. Place of contact *
                  </label>
                  <select
                    value={encPlace}
                    onChange={(e) => setEncPlace(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    {CHOICE_LISTS.place?.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {lang === 'hi' ? opt.labelHi : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ic. {t.artAdherence}
                  </label>
                  <select
                    value={encArtStatus}
                    onChange={(e) => setEncArtStatus(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    {CHOICE_LISTS.art_status2?.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {lang === 'hi' ? opt.labelHi : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ie. Regimen Line
                  </label>
                  <select
                    value={encRegimen}
                    onChange={(e) => setEncRegimen(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    {CHOICE_LISTS.art_line?.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {lang === 'hi' ? opt.labelHi : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clinical Measurements */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.cd4Count}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    placeholder="e.g. 450"
                    value={encCd4}
                    onChange={(e) => setEncCd4(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-2 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.cd4Percent}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="e.g. 25.5"
                    value={encCd4Pct}
                    onChange={(e) => setEncCd4Pct(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-2 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.viralLoad}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 0"
                    value={encViralLoad}
                    onChange={(e) => setEncViralLoad(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-2 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 54.5"
                    value={encWeight}
                    onChange={(e) => setEncWeight(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-2 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Social Welfare Schemes & ATT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ii. Linked to Welfare Scheme?
                  </label>
                  <select
                    value={encSwsAny}
                    onChange={(e) => setEncSwsAny(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    <option value="1">Yes</option>
                    <option value="2">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Il. Presently on ATT (TB Rx)?
                  </label>
                  <select
                    value={encAtt}
                    onChange={(e) => setEncAtt(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    <option value="2">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={encNotes}
                  onChange={(e) => setEncNotes(e.target.value)}
                  placeholder="Encounter summary, family situation, medication adherence barriers..."
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              {/* NON-NEGOTIABLE ACTION RADIO: Complete vs Leave Open */}
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Icon name="Activity" className="w-3.5 h-3.5 text-amber-700" />
                  <span>Follow-Up Task Closure Decision:</span>
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="encAction"
                      checked={encAction === 'COMPLETE'}
                      onChange={() => setEncAction('COMPLETE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Complete follow-up task [COMPLETE]</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="encAction"
                      checked={encAction === 'LEAVE_OPEN'}
                      onChange={() => setEncAction('LEAVE_OPEN')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Leave follow-up task open [OPEN]</span>
                  </label>
                </div>
                <p className="text-[11px] text-amber-800 italic">
                  Domain rule: A follow-up task transitions to COMPLETED only when explicit COMPLETE action is selected.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : t.submitToServer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PLAN NEXT ACTION (CRF SECTION J5)               */}
      {/* ======================================================== */}
      {activeModal === 'plan' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.planService} (CRF Section J5)
                </h3>
                <p className="text-xs text-slate-500">
                  {client.fullName} ({client.clientRef})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlanService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose Code (J.2 / Choice list: purpose) *
                </label>
                <select
                  value={planPurpose}
                  onChange={(e) => setPlanPurpose(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                >
                  {CHOICE_LISTS.purpose?.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.code}. {lang === 'hi' ? opt.labelHi : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.serviceCategory} (svc_cat) *
                  </label>
                  <select
                    value={planCategory}
                    onChange={(e) => setPlanCategory(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    {CHOICE_LISTS.svc_cat?.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {lang === 'hi' ? opt.labelHi : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.serviceCode} (svc) *
                  </label>
                  <select
                    value={planServiceCode}
                    onChange={(e) => setPlanServiceCode(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    {CHOICE_LISTS.svc?.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.code} - {lang === 'hi' ? opt.labelHi : opt.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.targetDueDate} *
                </label>
                <input
                  type="date"
                  required
                  value={planDueDate}
                  onChange={(e) => setPlanDueDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Action instructions, specific documents required, linkage facility..."
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : t.planService}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RECORD DELIVERED SERVICE                        */}
      {/* ======================================================== */}
      {activeModal === 'delivered' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.recordDeliveredService}
                </h3>
                <p className="text-xs text-slate-500">
                  {client.fullName} ({client.clientRef})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordDelivered} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link to Planned Service
                </label>
                <select
                  value={delivPlannedId}
                  onChange={(e) => {
                    setDelivPlannedId(e.target.value);
                    const target = plannedServices.find((p) => p.id === e.target.value);
                    if (target) setDelivServiceCode(target.serviceCode);
                  }}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                >
                  <option value="">-- None / Ad-Hoc Delivery --</option>
                  {plannedServices
                    .filter((p) => p.status !== 'DELIVERED')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.serviceName || p.serviceCode} (Target: {p.targetDueDate})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={delivDate}
                    onChange={(e) => setDelivDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility / Service Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={delivFacility}
                    onChange={(e) => setDelivFacility(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={delivNotes}
                  onChange={(e) => setDelivNotes(e.target.value)}
                  placeholder="Verification details, scheme sanction order number, health card issued..."
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : t.recordDeliveredService}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: RECORD CONTACT ATTEMPT                          */}
      {/* ======================================================== */}
      {activeModal === 'attempt' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.recordContactAttempt}
                </h3>
                <p className="text-xs text-slate-500">
                  {client.fullName} ({client.clientRef})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordAttempt} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attempt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={attemptDate}
                    onChange={(e) => setAttemptDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.channel} *
                  </label>
                  <select
                    value={attemptChannel}
                    onChange={(e) => setAttemptChannel(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                  >
                    <option value="PHONE">Phone Call</option>
                    <option value="HOME_VISIT">Home Visit</option>
                    <option value="PHYSICAL_CSC">CSC Physical Visit</option>
                    <option value="WHATSAPP">WhatsApp Message</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.outcome} *
                </label>
                <select
                  value={attemptOutcome}
                  onChange={(e) => setAttemptOutcome(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px] bg-white"
                >
                  <option value="reached">{t.reached}</option>
                  <option value="not_reached">{t.not_reached}</option>
                  <option value="refused">{t.refused}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.notes}
                </label>
                <textarea
                  rows={2}
                  value={attemptNotes}
                  onChange={(e) => setAttemptNotes(e.target.value)}
                  placeholder="Reason not reached, family member spoken to, follow-up agreement..."
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : t.recordContactAttempt}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: RESCHEDULE TASK (MANDATORY REASON)              */}
      {/* ======================================================== */}
      {activeModal === 'reschedule' && selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.reschedule}: {selectedTask.taskRef}
                </h3>
                <p className="text-xs text-slate-500">
                  Current Due Date: <strong>{selectedTask.dueDate}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={reschedDate}
                  onChange={(e) => setReschedDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1">
                  {t.rescheduleReason} (MANDATORY) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reschedReason}
                  onChange={(e) => setReschedReason(e.target.value)}
                  placeholder="State the verified operational or beneficiary reason for postponing this task..."
                  className="w-full text-xs border border-rose-300 rounded-md px-3 py-2 bg-rose-50/20"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : t.reschedule}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: CORRECT RECORD (MANDATORY REASON)               */}
      {/* ======================================================== */}
      {activeModal === 'correct' && correctionTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.correct}: {correctionTarget.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Record ID: <code>{correctionTarget.id}</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCorrect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Field to Correct *
                </label>
                <input
                  type="text"
                  required
                  value={correctField}
                  onChange={(e) => setCorrectField(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Value *
                </label>
                <input
                  type="text"
                  required
                  value={correctNewValue}
                  onChange={(e) => setCorrectNewValue(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-800 mb-1">
                  {t.correctionReason} (MANDATORY) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                  placeholder="Explain why this historical record is being modified (e.g. data entry error, field supervisor verification)..."
                  className="w-full text-xs border border-rose-300 rounded-md px-3 py-2 bg-rose-50/20"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
