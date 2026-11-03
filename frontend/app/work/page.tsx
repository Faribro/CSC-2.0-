'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Language, translations } from '@/lib/translations';

interface DraftRecord {
  id: string;
  clientRef?: string;
  fullName: string;
  age?: number;
  gender?: string;
  lastSavedAt: string;
  progressPercent: number;
}

export default function FormsWorkspacePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // Local draft states
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [waitingSyncCount, setWaitingSyncCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);

  // Active user state
  const [fieldUser, setFieldUser] = useState<{ id: string; firstName: string; phone: string; status: string } | null>(null);

  // Load drafts and counts from local storage & server
  const loadWorkspaceData = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Load local field user
    const storedUser = localStorage.getItem('csc2_field_user');
    if (storedUser) {
      try {
        setFieldUser(JSON.parse(storedUser));
      } catch {}
    }

    // Load local drafts
    try {
      const storedDrafts = localStorage.getItem('csc2_local_drafts');
      if (storedDrafts) {
        const parsed = JSON.parse(storedDrafts);
        if (Array.isArray(parsed)) {
          setDrafts(parsed);
        }
      }
    } catch {}

    // Load local waiting queue
    try {
      const queue = localStorage.getItem('csc2_sync_outbox');
      if (queue) {
        const parsedQueue = JSON.parse(queue);
        setWaitingSyncCount(Array.isArray(parsedQueue) ? parsedQueue.length : 0);
      }
    } catch {}

    // Fetch authoritative counts from server
    fetch('/api/v1/clients?page=0&size=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.totalElements === 'number') {
          setSubmittedCount(data.totalElements);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadWorkspaceData();

    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setFieldUser(customEvent.detail);
      }
    };
    window.addEventListener('csc2:field_user_updated', handleUserUpdated);
    return () => {
      window.removeEventListener('csc2:field_user_updated', handleUserUpdated);
    };
  }, [loadWorkspaceData]);

  // Handle Primary "Start New Registration" Action
  const handleStartNewRegistration = () => {
    let currentUser = fieldUser;
    if (!currentUser && typeof window !== 'undefined') {
      const stored = localStorage.getItem('csc2_field_user');
      if (stored) {
        try {
          currentUser = JSON.parse(stored);
          setFieldUser(currentUser);
        } catch {}
      }
    }

    if (!currentUser) {
      // Trigger phone verification modal via custom window event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('csc2:open_phone_verification', {
            detail: { targetUrl: '/clients/new' },
          })
        );
      }
      return;
    }
    router.push('/clients/new');
  };

  // Delete a local draft
  const handleDeleteDraft = (draftId: string) => {
    if (typeof window === 'undefined') return;
    const updated = drafts.filter((d) => d.id !== draftId);
    setDrafts(updated);
    localStorage.setItem('csc2_local_drafts', JSON.stringify(updated));
  };

  return (
    <AppShell
      currentLang={lang}
      onLanguageChange={setLang}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Playful Hero Illustration Banner */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-mint/40 via-lavender/30 to-peach/40 border-2 border-border/40 p-6 sm:p-8 shadow-comic">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-plum text-[11px] font-black border border-border/40 mb-2 shadow-2xs">
                <Icon name="Heart" className="w-3.5 h-3.5 text-primary" />
                <span>{lang === 'hi' ? 'केयर एंड सपोर्ट सेंटर मिशन' : 'Care & Support Mission'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight font-comic">
                CSC 2.0
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
                {lang === 'hi'
                  ? 'दैनिक फील्ड विज़िट, पोषण मूल्यांकन, और कल्याणकारी सेवाओं की ट्रैकिंग के लिए अधिकृत पोर्टल।'
                  : 'Fast, offline-ready intake and follow-up platform for community outreach workers.'}
              </p>
            </div>

            {/* Primary CTA Button (48px Touch Target) */}
            <button
              type="button"
              onClick={handleStartNewRegistration}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-black rounded-[14px] shadow-comic transition-all active:scale-[0.98] min-h-[48px] shrink-0 cursor-pointer"
            >
              <Icon name="Plus" className="w-5 h-5 stroke-[2.5]" />
              <span>{lang === 'hi' ? '+ नया पंजीकरण शुरू करें' : '+ Start New Registration'}</span>
            </button>
          </div>

          {/* Decorative Comic Garden Graphics (Accessible aria-hidden) */}
          <div className="absolute right-4 bottom-2 opacity-25 pointer-events-none hidden md:block" aria-hidden="true">
            <svg width="180" height="70" viewBox="0 0 180 70" fill="none">
              <circle cx="30" cy="50" r="20" fill="#BFEBDD" />
              <circle cx="80" cy="45" r="25" fill="#FFD166" />
              <circle cx="140" cy="48" r="22" fill="#E4D8F7" />
              <path d="M10 65 Q 90 40 170 65" stroke="#7B3F8C" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Status / Needs Attention Banner */}
        {fieldUser && fieldUser.status === 'PENDING' && (
          <div className="p-4 bg-sun/30 border-2 border-sun rounded-[16px] text-warning-ink shadow-comic flex items-start gap-3">
            <div className="p-2 bg-surface rounded-full text-warning-ink shrink-0 mt-0.5">
              <Icon name="AlertTriangle" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">
                {lang === 'hi' ? 'राज्य टीम अनुमोदन लंबित है' : 'State Team Approval Pending'}
              </h3>
              <p className="text-xs mt-0.5 leading-relaxed">
                {lang === 'hi'
                  ? `आपका नंबर (${fieldUser.phone}) सत्यापित है। आप स्थानीय ड्राफ्ट बना सकते हैं। अनुमोदन के बाद सर्वर सबमिशन सक्रिय हो जाएगा।`
                  : `Your phone number (${fieldUser.phone}) is verified. You can create and save local drafts on this device now; server submissions will activate automatically once your State Team approves your number.`}
              </p>
            </div>
          </div>
        )}

        {/* 3 Summary Cards (Comic Style Tints, Rounded Corners, Soft Shadows) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Unfinished Forms (Local Drafts) */}
          <div className="bg-surface border-2 border-border/40 rounded-[16px] p-4 shadow-comic flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-ink border border-border/30">
                  <Icon name="FileText" className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-mint/50 text-ink px-2 py-0.5 rounded-full border border-mint">
                  local
                </span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-ink mb-1">
                {lang === 'hi' ? 'अधूरे फॉर्म (ड्राफ्ट)' : 'Unfinished Forms'}
              </h3>
              <div className="text-3xl font-black text-ink font-mono mb-2">
                {drafts.length}
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {lang === 'hi'
                  ? 'इस डिवाइस पर सहेजे गए ड्राफ्ट पूर्ण होने की प्रतीक्षा कर रहे हैं।'
                  : 'Drafts saved on this device awaiting completion.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30">
              <button
                type="button"
                onClick={() => {
                  const elem = document.getElementById('in-progress-drafts-section');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-bold text-plum hover:text-primary flex items-center gap-1 cursor-pointer"
              >
                <span>{lang === 'hi' ? 'ड्राफ्ट देखें' : 'Resume drafts'}</span>
                <Icon name="ChevronRight" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Queued / Retryable Sync (Local Outbox) */}
          <div className="bg-surface border-2 border-border/40 rounded-[16px] p-4 shadow-comic flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center text-plum border border-border/30">
                  <Icon name="Clock" className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-lavender text-plum px-2 py-0.5 rounded-full border border-lavender">
                  outbox
                </span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-ink mb-1">
                {lang === 'hi' ? 'सिंक कतार' : 'Queued Sync'}
              </h3>
              <div className="text-3xl font-black text-ink font-mono mb-2">
                {waitingSyncCount}
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {lang === 'hi'
                  ? 'सर्वर कनेक्शन की प्रतीक्षा में कतारबद्ध रिकॉर्ड।'
                  : 'Surveys queued to dispatch once online reconnection occurs.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30">
              <span className="text-xs font-bold text-ink-muted">
                {waitingSyncCount === 0 ? (lang === 'hi' ? 'सब सिंक है' : 'All synced') : (lang === 'hi' ? 'कतार सक्रिय है' : 'Outbox active')}
              </span>
            </div>
          </div>

          {/* Card 3: Submitted (Server Confirmed) */}
          <div className="bg-surface border-2 border-border/40 rounded-[16px] p-4 shadow-comic flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-peach flex items-center justify-center text-ink border border-border/30">
                  <Icon name="CheckCircle" className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-peach/60 text-ink px-2 py-0.5 rounded-full border border-peach">
                  confirmed
                </span>
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-ink mb-1">
                {lang === 'hi' ? 'रिकॉर्ड और फॉलो-अप' : 'Records & Follow-ups'}
              </h3>
              <div className="text-3xl font-black text-ink font-mono mb-2">
                {submittedCount}
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {lang === 'hi'
                  ? 'सर्वर द्वारा पुष्ट किए गए आपके रिकॉर्ड और फॉलो-अप।'
                  : 'Authoritative beneficiary records verified on server.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/30">
              <Link
                href="/clients"
                className="text-xs font-bold text-plum hover:text-primary flex items-center gap-1 cursor-pointer"
              >
                <span>{lang === 'hi' ? 'रिकॉर्ड और फॉलो-अप खोलें' : 'View records & follow-ups'}</span>
                <Icon name="ChevronRight" className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Section: My In-Progress Drafts */}
        <section id="in-progress-drafts-section" className="bg-surface border-2 border-border/40 rounded-[16px] p-6 shadow-comic">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon name="FileText" className="w-5 h-5 text-plum" />
              <h2 className="text-base font-black text-ink font-comic">
                {lang === 'hi' ? `मेरे प्रगतिशील ड्राफ्ट (${drafts.length})` : `My In-Progress Drafts (${drafts.length})`}
              </h2>
            </div>
          </div>

          {drafts.length === 0 ? (
            <div className="py-10 text-center text-ink-muted border-2 border-dashed border-border/40 rounded-[14px]">
              <Icon name="FileText" className="w-8 h-8 mx-auto text-ink-muted/50 mb-2" />
              <p className="text-xs font-bold">
                {lang === 'hi' ? 'वर्तमान में इस डिवाइस पर कोई ड्राफ्ट नहीं है।' : 'No drafts saved on this device.'}
              </p>
              <p className="text-[11px] text-ink-muted/80 mt-1">
                {lang === 'hi'
                  ? 'नया फॉर्म शुरू करने के बाद आप किसी भी समय प्रगति सहेज सकते हैं।'
                  : 'Forms auto-save locally so you never lose beneficiary responses.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {drafts.map((draft) => (
                <div key={draft.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-ink">
                      {draft.fullName || (lang === 'hi' ? 'अनाम लाभार्थी' : 'Unnamed Beneficiary')}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                      {draft.clientRef && <span className="font-mono">{draft.clientRef}</span>}
                      <span>•</span>
                      <span>
                        {lang === 'hi' ? 'सहेजा गया: ' : 'Saved: '}
                        {new Date(draft.lastSavedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/clients/new?draftId=${draft.id}`)}
                      className="px-3 py-1.5 bg-mint hover:bg-mint/80 text-success-ink text-xs font-bold rounded-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="Edit3" className="w-3.5 h-3.5" />
                      <span>{lang === 'hi' ? 'जारी रखें' : 'Resume'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="p-1.5 text-ink-muted hover:text-primary hover:bg-pink/30 rounded-[10px] transition-colors cursor-pointer"
                      title={lang === 'hi' ? 'ड्राफ्ट हटाएं' : 'Delete draft'}
                      aria-label="Delete draft"
                    >
                      <Icon name="Trash2" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
