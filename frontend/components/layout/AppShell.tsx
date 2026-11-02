"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Language, translations } from '@/lib/translations';
import {
  getStoredSession,
  clearSessionPreservingDrafts,
  checkHasUnsentDrafts,
  isRouteAllowedForRole,
  StoredUser,
} from '@/lib/auth';

export type UserRole =
  | 'field_worker'
  | 'supervisor'
  | 'state_reviewer'
  | 'administrator'
  | 'leadership';

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
  currentRole: propRole,
  onRoleChange,
  offlineCount = 0,
  isOffline = false,
}) => {
  const t = translations[currentLang];
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [hasUnsentDrafts, setHasUnsentDrafts] = useState(false);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  // Authenticated session load & route guard
  useEffect(() => {
    setIsClientLoaded(true);
    const session = getStoredSession();
    if (!session) {
      if (pathname !== '/sign-in') {
        router.push('/sign-in');
      }
      return;
    }

    setCurrentUser(session);
    const role = propRole || session.role;

    // Guard route against unauthorized role
    if (!isRouteAllowedForRole(role, pathname)) {
      router.push('/not-permitted');
    }

    // Check draft status
    setHasUnsentDrafts(checkHasUnsentDrafts());
  }, [pathname, propRole, router]);

  const effectiveRole: UserRole = propRole || currentUser?.role || 'field_worker';

  // Role Gating Logic
  const navItems = [
    {
      href: '/work',
      label: t.myWork,
      roles: ['field_worker', 'supervisor', 'leadership', 'administrator'],
    },
    {
      href: '/clients',
      label: t.clients,
      roles: ['field_worker', 'supervisor', 'state_reviewer', 'leadership', 'administrator'],
    },
    {
      href: '/reports',
      label: t.reports,
      roles: ['supervisor', 'state_reviewer', 'leadership', 'administrator'],
    },
    {
      href: '/admin',
      label: t.admin,
      roles: ['administrator'], // strictly admin only!
    },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(effectiveRole));

  const handleSignOutClick = () => {
    const hasDrafts = checkHasUnsentDrafts();
    setHasUnsentDrafts(hasDrafts);
    if (hasDrafts) {
      setShowSignOutModal(true);
    } else {
      performSignOut();
    }
  };

  const performSignOut = () => {
    clearSessionPreservingDrafts();
    setShowSignOutModal(false);
    router.push('/sign-in');
  };

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
              {visibleNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/work' && pathname?.startsWith(item.href));
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

            {/* Controls: Quick Register, Role/User Chip, Language Toggle, Sign Out */}
            <div className="flex items-center space-x-2.5">
              {/* "+ New Registration" Quick Action Button (if not already on /clients/new) */}
              {pathname !== '/clients/new' && effectiveRole !== 'leadership' && effectiveRole !== 'state_reviewer' && (
                <Link
                  href="/clients/new"
                  className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                >
                  <span>+</span> {currentLang === 'hi' ? 'नया पंजीकरण' : 'New Registration'}
                </Link>
              )}

              {/* Current User Chip with Role + Scope */}
              {currentUser && (
                <div className="hidden lg:flex items-center bg-slate-100 border border-slate-200 rounded-lg py-1 px-2.5 text-xs">
                  <div className="flex flex-col text-right mr-2">
                    <span className="font-bold text-slate-800 text-[11px] leading-tight">
                      {currentUser.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold leading-tight">
                      {effectiveRole} • {currentUser.scope}
                    </span>
                  </div>
                </div>
              )}

              {/* Offline Queue Badge */}
              {offlineCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  Queue: {offlineCount}
                </span>
              )}

              {/* Bilingual Language Selector */}
              <div
                className="inline-flex rounded-lg border border-slate-300 bg-white shadow-xs p-0.5"
                role="group"
                aria-label="Language Toggle"
              >
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
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
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${
                    currentLang === 'hi'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  aria-pressed={currentLang === 'hi'}
                >
                  हिन्दी
                </button>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOutClick}
                title="Sign Out"
                className="p-1.5 text-xs font-semibold text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                aria-label="Sign Out"
              >
                <span className="hidden sm:inline px-1">
                  {currentLang === 'hi' ? 'लॉगआउट' : 'Sign Out'}
                </span>
                <span className="sm:hidden">⎋</span>
              </button>

              {/* Mobile menu hamburger button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 shadow-md">
            {currentUser && (
              <div className="pb-2 border-b border-slate-100 text-xs">
                <div className="font-bold text-slate-900">{currentUser.fullName}</div>
                <div className="text-[11px] text-emerald-700 font-mono">
                  {effectiveRole} • {currentUser.scope}
                </div>
              </div>
            )}
            {visibleNav.map((item) => (
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
            {effectiveRole !== 'leadership' && effectiveRole !== 'state_reviewer' && (
              <Link
                href="/clients/new"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                + {currentLang === 'hi' ? 'नया पंजीकरण' : 'New Registration'}
              </Link>
            )}
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
        <div
          className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 text-center shadow-xs"
          role="alert"
        >
          {t.offlineNotice}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Sign Out Draft Warning Modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-left border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-amber-600">
              <span className="text-2xl font-black">⚠️</span>
              <h3 className="text-base font-bold text-slate-900">
                {currentLang === 'hi' ? 'अपूर्ण ड्राफ्ट सूचना' : 'Unsaved Draft Registration Notice'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentLang === 'hi'
                ? 'आपके पास स्थानीय भंडारण में सहेजा गया अपूर्ण पंजीकरण ड्राफ्ट है। लॉगआउट करने पर यह ड्राफ्ट इस डिवाइस पर सुरक्षित रहेगा, लेकिन अभी तक केंद्रीय डेटाबेस में सबमिट नहीं हुआ है।'
                : 'You have an unsaved client intake registration draft in local storage. Signing out will safely retain your draft on this device, but it has not yet been submitted to the central database.'}
            </p>
            <div className="mt-5 flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg min-h-[44px]"
              >
                {currentLang === 'hi' ? 'वापस जाएं' : 'Stay Signed In'}
              </button>
              <button
                type="button"
                onClick={performSignOut}
                className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 rounded-lg min-h-[44px]"
              >
                {currentLang === 'hi' ? 'लॉगआउट (ड्राफ्ट सुरक्षित रखें)' : 'Sign Out (Retain Local Draft)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
