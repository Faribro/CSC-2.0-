"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Language, translations } from '@/lib/translations';

interface ClientSummary {
  id: string;
  clientRef: string;
  centerId: string;
  fullName: string;
  age: number;
  gender: string;
  primaryPhone?: string;
  hivStatus?: string;
  artNumber?: string;
  status: string;
  registrationDate?: string;
  openTaskCount: number;
}

export default function ClientsDirectoryPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [clients, setClients] = useState<ClientSummary[]>([
    {
      id: "client-001",
      clientRef: "CSC-DL-0001",
      centerId: "CENTER_DELHI_01",
      fullName: "Sunita Verma (Synthetic)",
      age: 28,
      gender: "female",
      primaryPhone: "0000000000",
      hivStatus: "positive",
      artNumber: "ART-DL-9988",
      status: "ACTIVE",
      registrationDate: "2026-04-12",
      openTaskCount: 1,
    },
    {
      id: "client-002",
      clientRef: "CSC-DL-0002",
      centerId: "CENTER_DELHI_01",
      fullName: "Rajesh Kumar (Synthetic)",
      age: 35,
      gender: "male",
      primaryPhone: "0000000001",
      hivStatus: "positive",
      artNumber: "ART-DL-9989",
      status: "ACTIVE",
      registrationDate: "2026-05-18",
      openTaskCount: 2,
    },
    {
      id: "client-003",
      clientRef: "CSC-MB-0001",
      centerId: "CENTER_MUMBAI_01",
      fullName: "Anita Patil (Synthetic)",
      age: 42,
      gender: "female",
      primaryPhone: "0000000002",
      hivStatus: "positive",
      artNumber: "ART-MB-5544",
      status: "ACTIVE",
      registrationDate: "2026-06-20",
      openTaskCount: 0,
    },
  ]);

  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt live fetch if available
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('csc_token');
        const res = await fetch(`/api/v1/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.clients && data.clients.length > 0) {
            setClients(data.clients);
          }
        }
      } catch (ignored) {
        // Fallback to initial synthetic data for offline/demo
      }
    };
    fetchClients();
  }, [search]);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientRef.toLowerCase().includes(search.toLowerCase()) ||
      (c.artNumber && c.artNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesCenter = centerFilter === 'ALL' || c.centerId === centerFilter;
    return matchesSearch && matchesCenter;
  });

  return (
    <AppShell
      currentLang={lang}
      onLanguageChange={setLang}
    >
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>👥</span> {t.clients} ({filteredClients.length})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Care & Support Centre Linelist and Beneficiary Directory
            </p>
          </div>

          <Link
            href="/clients/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all min-h-[44px]"
          >
            <span>+</span> {lang === 'hi' ? 'नया लाभार्थी पंजीकरण (CRF)' : 'New Registration (CRF)'}
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg min-h-[44px] focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              {t.center}:
            </label>
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 min-h-[44px] bg-white w-full md:w-48 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="ALL">All Authorized Centers</option>
              <option value="CENTER_DELHI_01">CENTER_DELHI_01</option>
              <option value="CENTER_MUMBAI_01">CENTER_MUMBAI_01</option>
            </select>
          </div>
        </div>

        {/* Client Linelist Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">{t.clientRef}</th>
                  <th className="py-3 px-4">Beneficiary Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">{t.center}</th>
                  <th className="py-3 px-4">ART Info</th>
                  <th className="py-3 px-4">Open Tasks</th>
                  <th className="py-3 px-4">{t.status}</th>
                  <th className="py-3 px-4 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No registered clients match your query.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {client.clientRef}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:text-emerald-700 hover:underline"
                        >
                          {client.fullName}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {client.age} yrs • {client.gender.toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {client.centerId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {client.artNumber || 'Pending'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {client.hivStatus?.toUpperCase() || 'POSITIVE'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {client.openTaskCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {client.openTaskCount} Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            0 Tasks
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-md border border-slate-300 transition-colors"
                        >
                          View Case →
                        </Link>
                      </td>
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
