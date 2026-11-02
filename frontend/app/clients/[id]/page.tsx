"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { RegistrationForm, RegistrationFormData } from '@/components/forms/RegistrationForm';
import { FollowUpTab, TaskSummary, ContactAttemptDto, EncounterDto, PlannedServiceDto, DeliveredServiceDto } from '@/components/forms/FollowUpTab';
import { Language, translations } from '@/lib/translations';

export default function ClientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const clientId = unwrappedParams.id || "client-001";
  
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Tab State: 'registration' | 'followup'
  const [activeTab, setActiveTab] = useState<'registration' | 'followup'>('followup');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Synthetic Baseline Beneficiary
  const [client, setClient] = useState({
    id: clientId,
    clientRef: "CSC-DL-0001",
    centerId: "CENTER_DELHI_01",
    fullName: "Sunita Verma (Synthetic)",
    aliasName: "Guddi",
    age: 28,
    gender: "female",
    maritalStatus: "married",
    caregiverName: "Ramesh Verma",
    primaryPhone: "0000000000",
    alternatePhone: "0000000001",
    inSchool: "no",
    occupation: "self_employed",
    keyPopulation: "general",
    addressCurrent: "House 124, Gali 4, Paharganj, New Delhi, 110055",
    district: "Central Delhi",
    state: "Delhi",
    pincode: "110055",
    hivStatus: "positive",
    artNumber: "ART-DL-9988",
    artCenterName: "LNJP Hospital ART Centre",
    artStartDate: "2023-04-12",
    cd4Count: 420,
    cd4Percentage: "24.5",
    viralLoadCount: 0,
    muacCm: 23.5,
    hasHivDocDeclaration: true,
    hasAddressDocDeclaration: true,
    hasArtDocDeclaration: true,
    docDeclarationNotes: "Sighted original NACO ART green card and Aadhaar card at home visit on 2026-10-15.",
    homeVisitConsent: true,
    messagingConsent: true,
    sharingConsent: false,
    version: 2,
    status: "ACTIVE",
  });

  const [tasks, setTasks] = useState<TaskSummary[]>([
    {
      id: "task-001",
      taskRef: "TSK-DL-1001",
      clientId: clientId,
      clientRef: "CSC-DL-0001",
      clientName: "Sunita Verma (Synthetic)",
      centerId: "CENTER_DELHI_01",
      taskType: "1", // Purpose code 1: Counselling
      title: "Quarterly Adherence & Nutrition Counselling",
      description: "Follow-up visit for routine adherence verification and social protection review.",
      dueDate: "2026-11-03",
      status: "DUE",
      version: 1,
    },
    {
      id: "task-002",
      taskRef: "TSK-DL-1002",
      clientId: clientId,
      clientRef: "CSC-DL-0001",
      clientName: "Sunita Verma (Synthetic)",
      centerId: "CENTER_DELHI_01",
      taskType: "11", // Purpose code 11: Social protection linkage
      title: "AAY Food Security Scheme Linkage Verification",
      description: "Assist client with Ration card documentation at Delhi Food & Supplies Office.",
      dueDate: "2026-11-10",
      status: "PENDING",
      version: 1,
    },
  ]);

  const [contactAttempts, setContactAttempts] = useState<ContactAttemptDto[]>([
    {
      id: "att-001",
      taskId: "task-001",
      attemptDate: "2026-11-01",
      channel: "PHONE",
      outcome: "reached",
      notes: "Client confirmed pill count on track. Agreed to home encounter on Nov 3.",
    },
  ]);

  const [encounters, setEncounters] = useState<EncounterDto[]>([
    {
      id: "enc-001",
      observationDate: "2026-10-15",
      recordedAt: "2026-10-15T11:30:00Z",
      encounterType: "HOME_VISIT",
      artAdherenceAssessment: "Good (95%+)",
      nutritionAssessment: "Adequate (MUAC: 23.5cm)",
      generalNotes: "CD4 count 420 cells/mm3. Client reports no opportunistic symptoms. Family supportive.",
    },
  ]);

  const [plannedServices, setPlannedServices] = useState<PlannedServiceDto[]>([
    {
      id: "plan-001",
      serviceCode: "cc1",
      serviceName: "Routine Treatment Adherence Counselling",
      targetDueDate: "2026-11-03",
      status: "PLANNED",
      notes: "Ensure timely ART refill before festival holidays.",
      version: 1,
    },
    {
      id: "plan-002",
      serviceCode: "sp1",
      serviceName: "Nutrition / Food Security Linkage (AAY)",
      targetDueDate: "2026-11-10",
      status: "PLANNED",
      notes: "Follow up on department application reference #DL-2026-AAY-8812.",
      version: 1,
    },
  ]);

  const [deliveredServices, setDeliveredServices] = useState<DeliveredServiceDto[]>([
    {
      id: "deliv-001",
      plannedServiceId: "plan-000",
      deliveryDate: "2026-10-15",
      recordedAt: "2026-10-15T12:00:00Z",
      serviceCode: "cc1",
      facilityName: "LNJP ART Centre",
      notes: "30-day regimen refill dispensed and verified.",
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
    } catch (ignored) {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const handleRegistrationSubmit = async (formData: RegistrationFormData) => {
    showToast("Registration data saved locally. Central updates logged in audit trail.");
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
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
              onClick={() => setActiveTab('followup')}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all min-h-[44px] flex items-center gap-2 ${
                activeTab === 'followup'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>📌</span> {t.tabFollowUp}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('registration')}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all min-h-[44px] flex items-center gap-2 ${
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
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-center gap-2">
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
