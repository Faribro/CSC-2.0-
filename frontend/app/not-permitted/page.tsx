"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getStoredSession, StoredUser } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';

export default function NotPermittedPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const user = getStoredSession();
    setCurrentUser(user);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="cancel" className="w-8 h-8 text-rose-700" />
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full">
          403 Access Restricted
        </span>
        <h1 className="text-xl font-black text-slate-900 mt-3">
          Not Permitted for Your Role
        </h1>
        <p className="text-xs text-slate-600 mt-2">
          Your current authenticated role (
          <strong className="text-slate-900">{currentUser?.role || 'unassigned'}</strong>
          ) does not have access permissions for this section.
        </p>

        {currentUser && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left text-xs my-4 space-y-1">
            <div>
              User: <strong>{currentUser.fullName}</strong>
            </div>
            <div>
              Scope: <strong>{currentUser.scope}</strong>
            </div>
            <div>
              Authorized Centers: <strong>{currentUser.authorizedCenters.join(', ') || 'None'}</strong>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6">
          <Link
            href="/work"
            className="w-full py-2.5 px-4 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
          >
            Return to My Work
          </Link>
          <Link
            href="/clients"
            className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Go to Beneficiary Linelist
          </Link>
          <Link
            href="/sign-in"
            className="text-xs text-slate-500 hover:text-slate-800 underline mt-2"
          >
            Switch to a different test user (e.g., Administrator)
          </Link>
        </div>
      </div>
    </div>
  );
}
