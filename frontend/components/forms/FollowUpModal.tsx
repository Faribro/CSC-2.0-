'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Language, translations } from '@/lib/translations';
import { CHOICE_LISTS } from '@/lib/crfDefinitions';
import { saveVisitDraft, getVisitDraft, clearVisitDraft, enqueueOutbox } from '@/lib/storage/indexedDb';

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

export interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientRef: string;
  clientName: string;
  task?: TaskSummary | null;
  tasksList?: TaskSummary[];
  currentIndex?: number;
  onNextClient?: () => void;
  onSaved: (result: { type: 'attempt' | 'encounter' | 'reschedule'; message: string }) => void;
  lang: Language;
  lastContactSummary?: string;
  initialMode?: 'select' | 'attempt' | 'reschedule' | 'visit';
  previousClinicalValues?: {
    weight?: number | string;
    height?: number | string;
    muac?: number | string;
    cd4?: number | string;
    cd4Pct?: number | string;
    viralLoad?: number | string;
    artStatus?: string;
    regimen?: string;
    attStatus?: string;
  };
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientRef,
  clientName,
  task,
  tasksList = [],
  currentIndex = -1,
  onNextClient,
  onSaved,
  lang,
  lastContactSummary,
  initialMode = 'select',
  previousClinicalValues = {},
}) => {
  const isHi = lang === 'hi';
  const t = translations[lang];

  // Active Flow: 'select' | 'could_not_reach' | 'reschedule' | 'visit'
  const [activeFlow, setActiveFlow] = useState<'select' | 'could_not_reach' | 'reschedule' | 'visit'>(() => {
    if (initialMode === 'attempt') return 'could_not_reach';
    if (initialMode === 'reschedule') return 'reschedule';
    if (initialMode === 'visit') return 'visit';
    return 'select';
  });

  // Flow A: Could Not Reach
  const [attemptDate, setAttemptDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attemptReason, setAttemptReason] = useState<string>('no_answer');
  const [attemptNotes, setAttemptNotes] = useState<string>('');
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Flow B: Reschedule
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');

  // Flow C: Visited / Spoke
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [placeOfContact, setPlaceOfContact] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('csc2_last_place_of_contact') || '2'; // Home visit default
    }
    return '2';
  });
  const [visitOutcome, setVisitOutcome] = useState<string>('');

  // Optional Section I Collapsible Sections
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    measurements: false,
    art: false,
    cd4: false,
    tb: false,
    sws: false,
    entitlements: false,
    stigma: false,
  });

  // Clinical inputs (Never copied forward; blank by default)
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [muac, setMuac] = useState<string>('');
  const [artStatus, setArtStatus] = useState<string>('');
  const [regimenLine, setRegimenLine] = useState<string>('');
  const [cd4Count, setCd4Count] = useState<string>('');
  const [cd4Pct, setCd4Pct] = useState<string>('');
  const [viralLoad, setViralLoad] = useState<string>('');
  const [tbAttStatus, setTbAttStatus] = useState<string>('');
  const [selectedSws, setSelectedSws] = useState<string[]>([]);
  const [selectedEntitlements, setSelectedEntitlements] = useState<string[]>([]);
  const [stigmaFaced, setStigmaFaced] = useState<string>('no');
  const [stigmaSources, setStigmaSources] = useState<string[]>([]);

  // Next Action (Step 2 of Visit)
  const [scheduleNextAction, setScheduleNextAction] = useState<boolean>(true);
  const [nextActionDate, setNextActionDate] = useState<string>('');
  const [nextPurpose, setNextPurpose] = useState<string>('1'); // Counselling
  const [nextCategory, setNextCategory] = useState<string>('cc');
  const [nextServiceCode, setNextServiceCode] = useState<string>('');
  const [markTaskComplete, setMarkTaskComplete] = useState<boolean>(true);

  // Status & Submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Helper to obtain current signed-in user id
  const getActiveUserId = (): string => {
    if (typeof window === 'undefined') return 'anonymous_user';
    try {
      const stored = localStorage.getItem('csc2_field_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id) return parsed.id;
      }
    } catch {}
    return 'default_field_user';
  };

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'attempt') setActiveFlow('could_not_reach');
      else if (initialMode === 'reschedule') setActiveFlow('reschedule');
      else if (initialMode === 'visit') setActiveFlow('visit');
      else setActiveFlow('select');

      setSaveStatus(null);

      // Load draft from IndexedDB (scoped by account & client)
      if (typeof window !== 'undefined') {
        const userId = getActiveUserId();
        getVisitDraft(userId, clientId)
          .then((parsed) => {
            if (parsed) {
              if (parsed.visitOutcome) setVisitOutcome(parsed.visitOutcome);
              if (parsed.placeOfContact) setPlaceOfContact(parsed.placeOfContact);
              if (parsed.weight) setWeight(parsed.weight);
              if (parsed.height) setHeight(parsed.height);
              if (parsed.cd4Count) setCd4Count(parsed.cd4Count);
              if (parsed.cd4Pct) setCd4Pct(parsed.cd4Pct);
              if (parsed.viralLoad) setViralLoad(parsed.viralLoad);
              if (parsed.tbAttStatus) setTbAttStatus(parsed.tbAttStatus);
              if (parsed.selectedSws) setSelectedSws(parsed.selectedSws);
              if (parsed.selectedEntitlements) setSelectedEntitlements(parsed.selectedEntitlements);
              if (parsed.stigmaFaced) setStigmaFaced(parsed.stigmaFaced);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, clientId, initialMode]);

  // Periodic Autosave of Visit Draft to IndexedDB (scoped by userId and clientId)
  useEffect(() => {
    if (activeFlow !== 'visit' || !isOpen || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const draftPayload = {
        visitOutcome,
        placeOfContact,
        weight,
        height,
        muac,
        artStatus,
        regimenLine,
        cd4Count,
        cd4Pct,
        viralLoad,
        tbAttStatus,
        selectedSws,
        selectedEntitlements,
        stigmaFaced,
        updatedAt: new Date().toISOString(),
      };
      const userId = getActiveUserId();
      saveVisitDraft(userId, clientId, draftPayload).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    activeFlow,
    isOpen,
    clientId,
    visitOutcome,
    placeOfContact,
    weight,
    height,
    muac,
    artStatus,
    regimenLine,
    cd4Count,
    cd4Pct,
    viralLoad,
    tbAttStatus,
    selectedSws,
    selectedEntitlements,
    stigmaFaced,
  ]);

  if (!isOpen) return null;

  const toggleAccordion = (name: string) => {
    setOpenAccordions((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Date shortcut helpers
  const applyDateShortcut = (days: number, target: 'reschedule' | 'nextAction') => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    if (target === 'reschedule') {
      setRescheduleDate(dateStr);
    } else {
      setNextActionDate(dateStr);
    }
  };

  // Filtered Services for Chosen Category
  const servicesInCategory = (CHOICE_LISTS['svc'] || []).filter((s) => {
    if (!nextCategory) return true;
    return s.code.toLowerCase().startsWith(nextCategory.toLowerCase());
  });

  // Handle Flow A: Save Could Not Reach Contact Attempt
  const handleSaveContactAttempt = async (proceedToNext: boolean = false) => {
    setIsSubmitting(true);
    setSaveStatus(null);
    try {
      const idempotencyKey = `attempt-${clientId}-${Date.now()}`;
      const payload = {
        taskId: task ? task.id : 'task-001',
        attemptDate,
        channel: 'PHONE',
        outcome: attemptReason,
        notes: attemptNotes || `Contact attempt: ${attemptReason}`,
        expectedTaskVersion: task ? task.version : undefined,
      };

      let savedServer = false;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        try {
          const res = await fetch('/api/v1/contact-attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            savedServer = true;
            setSaveStatus(isHi ? 'सर्वर पर सहेजा गया' : 'Saved on the server');
          }
        } catch {
          savedServer = false;
        }
      }

      if (!savedServer) {
        // Save to offline outbox in IndexedDB and local mirror
        enqueueOutbox('anonymous_field_user', {
          idempotencyKey,
          url: '/api/v1/contact-attempts',
          method: 'POST',
          payload,
        }).catch(() => {});
        const queue = JSON.parse(localStorage.getItem('csc2_sync_outbox') || '[]');
        queue.push({
          url: '/api/v1/contact-attempts',
          method: 'POST',
          payload,
          idempotencyKey,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('csc2_sync_outbox', JSON.stringify(queue));
        setSaveStatus(
          isHi
            ? 'इस डिवाइस पर सहेजा गया, ऑनलाइन होने पर भेजा जाएगा'
            : 'Saved on this device, will send when online'
        );
      }

      setAttemptCount((prev) => prev + 1);
      onSaved({
        type: 'attempt',
        message: isHi
          ? `संपर्क प्रयास दर्ज किया गया (${attemptReason})। कार्य खुला रहेगा।`
          : `Contact attempt recorded (${attemptReason}). Task remains open.`,
      });

      if (proceedToNext && onNextClient) {
        onNextClient();
      } else {
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      alert(`Error saving attempt: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Flow B: Save Reschedule
  const handleSaveReschedule = async (proceedToNext: boolean = false) => {
    if (!rescheduleDate) {
      alert(isHi ? 'कृपया नई तारीख चुनें।' : 'Please choose a new due date.');
      return;
    }
    if (!rescheduleReason.trim()) {
      alert(isHi ? 'रीशेड्यूल का कारण अनिवार्य है।' : 'Reschedule reason is mandatory.');
      return;
    }

    setIsSubmitting(true);
    setSaveStatus(null);
    try {
      const taskId = task ? task.id : 'task-001';
      const idempotencyKey = `resched-${taskId}-${Date.now()}`;
      const payload = {
        newDueDate: rescheduleDate,
        reason: rescheduleReason.trim(),
        expectedTaskVersion: task ? task.version : undefined,
      };

      let savedServer = false;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        try {
          const res = await fetch(`/api/v1/tasks/${taskId}/reschedule`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify(payload),
          });

          if (res.status === 409) {
            alert(
              isHi
                ? 'संस्करण टकराव (409): किसी अन्य उपयोगकर्ता ने इस कार्य को संशोधित कर दिया है।'
                : 'Version conflict (409): Another user modified this task concurrently.'
            );
            return;
          }

          if (res.ok) {
            savedServer = true;
            setSaveStatus(isHi ? 'सर्वर पर सहेजा गया' : 'Saved on the server');
          }
        } catch {
          savedServer = false;
        }
      }

      if (!savedServer) {
        // Save to offline outbox in IndexedDB and local mirror
        enqueueOutbox('anonymous_field_user', {
          idempotencyKey,
          url: `/api/v1/tasks/${taskId}/reschedule`,
          method: 'POST',
          payload,
        }).catch(() => {});
        const queue = JSON.parse(localStorage.getItem('csc2_sync_outbox') || '[]');
        queue.push({
          url: `/api/v1/tasks/${taskId}/reschedule`,
          method: 'POST',
          payload,
          idempotencyKey,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('csc2_sync_outbox', JSON.stringify(queue));
        setSaveStatus(
          isHi
            ? 'इस डिवाइस पर सहेजा गया, ऑनलाइन होने पर भेजा जाएगा'
            : 'Saved on this device, will send when online'
        );
      }

      onSaved({
        type: 'reschedule',
        message: isHi
          ? `फ़ॉलो-अप ${rescheduleDate} के लिए रीशेड्यूल किया गया।`
          : `Follow-up rescheduled to ${rescheduleDate}.`,
      });

      if (proceedToNext && onNextClient) {
        onNextClient();
      } else {
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      alert(`Error rescheduling task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Flow C: Save Visited Encounter & Next Action
  const handleSaveVisit = async (proceedToNext: boolean = false) => {
    setIsSubmitting(true);
    setSaveStatus(null);
    try {
      // Remember place of contact in local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem('csc2_last_place_of_contact', placeOfContact);
      }

      const encounterIdempotencyKey = `enc-${clientId}-${Date.now()}`;
      const encounterPayload = {
        clientId,
        taskId: task ? task.id : undefined,
        expectedTaskVersion: task ? task.version : undefined,
        observationDate: visitDate,
        encounterType:
          placeOfContact === '1'
            ? 'CSC_CENTRE'
            : placeOfContact === '3'
            ? 'PHONE_CALL'
            : placeOfContact === '4'
            ? 'COMMUNITY_OUTREACH'
            : 'HOME_VISIT',
        artAdherenceAssessment: artStatus === '1' ? 'NOT_ON_ART' : 'ON_ART',
        nutritionAssessment: muac ? `MUAC_${muac}cm` : 'STANDARD',
        generalNotes: visitOutcome || 'Field follow-up visit conducted.',
        cd4Count: cd4Count ? Number(cd4Count) : undefined,
        viralLoadCount: viralLoad ? Number(viralLoad) : undefined,
        action: markTaskComplete ? 'COMPLETE' : 'LEAVE_OPEN',
      };

      let savedServer = false;
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // 1. Submit Encounter
      if (isOnline) {
        try {
          const res = await fetch('/api/v1/encounters', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': encounterIdempotencyKey,
            },
            body: JSON.stringify(encounterPayload),
          });

          if (res.ok) {
            savedServer = true;
          }
        } catch {
          savedServer = false;
        }
      }

      if (!savedServer) {
        // Save to offline outbox in IndexedDB and local mirror
        enqueueOutbox('anonymous_field_user', {
          idempotencyKey: encounterIdempotencyKey,
          url: '/api/v1/encounters',
          method: 'POST',
          payload: encounterPayload,
        }).catch(() => {});
        const queue = JSON.parse(localStorage.getItem('csc2_sync_outbox') || '[]');
        queue.push({
          url: '/api/v1/encounters',
          method: 'POST',
          payload: encounterPayload,
          idempotencyKey: encounterIdempotencyKey,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('csc2_sync_outbox', JSON.stringify(queue));
      }

      // 2. Submit Next Action (Planned Service) if specified
      if (scheduleNextAction && nextActionDate) {
        const planIdempotencyKey = `plan-${clientId}-${Date.now()}`;
        const serviceObj = (CHOICE_LISTS['svc'] || []).find((s) => s.code === nextServiceCode);
        const serviceName = serviceObj
          ? isHi
            ? serviceObj.labelHi
            : serviceObj.labelEn
          : 'Planned follow-up service';

        const planPayload = {
          clientId,
          serviceCode: nextServiceCode || 'GENERAL_FOLLOWUP',
          serviceName,
          targetDueDate: nextActionDate,
          purposeCode: nextPurpose,
          notes: `Follow-up planned after visit on ${visitDate}`,
        };

        if (isOnline) {
          await fetch('/api/v1/planned-services', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': planIdempotencyKey,
            },
            body: JSON.stringify(planPayload),
          });
        } else {
          enqueueOutbox('anonymous_field_user', {
            idempotencyKey: planIdempotencyKey,
            url: '/api/v1/planned-services',
            method: 'POST',
            payload: planPayload,
          }).catch(() => {});
          const queue = JSON.parse(localStorage.getItem('csc2_sync_outbox') || '[]');
          queue.push({
            url: '/api/v1/planned-services',
            method: 'POST',
            payload: planPayload,
            idempotencyKey: planIdempotencyKey,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem('csc2_sync_outbox', JSON.stringify(queue));
        }
      }

      // Clear local visit draft upon successful save
      const activeUser = getActiveUserId();
      clearVisitDraft(activeUser, clientId).catch(() => {});

      setSaveStatus(
        isOnline
          ? isHi
            ? 'सर्वर पर सहेजा गया'
            : 'Saved on the server'
          : isHi
          ? 'इस डिवाइस पर सहेजा गया, ऑनलाइन होने पर भेजा जाएगा'
          : 'Saved on this device, will send when online'
      );

      onSaved({
        type: 'encounter',
        message: isHi
          ? 'विज़िट सफलतापूर्वक दर्ज की गई।'
          : 'Follow-up visit recorded successfully.',
      });

      if (proceedToNext && onNextClient) {
        onNextClient();
      } else {
        setTimeout(() => onClose(), 800);
      }
    } catch (err: any) {
      alert(`Error saving visit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="followup-modal-title"
    >
      <div className="bg-surface border-2 border-border/40 rounded-[22px] max-w-2xl w-full max-h-[92vh] flex flex-col shadow-comic overflow-hidden animate-unlock-pop">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-border/40 bg-canvas/60 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-lavender text-plum border border-border/40">
                {clientRef}
              </span>
              {task && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-sun/40 text-ink border border-sun">
                  {task.taskRef}
                </span>
              )}
            </div>
            <h2 id="followup-modal-title" className="text-base sm:text-lg font-black text-ink mt-1 font-comic">
              {clientName}
            </h2>
            {lastContactSummary && (
              <p className="text-[11px] text-ink-muted mt-0.5">{lastContactSummary}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-canvas hover:bg-pink/20 text-ink-muted hover:text-ink flex items-center justify-center border border-border/40 transition-colors cursor-pointer"
            aria-label={isHi ? 'बंद करें' : 'Close modal'}
          >
            <Icon name="cancel" className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Feedback Notification */}
          {saveStatus && (
            <div
              className="p-3 bg-mint/50 border border-mint rounded-xl text-xs font-bold text-success-ink flex items-center gap-2 shadow-2xs"
              role="status"
            >
              <Icon name="check" className="w-4 h-4 text-success-ink shrink-0" />
              <span>{saveStatus}</span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 1: INITIAL 3 CHOICES (If not pre-selected)               */}
          {/* ------------------------------------------------------------- */}
          {activeFlow === 'select' && (
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-ink-muted">
                {isHi ? 'फॉलो-अप परिणाम का चयन करें' : 'Select Follow-up Outcome'}
              </p>

              <div className="grid grid-cols-1 gap-3">
                {/* Choice 1: Visited / Spoke */}
                <button
                  type="button"
                  onClick={() => setActiveFlow('visit')}
                  className="p-4 rounded-[16px] border-2 border-border/40 bg-surface hover:bg-canvas hover:border-plum transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-2xs min-h-[56px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center text-success-ink shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="UserCheck" className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-sm font-black text-ink block">
                      {isHi ? 'विज़िट / बात हुई (Visited / Spoke)' : 'Visited / Spoke'}
                    </strong>
                    <span className="text-xs text-ink-muted leading-snug block mt-0.5">
                      {isHi
                        ? 'लाभार्थी से व्यक्तिगत रूप से या फोन पर संपर्क हुआ; विज़िट परिणाम और क्लिनिकल अपडेट दर्ज करें।'
                        : 'Contacted beneficiary in person or by phone; record encounter details and Section I clinical updates.'}
                    </span>
                  </div>
                </button>

                {/* Choice 2: Tried but could not reach */}
                <button
                  type="button"
                  onClick={() => setActiveFlow('could_not_reach')}
                  className="p-4 rounded-[16px] border-2 border-border/40 bg-surface hover:bg-canvas hover:border-plum transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-2xs min-h-[56px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-peach flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="PhoneOff" className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-black text-ink">
                        {isHi ? 'संपर्क नहीं हो सका (Tried, could not reach)' : 'Tried but could not reach'}
                      </strong>
                      {attemptCount > 0 && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-peach/60 text-primary border border-primary/20">
                          {isHi ? `${attemptCount} प्रयास` : `${attemptCount} attempts`}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-ink-muted leading-snug block mt-0.5">
                      {isHi
                        ? 'फोन बंद था, घंटी बजी उत्तर नहीं आया, या घर पर अनुपलब्ध। कार्य खुला रहेगा।'
                        : 'Phone switched off, no answer, wrong number, or unavailable. Saves as contact attempt; task stays open.'}
                    </span>
                  </div>
                </button>

                {/* Choice 3: Reschedule */}
                <button
                  type="button"
                  onClick={() => setActiveFlow('reschedule')}
                  className="p-4 rounded-[16px] border-2 border-border/40 bg-surface hover:bg-canvas hover:border-plum transition-all text-left flex items-start gap-3.5 group cursor-pointer shadow-2xs min-h-[56px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center text-plum shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name="Calendar" className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-sm font-black text-ink block">
                      {isHi ? 'रीशेड्यूल करें (Reschedule)' : 'Reschedule Follow-up'}
                    </strong>
                    <span className="text-xs text-ink-muted leading-snug block mt-0.5">
                      {isHi
                        ? 'नई नियत तारीख और अनिवार्य कारण दर्ज करें। इतिहास ऑडिट लॉग में रहेगा।'
                        : 'Change due date with required reason. Audit history preserved.'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FLOW A: COULD NOT REACH FORM                                  */}
          {/* ------------------------------------------------------------- */}
          {activeFlow === 'could_not_reach' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveFlow('select')}
                  className="text-xs font-bold text-plum hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
                  <span>{isHi ? 'वापस परिणाम चुनें' : 'Back to outcome selection'}</span>
                </button>
                <span className="text-[11px] font-mono font-bold text-ink-muted bg-peach/40 px-2.5 py-0.5 rounded-full border border-peach">
                  {isHi ? 'कार्य खुला रहेगा' : 'Task will stay open'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-peach/20 border border-peach text-ink text-xs flex items-center gap-2.5">
                <Icon name="AlertCircle" className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {isHi
                    ? 'असंपर्क प्रयास केवल संपर्क इतिहास के रूप में दर्ज होता है। फॉलो-अप कार्य खुला रहेगा।'
                    : 'Recording an unreachable attempt keeps the follow-up open and increments your logged attempts.'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1.5">
                    {isHi ? 'प्रयास की तारीख' : 'Attempt Date'} <span className="text-primary">*</span>
                  </label>
                  <input
                    type="date"
                    value={attemptDate}
                    onChange={(e) => setAttemptDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-border/50 bg-canvas text-ink min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1.5">
                    {isHi ? 'असंपर्क कारण' : 'Unreachable Reason'} <span className="text-primary">*</span>
                  </label>
                  <select
                    value={attemptReason}
                    onChange={(e) => setAttemptReason(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-border/50 bg-canvas text-ink min-h-[44px]"
                  >
                    <option value="no_answer">{isHi ? 'घंटी बजी, उत्तर नहीं मिला' : 'No answer / Ringing'}</option>
                    <option value="switched_off">{isHi ? 'फोन बंद / नेटवर्क से बाहर' : 'Switched off / Unreachable'}</option>
                    <option value="wrong_number">{isHi ? 'गलत नंबर / अमान्य' : 'Wrong number / Invalid'}</option>
                    <option value="refused">{isHi ? 'क्लाइंट ने बात करने से मना किया' : 'Refused to speak'}</option>
                    <option value="other">{isHi ? 'अन्य' : 'Other'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink mb-1.5">
                  {isHi ? 'अतिरिक्त टिप्पणी (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={attemptNotes}
                  onChange={(e) => setAttemptNotes(e.target.value)}
                  placeholder={isHi ? 'जैसे: 3 बार फोन मिलाया, उत्तर नहीं आया...' : 'e.g., Tried 3 times, rang continuously with no answer...'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-canvas text-ink"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-ink-muted hover:text-ink min-h-[44px] px-3"
                >
                  {isHi ? 'रद्द करें' : 'Cancel'}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onNextClient && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveContactAttempt(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 border-border/40 bg-surface hover:bg-canvas text-ink text-xs font-bold transition-all min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isHi ? 'सहेजें और अगला' : 'Save & Next Client'}</span>
                      <Icon name="ChevronRight" className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveContactAttempt(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Icon name="check" className="w-4 h-4" />
                    <span>{isHi ? 'सहेजें और पूर्ण करें' : 'Save & Done'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FLOW B: RESCHEDULE FORM                                       */}
          {/* ------------------------------------------------------------- */}
          {activeFlow === 'reschedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveFlow('select')}
                  className="text-xs font-bold text-plum hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
                  <span>{isHi ? 'वापस परिणाम चुनें' : 'Back to outcome selection'}</span>
                </button>
                <span className="text-[11px] font-mono font-bold text-ink-muted bg-lavender px-2.5 py-0.5 rounded-full border border-border/40">
                  {isHi ? 'इतिहास सुरक्षित रहेगा' : 'Audit trail preserved'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink mb-1.5">
                  {isHi ? 'त्वरित तारीख शॉर्टकट' : 'Quick Date Shortcuts'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyDateShortcut(7, 'reschedule')}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-border/40 bg-surface hover:bg-lavender/30 text-ink min-h-[44px] cursor-pointer"
                  >
                    {isHi ? '1 सप्ताह बाद' : 'In 1 week'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDateShortcut(14, 'reschedule')}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-border/40 bg-surface hover:bg-lavender/30 text-ink min-h-[44px] cursor-pointer"
                  >
                    {isHi ? '2 सप्ताह बाद' : 'In 2 weeks'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDateShortcut(30, 'reschedule')}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-border/40 bg-surface hover:bg-lavender/30 text-ink min-h-[44px] cursor-pointer"
                  >
                    {isHi ? '1 माह बाद' : 'In 1 month'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('resched-date-input');
                      if (input) (input as HTMLInputElement).showPicker?.();
                    }}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-border/40 bg-surface hover:bg-lavender/30 text-ink min-h-[44px] cursor-pointer"
                  >
                    {isHi ? 'कस्टम तारीख' : 'Pick date'}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="resched-date-input" className="block text-[11px] font-bold text-ink mb-1.5">
                  {isHi ? 'नई नियत तारीख' : 'New Due Date'} <span className="text-primary">*</span>
                </label>
                <input
                  id="resched-date-input"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-border/50 bg-canvas text-ink min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink mb-1.5">
                  {isHi ? 'रीशेड्यूल का कारण' : 'Reason for Rescheduling'} <span className="text-primary">*</span>
                </label>
                <textarea
                  rows={2}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder={isHi ? 'रीशेड्यूल का स्पष्ट कारण दर्ज करें...' : 'State clear reason for postponement...'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border/50 bg-canvas text-ink"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-ink-muted hover:text-ink min-h-[44px] px-3"
                >
                  {isHi ? 'रद्द करें' : 'Cancel'}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onNextClient && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveReschedule(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 border-border/40 bg-surface hover:bg-canvas text-ink text-xs font-bold transition-all min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isHi ? 'सहेजें और अगला' : 'Save & Next Client'}</span>
                      <Icon name="ChevronRight" className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveReschedule(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Icon name="check" className="w-4 h-4" />
                    <span>{isHi ? 'सहेजें और पूर्ण करें' : 'Save & Done'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FLOW C: VISITED / SPOKE SHORT FORM + COLLAPSIBLE SECTION I    */}
          {/* ------------------------------------------------------------- */}
          {activeFlow === 'visit' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveFlow('select')}
                  className="text-xs font-bold text-plum hover:text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
                  <span>{isHi ? 'वापस परिणाम चुनें' : 'Back to outcome selection'}</span>
                </button>
                <span className="text-[10px] font-mono font-bold text-ink-muted bg-mint/40 text-success-ink px-2 py-0.5 rounded-full border border-mint">
                  {isHi ? 'ऑटोसेव सक्रिय' : 'Autosave active'}
                </span>
              </div>

              {/* Short Core Visit Details */}
              <div className="p-4 bg-canvas/70 border border-border/40 rounded-xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-ink font-comic">
                  {isHi ? '1. संक्षिप्त विज़िट विवरण' : '1. Core Visit Record'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-ink mb-1">
                      {isHi ? 'विज़िट की तारीख' : 'Visit Date'} <span className="text-primary">*</span>
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-surface text-ink min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-ink mb-1">
                      {isHi ? 'संपर्क का स्थान (याद रखा गया)' : 'Place of Contact (Remembered)'}
                    </label>
                    <select
                      value={placeOfContact}
                      onChange={(e) => setPlaceOfContact(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-surface text-ink min-h-[44px]"
                    >
                      <option value="1">{isHi ? 'केयर एंड सपोर्ट सेंटर (CSC)' : 'Care & Support Centre (CSC)'}</option>
                      <option value="2">{isHi ? 'घर पर विज़िट (Home Visit)' : 'Home Visit'}</option>
                      <option value="3">{isHi ? 'फोन कॉल (Phone Call)' : 'Phone Call'}</option>
                      <option value="4">{isHi ? 'फील्ड / समुदाय (Community Field)' : 'Community / Field'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink mb-1">
                    {isHi ? 'विज़िट परिणाम एवं सारांश' : 'Visit Outcome & Summary Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={visitOutcome}
                    onChange={(e) => setVisitOutcome(e.target.value)}
                    placeholder={isHi ? 'लाभार्थी के स्वास्थ्य और परामर्श का सारांश...' : 'Summary of adherence, counselling, and well-being...'}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-surface text-ink"
                  />
                </div>
              </div>

              {/* Collapsible Accordions for Section I Clinical Updates */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-ink font-comic">
                    {isHi ? '2. अनुभाग I क्लिनिकल अपडेट (वैकल्पिक)' : '2. Section I Clinical Updates (Optional)'}
                  </h3>
                  <span className="text-[10px] text-ink-muted">
                    {isHi ? 'पिछला मान केवल संकेत हेतु' : 'Previous value shown as read-only hint'}
                  </span>
                </div>

                {/* Accordion 1: Anthropometry */}
                <div className="border border-border/40 rounded-xl bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('measurements')}
                    className="w-full px-4 py-3 bg-canvas/40 hover:bg-canvas flex items-center justify-between text-xs font-bold text-ink cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Activity" className="w-4 h-4 text-plum" />
                      <span>{isHi ? 'माप (वजन, ऊंचाई, MUAC)' : 'Measurements (Weight, Height, MUAC)'}</span>
                    </div>
                    <Icon
                      name={openAccordions.measurements ? 'ChevronUp' : 'ChevronDown'}
                      className="w-4 h-4 text-ink-muted"
                    />
                  </button>

                  {openAccordions.measurements && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-ink">{isHi ? 'वजन (किग्रा)' : 'Weight (kg)'}</label>
                          {previousClinicalValues.weight && (
                            <span className="text-[10px] text-ink-muted font-mono">
                              prev: {previousClinicalValues.weight} kg
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="e.g. 54.5"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/50 bg-canvas text-ink"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-ink">{isHi ? 'ऊंचाई (सेमी)' : 'Height (cm)'}</label>
                          {previousClinicalValues.height && (
                            <span className="text-[10px] text-ink-muted font-mono">
                              prev: {previousClinicalValues.height} cm
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          placeholder="e.g. 165"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/50 bg-canvas text-ink"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-ink">{isHi ? 'MUAC (सेमी)' : 'MUAC (cm)'}</label>
                          {previousClinicalValues.muac && (
                            <span className="text-[10px] text-ink-muted font-mono">
                              prev: {previousClinicalValues.muac} cm
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={muac}
                          onChange={(e) => setMuac(e.target.value)}
                          placeholder="e.g. 23.5"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/50 bg-canvas text-ink"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 2: ART Status & Regimen Line */}
                <div className="border border-border/40 rounded-xl bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('art')}
                    className="w-full px-4 py-3 bg-canvas/40 hover:bg-canvas flex items-center justify-between text-xs font-bold text-ink cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Heart" className="w-4 h-4 text-primary" />
                      <span>{isHi ? 'एआरटी स्थिति एवं रेजिमेन लाइन' : 'ART Status & Regimen Line'}</span>
                    </div>
                    <Icon
                      name={openAccordions.art ? 'ChevronUp' : 'ChevronDown'}
                      className="w-4 h-4 text-ink-muted"
                    />
                  </button>

                  {openAccordions.art && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/30 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-ink mb-1">
                          {isHi ? 'एआरटी स्थिति' : 'ART Status'}
                        </label>
                        <select
                          value={artStatus}
                          onChange={(e) => setArtStatus(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-canvas text-ink min-h-[44px]"
                        >
                          <option value="">{isHi ? '-- दर्ज नहीं किया गया --' : '-- Not recorded --'}</option>
                          {(CHOICE_LISTS['artstat'] || []).map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}. {isHi ? c.labelHi : c.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-ink mb-1">
                          {isHi ? 'एआरटी रेजिमेन लाइन' : 'ART Regimen Line'}
                        </label>
                        <select
                          value={regimenLine}
                          onChange={(e) => setRegimenLine(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-canvas text-ink min-h-[44px]"
                        >
                          <option value="">{isHi ? '-- दर्ज नहीं किया गया --' : '-- Not recorded --'}</option>
                          {(CHOICE_LISTS['art_line'] || []).map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}. {isHi ? c.labelHi : c.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 3: CD4 & Viral Load */}
                <div className="border border-border/40 rounded-xl bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('cd4')}
                    className="w-full px-4 py-3 bg-canvas/40 hover:bg-canvas flex items-center justify-between text-xs font-bold text-ink cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Activity" className="w-4 h-4 text-plum" />
                      <span>{isHi ? 'CD4 काउंट / % एवं वायरल लोड' : 'CD4 Count / % & Viral Load'}</span>
                    </div>
                    <Icon
                      name={openAccordions.cd4 ? 'ChevronUp' : 'ChevronDown'}
                      className="w-4 h-4 text-ink-muted"
                    />
                  </button>

                  {openAccordions.cd4 && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-ink">{isHi ? 'CD4 काउंट (cells/mm³)' : 'CD4 Count'}</label>
                          {previousClinicalValues.cd4 && (
                            <span className="text-[10px] text-ink-muted font-mono">
                              prev: {previousClinicalValues.cd4}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={cd4Count}
                          onChange={(e) => setCd4Count(e.target.value)}
                          placeholder="e.g. 450"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/50 bg-canvas text-ink"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-ink">{isHi ? 'CD4 प्रतिशत (%)' : 'CD4 %'}</label>
                          {previousClinicalValues.cd4Pct && (
                            <span className="text-[10px] text-ink-muted font-mono">
                              prev: {previousClinicalValues.cd4Pct}%
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          value={cd4Pct}
                          onChange={(e) => setCd4Pct(e.target.value)}
                          placeholder="e.g. 25.0"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/50 bg-canvas text-ink"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-ink">{isHi ? 'वायरल लोड (copies/mL)' : 'Viral Load'}</label>
                          {previousClinicalValues.viralLoad !== undefined && (
                            <span className="text-[10px] text-ink-muted font-mono">
                              prev: {previousClinicalValues.viralLoad}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={viralLoad}
                          onChange={(e) => setViralLoad(e.target.value)}
                          placeholder="e.g. 0 or 200"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/50 bg-canvas text-ink"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 4: TB & ATT Status */}
                <div className="border border-border/40 rounded-xl bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('tb')}
                    className="w-full px-4 py-3 bg-canvas/40 hover:bg-canvas flex items-center justify-between text-xs font-bold text-ink cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Shield" className="w-4 h-4 text-plum" />
                      <span>{isHi ? 'टीबी / एटीटी उपचार स्थिति' : 'TB & ATT Treatment Status'}</span>
                    </div>
                    <Icon
                      name={openAccordions.tb ? 'ChevronUp' : 'ChevronDown'}
                      className="w-4 h-4 text-ink-muted"
                    />
                  </button>

                  {openAccordions.tb && (
                    <div className="p-4 border-t border-border/30 text-xs">
                      <label className="block text-[11px] font-bold text-ink mb-1.5">
                        {isHi ? 'क्या वर्तमान में ATT (एंटी-टीबी उपचार) पर हैं?' : 'Presently on ATT (Anti-TB Treatment)?'}
                      </label>
                      <select
                        value={tbAttStatus}
                        onChange={(e) => setTbAttStatus(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-canvas text-ink min-h-[44px]"
                      >
                        <option value="">{isHi ? '-- दर्ज नहीं किया गया --' : '-- Not recorded --'}</option>
                        <option value="yes">{isHi ? 'हाँ (Yes)' : 'Yes'}</option>
                        <option value="no">{isHi ? 'नहीं (No)' : 'No'}</option>
                        <option value="completed">{isHi ? 'उपचार पूर्ण हो चुका है' : 'Completed treatment'}</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Accordion 5: Social Welfare Schemes */}
                <div className="border border-border/40 rounded-xl bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('sws')}
                    className="w-full px-4 py-3 bg-canvas/40 hover:bg-canvas flex items-center justify-between text-xs font-bold text-ink cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="Gift" className="w-4 h-4 text-primary" />
                      <span>{isHi ? 'सामाजिक कल्याण योजना लिंकेज (SWS)' : 'Social Welfare Scheme Linkages (SWS)'}</span>
                    </div>
                    <Icon
                      name={openAccordions.sws ? 'ChevronUp' : 'ChevronDown'}
                      className="w-4 h-4 text-ink-muted"
                    />
                  </button>

                  {openAccordions.sws && (
                    <div className="p-4 border-t border-border/30 text-xs space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                        {(CHOICE_LISTS['sws'] || []).map((item) => (
                          <label key={item.code} className="flex items-center gap-2 p-2 rounded-lg bg-canvas border border-border/30 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedSws.includes(item.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSws([...selectedSws, item.code]);
                                } else {
                                  setSelectedSws(selectedSws.filter((x) => x !== item.code));
                                }
                              }}
                              className="rounded text-plum"
                            />
                            <span className="text-xs">{isHi ? item.labelHi : item.labelEn}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 6: Stigma & Discrimination */}
                <div className="border border-border/40 rounded-xl bg-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAccordion('stigma')}
                    className="w-full px-4 py-3 bg-canvas/40 hover:bg-canvas flex items-center justify-between text-xs font-bold text-ink cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="AlertTriangle" className="w-4 h-4 text-primary" />
                      <span>{isHi ? 'भेदभाव / कलंक का सामना' : 'Stigma & Discrimination Faced'}</span>
                    </div>
                    <Icon
                      name={openAccordions.stigma ? 'ChevronUp' : 'ChevronDown'}
                      className="w-4 h-4 text-ink-muted"
                    />
                  </button>

                  {openAccordions.stigma && (
                    <div className="p-4 border-t border-border/30 text-xs space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-ink mb-1.5">
                          {isHi ? 'क्या पिछले महीने में कोई भेदभाव का सामना किया?' : 'Faced any stigma or discrimination in the past month?'}
                        </label>
                        <select
                          value={stigmaFaced}
                          onChange={(e) => setStigmaFaced(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-canvas text-ink min-h-[44px]"
                        >
                          <option value="no">{isHi ? 'नहीं (No)' : 'No'}</option>
                          <option value="yes">{isHi ? 'हाँ (Yes)' : 'Yes'}</option>
                        </select>
                      </div>

                      {stigmaFaced === 'yes' && (
                        <div>
                          <label className="block text-[11px] font-bold text-ink mb-1.5">
                            {isHi ? 'किसके द्वारा (स्रोत चुनें)' : 'Source of discrimination (Select all that apply)'}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(CHOICE_LISTS['disc_from'] || []).map((s) => (
                              <label key={s.code} className="flex items-center gap-2 p-2 rounded-lg bg-canvas border border-border/30 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={stigmaSources.includes(s.code)}
                                  onChange={(e) => {
                                    if (e.target.checked) setStigmaSources([...stigmaSources, s.code]);
                                    else setStigmaSources(stigmaSources.filter((x) => x !== s.code));
                                  }}
                                  className="rounded text-plum"
                                />
                                <span className="text-xs">{isHi ? s.labelHi : s.labelEn}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* STEP 3: NEXT ACTION & PURPOSE (J5 PLANNING)                   */}
              {/* ------------------------------------------------------------- */}
              <div className="p-4 bg-lavender/20 border-2 border-border/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-ink font-comic">
                    {isHi ? '3. अगला फॉलो-अप एवं सेवा योजना (J5)' : '3. Next Action & Service Planning (J5)'}
                  </h3>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleNextAction}
                      onChange={(e) => setScheduleNextAction(e.target.checked)}
                      className="rounded text-plum"
                    />
                    <span>{isHi ? 'अगली कार्रवाई तय करें' : 'Schedule next follow-up'}</span>
                  </label>
                </div>

                {scheduleNextAction && (
                  <div className="space-y-3 pt-2 text-xs">
                    {/* Date Shortcuts */}
                    <div>
                      <span className="block text-[11px] font-bold text-ink mb-1.5">
                        {isHi ? 'अगली तारीख शॉर्टकट' : 'Next Action Date Shortcut'}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => applyDateShortcut(7, 'nextAction')}
                          className="py-1.5 px-2.5 text-xs font-bold rounded-lg border border-border/40 bg-surface hover:bg-canvas text-ink cursor-pointer min-h-[40px]"
                        >
                          {isHi ? '1 सप्ताह बाद' : 'In 1 week'}
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDateShortcut(14, 'nextAction')}
                          className="py-1.5 px-2.5 text-xs font-bold rounded-lg border border-border/40 bg-surface hover:bg-canvas text-ink cursor-pointer min-h-[40px]"
                        >
                          {isHi ? '2 सप्ताह बाद' : 'In 2 weeks'}
                        </button>
                        <button
                          type="button"
                          onClick={() => applyDateShortcut(30, 'nextAction')}
                          className="py-1.5 px-2.5 text-xs font-bold rounded-lg border border-border/40 bg-surface hover:bg-canvas text-ink cursor-pointer min-h-[40px]"
                        >
                          {isHi ? '1 माह बाद' : 'In 1 month'}
                        </button>
                        <input
                          type="date"
                          value={nextActionDate}
                          onChange={(e) => setNextActionDate(e.target.value)}
                          className="px-2 py-1.5 text-xs rounded-lg border border-border/50 bg-surface text-ink min-h-[40px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-ink mb-1">
                          {isHi ? 'फॉलो-अप उद्देश्य (J5 Purpose)' : 'Follow-up Purpose (J5)'}
                        </label>
                        <select
                          value={nextPurpose}
                          onChange={(e) => setNextPurpose(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-surface text-ink min-h-[44px]"
                        >
                          {(CHOICE_LISTS['purpose'] || []).map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.code}. {isHi ? p.labelHi : p.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-ink mb-1">
                          {isHi ? 'सेवा श्रेणी (Category)' : 'Service Category'}
                        </label>
                        <select
                          value={nextCategory}
                          onChange={(e) => {
                            setNextCategory(e.target.value);
                            setNextServiceCode('');
                          }}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-surface text-ink min-h-[44px]"
                        >
                          {(CHOICE_LISTS['svc_cat'] || []).map((c) => (
                            <option key={c.code} value={c.code}>
                              {isHi ? c.labelHi : c.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-ink mb-1">
                        {isHi ? 'विशिष्ट सेवा (114 सेवाओं में से खोजें)' : 'Specific Service Code (Search within category)'}
                      </label>
                      <select
                        value={nextServiceCode}
                        onChange={(e) => setNextServiceCode(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/50 bg-surface text-ink min-h-[44px]"
                      >
                        <option value="">{isHi ? '-- सेवा चुनें --' : '-- Select specific service --'}</option>
                        {servicesInCategory.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.code}: {isHi ? s.labelHi : s.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Completion Control */}
              <div className="p-3 bg-canvas/60 border border-border/40 rounded-xl flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-ink">
                  <input
                    type="checkbox"
                    checked={markTaskComplete}
                    onChange={(e) => setMarkTaskComplete(e.target.checked)}
                    className="rounded text-plum w-4 h-4"
                  />
                  <span>
                    {isHi ? 'इस वर्तमान फॉलो-अप कार्य को पूर्ण चिह्नित करें' : 'Mark this follow-up task complete'}
                  </span>
                </label>
                <span className="text-[10px] text-ink-muted">
                  {isHi ? 'केवल यही कार्य बंद होगा' : 'Closes only this task'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold text-ink-muted hover:text-ink min-h-[44px] px-3"
                >
                  {isHi ? 'रद्द करें' : 'Cancel'}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onNextClient && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveVisit(true)}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 border-border/40 bg-surface hover:bg-canvas text-ink text-xs font-bold transition-all min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isHi ? 'सहेजें और अगला' : 'Save & Next Client'}</span>
                      <Icon name="ChevronRight" className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveVisit(false)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all min-h-[48px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Icon name="check" className="w-4 h-4" />
                    <span>{isHi ? 'सहेजें और पूर्ण करें' : 'Save & Done'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
