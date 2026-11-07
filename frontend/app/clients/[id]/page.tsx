"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RegistrationForm, RegistrationFormData } from '@/components/forms/RegistrationForm';
import {
  FollowUpTab,
  TaskSummary,
  ContactAttemptDto,
  EncounterDto,
  PlannedServiceDto,
  DeliveredServiceDto,
} from '@/components/forms/FollowUpTab';
import { FollowUpModal } from '@/components/forms/FollowUpModal';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

function ClientRecordContent({ clientId }: { clientId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const modeParam = searchParams.get('mode');
  const isNewlyCreated = searchParams.get('created') === 'true';
  const initialEditMode = searchParams.get('edit') === 'true' || modeParam === 'edit';

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Deep-linkable Tab State: 'registration' | 'followup'
  const [activeTab, setActiveTab] = useState<'registration' | 'followup'>(() => {
    if (initialTabParam === 'registration' || modeParam === 'view' || modeParam === 'edit') return 'registration';
    return 'followup';
  });

  const [formMode, setFormMode] = useState<'view' | 'edit'>(initialEditMode ? 'edit' : 'view');
  const [profileData, setProfileData] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCreatedNotice, setShowCreatedNotice] = useState(isNewlyCreated);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictDiff, setConflictDiff] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('csc_token'));
    }
  }, []);

  // Fast & Friendly Follow-up Modal State
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<'select' | 'attempt' | 'reschedule' | 'visit'>('select');
  const [activeFollowUpTask, setActiveFollowUpTask] = useState<TaskSummary | null>(null);

  // Handle opening follow up modal
  const handleOpenFollowUp = (mode: 'select' | 'attempt' | 'reschedule' | 'visit', targetTask?: TaskSummary | null) => {
    setModalInitialMode(mode);
    setActiveFollowUpTask(targetTask || (tasks.length > 0 ? tasks[0] : null));
    setIsFollowUpModalOpen(true);
  };

  // Handle navigating to next client in linelist
  const handleNextClient = () => {
    setIsFollowUpModalOpen(false);
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('csc2_filtered_client_ids');
        if (stored) {
          const ids: string[] = JSON.parse(stored);
          const currentIndex = ids.indexOf(clientId);
          if (currentIndex !== -1 && currentIndex + 1 < ids.length) {
            router.push(`/clients/${ids[currentIndex + 1]}?tab=followup`);
            return;
          }
        }
      } catch {
        // Fallback
      }
    }
    router.push('/work');
  };

  // Sync tab with browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'registration') {
        setActiveTab('registration');
      } else {
        setActiveTab('followup');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (newTab: 'registration' | 'followup') => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab === 'registration' ? 'registration' : 'follow-up');
      url.searchParams.delete('created');
      window.history.pushState(null, '', url.toString());
    }
  };

  // Baseline Beneficiary State
  const [client, setClient] = useState({
    id: clientId,
    clientRef: "CSC-DL-0001",
    centerId: "CENTER_DELHI_01",
    fullName: "Aarav Sharma",
    aliasName: "Sonu",
    age: 34,
    gender: "male",
    maritalStatus: "1",
    caregiverName: "Radha Sharma",
    primaryPhone: "9811001101",
    alternatePhone: "9811001102",
    inSchool: "no",
    occupation: "daily_wage",
    occupationOther: "",
    keyPopulation: "none",
    addressCurrent: "House 42, Gali 3, Daryaganj, Central Delhi, 110002",
    district: "Central Delhi",
    state: "Delhi",
    pincode: "110002",
    hivStatus: "positive",
    artNumber: "DL-LNJP-4021",
    artCenterName: "LNJP Hospital ART Centre Delhi",
    artStartDate: "2024-04-12",
    cd4Count: 420,
    cd4Percentage: "24.5",
    viralLoadCount: 0,
    muacCm: 24.0,
    hasHivDocDeclaration: true,
    hasAddressDocDeclaration: true,
    hasArtDocDeclaration: true,
    docDeclarationNotes: "Physical originals of Green Card and Voter ID sighted at intake visit.",
    homeVisitConsent: true,
    messagingConsent: true,
    sharingConsent: false,
    version: 1,
    status: "ACTIVE",
    registrationDate: "",
    revisions: [] as any[],
  });

  const [tasks, setTasks] = useState<TaskSummary[]>([
    {
      id: "task-001",
      taskRef: "TSK-DL-TD-01",
      clientId: clientId,
      clientRef: "CSC-DL-0001",
      clientName: "Aarav Sharma",
      centerId: "CENTER_DELHI_01",
      taskType: "1",
      title: "Purpose 01: ART adherence support and pill count verification",
      description: "Routine monthly adherence counseling and pill count check.",
      dueDate: new Date().toISOString().split('T')[0],
      status: "DUE",
      version: 0,
    },
    {
      id: "task-002",
      taskRef: "TSK-DL-UP-01",
      clientId: clientId,
      clientRef: "CSC-DL-0001",
      clientName: "Aarav Sharma",
      centerId: "CENTER_DELHI_01",
      taskType: "8",
      title: "Purpose 08: Social protection scheme linkage assistance",
      description: "Ration card linkage and food security assistance.",
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: "PENDING",
      version: 0,
    },
  ]);

  const [contactAttempts, setContactAttempts] = useState<ContactAttemptDto[]>([
    {
      id: "att-001",
      taskId: "task-001",
      attemptDate: new Date().toISOString().split('T')[0],
      channel: "PHONE",
      outcome: "reached",
      notes: "Beneficiary confirmed adherence. Will attend centre tomorrow.",
    },
  ]);

  const [encounters, setEncounters] = useState<EncounterDto[]>([
    {
      id: "enc-001",
      observationDate: "2026-10-15",
      recordedAt: "2026-10-15T11:30:00Z",
      encounterType: "CSC_VISIT",
      artAdherenceAssessment: "GOOD (>95%)",
      nutritionAssessment: "NORMAL",
      generalNotes: "Initial counseling conducted. Patient motivated to adhere.",
    },
  ]);

  const [plannedServices, setPlannedServices] = useState<PlannedServiceDto[]>([
    {
      id: "plan-001",
      serviceCode: "1",
      serviceName: "Adherence Support & Verification",
      targetDueDate: new Date().toISOString().split('T')[0],
      status: "PLANNED",
      notes: "Monthly adherence check",
      version: 1,
    },
  ]);

  const [deliveredServices, setDeliveredServices] = useState<DeliveredServiceDto[]>([
    {
      id: "deliv-001",
      plannedServiceId: "plan-001",
      deliveryDate: "2026-10-15",
      recordedAt: "2026-10-15T12:00:00Z",
      serviceCode: "1",
      facilityName: "LNJP Hospital ART Centre Delhi",
      notes: "Adherence counseling completed.",
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadClientData = async () => {
    try {
      // 0. Check for offline pending submissions
      if (typeof window !== 'undefined' && (clientId.startsWith('offline-') || clientId.startsWith('local-'))) {
        const queue = JSON.parse(localStorage.getItem('csc2_pending_offline_submissions') || '[]');
        const found = queue.find((q: any) => q.id === clientId);
        if (found && found.payload) {
          const p = found.payload;
          setClient((prev) => ({
            ...prev,
            id: clientId,
            clientRef: p.clientRef || 'LOCAL-DRAFT',
            centerId: p.centerId || 'Saved Locally',
            fullName: p.fullName || 'Unsynced Beneficiary',
            age: p.age || 30,
            gender: p.gender || 'male',
            primaryPhone: p.primaryPhone || '',
            addressCurrent: p.addressCurrent || '',
            district: p.district || '',
            state: p.state || '',
            pincode: p.pincode || '',
            hivStatus: p.hivStatus || 'positive',
            artNumber: p.artNumber || '',
            version: 1,
            revisions: [],
          }));
          return;
        }
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') || localStorage.getItem('csc2_auth_token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch full profile (A-J, repeats, revisions, version)
      try {
        const pRes = await fetch(`/api/v1/clients/${clientId}/profile`, { headers });
        if (pRes.ok) {
          const p = await pRes.json();
          setProfileData(p);
          setClient((prev) => ({
            ...prev,
            id: p.id,
            clientRef: p.clientRef,
            centerId: p.centerId,
            fullName: p.fullName,
            aliasName: p.aliasName || '',
            age: p.age,
            gender: p.gender,
            maritalStatus: p.maritalStatus || '1',
            caregiverName: p.caregiverName || '',
            primaryPhone: p.primaryPhone || '',
            alternatePhone: p.alternatePhone || '',
            inSchool: p.inSchool || 'no',
            occupation: p.occupation || '',
            occupationOther: p.occupationOther || '',
            keyPopulation: p.keyPopulation || 'none',
            addressCurrent: p.addressCurrent || '',
            district: p.district || '',
            state: p.state || '',
            pincode: p.pincode || '',
            hivStatus: p.hivStatus || 'positive',
            artNumber: p.artNumber || '',
            artCenterName: p.artCenterName || '',
            artStartDate: p.artStartDate || '',
            cd4Count: p.cd4Count || 0,
            cd4Percentage: p.cd4Percentage ? String(p.cd4Percentage) : '',
            viralLoadCount: p.viralLoadCount || 0,
            muacCm: p.muacCm ? Number(p.muacCm) : 0,
            hasHivDocDeclaration: p.hasHivDocDeclaration ?? true,
            hasAddressDocDeclaration: p.hasAddressDocDeclaration ?? true,
            hasArtDocDeclaration: p.hasArtDocDeclaration ?? true,
            docDeclarationNotes: p.docDeclarationNotes || '',
            homeVisitConsent: p.homeVisitConsent ?? true,
            messagingConsent: p.messagingConsent ?? true,
            sharingConsent: p.sharingConsent ?? false,
            version: p.version || 1,
            status: p.status || 'ACTIVE',
            registrationDate: p.registrationDate || '',
            revisions: p.revisions || [],
          }));
        }
      } catch (_pErr) {}

      // 2. Fetch tasks, attempts, encounters, planned services
      try {
        const res = await fetch(`/api/v1/clients/${clientId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.tasks) setTasks(data.tasks);
          if (data.contactAttempts) setContactAttempts(data.contactAttempts);
          if (data.encounters) setEncounters(data.encounters);
          if (data.plannedServices) setPlannedServices(data.plannedServices);
          if (data.deliveredServices) setDeliveredServices(data.deliveredServices);
        }
      } catch (_dErr) {}
    } catch (_ignored) {}
  };

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  // Deep-link action handler (e.g. from Forms Tab "Record visit" CTA button)
  useEffect(() => {
    const action = searchParams.get('action');
    const taskId = searchParams.get('taskId');
    if (action) {
      if (action === 'record') setModalInitialMode('visit');
      else if (action === 'attempt') setModalInitialMode('attempt');
      else if (action === 'reschedule') setModalInitialMode('reschedule');
      else setModalInitialMode('select');

      if (taskId && tasks.length > 0) {
        const found = tasks.find((t) => t.id === taskId);
        if (found) setActiveFollowUpTask(found);
      }
      setIsFollowUpModalOpen(true);
    }
  }, [searchParams, tasks]);

  // Calculate Last Contact Summary for header
  const lastContactSummary = React.useMemo(() => {
    if (encounters && encounters.length > 0) {
      const latest = encounters[0];
      return lang === 'hi'
        ? `अंतिम संपर्क: ${latest.observationDate} (${latest.encounterType})`
        : `Last contact: ${latest.observationDate} via ${latest.encounterType.replace('_', ' ')}`;
    }
    if (contactAttempts && contactAttempts.length > 0) {
      const latest = contactAttempts[0];
      return lang === 'hi'
        ? `अंतिम संपर्क प्रयास: ${latest.attemptDate} (${latest.outcome})`
        : `Last contact attempt: ${latest.attemptDate} (${latest.outcome})`;
    }
    return lang === 'hi' ? 'कोई पूर्व संपर्क दर्ज नहीं है' : 'No previous contact recorded';
  }, [encounters, contactAttempts, lang]);

  // Handle Profile Modification (PUT /api/v1/clients/{id}/profile)
  const handleProfileSubmit = async (formData: RegistrationFormData, changeReason?: string) => {
    setIsSubmitting(true);
    setConflictDiff(null);
    try {
      const idempotencyKey = `edit-${clientId}-${Date.now()}`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') || localStorage.getItem('csc2_auth_token') : null;

      const payload = {
        expectedVersion: client.version,
        changeReason: changeReason || 'Routine profile update',
        fullName: formData.a03_name || client.fullName,
        aliasName: formData.a03_alias || client.aliasName,
        age: Number(formData.a04_age) || client.age,
        gender: formData.a05_gender || client.gender,
        maritalStatus: formData.a06_marital || client.maritalStatus,
        caregiverName: formData.a16_caretaker || client.caregiverName,
        primaryPhone: formData.a11_phone || client.primaryPhone,
        alternatePhone: formData.a11_alt_phone || client.alternatePhone,
        inSchool: formData.a18_in_school || client.inSchool,
        occupation: formData.a19_occupation || client.occupation,
        occupationOther: formData.a19_occupation_other || client.occupationOther,
        keyPopulation: formData.a14_kp || client.keyPopulation,
        addressCurrent: formData.a09_address || client.addressCurrent,
        district: client.district,
        state: client.state,
        pincode: formData.a10_pincode || client.pincode,
        hivStatus: formData.c1_hiv_confirmed === 'yes' ? 'positive' : client.hivStatus,
        artNumber: formData.c9_art_no || client.artNumber,
        artCenterName: formData.c6_artc_name || client.artCenterName,
        artStartDate: formData.c9_art_date || client.artStartDate,
        cd4Count: Number(formData.c12b_cd4_count) || client.cd4Count,
        cd4Percentage: formData.c12b_cd4_pct ? Number(formData.c12b_cd4_pct) : client.cd4Percentage,
        viralLoadCount: Number(formData.c13b_vl_count) || client.viralLoadCount,
        hasHivDocDeclaration: Boolean(formData.j_doc_hiv),
        hasAddressDocDeclaration: Boolean(formData.j_doc_addr),
        hasArtDocDeclaration: Boolean(formData.j_doc_art),
        docDeclarationNotes: formData.j4_comments || client.docDeclarationNotes,
        homeVisitConsent: formData.a01_consent === 'yes' || formData.a01_consent === true,
        messagingConsent: true,
        sharingConsent: false,
        clientRef: client.clientRef,
        familyMembers: (formData.b2_members || []).map((m) => ({
          name: m.name,
          relationship: m.relationship,
          age: Number(m.age) || 0,
          gender: m.gender,
          hivStatus: m.hivStatus,
          artNumber: m.artNumber,
        })),
        referralRequests: (formData.d5_referrals || []).map((r) => ({
          serviceCategory: r.category,
          facilityName: r.facility,
          targetDueDate: r.targetDueDate,
          status: r.status,
          notes: r.notes,
        })),
      };

      // Check if browser is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const queueKey = 'csc2_pending_offline_updates';
        const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
        queue.push({
          clientId,
          payload,
          idempotencyKey,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem(queueKey, JSON.stringify(queue));
        showToast(lang === 'hi' ? 'ऑफ़लाइन: संशोधन इस डिवाइस पर सहेजा गया।' : 'Offline: Changes saved on this device (queued for sync).');
        setFormMode('view');
        return;
      }

      const res = await fetch(`/api/v1/clients/${clientId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const conflict = await res.json().catch(() => ({}));
        setConflictDiff(conflict);
        alert(
          lang === 'hi'
            ? `समवर्ती संशोधन संघर्ष: रिकॉर्ड को किसी अन्य उपयोगकर्ता द्वारा संशोधित किया गया है (सर्वर संस्करण v${conflict.currentVersion || 'new'})। कृपया पृष्ठ ताज़ा करें।`
            : `Concurrent modification conflict: This record was modified elsewhere (current server version is v${conflict.currentVersion || 'higher'}). Please refresh before saving.`
        );
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Profile update failed');
      }

      const receipt = await res.json();
      setClient((prev) => ({
        ...prev,
        version: receipt.version || prev.version + 1,
      }));
      setFormMode('view');
      showToast(lang === 'hi' ? `संशोधन v${receipt.version} सफलतापूर्वक सहेजा गया!` : `Profile updated to revision v${receipt.version} successfully!`);
      await loadClientData();
    } catch (err: any) {
      if (!navigator.onLine || err.message?.includes('fetch')) {
        const queueKey = 'csc2_pending_offline_updates';
        const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
        queue.push({
          clientId,
          payload: { expectedVersion: client.version, ...formData },
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem(queueKey, JSON.stringify(queue));
        showToast(lang === 'hi' ? 'ऑफ़लाइन: संशोधन इस डिवाइस पर सहेजा गया।' : 'Offline: Changes saved on this device (queued for sync).');
        setFormMode('view');
      } else {
        alert(`Error updating profile: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      currentLang={lang}
      onLanguageChange={setLang}
      activeClient={{
        clientRef: client.clientRef,
        fullName: client.fullName,
        centerId: client.centerId,
        age: client.age,
        gender: client.gender,
        saveStatus: 'saved_locally',
      }}
    >
      <div className="space-y-6 pb-28 sm:pb-8">
        {/* Success Notice after New Registration */}
        {showCreatedNotice && (
          <div
            className="bg-mint/40 border-2 border-mint rounded-xl p-4 text-xs text-success-ink flex items-center justify-between shadow-xs"
            role="status"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="check" className="w-5 h-5 text-success-ink shrink-0" />
              <div>
                <strong className="font-bold text-sm block">
                  Beneficiary Registration Successfully Completed!
                </strong>
                <span>
                  Permanent Client Reference: <strong className="font-mono">{client.clientRef}</strong> • Logged to Central PostgreSQL and queued for sync.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCreatedNotice(false)}
              className="text-success-ink hover:text-ink font-bold px-2 py-1"
            >
              <Icon name="cancel" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 409 Conflict Notice Banner */}
        {conflictDiff && (
          <div
            className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 text-xs text-rose-950 shadow-md space-y-2"
            role="alert"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="AlertTriangle" className="w-5 h-5 text-rose-600" />
                <strong className="text-sm font-bold">
                  Concurrency Conflict (HTTP 409): Record Modified on Server
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setConflictDiff(null)}
                className="text-rose-700 hover:text-rose-900 font-bold"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>
            <p className="text-rose-800">
              The record version has advanced on the server. Your current edits have been preserved in the form below. Please review changes before resubmitting.
            </p>
          </div>
        )}

        {/* Navigation Breadcrumb (Back button hidden on mobile since AppShell provides bottom navigation) */}
        <div className="flex items-center justify-between">
          <Link
            href="/clients"
            className="hidden md:flex text-xs font-semibold text-plum hover:text-primary items-center gap-1.5 transition-colors"
          >
            <Icon name="back" className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'वापस लाभार्थी सूची' : 'Back to Client Linelist'}</span>
          </Link>
          <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
            <span className="text-[11px] font-mono text-slate-500">ID: {client.id}</span>
            <span className="text-xs font-bold bg-mint text-success-ink px-2.5 py-0.5 rounded-full border border-mint">
              {client.status}
            </span>
          </div>
        </div>

        {/* Client Header Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-comic">
                  {client.fullName}
                </h1>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {client.clientRef}
                </span>

                {/* Call button: shown ONLY on this client detail page */}
                {client.primaryPhone && (
                  <a
                    href={`tel:${client.primaryPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mint/50 hover:bg-mint text-success-ink font-bold text-xs border border-mint shadow-2xs transition-colors min-h-[40px] cursor-pointer"
                    title={lang === 'hi' ? 'लाभार्थी को कॉल करें' : 'Call Beneficiary'}
                  >
                    <Icon name="Phone" className="w-4 h-4 text-success-ink" />
                    <span>{lang === 'hi' ? 'कॉल करें' : 'Call'} ({client.primaryPhone})</span>
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {client.age} years • {client.gender.toUpperCase()} • Center:{' '}
                <strong className="font-mono text-slate-800">{client.centerId}</strong> • Version:{' '}
                <strong>v{client.version}</strong>
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-slate-400">•</span>
                <span className="text-plum font-bold bg-lavender/40 px-2 py-0.5 rounded-md border border-border/30">
                  {lastContactSummary}
                </span>
              </div>
            </div>

            {/* Quick Clinical Metrics */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500">ART Number</p>
                <p className="text-xs font-mono font-bold text-slate-900">{client.artNumber || 'N/A'}</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500">Latest CD4</p>
                <p className="text-xs font-bold text-success-ink">{client.cd4Count} cells/mm³</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500">Viral Load</p>
                <p className="text-xs font-bold text-plum">{client.viralLoadCount} copies/mL</p>
              </div>
            </div>
          </div>

          {/* TWO TABS NAVIGATION SELECTOR */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleTabChange('followup')}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 ${
                  activeTab === 'followup'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Icon name="Activity" className="w-4 h-4" />
                <span>{t.tabFollowUp}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('registration')}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 ${
                  activeTab === 'registration'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Icon name="file" className="w-4 h-4" />
                <span>{t.tabRegistration}</span>
              </button>
            </div>

            {/* Mode Toggle when in Registration Tab */}
            {activeTab === 'registration' && (
              <div className="flex items-center gap-2">
                {formMode === 'view' ? (
                  <button
                    type="button"
                    onClick={() => setFormMode('edit')}
                    className="inline-flex items-center gap-1.5 bg-mint/40 hover:bg-mint text-success-ink text-xs font-bold px-3.5 py-2 rounded-xl border border-mint transition-colors min-h-[44px]"
                  >
                    <Icon name="edit" className="w-4 h-4" />
                    <span>{lang === 'hi' ? 'संशोधन करें (Edit)' : 'Edit Registration'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFormMode('view')}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 transition-colors min-h-[44px]"
                  >
                    <Icon name="view" className="w-4 h-4" />
                    <span>{lang === 'hi' ? 'केवल देखें (View Mode)' : 'View Mode'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Action Bar on Desktop when in Follow-up Tab */}
            {activeTab === 'followup' && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  data-testid="action-record-visit"
                  onClick={() => handleOpenFollowUp('visit')}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <Icon name="CheckCircle" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'विज़िट दर्ज करें' : 'Record visit'}</span>
                </button>
                <button
                  type="button"
                  data-testid="action-could-not-reach"
                  onClick={() => handleOpenFollowUp('attempt')}
                  className="px-3 py-2 rounded-xl border border-border/40 bg-surface text-ink hover:bg-canvas text-xs font-bold flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <Icon name="PhoneOff" className="w-4 h-4 text-primary" />
                  <span>{lang === 'hi' ? 'संपर्क नहीं हुआ' : 'Could not reach'}</span>
                </button>
                <button
                  type="button"
                  data-testid="action-reschedule"
                  onClick={() => handleOpenFollowUp('reschedule')}
                  className="px-3 py-2 rounded-xl border border-border/40 bg-surface text-ink hover:bg-canvas text-xs font-bold flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                >
                  <Icon name="Calendar" className="w-4 h-4 text-plum" />
                  <span>{lang === 'hi' ? 'रीशेड्यूल' : 'Reschedule'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className="fixed bottom-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2"
            role="status"
          >
            <Icon name="check" className="w-4 h-4 text-mint" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: REGISTRATION (Sections A–H and J on one scrollable centered page) */}
        {activeTab === 'registration' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2">
              <Icon name="help" className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>{t.tabRegistration}:</strong> Showing baseline registration data from intake.
                Per CSC guidelines, routine visits and encounters do not re-record registration.
              </span>
            </div>

            <RegistrationForm
              mode={formMode}
              version={client.version}
              clientRef={client.clientRef}
              revisions={client.revisions}
              onBackToList={() => router.push('/clients')}
              initialData={{
                a01_reg_date: client.registrationDate || new Date().toISOString().split('T')[0],
                a02_reg_place: '1',
                a03_name: client.fullName,
                a03_alias: client.aliasName,
                a04_age: String(client.age),
                a05_gender: client.gender,
                a06_marital: client.maritalStatus,
                a09_address: client.addressCurrent,
                a10_csc_name: client.centerId,
                a10_pincode: client.pincode,
                a11_phone: client.primaryPhone,
                a11_alt_phone: client.alternatePhone,
                a14_kp: client.keyPopulation,
                a16_caretaker: client.caregiverName,
                a18_in_school: client.inSchool,
                a19_occupation: client.occupation,
                a19_occupation_other: client.occupationOther,
                a01_consent: client.homeVisitConsent ? 'yes' : 'no',
                c1_hiv_confirmed: client.hivStatus === 'positive' || client.hivStatus === 'confirmed' ? 'yes' : 'no',
                c6_artc_name: client.artCenterName,
                c9_art_no: client.artNumber,
                c9_art_date: client.artStartDate,
                c12b_cd4_count: String(client.cd4Count || ''),
                c12b_cd4_pct: client.cd4Percentage ? String(client.cd4Percentage) : '',
                c13b_vl_count: String(client.viralLoadCount || ''),
                j_doc_hiv: client.hasHivDocDeclaration,
                j_doc_addr: client.hasAddressDocDeclaration,
                j_doc_art: client.hasArtDocDeclaration,
                j4_comments: client.docDeclarationNotes,
                b2_members: profileData?.familyMembers?.length
                  ? profileData.familyMembers.map((fm: any, idx: number) => ({
                      id: fm.id || `fm-${idx}`,
                      name: fm.name,
                      relationship: fm.relationship || 'other',
                      age: String(fm.age || ''),
                      gender: fm.gender || 'male',
                      living: '1',
                      hivStatus: fm.hivStatus || 'negative',
                      artNumber: fm.artNumber || '',
                    }))
                  : undefined,
                d5_referrals: profileData?.referralRequests?.length
                  ? profileData.referralRequests.map((r: any, idx: number) => ({
                      id: r.id || `ref-${idx}`,
                      category: r.serviceCategory || 'social_protection',
                      facility: r.facilityName || '',
                      targetDueDate: r.targetDueDate || '',
                      status: r.status || 'PENDING',
                      notes: r.notes || '',
                    }))
                  : undefined,
                j5_services: plannedServices?.length
                  ? plannedServices.map((ps: any, idx: number) => ({
                      id: ps.id || `ps-${idx}`,
                      category: ps.serviceCode || '1',
                      service: ps.serviceName || 'Follow-up service',
                      targetDueDate: ps.targetDueDate || '',
                      facility: '',
                      notes: ps.notes || '',
                    }))
                  : undefined,
              }}
              lang={lang}
              onSubmit={handleProfileSubmit}
              onCancel={() => setFormMode('view')}
              onSwitchToEdit={() => setFormMode('edit')}
              canEdit={true}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {/* TAB 2: FOLLOW-UP (Six Sub-sections) */}
        {activeTab === 'followup' && (
          <FollowUpTab
            client={client}
            tasks={tasks}
            contactAttempts={contactAttempts}
            encounters={encounters}
            plannedServices={plannedServices}
            deliveredServices={deliveredServices}
            lang={lang}
            token={token}
            onActionCompleted={loadClientData}
            showToast={showToast}
          />
        )}

        {/* Sticky Bottom Action Bar on Mobile: Record visit | Could not reach | Reschedule */}
        <div className="fixed bottom-14 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t-2 border-border/40 p-3 sm:hidden shadow-comic flex items-center justify-around gap-2">
          <button
            type="button"
            data-testid="action-record-visit"
            onClick={() => handleOpenFollowUp('visit')}
            className="flex-1 px-3 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-xs flex items-center justify-center gap-1 min-h-[48px] cursor-pointer"
          >
            <Icon name="Activity" className="w-4 h-4" />
            <span>{lang === 'hi' ? 'विज़िट दर्ज करें' : 'Record visit'}</span>
          </button>
          <button
            type="button"
            data-testid="action-could-not-reach"
            onClick={() => handleOpenFollowUp('attempt')}
            className="flex-1 px-3 py-2.5 rounded-xl border border-border/40 bg-surface text-ink hover:bg-canvas text-xs font-bold flex items-center justify-center gap-1 min-h-[48px] cursor-pointer"
          >
            <Icon name="PhoneOff" className="w-4 h-4 text-primary" />
            <span>{lang === 'hi' ? 'संपर्क नहीं हुआ' : 'Could not reach'}</span>
          </button>
          <button
            type="button"
            data-testid="action-reschedule"
            onClick={() => handleOpenFollowUp('reschedule')}
            className="flex-1 px-3 py-2.5 rounded-xl border border-border/40 bg-surface text-ink hover:bg-canvas text-xs font-bold flex items-center justify-center gap-1 min-h-[48px] cursor-pointer"
          >
            <Icon name="Calendar" className="w-4 h-4 text-plum" />
            <span>{lang === 'hi' ? 'रीशेड्यूल' : 'Reschedule'}</span>
          </button>
        </div>

        {/* Fast & Friendly Follow-Up Outcome Modal */}
        <FollowUpModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          clientId={client.id}
          clientRef={client.clientRef}
          clientName={client.fullName}
          task={activeFollowUpTask}
          initialMode={modalInitialMode}
          lastContactSummary={lastContactSummary}
          previousClinicalValues={{
            cd4: client.cd4Count,
            cd4Pct: client.cd4Percentage,
            viralLoad: client.viralLoadCount,
          }}
          lang={lang}
          onSaved={(res) => {
            showToast(res.message);
            loadClientData();
          }}
          onNextClient={handleNextClient}
        />
      </div>
    </AppShell>
  );
}

export default function ClientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const clientId = unwrappedParams.id || "client-001";

  return (
    <ClientOnly
      fallback={
        <div suppressHydrationWarning className="min-h-screen bg-canvas flex items-center justify-center p-8 text-xs font-bold text-slate-500">
          Loading client record...
        </div>
      }
    >
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading client record...</div>}>
        <ClientRecordContent clientId={clientId} />
      </Suspense>
    </ClientOnly>
  );
}
