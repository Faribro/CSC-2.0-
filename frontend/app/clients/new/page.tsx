"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { RegistrationForm, RegistrationFormData } from '@/components/forms/RegistrationForm';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

const DRAFT_STORAGE_KEY = 'csc_crf_draft';

export default function NewClientRegistrationPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [centerId, setCenterId] = useState('CENTER_DELHI_01');
  const [formData, setFormData] = useState<Partial<RegistrationFormData>>({});
  const [saveStatus, setSaveStatus] = useState<'saved_locally' | 'queued' | 'accepted_by_server'>('saved_locally');
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
    } catch (_ignored) {}
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveDraft = (data: RegistrationFormData) => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData: data, centerId }));
      setSaveStatus('saved_locally');
      showToast(t.savedLocally);
    } catch (_e) {
      alert('Could not save draft locally');
    }
  };

  // Final Submission to Backend API
  const handleSubmit = async (submittedData: RegistrationFormData) => {
    const fullName = submittedData.a03_name || submittedData.a01_full_name || 'New Beneficiary';
    if (!centerId) {
      alert('Please select a Center ID before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSaveStatus('queued');

    try {
      const jwtToken = typeof window !== 'undefined' ? (localStorage.getItem('csc_token') || localStorage.getItem('csc2_auth_token')) : null;
      const deviceToken = typeof window !== 'undefined' ? localStorage.getItem('csc2_device_session_token') : null;

      // Transform form data to match Backend RegisterClientRequest
      const payload = {
        centerId: centerId,
        registrationDate: submittedData.a01_reg_date || submittedData.a02_reg_date || new Date().toISOString().split('T')[0],
        clientType: submittedData.a13_client_type || '1',
        fullName: fullName,
        age: Number(submittedData.a04_age) || 30,
        gender: submittedData.a05_gender === '1' ? 'male' : (submittedData.a05_gender === '3' ? 'transgender' : 'female'),
        maritalStatus: submittedData.a06_marital || null,
        primaryPhone: submittedData.a11_phone || null,
        addressCurrent: submittedData.a09_address || null,
        hivStatus: submittedData.c1_hiv_confirmed === 'yes' ? 'positive' : 'negative',
        artNumber: submittedData.c9_art_no || null,
        artCenterName: submittedData.c6_artc_name || null,
        cd4Count: submittedData.c12b_cd4_count ? Number(submittedData.c12b_cd4_count) : null,
        cd4Percentage: submittedData.c12b_cd4_pct ? Number(submittedData.c12b_cd4_pct) : null,
        viralLoadCount: submittedData.c13b_vl_count ? Number(submittedData.c13b_vl_count) : null,
        hasHivDocDeclaration: Boolean(submittedData.j_doc_hiv),
        hasAddressDocDeclaration: Boolean(submittedData.j_doc_addr),
        hasArtDocDeclaration: Boolean(submittedData.j_doc_art),
        docDeclarationNotes: submittedData.j4_comments || null,
        homeVisitConsent: Boolean(submittedData.a01_consent),
        messagingConsent: Boolean(submittedData.a01_consent),
        sharingConsent: false,
        familyMembers: (submittedData.b2_members || []).map((m) => ({
          name: m.name || 'Family Member',
          relationship: m.relationship || 'other',
          age: Number(m.age) || 0,
          gender: m.gender || 'other',
          hivStatus: m.hivStatus || 'unknown',
          artNumber: m.artNumber || null,
        })),
        referralRequests: (submittedData.d5_referrals || []).map((r) => ({
          serviceCategory: r.category || 'social_protection',
          targetFacility: r.facility || 'Local Agency',
          reason: r.notes || 'Linkage assistance',
          referralDate: new Date().toISOString().split('T')[0],
        })),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }
      if (deviceToken) {
        headers['X-Device-Session'] = deviceToken;
      }

      // Check if browser is explicitly offline before attempting network call
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData: submittedData, centerId }));
        const pendingQueueKey = 'csc2_pending_offline_submissions';
        try {
          const currentQueue = JSON.parse(localStorage.getItem(pendingQueueKey) || '[]');
          currentQueue.push({
            id: 'offline-' + Date.now(),
            type: 'client_registration',
            payload,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem(pendingQueueKey, JSON.stringify(currentQueue));
        } catch (_qErr) {}
        setSaveStatus('saved_locally');
        showToast(lang === 'hi' ? 'ऑफ़लाइन: डेटा इस डिवाइस पर सुरक्षित रूप से सहेजा गया।' : 'Offline: Form saved on this device (queued for sync).');
        return;
      }

      const res = await fetch('/api/v1/clients', {
        method: 'POST',
        headers,
        credentials: 'include',
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
      const isNetworkOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData: submittedData, centerId }));
      setSaveStatus('saved_locally');
      if (isNetworkOffline || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        showToast(lang === 'hi' ? 'ऑफ़लाइन: डेटा इस डिवाइस पर सुरक्षित रूप से सहेजा गया।' : 'Offline: Form saved on this device (queued for sync).');
      } else {
        alert(`Submission error: ${err.message}. Draft remains saved locally.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientOnly
      fallback={
        <div suppressHydrationWarning className="min-h-screen bg-canvas flex items-center justify-center p-8 text-xs font-bold text-slate-500">
          Loading registration form...
        </div>
      }
    >
      <AppShell
        currentLang={lang}
        onLanguageChange={setLang}
        activeClient={{
          clientRef: 'DRAFT',
          fullName: formData.a03_name || 'New Beneficiary (Unsaved)',
          centerId: centerId,
          age: Number(formData.a04_age) || 30,
          gender: formData.a05_gender || 'female',
          saveStatus: saveStatus,
        }}
      >
        <div className="space-y-6">
          {/* Navigation Breadcrumb & Center Selector (Hidden on mobile, visible on desktop) */}
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-4xl mx-auto w-full">
            <Link
              href="/clients"
              className="text-xs font-semibold text-plum hover:text-primary flex items-center gap-1.5 transition-colors"
            >
              <Icon name="back" className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'वापस लाभार्थी सूची' : 'Back to Client Linelist'}</span>
            </Link>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500">Center:</span>
              <select
                value={centerId}
                onChange={(e) => setCenterId(e.target.value)}
                className="text-xs font-mono font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white shadow-2xs focus:ring-2 focus:ring-plum focus:outline-hidden"
              >
                <option value="CENTER_DELHI_01">CENTER_DELHI_01 (Delhi Central)</option>
                <option value="CENTER_MUMBAI_01">CENTER_MUMBAI_01 (Mumbai South)</option>
              </select>
            </div>
          </div>

          {/* Centered Enketo Form Layout (No desktop sidebar) */}
          <div className="w-full">
            <RegistrationForm
              mode="create"
              initialData={formData}
              lang={lang}
              onDataChange={(data) => {
                setFormData(data);
                setSaveStatus('saved_locally');
              }}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onCancel={() => router.push('/clients')}
            />
          </div>

          {/* Toast Message */}
          {toastMessage && (
            <div
              id="csc-toast-message"
              className="fixed bottom-28 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-slate-900/95 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 backdrop-blur-md"
              role="status"
            >
              <Icon name="check" className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      </AppShell>
    </ClientOnly>
  );
}
