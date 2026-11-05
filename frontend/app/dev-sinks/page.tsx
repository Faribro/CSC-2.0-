"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface SmsItem {
  id: string;
  phoneE164: string;
  messageText: string;
  status: string;
  attempts: number;
  lastErrorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

interface EmailItem {
  id: string;
  type: string;
  recipient: string;
  template: string;
  payload: string;
  status: string;
  attempts: number;
  lastErrorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export default function DevSinksPage() {
  const [activeTab, setActiveTab] = useState<'sms' | 'email'>('sms');
  const [smsList, setSmsList] = useState<SmsItem[]>([]);
  const [emailList, setEmailList] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchSinks = async () => {
    setLoading(true);
    try {
      const [smsRes, emailRes] = await Promise.all([
        fetch('/api/v1/dev-sinks/sms'),
        fetch('/api/v1/dev-sinks/email')
      ]);

      if (smsRes.ok) {
        const data = await smsRes.json();
        setSmsList(data);
      }
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailList(data);
      }
    } catch (err) {
      console.error('Error fetching dev sinks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSinks();
    const interval = setInterval(fetchSinks, 4000);
    return () => clearInterval(interval);
  }, []);

  const clearSinks = async () => {
    if (!confirm('Clear all local dev outbox records?')) return;
    try {
      await fetch('/api/v1/dev-sinks/clear', { method: 'POST' });
      fetchSinks();
    } catch (err) {
      console.error('Clear failed', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const extractOtp = (text: string) => {
    const match = text.match(/(?:code is:?|#)\s*([0-9]{6})/i);
    return match ? match[1] : null;
  };

  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-amber-100 border-2 border-amber-300 text-amber-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black uppercase bg-amber-200 px-2.5 py-1 rounded-md border border-amber-400">
              Dev-Only Sink
            </span>
            <span className="text-xs font-semibold">
              Local Profile SMS & Email Outbox Inspector • Disabled & Not Routable in Production
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/work"
              className="text-xs font-bold text-plum hover:underline flex items-center gap-1"
            >
              <Icon name="back" className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>
          </div>
        </div>

        {/* Action Controls & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border-2 border-border/40 shadow-comic">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('sms')}
              className={`px-4 py-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                activeTab === 'sms'
                  ? 'bg-plum text-white border-plum shadow-xs'
                  : 'bg-white text-ink border-border hover:bg-lavender/40'
              }`}
            >
              SMS Outbox ({smsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-plum text-white border-plum shadow-xs'
                  : 'bg-white text-ink border-border hover:bg-lavender/40'
              }`}
            >
              Email Outbox ({emailList.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSinks}
              disabled={loading}
              className="px-3 py-1.5 bg-lavender hover:bg-lavender/70 text-plum text-xs font-bold rounded-lg border border-border/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Icon name="RotateCcw" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={clearSinks}
              className="px-3 py-1.5 bg-pink/30 hover:bg-pink/50 text-error-ink text-xs font-bold rounded-lg border border-border/50 flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="trash" className="w-3.5 h-3.5" />
              <span>Clear Outbox</span>
            </button>
          </div>
        </div>

        {/* Copied Notification */}
        {copiedCode && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <Icon name="check" className="w-4 h-4 text-emerald-700" />
            <span>Copied code &quot;{copiedCode}&quot; to clipboard! Paste it into the auth modal.</span>
          </div>
        )}

        {/* Content List */}
        {activeTab === 'sms' ? (
          <div className="space-y-3">
            {smsList.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-2xl border-2 border-border/40 text-xs text-ink-muted">
                No SMS messages dispatched yet. Request an OTP on the field worker login to inspect here.
              </div>
            ) : (
              smsList.map((sms) => {
                const otp = extractOtp(sms.messageText);
                return (
                  <div
                    key={sms.id}
                    className="p-4 bg-surface rounded-2xl border-2 border-border/40 shadow-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-ink">{sms.phoneE164}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            sms.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sms.status === 'ACCEPTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sms.status}
                        </span>
                        {sms.attempts > 1 && (
                          <span className="text-[10px] font-mono text-ink-muted">
                            Attempts: {sms.attempts}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted">
                        {new Date(sms.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-ink bg-canvas p-2.5 rounded-xl border border-border/30 whitespace-pre-wrap">
                      {sms.messageText}
                    </p>

                    {otp && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-semibold text-ink-muted">
                          Detected 6-Digit OTP: <strong className="font-mono text-plum text-sm">{otp}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(otp)}
                          className="px-2.5 py-1 bg-plum text-white text-[11px] font-black rounded-lg hover:bg-plum/90 cursor-pointer shadow-2xs"
                        >
                          Copy Code
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {emailList.length === 0 ? (
              <div className="text-center py-12 bg-surface rounded-2xl border-2 border-border/40 text-xs text-ink-muted">
                No email notifications dispatched yet. Register as State Team or request Leadership OTP to inspect.
              </div>
            ) : (
              emailList.map((email) => {
                let parsedPayload: any = {};
                try {
                  parsedPayload = JSON.parse(email.payload);
                } catch {}

                const otp = parsedPayload.otp;

                return (
                  <div
                    key={email.id}
                    className="p-4 bg-surface rounded-2xl border-2 border-border/40 shadow-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-ink">{email.recipient}</span>
                        <span className="text-[10px] font-mono font-bold bg-lavender text-plum px-2 py-0.5 rounded-full border border-border/30">
                          {email.template}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {email.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted">
                        {new Date(email.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-ink bg-canvas p-2.5 rounded-xl border border-border/30 overflow-x-auto">
                      <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(parsedPayload, null, 2)}</pre>
                    </div>

                    {otp && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-semibold text-ink-muted">
                          Verification OTP: <strong className="font-mono text-plum text-sm">{otp}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(String(otp))}
                          className="px-2.5 py-1 bg-plum text-white text-[11px] font-black rounded-lg hover:bg-plum/90 cursor-pointer shadow-2xs"
                        >
                          Copy Code
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
