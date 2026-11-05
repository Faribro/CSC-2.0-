'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Language, translations } from '@/lib/translations';

interface FieldPhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; firstName: string; phone: string; status: string; state?: string; district?: string }) => void;
  lang?: Language;
}

export function FieldPhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  lang = 'en',
}: FieldPhoneVerificationModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pendingWarning, setPendingWarning] = useState<string | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setPendingWarning(null);

    const cleanPhone = phone.trim().replace(/[\s\-()]+/g, '');
    if (!cleanPhone) {
      setError(lang === 'hi' ? 'कृपया मोबाइल नंबर दर्ज करें' : 'Please enter your mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/field/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: cleanPhone, deviceId: 'browser-device' }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOtpSent(true);
        setOtp('123456');
        setCooldown(60);
        setInfoMessage(data.message || (lang === 'hi' ? 'सत्यापन कोड भेजा गया है। डिफ़ॉल्ट कोड: 123456' : 'Verification code sent. Default code: 123456'));
      } else {
        if (data.cooldownActive) {
          setCooldown(60);
        }
        setError(data.message || (lang === 'hi' ? 'कोड भेजने में विफल' : 'Failed to send verification code.'));
      }
    } catch {
      setError(lang === 'hi' ? 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।' : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingWarning(null);

    const cleanPhone = phone.trim().replace(/[\s\-()]+/g, '');
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setError(lang === 'hi' ? 'कृपया 6-अंकों का कोड दर्ज करें' : 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/field/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: cleanPhone,
          code: cleanOtp,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          deviceId: 'browser-device',
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const verifiedUser = {
          ...data.user,
          phone: data.user.phone || data.user.phoneE164,
        };

        if (typeof window !== 'undefined') {
          if (data.tokens && data.tokens.sessionToken) {
            localStorage.setItem('csc2_device_session_token', data.tokens.sessionToken);
            localStorage.setItem('csc_token', data.tokens.sessionToken);
          }
          localStorage.setItem('csc2_field_user', JSON.stringify(verifiedUser));
          window.dispatchEvent(new CustomEvent('csc2:field_user_updated', { detail: verifiedUser }));
        }

        if (verifiedUser.status === 'PENDING') {
          setPendingWarning(
            lang === 'hi'
              ? `आपका नंबर (${verifiedUser.phone}) सत्यापित है, लेकिन राज्य टीम के अनुमोदन की प्रतीक्षा कर रहा है। आप स्थानीय ड्राफ्ट सहेज सकते हैं। अनुमोदन के बाद सर्वर सबमिशन सक्रिय हो जाएगा।`
              : `Your mobile number (${verifiedUser.phone}) has been verified, but is awaiting State Team approval. You can save local drafts on this device now; server submission will activate once approved.`
          );
          setTimeout(() => {
            onSuccess(verifiedUser);
            onClose();
          }, 1500);
        } else {
          onSuccess(verifiedUser);
          onClose();
        }
      } else {
        setError(data.message || (lang === 'hi' ? 'अमान्य कोड' : 'Invalid verification code.'));
      }
    } catch {
      setError(lang === 'hi' ? 'सत्यापन विफल' : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-verify-title"
    >
      <div className="bg-surface rounded-[20px] max-w-md w-full p-6 shadow-comic border-2 border-border/40 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-ink-muted hover:text-ink hover:bg-canvas rounded-full transition-colors"
          aria-label={lang === 'hi' ? 'बंद करें' : 'Close modal'}
        >
          <Icon name="x" className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-peach flex items-center justify-center text-primary shadow-xs border border-border/30">
            <Icon name="Phone" className="w-6 h-6" />
          </div>
          <div>
            <h2 id="phone-verify-title" className="text-lg font-black text-ink tracking-tight font-comic">
              {lang === 'hi' ? 'फील्ड कार्यकर्ता सत्यापन' : 'Field Worker Access'}
            </h2>
            <p className="text-xs text-ink-muted">
              {lang === 'hi' ? 'पहली बार उपयोग के लिए मोबाइल सत्यापन आवश्यक है' : 'One-time phone verification for this device'}
            </p>
          </div>
        </div>

        {/* Pending Approval Warning */}
        {pendingWarning && (
          <div className="mb-4 p-3.5 bg-sun/20 border-2 border-sun text-warning-ink rounded-[12px] text-xs font-medium flex items-start gap-2 animate-in fade-in">
            <Icon name="AlertTriangle" className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{pendingWarning}</p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-pink/40 border border-border text-error-ink rounded-[10px] text-xs font-semibold flex items-center gap-2" role="alert">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0 text-primary" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Message */}
        {infoMessage && !error && !pendingWarning && (
          <div className="mb-4 p-3 bg-mint/50 border border-mint text-success-ink rounded-[10px] text-xs font-semibold flex items-center gap-2">
            <Icon name="CheckCircle" className="w-4 h-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {!otpSent ? (
          /* Step 1: Name and Phone Number Form */
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  {lang === 'hi' ? 'पहला नाम' : 'First Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={lang === 'hi' ? 'रमेश' : 'e.g. Ramesh'}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  {lang === 'hi' ? 'अंतिम नाम' : 'Last Name'}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={lang === 'hi' ? 'कुमार' : 'e.g. Kumar'}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lang === 'hi' ? 'मोबाइल नंबर (+91)' : 'Mobile Number (+91)'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-ink-muted">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone.replace(/^\+91/, '')}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full text-xs font-medium pl-11 pr-3 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20 tracking-wider"
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-1">
                {lang === 'hi'
                  ? 'यह नंबर आपकी राज्य टीम द्वारा अनुमोदित होना चाहिए।'
                  : 'Must be registered on your State Team approved caseworker roster.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone || phone.length < 10}
              className="w-full min-h-[48px] px-4 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{lang === 'hi' ? 'भेजा जा रहा है...' : 'Sending code...'}</span>
              ) : (
                <>
                  <Icon name="Send" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {lang === 'hi' ? '6-अंकों का सत्यापन कोड' : 'Enter 6-Digit Code'} *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                className="w-full text-center text-xl font-mono font-bold tracking-[0.3em] px-4 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
                autoFocus
              />
              <div className="mt-2 flex items-center justify-between">
                <Link
                  href="/dev-sinks"
                  target="_blank"
                  className="text-[11px] font-mono font-bold text-plum hover:underline bg-lavender px-2 py-0.5 rounded-full border border-border/30 flex items-center gap-1"
                >
                  <Icon name="external" className="w-3 h-3" />
                  <span>Open Local SMS Sink</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Fill 123456 (Dev)
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-ink-muted mt-2">
                <span>
                  {lang === 'hi' ? 'कोड 10 मिनट के लिए मान्य है' : 'Code valid for 10 minutes'}
                </span>
                {cooldown > 0 ? (
                  <span className="font-mono text-plum">
                    {lang === 'hi' ? `पुनः भेजें: ${cooldown}s` : `Resend in ${cooldown}s`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-plum font-bold hover:underline cursor-pointer"
                  >
                    {lang === 'hi' ? 'कोड पुनः भेजें' : 'Resend Code'}
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full min-h-[48px] px-4 py-3 bg-plum hover:bg-[#682e77] text-white text-xs font-black rounded-[12px] shadow-comic flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{lang === 'hi' ? 'सत्यापित किया जा रहा है...' : 'Verifying...'}</span>
              ) : (
                <>
                  <Icon name="CheckCircle" className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'सत्यापित करें और आगे बढ़ें' : 'Verify & Continue'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
