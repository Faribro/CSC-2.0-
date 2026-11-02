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

function ClientRecordContent({ clientId }: { clientId: string }) {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const isNewlyCreated = searchParams.get('created') === 'true';

  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Deep-linkable Tab State: 'registration' | 'followup'
  const [activeTab, setActiveTab] = useState<'registration' | 'followup'>(() => {
    if (initialTabParam === 'registration') return 'registration';
    return 'followup';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCreatedNotice, setShowCreatedNotice] = useState(isNewlyCreated);

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

  // Synthetic Baseline Beneficiary
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
      taskType: "1", // Purpose code 1: ART adherence
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
      taskType: "8", // Purpose code 8: Social protection
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
    } catch (ignored) {}
  };

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const handleRegistrationSubmit = async (formData: RegistrationFormData) => {
    showToast("Registration updates recorded in client audit trail.");
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
              <span className="text-xl">✓</span>
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
              ✕
            </button>
          </div>
        )}

        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/clients"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 transition-colors"
          >
            ← {lang === 'hi' ? 'वापस लाभार्थी सूची' : 'Back to Client Linelist'}
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500">ID: {client.id}</span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
              {client.status}
            </span>
          </div>
        </div>

        {/* Client Header Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
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
          <div className="border-t border-slate-100 pt-4 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleTabChange('followup')}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 ${
                activeTab === 'followup'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>📌</span> {t.tabFollowUp}
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
              <span>📝</span> {t.tabRegistration}
            </button>
          </div>
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

        {/* TAB 1: REGISTRATION (Sections A–H and J on one scrollable page) */}
        {activeTab === 'registration' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                <strong>{t.tabRegistration}:</strong> Showing baseline registration data from intake.
                Per CSC guidelines, routine visits and encounters do not re-record registration.
              </span>
            </div>
            <RegistrationForm
              initialData={{
                a01_full_name: client.fullName,
                a03_age: String(client.age),
                a04_gender: client.gender,
                a05_marital_status: client.maritalStatus,
                a06_phone: client.primaryPhone,
                a07_address_current: client.addressCurrent,
                a08_consent_status: true,
                a08_consent_home: client.homeVisitConsent,
                a08_consent_sms: client.messagingConsent,
                c01_hiv_status: client.hivStatus,
                c03_art_number: client.artNumber,
                c04_art_center: client.artCenterName,
                c06_cd4_count: String(client.cd4Count),
                c07_cd4_percent: client.cd4Percentage,
                c08_viral_load: String(client.viralLoadCount),
                j_hiv_doc_sighted: client.hasHivDocDeclaration,
                j_address_doc_sighted: client.hasAddressDocDeclaration,
                j_art_doc_sighted: client.hasArtDocDeclaration,
                j_verifier_notes: client.docDeclarationNotes,
              }}
              lang={lang}
              onDataChange={() => {}}
              onSubmit={handleRegistrationSubmit}
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
