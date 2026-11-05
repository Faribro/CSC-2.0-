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

  // Handle State Team Sign Up
  const handleStateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signupPassword !== signupConfirmPassword) {
      setError(lang === 'hi' ? 'पासवर्ड मेल नहीं खाते हैं' : 'Passwords do not match. Please verify your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/evaluation/state-team/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupFirstName.trim(),
          lastName: signupLastName.trim(),
          workEmail: signupEmail.trim(),
          stateCode: selectedStateCode,
          organization: signupOrg.trim() || 'Alliance State Team',
          password: signupPassword,
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
        setError(data.message || (lang === 'hi' ? 'पंजीकरण विफल' : 'Registration failed.'));
      }
    } catch {
      setError(lang === 'hi' ? 'कनेक्शन त्रुटि' : 'Connection error. Please try again.');
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
            ) : (
              <form onSubmit={handleStateSignUp} className="space-y-3">
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
                  <Icon name="User" className="w-4 h-4" />
                  <span>{loading ? (lang === 'hi' ? 'बनाया जा रहा है...' : 'Creating...') : (lang === 'hi' ? 'राज्य टीम खाता बनाएं' : 'Create State Team Account')}</span>
                </button>
              </form>
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
