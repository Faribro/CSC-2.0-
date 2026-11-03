import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-[20px] shadow-comic border-2 border-border/40 p-8 text-center">
        <div className="w-16 h-16 bg-lavender text-plum rounded-full flex items-center justify-center mx-auto text-2xl font-black mb-4 border border-border/30">
          404
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-peach text-ink border border-border/40 px-3 py-1 rounded-full">
          Page Not Found
        </span>
        <h1 className="text-xl font-black text-ink mt-3 font-comic">
          Resource Does Not Exist
        </h1>
        <p className="text-xs text-ink-muted mt-2">
          The follow-up route or beneficiary record you requested could not be found. Please verify the URL or return to your active worklist.
        </p>

        <div className="flex flex-col gap-2.5 mt-6">
          <Link
            href="/work"
            className="w-full py-2.5 px-4 bg-primary text-white rounded-[12px] text-xs font-black hover:bg-primary-hover transition-colors shadow-comic-sm font-comic inline-flex items-center justify-center gap-2"
          >
            <Icon name="Home" className="w-4 h-4" />
            <span>Go to Forms</span>
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
