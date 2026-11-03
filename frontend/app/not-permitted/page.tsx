"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredSession, StoredUser } from '@/lib/auth';
import { Icon } from '@/components/ui/Icon';

export default function NotPermittedPage() {
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const user = getStoredSession();
    setCurrentUser(user);
  }, []);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-[20px] shadow-comic border-2 border-border/40 p-8 text-center">
        <div className="w-16 h-16 bg-pink text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-border/30">
          <Icon name="AlertCircle" className="w-8 h-8 text-primary" />
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-pink/50 text-error-ink border border-border/40 px-3 py-1 rounded-full">
          403 Access Restricted
        </span>
        <h1 className="text-xl font-black text-ink mt-3 font-comic">
          Not Permitted for Your Role
        </h1>
        <p className="text-xs text-ink-muted mt-2">
          Your current authenticated role (
          <strong className="text-ink">{currentUser?.role || 'unassigned'}</strong>
          ) does not have access permissions for this section.
        </p>

        {currentUser && (
          <div className="bg-canvas border-2 border-border/30 rounded-[12px] p-3 text-left text-xs my-4 space-y-1 text-ink">
            <div>
              User: <strong className="text-plum">{currentUser.fullName}</strong>
            </div>
            <div>
              Scope: <strong>{currentUser.scope}</strong>
            </div>
            <div>
              Authorized Centers: <strong>{currentUser.authorizedCenters.join(', ') || 'None'}</strong>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mt-6">
          <Link
            href="/work"
            className="w-full py-2.5 px-4 bg-primary text-white rounded-[12px] text-xs font-black hover:bg-primary-hover transition-colors shadow-comic-sm font-comic inline-flex items-center justify-center gap-2"
          >
            <Icon name="Home" className="w-4 h-4" />
            <span>Return to Forms</span>
          </Link>
          <Link
            href="/clients"
            className="w-full py-2.5 px-4 bg-canvas text-ink rounded-[12px] text-xs font-bold hover:bg-surface border-2 border-border/40 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Icon name="Folder" className="w-4 h-4" />
            <span>Go to Submitted Surveys</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
