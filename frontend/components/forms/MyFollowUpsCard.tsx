'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Language, translations } from '@/lib/translations';
import { CHOICE_LISTS } from '@/lib/crfDefinitions';

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

interface MyFollowUpsCardProps {
  lang: Language;
  fieldUser: { id: string; firstName: string; phone: string; status: string } | null;
}

export const MyFollowUpsCard: React.FC<MyFollowUpsCardProps> = ({ lang, fieldUser }) => {
  const router = useRouter();
  const isHi = lang === 'hi';
  const t = translations[lang];

  // Active Segment State with sessionStorage persistence
  const [activeSegment, setActiveSegment] = useState<'today' | 'overdue' | 'upcoming'>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('csc2_followup_segment');
      if (stored === 'overdue' || stored === 'upcoming' || stored === 'today') return stored;
    }
    return 'today';
  });

  // Bounded Pagination State with sessionStorage persistence
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('csc2_followup_page');
      if (stored) return parseInt(stored, 10) || 0;
    }
    return 0;
  });

  const pageSize = 10;

  // Worklist Tasks
  const [todayTasks, setTodayTasks] = useState<TaskSummary[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskSummary[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOfflineData, setIsOfflineData] = useState<boolean>(false);

  // Sync segment changes to sessionStorage
  const handleSelectSegment = (seg: 'today' | 'overdue' | 'upcoming') => {
    setActiveSegment(seg);
    setCurrentPage(0);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csc2_followup_segment', seg);
      sessionStorage.setItem('csc2_followup_page', '0');
    }
  };

  // Sync page changes to sessionStorage
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csc2_followup_page', newPage.toString());
      // Save scroll position
      const scrollPos = window.scrollY;
      sessionStorage.setItem('csc2_followup_scroll', scrollPos.toString());
    }
  };

  // Restore scroll position when returning from client page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedScroll = sessionStorage.getItem('csc2_followup_scroll');
      if (savedScroll) {
        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'smooth' });
        sessionStorage.removeItem('csc2_followup_scroll');
      }
    }
  }, []);

  // Fetch Worklist from Backend or Offline Cache
  const loadWorklist = useCallback(async () => {
    setLoading(true);
    const userId = fieldUser ? fieldUser.id : 'me';
    const cacheKey = `csc2_cached_tasks_${userId}`;

    try {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        const res = await fetch('/api/v1/work');
        if (res.ok) {
          const data = await res.json();
          setTodayTasks(data.todayTasks || []);
          setOverdueTasks(data.overdueTasks || []);
          setUpcomingTasks(data.upcomingTasks || []);
          setIsOfflineData(false);

          // Cache current user's task list for offline access
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
          return;
        }
      }

      // Offline Fallback
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setTodayTasks(data.todayTasks || []);
          setOverdueTasks(data.overdueTasks || []);
          setUpcomingTasks(data.upcomingTasks || []);
          setIsOfflineData(true);
        }
      }
    } catch {
      // Offline fallback on fetch failure
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          setTodayTasks(data.todayTasks || []);
          setOverdueTasks(data.overdueTasks || []);
          setUpcomingTasks(data.upcomingTasks || []);
          setIsOfflineData(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fieldUser]);

  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // Active List & Pagination Slice
  const activeList = useMemo(() => {
    if (activeSegment === 'overdue') return overdueTasks;
    if (activeSegment === 'upcoming') return upcomingTasks;
    return todayTasks;
  }, [activeSegment, todayTasks, overdueTasks, upcomingTasks]);

  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const start = currentPage * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, currentPage, pageSize]);

  // Helper to map J5 Purpose code to bilingual label
  const getPurposeLabel = (taskType: string, title: string) => {
    const purposeList = CHOICE_LISTS['purpose'] || [];
    const matched = purposeList.find((p) => p.code === taskType);
    if (matched) {
      return isHi ? matched.labelHi : matched.labelEn;
    }
    return title || (isHi ? 'नियमित फॉलो-अप' : 'Routine Follow-up');
  };

  // Format Due Date cleanly
  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return isHi ? 'आज देय' : 'Due Today';
    if (diffDays === 1) return isHi ? 'कल देय' : 'Due Tomorrow';
    if (diffDays === -1) return isHi ? '1 दिन विलंबित' : '1 day overdue';
    if (diffDays < -1) return isHi ? `${Math.abs(diffDays)} दिन विलंबित` : `${Math.abs(diffDays)} days overdue`;
    if (diffDays > 1) return isHi ? `${diffDays} दिनों में` : `In ${diffDays} days`;
    return dateStr;
  };

  const handleRecordVisit = (task: TaskSummary) => {
    // Save scroll position before navigating
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csc2_followup_scroll', window.scrollY.toString());
    }
    router.push(`/clients/${task.clientId}?tab=followup&action=record&taskId=${task.id}`);
  };

  return (
    <section className="bg-surface border-2 border-border/40 rounded-[20px] p-5 sm:p-6 shadow-comic space-y-4">
      {/* Header with Title and Offline Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/30 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center text-plum border border-border/30 shrink-0">
            <Icon name="Activity" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-ink font-comic leading-tight">
              {isHi ? 'मेरे फॉलो-अप (My Follow-ups)' : 'My Follow-ups'}
            </h2>
            <p className="text-xs text-ink-muted">
              {isHi
                ? 'आपके द्वारा पंजीकृत लाभार्थियों के निर्धारित विज़िट कार्य।'
                : 'Assigned follow-up tasks for your registered beneficiaries.'}
            </p>
          </div>
        </div>

        {isOfflineData && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-warning-ink bg-sun/30 border border-sun px-3 py-1 rounded-full self-start sm:self-center">
            <Icon name="AlertTriangle" className="w-3.5 h-3.5" />
            <span>{isHi ? 'ऑफ़लाइन कैश' : 'Offline Cached List'}</span>
          </span>
        )}
      </div>

      {/* Segment Navigation Tabs: Today / Overdue / Upcoming */}
      <div className="flex items-center gap-2 pt-1 pb-1 overflow-x-auto scrollbar-none">
        {/* Today Tab */}
        <button
          type="button"
          onClick={() => handleSelectSegment('today')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[44px] shrink-0 ${
            activeSegment === 'today'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-canvas text-ink border-border/40 hover:bg-surface'
          }`}
        >
          <span>{isHi ? 'आज देय' : 'Today'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSegment === 'today' ? 'bg-white/20 text-white' : 'bg-surface text-ink-muted border border-border/30'
            }`}
          >
            {todayTasks.length}
          </span>
        </button>

        {/* Overdue Tab */}
        <button
          type="button"
          onClick={() => handleSelectSegment('overdue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[44px] shrink-0 ${
            activeSegment === 'overdue'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-canvas text-ink border-border/40 hover:bg-surface'
          }`}
        >
          <span>{isHi ? 'अतिदेय / विलंबित' : 'Overdue'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              overdueTasks.length > 0
                ? activeSegment === 'overdue'
                  ? 'bg-white text-primary'
                  : 'bg-pink/60 text-primary border border-primary/20'
                : activeSegment === 'overdue'
                ? 'bg-white/20 text-white'
                : 'bg-surface text-ink-muted border border-border/30'
            }`}
          >
            {overdueTasks.length}
          </span>
        </button>

        {/* Upcoming Tab */}
        <button
          type="button"
          onClick={() => handleSelectSegment('upcoming')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[44px] shrink-0 ${
            activeSegment === 'upcoming'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-canvas text-ink border-border/40 hover:bg-surface'
          }`}
        >
          <span>{isHi ? 'आगामी' : 'Upcoming'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSegment === 'upcoming' ? 'bg-white/20 text-white' : 'bg-surface text-ink-muted border border-border/30'
            }`}
          >
            {upcomingTasks.length}
          </span>
        </button>
      </div>

      {/* Follow-up Tasks List Body */}
      {loading ? (
        <div className="py-12 text-center text-ink-muted">
          <Icon name="RefreshCw" className="w-5 h-5 mx-auto animate-spin text-plum mb-2" />
          <p className="text-xs font-bold">{isHi ? 'फॉलो-अप लोड हो रहे हैं...' : 'Loading follow-up tasks...'}</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className="py-10 text-center text-ink-muted border-2 border-dashed border-border/40 rounded-[16px] bg-canvas/40">
          <Icon name="CheckCircle" className="w-8 h-8 mx-auto text-success-ink/60 mb-2" />
          <p className="text-xs font-bold">
            {activeSegment === 'today'
              ? isHi
                ? 'आज के लिए कोई लंबित फॉलो-अप नहीं है!'
                : 'No follow-ups due today!'
              : activeSegment === 'overdue'
              ? isHi
                ? 'बहुत बढ़िया! कोई अतिदेय फॉलो-अप नहीं है।'
                : 'Great job! Zero overdue follow-up tasks.'
              : isHi
              ? 'कोई आगामी फॉलो-अप कार्य निर्धारित नहीं हैं।'
              : 'No upcoming follow-ups scheduled.'}
          </p>
          <p className="text-[11px] text-ink-muted/80 mt-1">
            {isHi
              ? 'नए लाभार्थी पंजीकरण या विज़िट के बाद निर्धारित कार्य यहाँ दिखाई देंगे।'
              : 'Scheduled follow-ups from registrations and visits will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="divide-y divide-border/30 border border-border/40 rounded-[16px] bg-canvas/30 overflow-hidden">
            {paginatedTasks.map((task) => {
              const purposeText = getPurposeLabel(task.taskType, task.title);
              const dueBadge = formatDueDate(task.dueDate);
              const isOverdue = task.status === 'OVERDUE' || (task.dueDate && new Date(task.dueDate) < new Date());

              return (
                <div
                  key={task.id}
                  className="p-3.5 sm:p-4 bg-surface hover:bg-canvas/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left Column: Client Reference and J5 Purpose Reason (NO health details or phone in lists) */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-plum px-2 py-0.5 rounded-md bg-lavender/50 border border-border/40">
                        {task.clientRef || 'CSC-REF'}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isOverdue
                            ? 'bg-pink/40 text-primary border-primary/20'
                            : 'bg-mint/40 text-success-ink border-mint'
                        }`}
                      >
                        {dueBadge}
                      </span>
                    </div>

                    {/* J5 Purpose Label */}
                    <p className="text-xs font-bold text-ink leading-snug pt-0.5">
                      {purposeText}
                    </p>

                    <p className="text-[11px] text-ink-muted font-mono">
                      Task: {task.taskRef} • Due: {task.dueDate}
                    </p>
                  </div>

                  {/* Right Column: One Primary "Record visit" CTA button */}
                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRecordVisit(task)}
                      className="px-4 py-2.5 rounded-[12px] bg-primary hover:bg-primary-hover text-white text-xs font-black transition-all shadow-xs min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    >
                      <Icon name="Activity" className="w-3.5 h-3.5" />
                      <span>{isHi ? 'विज़िट दर्ज करें' : 'Record visit'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bounded Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1">
              <span className="text-xs text-ink-muted font-mono">
                {isHi
                  ? `पृष्ठ ${currentPage + 1} का ${totalPages} (कुल: ${activeList.length})`
                  : `Page ${currentPage + 1} of ${totalPages} (Total: ${activeList.length})`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-border/40 bg-surface hover:bg-canvas disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-ink flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
                  <span>{isHi ? 'पिछला' : 'Previous'}</span>
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 py-1.5 rounded-lg border border-border/40 bg-surface hover:bg-canvas disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-ink flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>{isHi ? 'अगला' : 'Next'}</span>
                  <Icon name="ChevronRight" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
