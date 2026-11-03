"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

function ClientRecordContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const isNewlyCreated = searchParams.get('created') === 'true';
  const initialEditMode = searchParams.get('edit') === 'true';

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Deep-linkable Tab State: 'registration' | 'followup'
  const [activeTab, setActiveTab] = useState<'registration' | 'followup'>(() => {
    if (initialTabParam === 'registration') return 'registration';
    return 'followup';
  });

  const [formMode, setFormMode] = useState<'view' | 'edit'>(initialEditMode ? 'edit' : 'view');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCreatedNotice, setShowCreatedNotice] = useState(isNewlyCreated);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictDiff, setConflictDiff] = useState<any | null>(null);

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
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;
      const res = await fetch(`/api/v1/clients/${clientId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setClient((prev) => ({
          ...prev,
          id: data.id,
          clientRef: data.clientRef,
          centerId: data.centerId,
          fullName: data.fullName,
          age: data.age,
          gender: data.gender,
          primaryPhone: data.primaryPhone,
          hivStatus: data.hivStatus,
          artNumber: data.artNumber,
          addressCurrent: data.addressCurrent,
          hasHivDocDeclaration: data.hasHivDocDeclaration,
          hasAddressDocDeclaration: data.hasAddressDocDeclaration,
          hasArtDocDeclaration: data.hasArtDocDeclaration,
          docDeclarationNotes: data.docDeclarationNotes,
          homeVisitConsent: data.homeVisitConsent,
          messagingConsent: data.messagingConsent,
          version: data.version,
        }));
        if (data.tasks) setTasks(data.tasks);
        if (data.contactAttempts) setContactAttempts(data.contactAttempts);
        if (data.encounters) setEncounters(data.encounters);
        if (data.plannedServices) setPlannedServices(data.plannedServices);
        if (data.deliveredServices) setDeliveredServices(data.deliveredServices);
      }
    } catch (_ignored) {}
  };

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  // Handle Profile Modification (PUT /api/v1/clients/{id}/profile)
  const handleProfileSubmit = async (formData: RegistrationFormData, changeReason?: string) => {
    setIsSubmitting(true);
    setConflictDiff(null);
    try {
      const idempotencyKey = `edit-${clientId}-${Date.now()}`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;

      const payload = {
        expectedVersion: client.version,
        changeReason: changeReason || 'Routine profile update',
        fullName: formData.a03_name || formData.a01_full_name || client.fullName,
        age: Number(formData.a04_age || formData.a03_age) || client.age,
        gender: formData.a05_gender || formData.a04_gender || client.gender,
        maritalStatus: formData.a06_marital || formData.a05_marital_status || client.maritalStatus,
        primaryPhone: formData.a11_phone || formData.a06_phone || client.primaryPhone,
        addressCurrent: formData.a09_address || formData.a07_address_current || client.addressCurrent,
        hivStatus: formData.c1_hiv_confirmed === 'yes' ? 'positive' : client.hivStatus,
        artNumber: formData.c9_art_no || formData.c03_art_number || client.artNumber,
        artCenterName: formData.c6_artc_name || formData.c04_art_center || client.artCenterName,
        cd4Count: formData.c12b_cd4_count ? Number(formData.c12b_cd4_count) : client.cd4Count,
        cd4Percentage: formData.c12b_cd4_pct || client.cd4Percentage,
        viralLoadCount: formData.c13b_vl_count ? Number(formData.c13b_vl_count) : client.viralLoadCount,
        hasHivDocDeclaration: Boolean(formData.j_doc_hiv ?? formData.j_hiv_doc_sighted),
        hasAddressDocDeclaration: Boolean(formData.j_doc_addr ?? formData.j_address_doc_sighted),
        hasArtDocDeclaration: Boolean(formData.j_doc_art ?? formData.j_art_doc_sighted),
        docDeclarationNotes: formData.j4_comments || formData.j_verifier_notes || client.docDeclarationNotes,
        homeVisitConsent: Boolean(formData.a01_consent ?? formData.a08_consent_home),
        messagingConsent: Boolean(formData.a01_consent ?? formData.a08_consent_sms),
        familyMembers: formData.b2_members || [],
        referralRequests: formData.d5_referrals || [],
      };

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
        const errJson = await res.json().catch(() => null);
        setConflictDiff(errJson || { message: 'Version conflict: Record was updated by another user.' });
        showToast('Version conflict (409): Another user modified this record concurrently.');
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Profile update failed');
      }

      const updated = await res.json();
      setClient((prev) => ({
        ...prev,
        version: updated.version || prev.version + 1,
        fullName: updated.fullName || prev.fullName,
      }));
      setFormMode('view');
      showToast('Profile revision successfully saved and recorded in audit log.');
      loadClientData();
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`);
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
      <div className="space-y-6">
        {/* Success Notice after New Registration */}
        {showCreatedNotice && (
          <div
            className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 text-xs text-emerald-950 flex items-center justify-between shadow-xs"
            role="status"
          >
            <div className="flex items-center gap-2.5">
              <Icon name="check" className="w-5 h-5 text-emerald-700 shrink-0" />
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
              className="text-emerald-800 hover:text-emerald-950 font-bold px-2 py-1"
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

        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/clients"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition-colors"
          >
            <Icon name="back" className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'वापस लाभार्थी सूची' : 'Back to Client Linelist'}</span>
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500">ID: {client.id}</span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
              {client.status}
            </span>
          </div>
        </div>

        {/* Client Header Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {client.fullName}
                </h1>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {client.clientRef}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {client.age} years • {client.gender.toUpperCase()} • Center:{' '}
                <strong className="font-mono text-slate-800">{client.centerId}</strong> • Version:{' '}
                <strong>v{client.version}</strong>
              </p>
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
                <p className="text-xs font-bold text-emerald-700">{client.cd4Count} cells/mm³</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500">Viral Load</p>
                <p className="text-xs font-bold text-blue-700">{client.viralLoadCount} copies/mL</p>
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
                    ? 'bg-emerald-700 text-white shadow-md'
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
                    ? 'bg-emerald-700 text-white shadow-md'
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
                    className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl border border-emerald-300 transition-colors min-h-[44px]"
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
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            className="fixed bottom-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2"
            role="status"
          >
            <Icon name="check" className="w-4 h-4 text-emerald-400" />
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
              initialData={{
                a03_name: client.fullName,
                a04_age: String(client.age),
                a05_gender: client.gender,
                a06_marital: client.maritalStatus,
                a11_phone: client.primaryPhone,
                a09_address: client.addressCurrent,
                a01_consent: client.homeVisitConsent,
                c1_hiv_confirmed: client.hivStatus === 'positive' ? 'yes' : 'no',
                c9_art_no: client.artNumber,
                c6_artc_name: client.artCenterName,
                c12b_cd4_count: String(client.cd4Count),
                c12b_cd4_pct: client.cd4Percentage,
                c13b_vl_count: String(client.viralLoadCount),
                j_doc_hiv: client.hasHivDocDeclaration,
                j_doc_addr: client.hasAddressDocDeclaration,
                j_doc_art: client.hasArtDocDeclaration,
                j4_comments: client.docDeclarationNotes,
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
            token={typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null}
            onActionCompleted={loadClientData}
            showToast={showToast}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function ClientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const clientId = unwrappedParams.id || "client-001";

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading client record...</div>}>
      <ClientRecordContent clientId={clientId} />
    </Suspense>
  );
}
