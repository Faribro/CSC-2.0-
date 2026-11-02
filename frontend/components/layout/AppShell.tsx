"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Language, translations } from '@/lib/translations';

export type UserRole = 'field_worker' | 'supervisor' | 'state_reviewer' | 'administrator' | 'leadership';

export interface ActiveClientContext {
  clientRef?: string;
  fullName?: string;
  age?: number;
  gender?: string;
  centerId?: string;
  saveStatus?: 'saved_locally' | 'queued' | 'accepted_by_server';
  lastSavedText?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeClient?: ActiveClientContext;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  offlineCount?: number;
  isOffline?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentLang,
  onLanguageChange,
  activeClient,
  currentRole = 'field_worker',
  onRoleChange,
  offlineCount = 0,
  isOffline = false
}) => {
  const t = translations[currentLang];
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Role Gating Logic
  // field_worker: My Work, Clients
  // supervisor: My Work, Clients, Reports
  // state_reviewer: Clients, Reports
  // leadership: My Work, Clients, Reports (leadership is NOT admin)
  // administrator: My Work, Clients, Reports, Admin
  const navItems = [
    { href: '/work', label: t.myWork, roles: ['field_worker', 'supervisor', 'leadership', 'administrator'] },
    { href: '/clients', label: t.clients, roles: ['field_worker', 'supervisor', 'state_reviewer', 'leadership', 'administrator'] },
    { href: '/reports', label: t.reports, roles: ['supervisor', 'state_reviewer', 'leadership', 'administrator'] },
    { href: '/admin', label: t.admin, roles: ['administrator'] } // strictly admin only!
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(currentRole));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Masthead */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo & Platform Title */}
            <div className="flex items-center space-x-3">
              <Link href="/work" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-sm group-hover:bg-emerald-900 transition-colors">
                  CSC
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                    {t.appTitle}
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full uppercase tracking-wider font-semibold">
                      v2.0
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 hidden sm:block">{t.subTitle}</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              {visibleNav.map(item => {
                const isActive = pathname === item.href || (item.href !== '/work' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Controls: Role Selector, Offline Indicator, Language Toggle */}
            <div className="flex items-center space-x-3">
              {/* Role Switcher Pill */}
              <div className="hidden lg:flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
                <label htmlFor="role-select" className="sr-only">Role</label>
                <select
                  id="role-select"
                  value={currentRole}
                  onChange={(e) => onRoleChange && onRoleChange(e.target.value as UserRole)}
                  className="bg-transparent text-xs font-semibold text-slate-700 px-2 py-1 rounded focus:outline-hidden"
                >
                  <option value="field_worker">Field Worker</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="state_reviewer">State Reviewer</option>
                  <option value="leadership">Leadership (View Only)</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              {/* Offline Queue Badge */}
              {offlineCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  Queue: {offlineCount}
                </span>
              )}

              {/* Bilingual Language Selector */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-white shadow-xs p-0.5" role="group" aria-label="Language Toggle">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    currentLang === 'en'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={currentLang === 'en'}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('hi')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    currentLang === 'hi'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={currentLang === 'hi'}
                >
                  हिन्दी
                </button>
              </div>

              {/* Mobile menu hamburger button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-md">
            {visibleNav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-semibold ${
                  pathname === item.href
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Persistent MobileContextBar when viewing an active client */}
      {activeClient && (activeClient.clientRef || activeClient.fullName) && (
        <aside
          aria-label="Active Beneficiary Bar"
          className="h-10 bg-slate-900 text-white px-4 flex items-center justify-between text-xs sticky top-16 z-30 shadow-xs"
        >
          <div className="flex items-center space-x-2 truncate">
            <span className="font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px] shrink-0 tracking-wider">
              {activeClient.clientRef || 'NEW-REGISTRATION'}
            </span>
            {activeClient.fullName && (
              <span className="font-semibold text-slate-100 truncate">
                {activeClient.fullName}
              </span>
            )}
            {activeClient.age && activeClient.gender && (
              <span className="text-slate-400 hidden sm:inline">
                ({activeClient.age}y / {activeClient.gender})
              </span>
            )}
            {activeClient.centerId && (
              <span className="text-slate-400 hidden md:inline">
                • {activeClient.centerId}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {activeClient.saveStatus === 'saved_locally' && (
              <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                {t.savedLocally}
              </span>
            )}
            {activeClient.saveStatus === 'queued' && (
              <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {t.queuedForSync}
              </span>
            )}
            {activeClient.saveStatus === 'accepted_by_server' && (
              <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {t.accepted}
              </span>
            )}
          </div>
        </aside>
      )}

      {/* Offline Alert Strip */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 text-center shadow-xs" role="alert">
          {t.offlineNotice}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};
