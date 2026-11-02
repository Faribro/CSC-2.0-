"use client";

import React from 'react';
import { Language, translations } from '@/lib/translations';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  centerId?: string;
  userName?: string;
  offlineCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  centerId = "CENTER_DELHI_01",
  userName = "Sunita Sharma (Outreach)",
  offlineCount = 0
}) => {
  const t = translations[currentLang];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-lg tracking-wider" aria-hidden="true">
              CSC
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t.appTitle}</h1>
              <p className="text-xs text-slate-500">{t.subTitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Center Scoped Badge */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
              {t.center}: <strong className="ml-1">{centerId}</strong>
            </span>

            {/* Offline sync indicator if actions pending */}
            {offlineCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                Queue: {offlineCount}
              </span>
            )}

            {/* Language Selector (Bilingual EN / HI) */}
            <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Language selection">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-3 py-1.5 text-xs font-medium rounded-l-md border ${
                  currentLang === 'en'
                    ? 'bg-blue-700 text-white border-blue-700 font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                aria-pressed={currentLang === 'en'}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('hi')}
                className={`px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-b border-r ${
                  currentLang === 'hi'
                    ? 'bg-blue-700 text-white border-blue-700 font-bold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                aria-pressed={currentLang === 'hi'}
              >
                हिन्दी
              </button>
            </div>

            {/* User Profile */}
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-700">
              <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                SS
              </span>
              <span className="font-medium">{userName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
