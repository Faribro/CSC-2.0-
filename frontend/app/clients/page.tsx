'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

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

export default function SubmittedSurveysDirectoryPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 15;

  const fetchClients = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/clients?page=${currentPage}&size=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setTotalElements(data.totalElements || 0);
      } else {
        setClients([]);
      }
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, currentPage]);

  return (
    <AppShell
      currentLang={lang}
      onLanguageChange={setLang}
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Filter and Search Bar */}
        <div className="bg-surface rounded-[16px] border-2 border-border/40 shadow-comic p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink-muted">
              <Icon name="Search" className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              placeholder={lang === 'hi' ? 'नाम, संदर्भ आईडी या एआरटी नंबर से खोजें...' : 'Search by name, reference ID, or ART number...'}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-[10px] border-2 border-border/50 bg-canvas text-ink min-h-[44px] focus:outline-hidden focus:border-plum focus:ring-2 focus:ring-plum/20"
            />
          </div>

          <div className="text-xs font-mono font-bold text-ink-muted self-end md:self-center">
            {lang === 'hi' ? `कुल रिकॉर्ड: ${totalElements}` : `Total verified: ${totalElements}`}
          </div>
        </div>

        {/* Surveys Linelist Table */}
        <div className="bg-surface rounded-[16px] border-2 border-border/40 shadow-comic overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas border-b-2 border-border/40 text-ink font-black uppercase text-[10.5px] tracking-wider">
                  <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'संदर्भ आईडी' : 'Client Ref'}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'लाभार्थी का नाम' : 'Beneficiary Name'}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'आयु / लिंग' : 'Age / Gender'}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'एचआईवी / एआरटी स्थिति' : 'HIV / ART Status'}</th>
                  <th scope="col" className="py-3.5 px-4">{lang === 'hi' ? 'पंजीकरण तिथि' : 'Registration Date'}</th>
                  <th scope="col" className="py-3.5 px-4 text-center">{lang === 'hi' ? 'क्रियाएं' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-muted">
                      <div className="inline-flex items-center gap-2">
                        <Icon name="RefreshCw" className="w-4 h-4 animate-spin text-plum" />
                        <span>{lang === 'hi' ? 'लोड हो रहा है...' : 'Loading submitted records...'}</span>
                      </div>
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-muted">
                      <Icon name="FileText" className="w-8 h-8 mx-auto text-ink-muted/40 mb-2" />
                      <p className="font-bold text-xs">{lang === 'hi' ? 'कोई रिकॉर्ड नहीं मिला।' : 'No records found.'}</p>
                      <p className="text-[11px] text-ink-muted/80 mt-1">
                        {lang === 'hi' ? 'आपके द्वारा सबमिट किए गए रिकॉर्ड और फॉलो-अप यहां दिखाई देंगे।' : 'Records and follow-ups you complete and submit to the server will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-plum">
                        <Link href={`/clients/${c.id}?mode=view`} className="hover:underline">
                          {c.clientRef}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ink">{c.fullName}</div>
                        {c.primaryPhone && <div className="text-[11px] font-mono text-ink-muted">{c.primaryPhone}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-medium capitalize">
                        {c.age} yrs • {c.gender}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-mint/50 text-success-ink border border-mint">
                          {c.hivStatus || 'Recorded'}
                        </span>
                        {c.artNumber && (
                          <div className="text-[10.5px] font-mono text-ink-muted mt-0.5">
                            {c.artNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted font-medium">
                        {c.registrationDate || 'Recent'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Button */}
                          <Link
                            href={`/clients/${c.id}?mode=view`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-canvas hover:bg-border/30 text-ink font-bold rounded-[8px] border border-border/40 transition-colors text-[11px]"
                            title={lang === 'hi' ? 'विवरण देखें' : 'View record'}
                          >
                            <Icon name="Eye" className="w-3.5 h-3.5 text-plum" />
                            <span>{lang === 'hi' ? 'देखें' : 'View'}</span>
                          </Link>

                          {/* Edit Button */}
                          <Link
                            href={`/clients/${c.id}?mode=edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-plum hover:bg-[#682e77] text-white font-bold rounded-[8px] transition-colors text-[11px] shadow-2xs"
                            title={lang === 'hi' ? 'संशोधन संपादित करें' : 'Edit with revision reason'}
                          >
                            <Icon name="Edit3" className="w-3.5 h-3.5" />
                            <span>{lang === 'hi' ? 'संपादित करें' : 'Edit'}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bounded Pagination Controls */}
          {totalElements > pageSize && (
            <div className="p-3 bg-canvas border-t-2 border-border/40 flex items-center justify-between text-xs">
              <span className="text-ink-muted">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-[8px] bg-surface border border-border/50 text-ink font-bold disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={(currentPage + 1) * pageSize >= totalElements}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-[8px] bg-surface border border-border/50 text-ink font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
