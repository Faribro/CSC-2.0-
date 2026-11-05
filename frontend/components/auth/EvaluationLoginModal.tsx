'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Language } from '@/lib/translations';

interface StateRef {
  stateCode: string;
  stateName: string;
  isoCode: string;
}

interface EvaluationLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authData: { role: string; fullName: string; state: string; token: string }) => void;
  lang?: Language;
}

export function EvaluationLoginModal({
  isOpen,
  onClose,
  onSuccess,
  lang = 'en',
}: EvaluationLoginModalProps) {
  const [activeTab, setActiveTab] = useState<'STATE' | 'LEADERSHIP'>('STATE');
  const [stateSubTab, setStateSubTab] = useState<'SIGNIN' | 'SIGNUP'>('SIGNIN');

  // State Reference Dropdown Data
  const [states, setStates] = useState<StateRef[]>([]);
  const [selectedStateCode, setSelectedStateCode] = useState('MH');

  // State Sign In form
  const [stateEmail, setStateEmail] = useState('');
  const [statePassword, setStatePassword] = useState('');

  // State Sign Up form
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupOrg, setSignupOrg] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // 2-Step Signup State: 'FORM' | 'OTP' | 'SUCCESS'
  const [signupStep, setSignupStep] = useState<'FORM' | 'OTP' | 'SUCCESS'>('FORM');
  const [signupOtp, setSignupOtp] = useState('');
  const [enrolmentToken, setEnrolmentToken] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [createdAuthData, setCreatedAuthData] = useState<{ role: string; fullName: string; state: string; token: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Leadership OTP form
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderOtp, setLeaderOtp] = useState('');
  const [leaderOtpSent, setLeaderOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch ISO 3166-2:IN validated state list
    fetch('/api/v1/evaluation/states')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setStates(data);
          if (!selectedStateCode) setSelectedStateCode(data[0].stateCode);
        }
      })
      .catch(() => {});
  }, [isOpen, selectedStateCode]);

  if (!isOpen) return null;

  // Handle State Team Sign In
  const handleStateSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/state-team/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workEmail: stateEmail.trim(),
          password: statePassword,
          stateCode: selectedStateCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('csc2_auth_token', data.token);
          localStorage.setItem('csc2_eval_user', JSON.stringify(data));
        }
        onSuccess(data);
        onClose();
      } else {
        setError(data.message || (lang === 'hi' ? 'अमान्य कार्य ईमेल या पासवर्ड' : 'Invalid work email or password.'));
      }
    } catch {
      setError(lang === 'hi' ? 'कनेक्शन त्रुटि' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request Email OTP for State Team Signup (no account or token created yet)
  const handleStateRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (signupPassword !== signupConfirmPassword) {
      setError(lang === 'hi' ? 'पासवर्ड मेल नहीं खाते हैं' : 'Passwords do not match. Please verify your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/state-team/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupFirstName.trim(),
          lastName: signupLastName.trim(),
          workEmail: signupEmail.trim(),
          stateCode: selectedStateCode,
          organization: signupOrg.trim() || 'Alliance State Team',
          password: signupPassword,
          confirmPassword: signupConfirmPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSignupStep('OTP');
        setSuccessMsg(data.message || (lang === 'hi' ? '6-अंकों का सत्यापन कोड आपके कार्य ईमेल पर भेजा गया है।' : 'A 6-digit verification code has been dispatched to your work email. Valid for 10 minutes.'));
      } else {
        setError(data.message || (lang === 'hi' ? 'सत्यापन कोड भेजने में विफल' : 'Failed to send verification code.'));
      }
    } catch {
      setError(lang === 'hi' ? 'कनेक्शन त्रुटि' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP and Create State Team Account
  const handleStateVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!signupOtp || signupOtp.trim().length !== 6) {
      setError(lang === 'hi' ? 'कृपया 6-अंकों का सत्यापन कोड दर्ज करें' : 'Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/state-team/signup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workEmail: signupEmail.trim(),
          otp: signupOtp.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('csc2_auth_token', data.token);
          localStorage.setItem('csc2_eval_user', JSON.stringify(data));
        }
        setEnrolmentToken(data.enrolmentToken || '');
        setQrCodeDataUrl(data.qrCodeDataUrl || '');
        setCreatedAuthData(data);
        setSignupStep('SUCCESS');
        setSuccessMsg(lang === 'hi' ? 'खाता सफलतापूर्वक सत्यापित और सक्रिय किया गया!' : 'Account verified and activated successfully! Welcome email with QR barcode dispatched.');
      } else {
        setError(data.message || (lang === 'hi' ? 'सत्यापन विफल' : 'Verification failed. Please check the code.'));
      }
    } catch {
      setError(lang === 'hi' ? 'सत्यापन त्रुटि' : 'Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Leadership Request OTP
  const handleLeaderSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/leadership/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: leaderEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeaderOtpSent(true);
        setSuccessMsg(data.message || (lang === 'hi' ? '6-अंकों का नेतृत्व सत्यापन कोड भेजा गया है।' : 'If registered, a 6-digit access code has been dispatched.'));
      } else {
        setError(data.message || (lang === 'hi' ? 'अनुरोध विफल' : 'Request failed.'));
      }
    } catch {
      setError(lang === 'hi' ? 'कनेक्शन त्रुटि' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Leadership Verify OTP
  const handleLeaderVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/leadership/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: leaderEmail.trim(), otp: leaderOtp.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('csc2_auth_token', data.token);
          localStorage.setItem('csc2_eval_user', JSON.stringify(data));
        }
        onSuccess(data);
        onClose();
      } else {
        setError(data.message || (lang === 'hi' ? 'अमान्य कोड' : 'Invalid access code.'));
      }
    } catch {
      setError(lang === 'hi' ? 'सत्यापन विफल' : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-modal-title"
    >
      <div className="bg-surface rounded-[20px] max-w-lg w-full p-6 shadow-comic border-2 border-border/40 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-muted hover:text-ink hover:bg-canvas rounded-full transition-colors"
          aria-label={lang === 'hi' ? 'बंद करें' : 'Close modal'}
        >
          <Icon name="x" className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-lavender flex items-center justify-center text-plum shadow-xs border border-border/30">
            <Icon name="Shield" className="w-6 h-6" />
          </div>
          <div>
            <h2 id="evaluation-modal-title" className="text-lg font-black text-ink tracking-tight font-comic">
              {lang === 'hi' ? 'मूल्यांकन और निगरानी एक्सेस' : 'Evaluation Access Control'}
            </h2>
            <p className="text-xs text-ink-muted">
              {lang === 'hi' ? 'राज्य टीम और राष्ट्रीय नेतृत्व पर्यवेक्षण पोर्टल' : 'State Team & National Leadership Surveillance Scope'}
            </p>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="mb-4 p-3 bg-mint/40 border border-mint text-success-ink rounded-[12px] text-xs flex items-center gap-2">
          <Icon name="Info" className="w-4 h-4 shrink-0 text-success-ink" />
          <span>
            {lang === 'hi'
              ? 'फील्ड कार्यकर्ता: फॉर्म, स्थानीय ड्राफ्ट और सर्वेक्षण प्रस्तुत करने के लिए मूल्यांकन पासवर्ड की आवश्यकता नहीं है।'
              : 'Field Caseworkers: Forms, local drafts, and survey submissions do not require an evaluation password.'}
          </span>
        </div>

        {/* Main Tab Switch: State Evaluation vs Leadership */}
        <div className="flex rounded-[12px] p-1 bg-canvas border-2 border-border/40 mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab('STATE'); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-[10px] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'STATE'
                ? 'bg-surface text-plum shadow-xs border border-border/30'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon name="MapPin" className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'राज्य मूल्यांकन' : 'State Evaluation'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('LEADERSHIP'); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-[10px] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'LEADERSHIP'
                ? 'bg-surface text-plum shadow-xs border border-border/30'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon name="Building" className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'राष्ट्रीय नेतृत्व' : 'Leadership'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-pink/40 border border-border text-error-ink rounded-[10px] text-xs font-semibold flex items-center gap-2" role="alert">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0 text-primary" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 bg-mint/50 border border-mint text-success-ink rounded-[10px] text-xs font-semibold flex items-center gap-2">
            <Icon name="CheckCircle" className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: STATE EVALUATION */}
        {activeTab === 'STATE' && (
          <div>
            {/* Sub-tabs: Sign In vs Sign Up */}
            <div className="flex border-b border-border/40 mb-4 gap-4">
              <button
                type="button"
                onClick={() => { setStateSubTab('SIGNIN'); setError(null); }}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                  stateSubTab === 'SIGNIN'
                    ? 'text-plum border-b-2 border-plum'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {lang === 'hi' ? 'साझा पासवर्ड / लॉगिन' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setStateSubTab('SIGNUP'); setError(null); }}
                className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                  stateSubTab === 'SIGNUP'
                    ? 'text-plum border-b-2 border-plum'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {lang === 'hi' ? 'कार्य ईमेल साइन अप' : 'Work Email Sign Up'}
              </button>
            </div>

            {stateSubTab === 'SIGNIN' ? (
              <form onSubmit={handleStateSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'असाइन किया गया राज्य (ISO 3166-2:IN)' : 'Assigned State (ISO 3166-2:IN)'} *
                  </label>
                  <select
                    value={selectedStateCode}
                    onChange={(e) => setSelectedStateCode(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  >
                    {states.map((st) => (
                      <option key={st.stateCode} value={st.stateCode}>
                        {st.stateName} ({st.isoCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'कार्य ईमेल' : 'Work Email'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={stateEmail}
                    onChange={(e) => setStateEmail(e.target.value)}
                    placeholder="state.lead@allianceindia.org"
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'राज्य मूल्यांकन पासवर्ड' : 'State Evaluation Password'} *
                  </label>
                  <input
                    type="password"
                    required
                    value={statePassword}
                    onChange={(e) => setStatePassword(e.target.value)}
                    placeholder="Enter state password"
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !stateEmail || !statePassword}
                  className="w-full min-h-[48px] px-4 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="Lock" className="w-4 h-4" />
                  <span>{loading ? (lang === 'hi' ? 'सत्यापित किया जा रहा है...' : 'Verifying...') : (lang === 'hi' ? 'साइन इन करें और मूल्यांकन अनलॉक करें' : 'Sign In & Unlock Evaluation')}</span>
                </button>
              </form>
            ) : signupStep === 'FORM' ? (
              <form onSubmit={handleStateRequestOtp} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      {lang === 'hi' ? 'पहला नाम' : 'First Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="e.g. Priya"
                      className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      {lang === 'hi' ? 'अंतिम नाम' : 'Last Name'}
                    </label>
                    <input
                      type="text"
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'राज्य (ISO 3166-2:IN)' : 'Assigned State'} *
                  </label>
                  <select
                    value={selectedStateCode}
                    onChange={(e) => setSelectedStateCode(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  >
                    {states.map((st) => (
                      <option key={st.stateCode} value={st.stateCode}>
                        {st.stateName} ({st.isoCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'कार्य ईमेल' : 'Work Email'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="priya.sharma@allianceindia.org"
                    className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'संस्था' : 'Organization'}
                  </label>
                  <input
                    type="text"
                    value={signupOrg}
                    onChange={(e) => setSignupOrg(e.target.value)}
                    placeholder="e.g. India HIV/AIDS Alliance"
                    className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'पासवर्ड (कम से कम 8 अक्षर)' : 'Password (min 8 chars)'} *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password (twice)'} *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs font-medium px-3 py-2 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !signupEmail || signupPassword.length < 8 || signupConfirmPassword.length < 8}
                  className="w-full min-h-[48px] px-4 py-3 bg-plum hover:bg-[#682e77] text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="Send" className="w-4 h-4" />
                  <span>{loading ? (lang === 'hi' ? 'सत्यापन कोड भेजा जा रहा है...' : 'Dispatching verification code...') : (lang === 'hi' ? 'ईमेल सत्यापन कोड भेजें' : 'Send Email Verification Code')}</span>
                </button>
              </form>
            ) : signupStep === 'OTP' ? (
              <form onSubmit={handleStateVerifyOtp} className="space-y-4">
                <div className="bg-lavender/40 border border-border/40 p-3 rounded-[12px]">
                  <p className="text-xs font-semibold text-ink">
                    {lang === 'hi' ? 'सत्यापन कोड भेजा गया:' : 'Verification code sent to:'} <span className="font-bold text-plum">{signupEmail}</span>
                  </p>
                  <p className="text-[11px] text-ink-muted mt-1">
                    {lang === 'hi' ? 'वैधता: 10 मिनट (अधिकतम 5 प्रयास)। खाता केवल कोड के बाद बनेगा।' : 'Validity: 10 minutes (max 5 attempts). Account is activated only after verification.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? '6-अंकों का ईमेल सत्यापन कोड' : '6-Digit Email Verification Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={signupOtp}
                    onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    className="w-full text-center text-xl font-mono font-bold tracking-[0.3em] px-4 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || signupOtp.length !== 6}
                  className="w-full min-h-[48px] px-4 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="CheckCircle" className="w-4 h-4" />
                  <span>{loading ? (lang === 'hi' ? 'सत्यापित किया जा रहा है...' : 'Verifying & Creating...') : (lang === 'hi' ? 'कोड सत्यापित करें और खाता बनाएं' : 'Verify Code & Create Account')}</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setSignupStep('FORM'); setError(null); }}
                    className="text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                  >
                    {lang === 'hi' ? '← विवरण संपादित करें' : '← Edit registration details'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStateRequestOtp}
                    disabled={loading}
                    className="text-xs font-semibold text-plum hover:underline cursor-pointer"
                  >
                    {lang === 'hi' ? 'कोड पुनः भेजें' : 'Resend code'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-accent-soft mx-auto flex items-center justify-center text-accent">
                  <Icon name="CheckCircle" className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-black text-ink">
                    {lang === 'hi' ? 'राज्य टीम खाता सक्रिय हुआ!' : 'State Team Account Activated!'}
                  </h4>
                  <p className="text-xs text-ink-muted mt-1">
                    {lang === 'hi' ? 'स्वागत ईमेल और फ़ील्ड कार्यकर्ता बारकोड भेज दिया गया है।' : 'Welcome email with caseworker barcode sent to your inbox.'}
                  </p>
                </div>

                {qrCodeDataUrl && (
                  <div className="bg-canvas border-2 border-border/40 p-4 rounded-[14px]">
                    <p className="text-xs font-bold text-ink mb-2">
                      {lang === 'hi' ? 'फ़ील्ड कार्यकर्ता नामांकन बारकोड (QR)' : 'Field Caseworker Enrolment Barcode (QR)'}
                    </p>
                    <img
                      src={qrCodeDataUrl}
                      alt="Caseworker Enrolment QR Barcode"
                      className="w-44 h-44 mx-auto rounded-lg border border-border/30 p-2 bg-white shadow-xs"
                    />
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink bg-surface px-3 py-1.5 rounded-md border border-border/40 select-all">
                        {enrolmentToken}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(enrolmentToken);
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-plum bg-lavender rounded-md hover:bg-lavender/80 cursor-pointer"
                      >
                        {copiedToken ? (lang === 'hi' ? 'कॉपी हुआ' : 'Copied!') : (lang === 'hi' ? 'कॉपी' : 'Copy')}
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-muted mt-2 text-left">
                      {lang === 'hi'
                        ? 'यह बारकोड/टोकन अपने राज्य के अधिकृत कार्यकर्ताओं को दें। कार्यकर्ताओं को लॉग इन करने के लिए इस बारकोड और एसएमएस ओटीपी दोनों की आवश्यकता होगी।'
                        : 'Share this barcode/token with authorized caseworkers in your state. Field workers require BOTH this token and their phone SMS OTP to sign in.'}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (createdAuthData) {
                      onSuccess(createdAuthData);
                    }
                    onClose();
                  }}
                  className="w-full min-h-[48px] px-4 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <Icon name="ArrowRight" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'राज्य मूल्यांकन पोर्टल खोलें' : 'Open State Evaluation Portal'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NATIONAL LEADERSHIP */}
        {activeTab === 'LEADERSHIP' && (
          <div>
            {!leaderOtpSent ? (
              <form onSubmit={handleLeaderSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? 'पंजीकृत नेतृत्व ईमेल' : 'Registered Leadership Email'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    placeholder="director.sen@allianceindia.org"
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    {lang === 'hi'
                      ? 'केवल अनुमोदित राष्ट्रीय नेतृत्व ईमेल ही एक्सेस कोड प्राप्त कर सकते हैं।'
                      : 'Only approved National Technical Oversight & Leadership emails will receive a code.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !leaderEmail}
                  className="w-full min-h-[48px] px-4 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="Send" className="w-4 h-4" />
                  <span>{loading ? (lang === 'hi' ? 'भेजा जा रहा है...' : 'Sending code...') : (lang === 'hi' ? 'नेतृत्व कोड भेजें' : 'Send Access Code')}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleLeaderVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {lang === 'hi' ? '6-अंकों का नेतृत्व एक्सेस कोड' : '6-Digit Access Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={leaderOtp}
                    onChange={(e) => setLeaderOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    className="w-full text-center text-xl font-mono font-bold tracking-[0.3em] px-4 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum"
                    autoFocus
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <a
                      href="/dev-sinks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono font-bold text-plum hover:underline bg-lavender px-2 py-0.5 rounded-full border border-border/30 flex items-center gap-1"
                    >
                      <Icon name="external" className="w-3 h-3" />
                      <span>View Local Email Sink</span>
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || leaderOtp.length !== 6}
                  className="w-full min-h-[48px] px-4 py-3 bg-plum hover:bg-[#682e77] text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Icon name="Unlock" className="w-4 h-4" />
                  <span>{loading ? (lang === 'hi' ? 'सत्यापित किया जा रहा है...' : 'Verifying...') : (lang === 'hi' ? 'राष्ट्रीय निगरानी अनलॉक करें' : 'Unlock National Surveillance')}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
