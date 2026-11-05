'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';
import { FieldPhoneVerificationModal } from '@/components/auth/FieldPhoneVerificationModal';
import { EvaluationLoginModal } from '@/components/auth/EvaluationLoginModal';
import { replaySyncQueue } from '@/lib/storage/syncManager';

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

export function AppShell({
  children,
  currentLang,
  onLanguageChange,
  activeClient,
  currentRole,
  onRoleChange,
  offlineCount = 0,
  isOffline = false,
}: AppShellProps) {
  const t = translations[currentLang];
  const pathname = usePathname();
  const router = useRouter();

  // Verification & Auth states
  const [fieldUser, setFieldUser] = useState<{ id: string; firstName: string; phone: string; status: string; state?: string } | null>(null);
  const [evalUser, setEvalUser] = useState<{ role: string; fullName: string; state: string } | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneTargetUrl, setPhoneTargetUrl] = useState<string | null>(null);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isJustUnlocked, setIsJustUnlocked] = useState(false);

  // Network & Sync status
  const [isOnline, setIsOnline] = useState(!isOffline);
  const [submittedCount, setSubmittedCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        replaySyncQueue().catch(() => {});
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Trigger background sync if online on mount
      if (navigator.onLine) {
        replaySyncQueue().catch(() => {});
      }

      // Restore field user from localStorage if verified
      const storedFieldUser = localStorage.getItem('csc2_field_user');
      if (storedFieldUser) {
        try {
          setFieldUser(JSON.parse(storedFieldUser));
        } catch {}
      }

      // Check authoritative device session via backend cookie
      fetch('/api/v1/auth/field/session')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.authenticated) {
            setFieldUser(data);
            localStorage.setItem('csc2_field_user', JSON.stringify(data));
          }
        })
        .catch(() => {});

      // Restore evaluation user from localStorage
      const storedEvalUser = localStorage.getItem('csc2_eval_user');
      if (storedEvalUser) {
        try {
          setEvalUser(JSON.parse(storedEvalUser));
        } catch {}
      }

      // Fetch submission count for badge
      fetch('/api/v1/clients?page=0&size=1')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.totalElements === 'number') {
            setSubmittedCount(data.totalElements);
          }
        })
        .catch(() => {});

      // Listen for custom trigger to open phone verification
      const handleOpenPhone = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail?.targetUrl) {
          setPhoneTargetUrl(customEvent.detail.targetUrl);
        } else {
          setPhoneTargetUrl('/clients/new');
        }
        setIsPhoneModalOpen(true);
      };
      window.addEventListener('csc2:open_phone_verification', handleOpenPhone);

      const handleUserUpdated = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          setFieldUser(customEvent.detail);
        }
      };
      window.addEventListener('csc2:field_user_updated', handleUserUpdated);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('csc2:open_phone_verification', handleOpenPhone);
        window.removeEventListener('csc2:field_user_updated', handleUserUpdated);
      };
    }
  }, []);

  const isEvaluationUnlocked = !!evalUser;

  const handleSubmittedSurveysClick = (e: React.MouseEvent) => {
    let current = fieldUser;
    if (!current && typeof window !== 'undefined') {
      const stored = localStorage.getItem('csc2_field_user');
      if (stored) {
        try {
          current = JSON.parse(stored);
          setFieldUser(current);
        } catch {}
      }
    }
    if (!current) {
      e.preventDefault();
      setPhoneTargetUrl('/clients');
      setIsPhoneModalOpen(true);
    }
  };

  const handleEvaluationClick = (e: React.MouseEvent) => {
    if (!isEvaluationUnlocked) {
      e.preventDefault();
      setIsEvalModalOpen(true);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('csc2_field_user');
      localStorage.removeItem('csc2_eval_user');
      localStorage.removeItem('csc2_auth_token');
    }
    fetch('/api/v1/auth/field/logout', { method: 'POST' }).catch(() => {});
    setFieldUser(null);
    setEvalUser(null);
    router.push('/work');
  };

  // 3 Primary Navigation Items
  const navTabs = [
    {
      id: 'forms',
      href: '/work',
      label: currentLang === 'hi' ? 'फॉर्म' : 'Forms',
      icon: 'Home',
      isActive: pathname === '/' || pathname === '/work' || pathname?.startsWith('/clients/new'),
    },
    {
      id: 'submitted',
      href: '/clients',
      label: currentLang === 'hi' ? 'रिकॉर्ड और फॉलो-अप' : 'Records & Follow-ups',
      icon: 'ClipboardList',
      badge: submittedCount > 0 ? submittedCount : undefined,
      isActive: pathname === '/clients' || (pathname?.startsWith('/clients/') && pathname !== '/clients/new'),
      onClick: handleSubmittedSurveysClick,
    },
    {
      id: 'evaluation',
      href: '/admin',
      label: currentLang === 'hi' ? 'मूल्यांकन' : 'Evaluation',
      restrictedLabel: currentLang === 'hi' ? '(प्रतिबंधित)' : '(Restricted)',
      icon: isJustUnlocked ? 'Unlock' : isEvaluationUnlocked ? 'Shield' : 'Lock',
      isLocked: !isEvaluationUnlocked,
      isUnlocking: isJustUnlocked,
      isActive: pathname === '/admin' || pathname === '/reports',
      onClick: handleEvaluationClick,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink font-sans antialiased pb-20 md:pb-0" suppressHydrationWarning>
      {/* Top Masthead (Desktop & Mobile Header) */}
      <header className="bg-surface border-b-2 border-border/40 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Alliance India Brand Logo */}
            <div className="flex items-center space-x-3">
              <Link
                href="/work"
                className="flex items-center rounded-[12px] p-1 group focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-plum"
                title="India HIV/AIDS Alliance"
              >
                <div className="h-10 w-28 sm:w-36 relative flex items-center">
                  <Image
                    src="/alliance-india-logo.png"
                    alt="India HIV/AIDS Alliance"
                    width={150}
                    height={40}
                    className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                    priority
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Center Navigation (Three Top-Level Tabs) */}
            <nav className="hidden md:flex items-center space-x-2" aria-label="Main Navigation">
              {navTabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={tab.onClick}
                  className={`group relative flex items-center space-x-2 px-3.5 py-2 rounded-[12px] text-xs transition-all select-none cursor-pointer ${
                    tab.isUnlocking
                      ? 'bg-lavender text-plum border-2 border-plum animate-unlock-pop shadow-comic'
                      : tab.isActive
                      ? 'bg-plum/10 text-plum border border-plum/30 shadow-xs font-bold'
                      : tab.isLocked
                      ? 'text-ink-muted/70 bg-canvas/30 border border-dashed border-border/50 hover:bg-canvas hover:text-ink hover:border-border/80 opacity-80 hover:opacity-100 font-medium'
                      : 'text-ink-muted hover:text-ink hover:bg-canvas font-bold'
                  }`}
                >
                  <div className={`relative ${tab.isUnlocking ? 'animate-lock-shackle text-plum' : ''}`}>
                    <Icon
                      name={tab.icon}
                      className={`w-4 h-4 ${
                        tab.isUnlocking
                          ? 'text-plum animate-pulse'
                          : tab.isActive
                          ? 'text-plum'
                          : tab.isLocked
                          ? 'text-ink-muted/80'
                          : 'text-ink-muted'
                      }`}
                    />
                  </div>
                  <span className={tab.isActive || tab.isUnlocking ? 'font-bold' : ''}>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-1 bg-primary text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                  {tab.isLocked && !tab.isUnlocking && (
                    <span className="text-[11px] font-normal text-ink-muted/70 ml-0.5" aria-hidden="true">
                      {tab.restrictedLabel}
                    </span>
                  )}
                  {tab.isUnlocking && (
                    <span className="text-[9px] font-black uppercase text-plum bg-surface px-1.5 py-0.5 rounded-full border border-plum/30 animate-pulse">
                      Unlocked!
                    </span>
                  )}
                  {tab.id === 'evaluation' && !tab.isLocked && !tab.isUnlocking && (
                    <span className="text-[9px] font-mono font-bold bg-mint text-success-ink px-1.5 py-0.5 rounded-full border border-mint">
                      {evalUser?.role === 'leadership' ? 'National' : evalUser?.state || 'State'}
                    </span>
                  )}
                  {/* Comic Active Tab Underline */}
                  {tab.isActive && (
                    <span className="absolute -bottom-1 left-3 right-3 h-[3px] rounded-full bg-plum shadow-[0_2px_4px_rgba(123,63,140,0.4)]" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Controls: Online/Sync Status, Language Toggle, Identity */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Online/Offline Status Indicator (Wifi / WifiOff) */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-[10px] border transition-colors select-none ${
                  isOnline
                    ? 'bg-mint/40 text-success-ink border-mint'
                    : 'bg-sun/40 text-warning-ink border-sun'
                }`}
                role="status"
                data-testid="header-network-indicator"
                title={
                  isOnline
                    ? currentLang === 'hi'
                      ? 'ऑनलाइन - सर्वर से जुड़ा है'
                      : 'Online - Connected to server'
                    : currentLang === 'hi'
                    ? 'ऑफलाइन - डेटा डिवाइस पर सुरक्षित है'
                    : 'Offline - Changes saved locally'
                }
                aria-label={isOnline ? 'Network Status: Online' : 'Network Status: Offline'}
                suppressHydrationWarning
              >
                <Icon
                  name={isOnline ? 'Wifi' : 'WifiOff'}
                  className={`w-4 h-4 ${isOnline ? 'text-success-ink' : 'text-warning-ink'}`}
                />
              </div>

              {/* Language Switcher */}
              <div className="flex items-center bg-canvas border border-border/40 rounded-[10px] p-0.5">
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`px-2 py-1 text-xs font-black rounded-[8px] transition-colors cursor-pointer ${
                    currentLang === 'en' ? 'bg-surface text-plum shadow-2xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('hi')}
                  className={`px-2 py-1 text-xs font-black rounded-[8px] transition-colors cursor-pointer ${
                    currentLang === 'hi' ? 'bg-surface text-plum shadow-2xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  HI
                </button>
              </div>

              {/* User Identity or Verification Trigger */}
              {evalUser ? (
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-bold text-ink leading-tight">{evalUser.fullName}</span>
                    <span className="text-[10px] font-mono text-plum">{evalUser.role} ({evalUser.state})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 text-ink-muted hover:text-primary hover:bg-canvas rounded-[10px] transition-colors"
                    title={currentLang === 'hi' ? 'साइन आउट' : 'Sign out'}
                    aria-label="Sign out"
                  >
                    <Icon name="LogOut" className="w-4 h-4" />
                  </button>
                </div>
              ) : fieldUser ? (
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-bold text-ink leading-tight">{fieldUser.firstName || 'Field Caseworker'}</span>
                    <span className="text-[10px] font-mono text-ink-muted">{fieldUser.phone}</span>
                  </div>
                  {fieldUser.status === 'PENDING' && (
                    <span className="px-2 py-0.5 bg-sun/30 text-warning-ink border border-sun rounded-full text-[10px] font-bold">
                      Pending
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 text-ink-muted hover:text-primary hover:bg-canvas rounded-[10px] transition-colors"
                    title={currentLang === 'hi' ? 'सत्र रीसेट करें' : 'Reset device session'}
                    aria-label="Reset device session"
                  >
                    <Icon name="LogOut" className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhoneModalOpen(true)}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-[10px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="Phone" className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{currentLang === 'hi' ? 'फोन सत्यापन' : 'Verify Phone'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (48px Touch Targets) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t-2 border-border/40 z-40 px-2 py-1 flex items-center justify-around shadow-comic"
        aria-label="Mobile Navigation"
      >
        {navTabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            onClick={tab.onClick}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[64px] px-2 py-1 rounded-[12px] text-[11px] font-bold transition-all relative select-none cursor-pointer ${
              tab.isUnlocking
                ? 'text-plum bg-lavender animate-unlock-pop border border-plum/40'
                : tab.isActive
                ? 'text-plum bg-plum/10'
                : tab.isLocked
                ? 'text-ink-muted/60 opacity-75 hover:opacity-100'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <div className={`relative ${tab.isUnlocking ? 'animate-lock-shackle text-plum' : ''}`}>
              <Icon
                name={tab.icon}
                className={`w-5 h-5 mb-0.5 ${
                  tab.isUnlocking
                    ? 'text-plum animate-pulse'
                    : tab.isActive
                    ? 'text-plum'
                    : tab.isLocked
                    ? 'text-ink-muted/70'
                    : 'text-ink-muted'
                }`}
              />
              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-mono font-black px-1 rounded-full border border-surface">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="flex items-center gap-0.5">
              <span>{tab.label}</span>
              {tab.isLocked && !tab.isUnlocking && (
                <span className="text-[9px] font-normal text-ink-muted/70">(Restricted)</span>
              )}
            </span>
          </Link>
        ))}
      </nav>

      {/* Field Phone Verification Modal */}
      <FieldPhoneVerificationModal
        isOpen={isPhoneModalOpen}
        onClose={() => {
          setIsPhoneModalOpen(false);
          setPhoneTargetUrl(null);
        }}
        onSuccess={(user) => {
          setFieldUser(user);
          setIsPhoneModalOpen(false);
          const dest = phoneTargetUrl || '/clients/new';
          setPhoneTargetUrl(null);
          router.push(dest);
        }}
        lang={currentLang}
      />

      {/* Evaluation Login Modal */}
      <EvaluationLoginModal
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        onSuccess={(authData) => {
          setEvalUser({ role: authData.role, fullName: authData.fullName, state: authData.state });
          setIsJustUnlocked(true);
          setTimeout(() => {
            setIsJustUnlocked(false);
            router.push('/admin');
          }, 1200);
        }}
        lang={currentLang}
      />
    </div>
  );
}
