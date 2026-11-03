"use client";

import React, { useState } from 'react';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

interface ContactAttemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { channel: string; outcome: string; notes: string; date: string }) => void;
  lang: Language;
  clientName: string;
  clientRef: string;
}

export const ContactAttemptModal: React.FC<ContactAttemptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lang,
  clientName,
  clientRef
}) => {
  const t = translations[lang];
  const [channel, setChannel] = useState('PHONE');
  const [outcome, setOutcome] = useState('reached');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ channel, outcome, notes, date });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" role="dialog" aria-modal="true" aria-labelledby="attempt-modal-title">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 id="attempt-modal-title" className="text-lg font-bold text-slate-900">{t.recordContactAttempt}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{clientName} ({clientRef})</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Close"
          >
            <Icon name="cancel" className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.dueDate} / Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-plum focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.channel}</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-plum focus:outline-none"
            >
              <option value="PHONE">Phone Call (दूरभाष)</option>
              <option value="HOME_VISIT">Home Visit (गृह भेंट)</option>
              <option value="PHYSICAL_CSC">Physical CSC Visit (सीएससी केंद्र)</option>
              <option value="WHATSAPP">WhatsApp / SMS (संदेश)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.outcome}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'reached', label: t.reached, color: 'border-mint bg-mint/50 text-success-ink' },
                { val: 'not_reached', label: t.not_reached, color: 'border-amber-500 bg-amber-50 text-amber-900' },
                { val: 'refused', label: t.refused, color: 'border-rose-500 bg-rose-50 text-rose-900' }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setOutcome(opt.val)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    outcome === opt.val ? opt.color + ' ring-2 ring-plum' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                  aria-pressed={outcome === opt.val}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              Notice: Contact attempt outcome does not close or complete the follow-up task. Task remains open.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Record beneficiary response, next suggested time, or barriers..."
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-plum focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm"
            >
              {t.submitToServer}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
