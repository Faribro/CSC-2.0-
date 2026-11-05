'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Language, translations } from '@/lib/translations';
import { ClientOnly } from '@/components/ui/ClientOnly';

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
  const [todayFollowUpCount, setTodayFollowUpCount] = useState(0);
  const [overdueFollowUpCount, setOverdueFollowUpCount] = useState(0);

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

    // Fetch worklist summary for today's agenda bar
    fetch('/api/v1/work')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTodayFollowUpCount(data.todayTasks?.length || 0);
          setOverdueFollowUpCount(data.overdueTasks?.length || 0);
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
    <ClientOnly
      fallback={
        <div suppressHydrationWarning className="min-h-screen bg-canvas flex items-center justify-center p-8 text-xs font-bold text-slate-500">
          Loading workspace...
        </div>
      }
    >
      <AppShell
        currentLang={lang}
        onLanguageChange={setLang}
      >
        <div className="space-y-6 max-w-5xl mx-auto">
        {/* Purpose-Built Daily Outreach Agenda & Action Header */}
        <section className="bg-surface rounded-[20px] border-2 border-border/40 p-5 sm:p-6 shadow-comic space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lavender/60 text-plum text-[11px] font-black border border-border/30 mb-1.5">
                <Icon name="Activity" className="w-3.5 h-3.5 text-plum" />
                <span>{lang === 'hi' ? 'दैनिक फील्ड कार्यसूची' : "Today's Outreach Agenda"}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight font-comic">
                {lang === 'hi'
                  ? `नमस्ते, ${fieldUser?.firstName || 'फील्ड कार्यकर्ता'}`
                  : `Hello, ${fieldUser?.firstName || 'Outreach Worker'}`}
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                {lang === 'hi'
                  ? 'आज के निर्धारित फॉलो-अप, अतिदेय विज़िट और इन-फील्ड पंजीकरण।'
                  : 'Prioritised daily follow-up visits and fast beneficiary registration.'}
              </p>
            </div>

            {/* Prominent Action: Start New Registration (Big Plus Icon Button) */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/clients/new"
                onClick={(e) => {
                  e.preventDefault();
                  handleStartNewRegistration();
                }}
                aria-label={lang === 'hi' ? 'नया पंजीकरण शुरू करें' : 'Start New Registration'}
                title={lang === 'hi' ? 'नया पंजीकरण शुरू करें' : 'Start New Registration'}
                className="inline-flex items-center justify-center p-3 sm:p-3.5 bg-primary hover:bg-primary-hover text-white rounded-[16px] shadow-comic transition-all active:scale-[0.95] min-w-[52px] min-h-[52px] cursor-pointer group"
              >
                <Icon name="Plus" className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3.5] shrink-0 text-white transition-transform group-hover:scale-110" />
              </Link>
            </div>
          </div>

          {/* Daily Triage Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/30">
            {/* Today Due Pill (Navigates to Records & Follow-ups -> Today) */}
            <button
              type="button"
              onClick={() => router.push('/clients?view=today')}
              className="flex items-center justify-between p-2.5 rounded-[12px] bg-mint/30 border border-mint hover:bg-mint/50 transition-all text-left cursor-pointer group"
              title={lang === 'hi' ? 'आज के फॉलो-अप देखें' : "View Today's Follow-up Visits"}
            >
              <div>
                <span className="text-[10.5px] font-bold text-success-ink block group-hover:underline">
                  {lang === 'hi' ? 'आज देय' : 'Due Today'}
                </span>
                <span className="text-xs font-semibold text-ink-muted">
                  {lang === 'hi' ? 'विज़िट कार्य →' : 'Scheduled →'}
                </span>
              </div>
              <span className="text-xl font-black text-success-ink font-mono">
                {todayFollowUpCount}
              </span>
            </button>

            {/* Overdue Pill (Navigates to Records & Follow-ups -> Overdue) */}
            <button
              type="button"
              onClick={() => router.push('/clients?view=overdue')}
              className={`flex items-center justify-between p-2.5 rounded-[12px] border transition-all text-left cursor-pointer group ${
                overdueFollowUpCount > 0
                  ? 'bg-pink/30 border-primary/30 text-primary hover:bg-pink/50'
                  : 'bg-canvas/50 border-border/40 text-ink-muted hover:bg-surface'
              }`}
              title={lang === 'hi' ? 'अतिदेय फॉलो-अप देखें' : 'View Overdue Follow-up Visits'}
            >
              <div>
                <span className="text-[10.5px] font-bold block group-hover:underline">
                  {lang === 'hi' ? 'अतिदेय' : 'Overdue'}
                </span>
                <span className="text-xs font-semibold text-ink-muted">
                  {overdueFollowUpCount > 0 ? (lang === 'hi' ? 'प्राथमिकता →' : 'Urgent →') : (lang === 'hi' ? 'शून्य लंबित' : 'Zero')}
                </span>
              </div>
              <span className="text-xl font-black font-mono">
                {overdueFollowUpCount}
              </span>
            </button>

            {/* In-Progress Drafts Pill */}
            <button
              type="button"
              onClick={() => {
                const elem = document.getElementById('in-progress-drafts-section');
                if (elem) elem.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-between p-2.5 rounded-[12px] bg-lavender/30 border border-lavender hover:bg-lavender/50 transition-colors text-left cursor-pointer group"
            >
              <div>
                <span className="text-[10.5px] font-bold text-plum block group-hover:underline">
                  {lang === 'hi' ? 'स्थानीय ड्राफ्ट' : 'Local Drafts'}
                </span>
                <span className="text-xs font-semibold text-ink-muted">
                  {lang === 'hi' ? 'अधूरे फॉर्म ↓' : 'Unfinished ↓'}
                </span>
              </div>
              <span className="text-xl font-black text-plum font-mono">
                {drafts.length}
              </span>
            </button>

            {/* Outbox / Sync Pill */}
            <button
              type="button"
              onClick={() => router.push('/clients?view=all')}
              className={`flex items-center justify-between p-2.5 rounded-[12px] border transition-all text-left cursor-pointer group ${
                waitingSyncCount > 0
                  ? 'bg-sun/30 border-sun text-warning-ink hover:bg-sun/50'
                  : 'bg-canvas/50 border-border/40 text-ink-muted hover:bg-surface'
              }`}
            >
              <div>
                <span className="text-[10.5px] font-bold block group-hover:underline">
                  {lang === 'hi' ? 'सिंक कतार' : 'Sync Outbox'}
                </span>
                <span className="text-xs font-semibold text-ink-muted">
                  {waitingSyncCount > 0 ? (lang === 'hi' ? 'ऑफ़लाइन कतार →' : 'Queued →') : (lang === 'hi' ? 'सब सिंक है' : 'All synced')}
                </span>
              </div>
              <span className="text-xl font-black font-mono">
                {waitingSyncCount}
              </span>
            </button>
          </div>
        </section>

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
            <div className="py-8 px-4 text-center text-ink-muted border-2 border-dashed border-border/40 rounded-[16px] bg-canvas/30 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-mint/40 border border-mint flex items-center justify-center text-success-ink mb-2.5">
                <Icon name="CheckCircle" className="w-6 h-6 stroke-[2.2]" />
              </div>
              <p className="text-xs font-black text-ink">
                {lang === 'hi' ? 'सभी फॉर्म पूरे हैं!' : 'All Caught Up!'}
              </p>
              <p className="text-[11px] text-ink-muted max-w-sm mt-0.5 leading-relaxed">
                {lang === 'hi'
                  ? 'इस डिवाइस पर कोई अधूरा ड्राफ्ट नहीं है। नया पंजीकरण शुरू करने पर ड्राफ्ट यहाँ स्वतः सहेजे जाएंगे।'
                  : 'No incomplete drafts on this device. New beneficiary registrations save automatically here.'}
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
  </ClientOnly>
);
}
