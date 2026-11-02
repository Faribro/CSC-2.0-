"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { RegistrationForm, RegistrationFormData } from '@/components/forms/RegistrationForm';
import { SectionIndexRunner, SectionProgress } from '@/components/forms/SectionIndexRunner';
import { Language, translations } from '@/lib/translations';

const DRAFT_STORAGE_KEY = 'csc_crf_draft';

const defaultFormData: RegistrationFormData = {
  a01_full_name: '',
  a02_dob: '',
  a03_age: '30',
  a04_gender: 'female',
  a05_marital_status: '1',
  a06_phone: '',
  a07_address_current: '',
  a08_consent_status: true,
  a08_consent_home: true,
  a08_consent_sms: true,

  b2_members: [],

  c01_hiv_status: 'positive',
  c02_art_status: 'on_art',
  c03_art_number: '',
  c04_art_center: 'LNJP Hospital ART Centre Delhi',
  c05_regimen_line: '1',
  c06_cd4_count: '',
  c07_cd4_percent: '',
  c08_viral_load: '',

  d01_ration_card: '',
  d02_pension: '',
  d03_insurance: '',
  d04_legal_aid: '',
  d5_referrals: [],

  e01_kp_group: '',
  e02_sub_pop: '',
  e03_risk_level: '',

  f01_experienced_stigma: 'no',
  f02_stigma_setting: '',
  f03_action_taken: '',

  g01_has_disability: 'no',
  g02_disability_type: '',
  g03_cert_available: '',

  h01_status: 'alive',
  h02_date_of_death: '',
  h03_cause: '',

  j_hiv_doc_sighted: true,
  j_art_doc_sighted: true,
  j_address_doc_sighted: true,
  j_caste_doc_sighted: false,
  j_income_doc_sighted: false,
  j_verification_date: new Date().toISOString().split('T')[0],
  j_verifier_notes: 'Physical originals verified during intake visit.',
};

