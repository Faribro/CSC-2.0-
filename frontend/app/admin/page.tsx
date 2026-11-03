"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Language, translations } from '@/lib/translations';
import { getStoredSession } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';

interface AdminStatus {
  sheetsDeploymentId: string;
  sheetsSpreadsheetId: string;
  sheetsMirrorStatus: string;
  outboxPending: number;
  outboxFailed: number;
  outboxPublished: number;
  recentOutbox: Array<{
    id: string;
    eventType: string;
    aggregateType: string;
    status: string;
    attempts: number;
    createdAt: string;
  }>;
  recentAudits: Array<{
    id: string;
    action: string;
    resourceType: string;
    actorUsername: string;
    occurredAt: string;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push('/sign-in');
      return;
    }
    if (session.role !== 'administrator') {
      router.push('/not-permitted');
      return;
    }

    const fetchStatus = async () => {
      try {
        const token = session.token;
        const res = await fetch('/api/v1/admin/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403) {
          router.push('/not-permitted');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        } else {
          setErrorMessage('Failed to load system administration status.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error communicating with administration endpoint.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [router]);

  return (
    <AppShell currentLang={lang} onLanguageChange={setLang}>
      <div className="space-y-6">
        {/* Masthead */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t.admin}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Transactional Outbox Streaming, Google Sheets Mirroring, and Immutable Audit Trail
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-full uppercase">
              Strictly Role-Gated: Administrator
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl p-4">
            {errorMessage}
          </div>
        )}

        {/* Integration Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Outbox Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Transactional Outbox Queue
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-2xl font-black text-slate-900">
                {status ? status.outboxPending : 0}
              </span>
              <span className="text-xs text-slate-500 font-semibold">pending sync</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px]">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Icon name="check" className="w-3 h-3 text-emerald-700" />
                <span>{status ? status.outboxPublished : 0} published</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <Icon name="cancel" className="w-3 h-3 text-rose-700" />
                <span>{status ? status.outboxFailed : 0} failed</span>
              </span>
            </div>
          </div>

          {/* Google Sheets Mirror Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Google Sheets Mirroring
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-emerald-800">
                {status?.sheetsMirrorStatus || 'CONNECTED'}
              </span>
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-500 truncate">
              ID: {status?.sheetsDeploymentId || 'AKfycbwDZRDCm5TgOAL4wVkGgLBkxQtthZYBzkUTd_M3PNrSF_srx0a78rcEuSU7byHqp7AjnQ'}
            </div>
          </div>

          {/* Center Scopes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Jurisdiction & Scopes
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              2 Active Centers
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-500">
              CENTER_DELHI_01, CENTER_MUMBAI_01
            </div>
          </div>
        </div>

        {/* Recent Outbox Events Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Icon name="Activity" className="w-4 h-4 text-amber-600" />
            <span>Transactional Outbox Events (Async Mirroring)</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Aggregate</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!status?.recentOutbox || status.recentOutbox.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Outbox queue is currently clear. All events mirrored to Google Sheets.
                    </td>
                  </tr>
                ) : (
                  status.recentOutbox.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50 font-mono text-[11px]">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{evt.eventType}</td>
                      <td className="py-2.5 px-3 text-slate-600">{evt.aggregateType}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{evt.attempts}</td>
                      <td className="py-2.5 px-3 text-slate-500">{evt.createdAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Icon name="ShieldCheck" className="w-4 h-4 text-emerald-700" />
            <span>Immutable Audit Trail (Append-Only)</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource Type</th>
                  <th className="py-2.5 px-3">Actor Username</th>
                  <th className="py-2.5 px-3">Occurred At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!status?.recentAudits || status.recentAudits.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  status.recentAudits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-slate-50 font-mono text-[11px]">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{audit.action}</td>
                      <td className="py-2.5 px-3 text-slate-600">{audit.resourceType}</td>
                      <td className="py-2.5 px-3 text-emerald-800 font-bold">{audit.actorUsername}</td>
                      <td className="py-2.5 px-3 text-slate-500">{audit.occurredAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
