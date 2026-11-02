"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SEEDED_TEST_USERS, loginAsTestUser } from '@/lib/auth';
import { Language, translations } from '@/lib/translations';

export default function SignInPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = translations[lang];

  // Fails closed guard: if host is not local, test identity is locked down.
  const isLocalEnvironment =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.local')
      : true;

  const handleSelectUser = async (username: string) => {
    setLoadingUser(username);
    setErrorMessage(null);
    try {
      const user = await loginAsTestUser(username);
      if (user.role === 'state_reviewer') {
        router.push('/clients');
      } else {
        router.push('/work');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate test user');
      setLoadingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Language Toggle Header */}
      <div className="absolute top-4 right-6 flex items-center space-x-2">
        <span className="text-xs font-semibold text-slate-500">Language:</span>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white shadow-xs p-0.5">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
              lang === 'en' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
              lang === 'hi' ? 'bg-emerald-800 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center px-4">
        {/* Logo */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-black text-2xl shadow-md">
          CSC
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t.appTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {t.subTitle}
        </p>

        {/* Mandatory Security Banner */}
        <div className="mt-4 bg-amber-50 border-2 border-amber-400 rounded-xl p-3 shadow-xs text-left flex items-start gap-3">
          <span className="text-amber-600 text-xl font-bold leading-none mt-0.5">⚠️</span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
              LOCAL TEST IDENTITY – SYNTHETIC DATA
            </h3>
            <p className="text-xs text-amber-800 mt-0.5">
              This identity selector is strictly enabled for local integration and review. All beneficiary data, clinic names, and IDs are 100% synthetic. Real beneficiary records are never stored or processed here.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        {!isLocalEnvironment ? (
          <div className="bg-red-50 border border-red-300 rounded-xl p-6 text-center text-red-800">
            <h4 className="font-bold text-base">Test Identity Mode Disabled</h4>
            <p className="text-xs mt-2">
              For security compliance, seeded test user selection fails closed outside local development profiles.
            </p>
          </div>
        ) : (
          <div className="bg-white py-6 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200">
            <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'hi' ? 'परीक्षण उपयोगकर्ता चुनें' : 'Select a Test Identity to Continue'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'hi'
                    ? 'अपनी भूमिका के अनुसार कार्यक्षेत्र और अनुमतियां देखने के लिए नीचे क्लिक करें'
                    : 'Click any role below to authenticate directly via PostgreSQL JWT'}
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                6 Seeded Users
              </span>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-lg p-3">
                <strong>Authentication error:</strong> {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {SEEDED_TEST_USERS.map((user) => {
                const isLoading = loadingUser === user.username;
                return (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => handleSelectUser(user.username)}
                    disabled={Boolean(loadingUser)}
                    className="flex flex-col text-left p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 hover:shadow-md transition-all group relative focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.badgeColor}`}
                      >
                        {lang === 'hi' ? user.roleLabelHi : user.roleLabelEn}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-700 font-semibold">
                        {user.scope}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-950">
                      {user.fullName}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {user.scopeDescription}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                      <span>{isLoading ? 'Authenticating...' : (lang === 'hi' ? 'इस रूप में प्रवेश करें →' : 'Sign In as this user →')}</span>
                      {isLoading && (
                        <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                PostgreSQL Local Service • Spring Boot Stateless JWT • Thin BFF Proxy
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
