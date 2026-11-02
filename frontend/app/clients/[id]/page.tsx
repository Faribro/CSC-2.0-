"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ContactAttemptModal } from '@/components/ContactAttemptModal';
import { EncounterModal } from '@/components/EncounterModal';
import { ServicePlanModal } from '@/components/ServicePlanModal';
import { Language, translations } from '@/lib/translations';

export default function ClientCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [activeModal, setActiveModal] = useState<'attempt' | 'encounter' | 'plan' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synthetic Beneficiary Data
  const client = {
    id: unwrappedParams.id || "client-001",
    clientRef: "CSC-DL-0001",
    fullName: "Sunita Verma (Synthetic)",
    age: 28,
    gender: "female",
    centerId: "CENTER_DELHI_01",
    primaryPhone: "0000000000",
    hivStatus: "positive",
    artNumber: "ART-DL-9988",
    artCenter: "LNJP Hospital ART Centre",
    artStartDate: "2023-04-12",
    cd4Count: 420,
    cd4Percentage: "24.5%",
    viralLoad: 0,
    address: "House 124, Gali 4, Paharganj, New Delhi, 110055",
    version: 2,
    
    // Declarations (yes/no boolean attestations)
    declarations: {
      hasHivDoc: true,
      hasArtDoc: true,
      hasAddressDoc: true,
      notes: "Sighted original NACO ART green card and Aadhaar card at home visit on 2026-10-15."
    },
    
    // Consents
    consents: {
      homeVisit: true,
      messaging: true,
      sharing: false
    },

    // Timeline Events
    timeline: [
      {
        id: "ev-01",
        date: "2026-11-01",
        type: "CONTACT_ATTEMPT",
        title: "Phone Follow-Up Attempt",
        badge: "REACHED",
        badgeColor: "bg-emerald-100 text-emerald-800",
        notes: "Client confirmed pill count on track. Confirmed scheduled visit for November 3."
      },
      {
        id: "ev-02",
        date: "2026-10-18",
        type: "DELIVERED_SERVICE",
        title: "Service Delivered: Monthly ART Refill",
        badge: "DELIVERED",
        badgeColor: "bg-emerald-100 text-emerald-800",
        notes: "Dispensed 30 days regimen at LNJP ART Center. Recorded by Staff Worker."
      },
      {
        id: "ev-03",
        date: "2026-10-15",
        type: "ENCOUNTER",
        title: "Clinical Encounter (Home Visit)",
        badge: "ENCOUNTER",
        badgeColor: "bg-blue-100 text-blue-800",
        notes: "Observation Date: 2026-10-15. CD4 Count: 420 cells/mm3. Nutrition adequate. Good family support."
      },
      {
        id: "ev-04",
        date: "2026-09-20",
        type: "REFERRAL",
        title: "Referral Request: Antyodaya Anna Yojana",
        badge: "REFERRED",
        badgeColor: "bg-purple-100 text-purple-800",
        notes: "Referred to District Food & Supplies Department for subsidized nutrition support."
      }
    ]
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <Navbar
        currentLang={lang}
        onLanguageChange={setLang}
        centerId={client.centerId}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl border border-slate-700" role="status">
          ✓ {toastMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link href="/work" className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1">
            ← Back to My Work
          </Link>
        </div>

        {/* Client Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-extrabold text-slate-900">{client.fullName}</h2>
                <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {client.clientRef}
                </span>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {client.age} years • {client.gender.toUpperCase()} • Center: <strong>{client.centerId}</strong> • Version: <strong>v{client.version}</strong>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('attempt')}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-sm"
              >
                + {t.recordContactAttempt}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('encounter')}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
              >
                + {t.recordEncounter}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('plan')}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
              >
                + {t.planService}
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Profile & Declarations Left, Timeline Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Clinical Baseline & Sighted Declarations */}
          <div className="space-y-6">
            {/* Clinical Needs Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                Clinical Baseline (CRF Section C)
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">HIV Status:</dt>
                  <dd className="font-bold text-slate-800">{client.hivStatus.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">ART Number:</dt>
                  <dd className="font-mono font-bold text-slate-800">{client.artNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">ART Center:</dt>
                  <dd className="font-medium text-slate-800">{client.artCenter}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Latest CD4 Count:</dt>
                  <dd className="font-bold text-blue-700">{client.cd4Count} cells/mm³ ({client.cd4Percentage})</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Viral Load:</dt>
                  <dd className="font-bold text-emerald-700">{client.viralLoad} copies/mL (Target Achieved)</dd>
                </div>
              </dl>
            </div>

            {/* Document Sighted Declarations (Boolean Attestations) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                {t.declarationsTitle}
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 italic">
                Declarations are physical yes/no sight attestations recorded by field staff. No document uploads required.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-700 font-medium">{t.hivDeclaration}</span>
                  <span className="font-bold text-emerald-700">✓ Sighted</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-700 font-medium">{t.artDeclaration}</span>
                  <span className="font-bold text-emerald-700">✓ Sighted</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                  <span className="text-slate-700 font-medium">{t.addrDeclaration}</span>
                  <span className="font-bold text-emerald-700">✓ Sighted</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-3 bg-blue-50 p-2.5 rounded border border-blue-100">
                <strong>Attestation Note:</strong> {client.declarations.notes}
              </p>
            </div>

            {/* Consents */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                {t.consentTitle}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">{t.homeVisitConsent}</span>
                  <span className="font-bold text-emerald-700">GRANTED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">{t.messagingConsent}</span>
                  <span className="font-bold text-emerald-700">GRANTED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Chronological Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                {t.timelineTitle}
              </h3>

              <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                {client.timeline.map(ev => (
                  <div key={ev.id} className="relative pl-6">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-4 border-blue-600" />
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-900">{ev.title}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${ev.badgeColor}`}>
                          {ev.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">Event Date: <strong>{ev.date}</strong></p>
                      <p className="text-xs text-slate-700">{ev.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ContactAttemptModal
        isOpen={activeModal === 'attempt'}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => {
          showToast(`${t.recordContactAttempt}: ${data.outcome.toUpperCase()}. ${t.serverAccepted}`);
          setActiveModal(null);
        }}
        lang={lang}
        clientName={client.fullName}
        clientRef={client.clientRef}
      />
      <EncounterModal
        isOpen={activeModal === 'encounter'}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => {
          showToast(`${t.recordEncounter}: ${t.serverAccepted}`);
          setActiveModal(null);
        }}
        lang={lang}
        clientName={client.fullName}
        clientRef={client.clientRef}
      />
      <ServicePlanModal
        isOpen={activeModal === 'plan'}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => {
          showToast(`${t.planService}: ${data.serviceName} registered as PLANNED.`);
          setActiveModal(null);
        }}
        lang={lang}
        clientName={client.fullName}
        clientRef={client.clientRef}
      />
    </div>
  );
}