export default function NewClientRegistrationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [centerId, setCenterId] = useState('CENTER_DELHI_01');
  const [formData, setFormData] = useState<RegistrationFormData>(defaultFormData);
  const [activeSection, setActiveSection] = useState('sec-a');
  const [saveStatus, setSaveStatus] = useState<'saved_locally' | 'queued' | 'accepted_by_server'>('saved_locally');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.centerId) setCenterId(parsed.centerId);
      }
    } catch (ignored) {}
  }, []);

  // Save draft locally
  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData, centerId }));
      setSaveStatus('saved_locally');
      showToast(t.savedLocally);
    } catch (e) {
      alert('Could not save draft locally');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const sectionList: SectionProgress[] = [
    {
      id: 'sec-a',
      code: 'A',
      titleEn: 'A. Basic Profile',
      titleHi: 'A. बुनियादी प्रोफ़ाइल',
      completedFields: formData.a01_full_name ? 5 : 2,
      totalFields: 6,
      hasErrors: false,
    },
    {
      id: 'sec-b',
      code: 'B',
      titleEn: 'B. Family & Dependents',
      titleHi: 'B. परिवार व आश्रित',
      completedFields: formData.b2_members.length,
      totalFields: Math.max(1, formData.b2_members.length),
      hasErrors: false,
    },
    {
      id: 'sec-c',
      code: 'C',
      titleEn: 'C. Testing & Treatment',
      titleHi: 'C. जांच और उपचार',
      completedFields: formData.c03_art_number ? 4 : 2,
      totalFields: 5,
      hasErrors: false,
    },
    {
      id: 'sec-d',
      code: 'D',
      titleEn: 'D. Social Protection',
      titleHi: 'D. सामाजिक सुरक्षा',
      completedFields: formData.d5_referrals.length,
      totalFields: 4,
      hasErrors: false,
    },
    {
      id: 'sec-e',
      code: 'E',
      titleEn: 'E. Key Population',
      titleHi: 'E. मुख्य समूह',
      completedFields: formData.e01_kp_group ? 2 : 1,
      totalFields: 3,
      hasErrors: false,
    },
    {
      id: 'sec-f',
      code: 'F',
      titleEn: 'F. Stigma & Discrimination',
      titleHi: 'F. कलंक और भेदभाव',
      completedFields: 1,
      totalFields: 2,
      hasErrors: false,
    },
    {
      id: 'sec-g',
      code: 'G',
      titleEn: 'G. Disability Assessment',
      titleHi: 'G. विकलांगता मूल्यांकन',
      completedFields: 1,
      totalFields: 2,
      hasErrors: false,
    },
    {
      id: 'sec-h',
      code: 'H',
      titleEn: 'H. Out-Migration / Death',
      titleHi: 'H. प्रवास / मृत्यु',
      completedFields: 1,
      totalFields: 2,
      hasErrors: false,
    },
    {
      id: 'sec-j',
      code: 'J',
      titleEn: 'J. Verification & Declarations',
      titleHi: 'J. सत्यापन और घोषणा',
      completedFields: 3,
      totalFields: 3,
      hasErrors: false,
    },
  ];

  // Final Submission to Backend API
  const handleConfirmSubmit = async () => {
    if (!formData.a01_full_name || !centerId) {
      alert('Please fill at least Beneficiary Full Name and Center ID before submitting.');
      setShowReviewModal(false);
      return;
    }

    setIsSubmitting(true);
    setSaveStatus('queued');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('csc_token') : null;

      // Transform form data to match Backend RegisterClientRequest
      const payload = {
        centerId: centerId,
        registrationDate: new Date().toISOString().split('T')[0],
        clientType: '1',
        fullName: formData.a01_full_name,
        age: Number(formData.a03_age) || 30,
        gender: formData.a04_gender || 'female',
        maritalStatus: formData.a05_marital_status || null,
        primaryPhone: formData.a06_phone || null,
        addressCurrent: formData.a07_address_current || null,
        hivStatus: formData.c01_hiv_status || 'positive',
        artNumber: formData.c03_art_number || null,
        artCenterName: formData.c04_art_center || null,
        cd4Count: formData.c06_cd4_count ? Number(formData.c06_cd4_count) : null,
        cd4Percentage: formData.c07_cd4_percent ? Number(formData.c07_cd4_percent) : null,
        viralLoadCount: formData.c08_viral_load ? Number(formData.c08_viral_load) : null,
        hasHivDocDeclaration: Boolean(formData.j_hiv_doc_sighted),
        hasAddressDocDeclaration: Boolean(formData.j_address_doc_sighted),
        hasArtDocDeclaration: Boolean(formData.j_art_doc_sighted),
        docDeclarationNotes: formData.j_verifier_notes || null,
        homeVisitConsent: Boolean(formData.a08_consent_home),
        messagingConsent: Boolean(formData.a08_consent_sms),
        sharingConsent: false,
        familyMembers: (formData.b2_members || []).map((m) => ({
          name: m.name || 'Family Member',
          relationship: m.relationship || 'other',
          age: Number(m.age) || 0,
          gender: m.gender || 'other',
          hivStatus: m.hivStatus || 'unknown',
          artNumber: m.artNumber || null,
        })),
        referralRequests: (formData.d5_referrals || []).map((r) => ({
          serviceCategory: r.category || 'social_protection',
          targetFacility: r.facility || 'Local Agency',
          reason: r.notes || 'Linkage assistance',
          referralDate: new Date().toISOString().split('T')[0],
        })),
      };

      const res = await fetch('/api/v1/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Registration submission failed');
      }

      const receipt = await res.json();
      setSaveStatus('accepted_by_server');
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      showToast(t.serverAccepted);

      // Redirect to newly registered client's detail page with created notification
      setTimeout(() => {
        router.push(`/clients/${receipt.resourceId || 'client-001'}?tab=registration&created=true`);
      }, 1000);
    } catch (err: any) {
      alert(`Submission error: ${err.message}. Changes remain saved locally.`);
      setSaveStatus('saved_locally');
    } finally {
      setIsSubmitting(false);
      setShowReviewModal(false);
    }
  };

  return (
    <AppShell
      currentLang={lang}
      onLanguageChange={setLang}
      activeClient={{
        clientRef: 'DRAFT',
        fullName: formData.a01_full_name || 'New Beneficiary (Unsaved)',
        centerId: centerId,
        age: Number(formData.a03_age) || 30,
        gender: formData.a04_gender || 'female',
        saveStatus: saveStatus,
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
            <span className="text-xs font-semibold text-slate-500">Center:</span>
            <select
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              className="text-xs font-mono font-bold border border-slate-300 rounded px-2 py-1 bg-white"
            >
              <option value="CENTER_DELHI_01">CENTER_DELHI_01</option>
              <option value="CENTER_MUMBAI_01">CENTER_MUMBAI_01</option>
            </select>
          </div>
        </div>

        {/* Section Index Runner + Registration Form Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sticky Sidebar Index Runner */}
          <div className="lg:col-span-1">
            <SectionIndexRunner
              sections={sectionList}
              activeSectionId={activeSection}
              onSelectSection={setActiveSection}
              lang={lang}
              saveStatus={saveStatus}
              onSaveDraft={handleSaveDraft}
              onReviewSubmit={() => setShowReviewModal(true)}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Main Scrollable Form */}
          <div className="lg:col-span-3">
            <RegistrationForm
              initialData={formData}
              lang={lang}
              onDataChange={(data) => {
                setFormData(data);
                setSaveStatus('saved_locally');
              }}
              onSubmit={() => setShowReviewModal(true)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>

        {/* Review Before Submit Modal */}
        {showReviewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 text-left border border-slate-200 my-8">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {t.reviewBeforeSubmit}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify all intake details before submitting to central PostgreSQL repository.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs">
                {/* Basic Profile */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Section A: Basic Profile</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      Full Name: <strong>{formData.a01_full_name || 'N/A'}</strong>
                    </div>
                    <div>
                      Age / Gender:{' '}
                      <strong>
                        {formData.a03_age} yrs, {formData.a04_gender}
                      </strong>
                    </div>
                    <div>
                      Primary Phone: <strong>{formData.a06_phone || 'None'}</strong>
                    </div>
                    <div>
                      Center ID: <strong>{centerId}</strong>
                    </div>
                  </div>
                </div>

                {/* Clinical */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">Section C: Testing & Treatment</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      HIV Status: <strong>{formData.c01_hiv_status || 'N/A'}</strong>
                    </div>
                    <div>
                      ART Number: <strong>{formData.c03_art_number || 'Pending'}</strong>
                    </div>
                    <div>
                      ART Center: <strong>{formData.c04_art_center || 'LNJP Hospital'}</strong>
                    </div>
                    <div>
                      CD4 Count: <strong>{formData.c06_cd4_count || 'Not entered'}</strong>
                    </div>
                  </div>
                </div>

                {/* Declarations */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">{t.declarationsTitle}</h4>
                  <ul className="space-y-1">
                    <li>
                      HIV Document Sighted:{' '}
                      <strong>{formData.j_hiv_doc_sighted ? '✓ Yes' : '✗ No'}</strong>
                    </li>
                    <li>
                      ART Prescription Sighted:{' '}
                      <strong>{formData.j_art_doc_sighted ? '✓ Yes' : '✗ No'}</strong>
                    </li>
                    <li>
                      Address Proof Sighted:{' '}
                      <strong>{formData.j_address_doc_sighted ? '✓ Yes' : '✗ No'}</strong>
                    </li>
                  </ul>
                </div>

                {/* Consents */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-2">{t.consentTitle}</h4>
                  <ul className="space-y-1">
                    <li>
                      Home Visit Consent:{' '}
                      <strong>{formData.a08_consent_home ? '✓ Granted' : '✗ Withheld'}</strong>
                    </li>
                    <li>
                      SMS / Messaging Consent:{' '}
                      <strong>{formData.a08_consent_sms ? '✓ Granted' : '✗ Withheld'}</strong>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
                >
                  Back to Editing
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-md min-h-[44px]"
                >
                  {isSubmitting ? 'Submitting...' : t.confirmSubmit}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMessage && (
          <div
            className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-2xl border border-slate-700 flex items-center gap-2"
            role="status"
          >
            <span className="text-emerald-400">✓</span> {toastMessage}
          </div>
        )}
      </div>
    </AppShell>
  );
}
