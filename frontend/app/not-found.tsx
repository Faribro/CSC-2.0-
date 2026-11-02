import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl font-black mb-4">
          404
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full">
          Page Not Found
        </span>
        <h1 className="text-xl font-black text-slate-900 mt-3">
          Resource Does Not Exist
        </h1>
        <p className="text-xs text-slate-600 mt-2">
          The follow-up route or beneficiary record you requested could not be found. Please verify the URL or return to your active worklist.
        </p>

        <div className="flex flex-col gap-2 mt-6">
          <Link
            href="/work"
            className="w-full py-2.5 px-4 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
          >
            Go to My Work
          </Link>
          <Link
            href="/clients"
            className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Go to Beneficiary Linelist
          </Link>
        </div>
      </div>
    </div>
  );
}
