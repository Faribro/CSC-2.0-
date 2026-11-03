"use client";

import React from 'react';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

export interface SectionProgress {
  id: string;
  code: string;
  titleEn: string;
  titleHi: string;
  completedFields: number;
  totalFields: number;
  hasErrors: boolean;
}

interface SectionIndexRunnerProps {
  sections: SectionProgress[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  lang: Language;
  saveStatus: 'saved_locally' | 'queued' | 'accepted_by_server';
  onSaveDraft: () => void;
  onReviewSubmit: () => void;
  isSubmitting?: boolean;
}

export const SectionIndexRunner: React.FC<SectionIndexRunnerProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  lang,
  saveStatus,
  onSaveDraft,
  onReviewSubmit,
  isSubmitting = false
}) => {
  const t = translations[lang];

  const overallCompleted = sections.reduce((acc, s) => acc + s.completedFields, 0);
  const overallTotal = sections.reduce((acc, s) => acc + s.totalFields, 0);
  const percentComplete = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  return (
    <>
      {/* Desktop Sticky Sidebar Section Index */}
      <nav aria-label="Section Index" className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-28 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              CRF Sections (A–H, J)
            </h2>
            <span className="text-xs font-bold text-plum bg-lavender px-2 py-0.5 rounded-full border border-border/40">
              {percentComplete}%
            </span>
          </div>

          <div className="space-y-1">
            {sections.map(sec => {
              const isActive = activeSectionId === sec.id;
              const title = lang === 'hi' ? sec.titleHi : sec.titleEn;
              const isSectionDone = sec.totalFields > 0 && sec.completedFields >= sec.totalFields;

              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectSection(sec.id);
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate pr-2">
                    {title}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSectionDone ? (
                      <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-plum font-bold'}`}>
                        <Icon name="check" className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                        {sec.completedFields}/{sec.totalFields}
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sticky Bottom Save & Progress Bar (Mobile + Desktop) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 py-3 px-4 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            {saveStatus === 'saved_locally' && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                {t.savedLocally}
              </span>
            )}
            {saveStatus === 'queued' && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                {t.queuedForSync}
              </span>
            )}
            {saveStatus === 'accepted_by_server' && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-ink bg-mint/50 px-2.5 py-1 rounded-md border border-mint">
                <span className="w-2 h-2 rounded-full bg-success-ink"></span>
                {t.accepted}
              </span>
            )}
          </div>

          {/* Action Buttons: Save Draft, Review Before Submit */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onSaveDraft}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg min-h-[44px] transition-colors"
            >
              {t.saveDraft}
            </button>

            <button
              type="button"
              onClick={onReviewSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm min-h-[44px] transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : t.reviewBeforeSubmit}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
