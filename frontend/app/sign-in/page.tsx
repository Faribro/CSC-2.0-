"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SEEDED_TEST_USERS, loginAsTestUser } from '@/lib/auth';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

type AuthTab = 'password' | 'state_manager' | 'field_worker';

export default function SignInPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<AuthTab>('password');

  // Password Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // State Manager Registration / OTP State
  const [smStep, setSmStep] = useState<'details' | 'otp' | 'pending'>('details');
  const [smEmail, setSmEmail] = useState('');
  const [smFirstName, setSmFirstName] = useState('');
  const [smLastName, setSmLastName] = useState('');
  const [smState, setSmState] = useState('Delhi');
  const [smOrg, setSmOrg] = useState('Delhi State AIDS Control Society');
  const [smOtp, setSmOtp] = useState('');
  const [smOtpId, setSmOtpId] = useState('');
  const [smResendEnvelope, setSmResendEnvelope] = useState('');
  const [smLoading, setSmLoading] = useState(false);
  const [smError, setSmError] = useState<string | null>(null);
  const [smPendingNotice, setSmPendingNotice] = useState<string | null>(null);

  // Field Worker Google Onboarding State
  const [fwStateCode, setFwStateCode] = useState('');
  const [fwDistrict, setFwDistrict] = useState('');
  const [fwFirstName, setFwFirstName] = useState('Sunita');
  const [fwLastName, setFwLastName] = useState('Sharma');
  const [fwEmail, setFwEmail] = useState('sunita.field@allianceindia.org');
  const [fwGoogleSub, setFwGoogleSub] = useState('google-sub-mock-12345');
  const [fwLoading, setFwLoading] = useState(false);
  const [fwError, setFwError] = useState<string | null>(null);

  const isHi = lang === 'hi';
  const t = translations[lang];

  // Fails closed guard: if host is not local, test identity is locked down.
  const isLocalEnvironment =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.local')
      : true;

  // Handle Standard Password Login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setPasswordError(isHi ? 'कृपया उपयोगकर्ता नाम और पासवर्ड दर्ज करें।' : 'Please enter username and password.');
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordError(null);

    try {
      // In local mode or standard API
      const user = await loginAsTestUser(username.trim());
      if (user.role === 'state_reviewer') {
        router.push('/clients');
      } else {
        router.push('/work');
      }
    } catch (err: any) {
      setPasswordError(err.message || (isHi ? 'प्रमाणीकरण विफल रहा।' : 'Authentication failed. Please verify credentials.'));
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  // Local helper: Fill form with seeded test user
  const handleFillTestUser = (testUsername: string) => {
    setUsername(testUsername);
    setPassword('CscPassword2026!');
    setPasswordError(null);
  };

  // Instant login with seeded user
  const handleInstantTestLogin = async (testUsername: string) => {
    setIsPasswordSubmitting(true);
    setPasswordError(null);
    try {
      const user = await loginAsTestUser(testUsername);
      if (user.role === 'state_reviewer') {
        router.push('/clients');
      } else {
        router.push('/work');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to authenticate test user');
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  // State Manager Step 1: Register / Send OTP
  const handleSmRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smEmail.trim() || !smFirstName.trim() || !smState) {
      setSmError(isHi ? 'कृपया सभी आवश्यक फ़ील्ड भरें।' : 'Please fill all required fields.');
      return;
    }

    setSmLoading(true);
    setSmError(null);

    try {
      const res = await fetch('/api/v1/auth/state-team/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: smFirstName.trim(),
          lastName: smLastName.trim(),
          workEmail: smEmail.trim(),
          state: smState,
          organization: smOrg.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'State manager registration failed.');
      }

      const data = await res.json();
      setSmOtpId(data.otpChallengeId || '');
      setSmResendEnvelope(data.resendEnvelope || '');
      setSmStep('otp');
    } catch (err: any) {
      setSmError(err.message);
    } finally {
      setSmLoading(false);
    }
  };

  // State Manager Step 2: Verify OTP
  const handleSmVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smOtp.trim() || smOtp.trim().length !== 6) {
      setSmError(isHi ? 'कृपया 6 अंकों का OTP दर्ज करें।' : 'Please enter 6-digit OTP code.');
      return;
    }

    setSmLoading(true);
    setSmError(null);

    try {
      const res = await fetch('/api/v1/auth/state-team/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: smEmail.trim(),
          otpCode: smOtp.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'OTP verification failed or expired.');
      }

      const data = await res.json();
      if (data.status === 'PENDING_APPROVAL') {
        setSmPendingNotice(
          data.message ||
            'Registration successful! Your application is currently awaiting administrator approval. You will receive an email once approved.'
        );
        setSmStep('pending');
      } else {
        // Authenticated Session established via HttpOnly cookie
        router.push('/work');
      }
    } catch (err: any) {
      setSmError(err.message);
    } finally {
      setSmLoading(false);
    }
  };

  // Field Worker: Complete Google Onboarding with State Code
  const handleFwCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fwStateCode.trim() || !fwDistrict.trim()) {
      setFwError(isHi ? 'राज्य आमंत्रण कोड और जिला दर्ज करें।' : 'Please enter state code and district.');
      return;
    }

    setFwLoading(true);
    setFwError(null);

    try {
      const res = await fetch('/api/v1/auth/field-user/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingTicket: 'signed-ticket-synthetic',
          googleSub: fwGoogleSub,
          email: fwEmail,
          firstName: fwFirstName,
          lastName: fwLastName,
          district: fwDistrict.trim(),
          stateCode: fwStateCode.trim().toUpperCase(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Invalid, expired, or fully redeemed state code.');
      }

      // Success -> Session cookie issued, proceed straight to My Work
      router.push('/work');
    } catch (err: any) {
      setFwError(err.message);
    } finally {
      setFwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Language Toggle Header */}
      <div className="absolute top-4 right-6 flex items-center space-x-2">
        <span className="text-xs font-semibold text-slate-500">Language:</span>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white shadow-2xs p-0.5">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
              lang === 'en' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
              lang === 'hi' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        {/* Logo */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-md">
          CSC
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t.appTitle}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          {t.subTitle}
        </p>

        {/* Mandatory Security Banner */}
        <div className="mt-4 bg-amber-50 border-2 border-amber-400 rounded-xl p-3 shadow-2xs text-left flex items-start gap-3">
          <Icon name="AlertTriangle" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
              LOCAL TEST IDENTITY – SYNTHETIC DATA
            </h3>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
              This platform runs in local test mode with synthetic identity profiles and encrypted PostgreSQL sessions. Real beneficiary data is never processed here.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-6 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200">
          {/* Navigation Tabs for Onboarding & Login Modes */}
          <div className="border-b border-slate-200 pb-3 mb-6">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                  activeTab === 'password'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon name="Lock" className="w-3.5 h-3.5" />
                <span>{isHi ? 'पासवर्ड लॉगिन' : 'Password Login'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('state_manager')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                  activeTab === 'state_manager'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon name="ShieldCheck" className="w-3.5 h-3.5" />
                <span>{isHi ? 'राज्य प्रबंधक (OTP)' : 'State Team (OTP)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('field_worker')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                  activeTab === 'field_worker'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon name="User" className="w-3.5 h-3.5" />
                <span>{isHi ? 'फील्ड कार्यकर्ता (Google)' : 'Field User (Code)'}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: PASSWORD LOGIN & SYNTHETIC IDENTITY FILLER */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {passwordError && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
                    <Icon name="AlertCircle" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="username-input" className="block text-xs font-bold text-slate-700 mb-1">
                    {isHi ? 'उपयोगकर्ता नाम' : 'Username'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="username-input"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. field_worker_a or admin"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="password-input" className="block text-xs font-bold text-slate-700 mb-1">
                    {isHi ? 'पासवर्ड' : 'Password'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all min-h-[44px] disabled:opacity-50"
                >
                  <Icon name="Lock" className="w-4 h-4" />
                  <span>{isPasswordSubmitting ? (isHi ? 'प्रवेश हो रहा है...' : 'Signing in...') : (isHi ? 'साइन इन करें' : 'Sign In with Password')}</span>
                </button>
              </form>

              {/* LOCAL TEST IDENTITIES HELPER (FAILS CLOSED OUTSIDE LOCAL) */}
              {isLocalEnvironment ? (
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Icon name="Users" className="w-4 h-4 text-plum" />
                      <span>{isHi ? 'स्थानीय परीक्षण पहचान (Synthetic)' : 'Local Test Identities (Synthetic)'}</span>
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">1-Click Fast Fill</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SEEDED_TEST_USERS.map((user) => (
                      <button
                        key={user.username}
                        type="button"
                        onClick={() => handleInstantTestLogin(user.username)}
                        className="p-3 text-left rounded-xl border border-slate-200 hover:border-plum hover:bg-lavender/30 transition-all text-xs group"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.badgeColor}`}>
                            {isHi ? user.roleLabelHi : user.roleLabelEn}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">{user.scope}</span>
                        </div>
                        <div className="font-bold text-slate-900 mt-1">{user.fullName}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{user.scopeDescription}</div>
                        <div className="mt-2 text-[11px] font-bold text-plum flex items-center justify-between">
                          <span>{isHi ? 'इस रूप में प्रवेश करें →' : 'Sign in as this user →'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  Local synthetic identities disabled in non-development profiles.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STATE MANAGER SIGNUP & OTP CHALLENGE */}
          {activeTab === 'state_manager' && (
            <div className="space-y-4">
              {smError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
                  <Icon name="AlertCircle" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{smError}</span>
                </div>
              )}

              {smStep === 'details' && (
                <form onSubmit={handleSmRegister} className="space-y-3.5 text-xs">
                  <p className="text-slate-600">
                    Register with your official work email. An HMAC-verified single-use code ALN-STATE-XXXX-XXXX will be securely provisioned upon verification.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={smFirstName}
                        onChange={(e) => setSmFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={smLastName}
                        onChange={(e) => setSmLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={smEmail}
                      onChange={(e) => setSmEmail(e.target.value)}
                      placeholder="coordinator@state.org"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">State / UT *</label>
                      <select
                        value={smState}
                        onChange={(e) => setSmState(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px] bg-white font-medium"
                      >
                        <option value="Delhi">Delhi</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Organization *</label>
                      <input
                        type="text"
                        required
                        value={smOrg}
                        onChange={(e) => setSmOrg(e.target.value)}
                        placeholder="Organization name"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={smLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl min-h-[44px] shadow-sm disabled:opacity-50"
                  >
                    <span>{smLoading ? 'Sending Challenge...' : 'Send 6-Digit Verification Code'}</span>
                  </button>
                </form>
              )}

              {smStep === 'otp' && (
                <form onSubmit={handleSmVerifyOtp} className="space-y-4 text-xs text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                    <p className="font-bold text-slate-800">Verification Code Sent</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      A 6-digit challenge has been sent to <strong>{smEmail}</strong>. Valid for 10 minutes.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-2">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={smOtp}
                      onChange={(e) => setSmOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-48 mx-auto text-center font-mono font-black text-xl tracking-widest px-3 py-2.5 border-2 border-primary rounded-xl min-h-[44px] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSmStep('details')}
                      className="w-1/2 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 min-h-[44px]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={smLoading || smOtp.length !== 6}
                      className="w-1/2 bg-primary hover:bg-primary-hover text-white font-bold py-2 rounded-xl min-h-[44px] disabled:opacity-50"
                    >
                      {smLoading ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                  </div>
                </form>
              )}

              {smStep === 'pending' && (
                <div className="p-5 bg-peach border border-border/40 rounded-2xl text-center space-y-3">
                  <Icon name="Clock" className="w-8 h-8 text-plum mx-auto" />
                  <h4 className="font-bold text-sm text-ink">Application Pending Approval</h4>
                  <p className="text-xs text-ink">{smPendingNotice}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSmStep('details');
                      setActiveTab('password');
                    }}
                    className="text-xs font-bold text-plum underline mt-2"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FIELD WORKER GOOGLE SIGN-IN & ONBOARDING */}
          {activeTab === 'field_worker' && (
            <div className="space-y-4 text-xs">
              {fwError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2">
                  <Icon name="AlertCircle" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{fwError}</span>
                </div>
              )}

              <p className="text-slate-600">
                First-time outreach workers must authenticate with Google and provide the State Invitation Code provided by their State Manager.
              </p>

              <form onSubmit={handleFwCompleteOnboarding} className="space-y-3.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-500">Google Account (Minimal Scopes):</div>
                  <div className="font-bold text-slate-900">{fwEmail}</div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    State Invitation Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fwStateCode}
                    onChange={(e) => setFwStateCode(e.target.value.toUpperCase())}
                    placeholder="ALN-DELHI-XXXX-XXXX"
                    className="w-full font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg min-h-[44px] uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Format: ALN-[STATE]-[XXXX]-[XXXX] (Unambiguous charset)</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Assigned District <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fwDistrict}
                    onChange={(e) => setFwDistrict(e.target.value)}
                    placeholder="e.g. Central Delhi"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={fwLoading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl min-h-[44px] shadow-sm disabled:opacity-50"
                >
                  <Icon name="check" className="w-4 h-4" />
                  <span>{fwLoading ? 'Validating Code & Enrolling...' : 'Complete Onboarding & Open My Work'}</span>
                </button>
              </form>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              PostgreSQL Onboarding & Session Engine • Spring Boot Stateless Security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
