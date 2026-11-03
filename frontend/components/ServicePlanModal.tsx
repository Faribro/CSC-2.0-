"use client";

import React, { useState } from 'react';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

interface ServicePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { serviceCode: string; serviceName: string; targetDueDate: string; notes: string }) => void;
  lang: Language;
  clientName: string;
  clientRef: string;
}

export const ServicePlanModal: React.FC<ServicePlanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lang,
  clientName,
  clientRef
}) => {
  const t = translations[lang];
  const [serviceCode, setServiceCode] = useState('ART_REFILL');
  const [serviceName, setServiceName] = useState('Monthly ART Medication Dispensation');
  const [targetDueDate, setTargetDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleServiceChange = (code: string) => {
    setServiceCode(code);
    if (code === 'ART_REFILL') setServiceName('Monthly ART Medication Dispensation');
    else if (code === 'VIRAL_LOAD') setServiceName('Routine Annual Viral Load Monitoring');
    else if (code === 'CD4_TEST') setServiceName('CD4 Count Monitoring');
    else if (code === 'NUTRITION_SUPPORT') setServiceName('Supplementary Food Basket Distribution');
    else if (code === 'LEGAL_AID') setServiceName('Stigma / Property Rights Legal Aid');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ serviceCode, serviceName, targetDueDate, notes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" role="dialog" aria-modal="true" aria-labelledby="plan-modal-title">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 id="plan-modal-title" className="text-lg font-bold text-slate-900">{t.planService} (CRF Section J5)</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.serviceCode}</label>
            <select
              value={serviceCode}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-plum focus:outline-none"
            >
              <option value="ART_REFILL">ART Refill Support (दवा वितरण सहायता)</option>
              <option value="VIRAL_LOAD">Viral Load Test Facilitation (वायरल लोड जांच)</option>
              <option value="CD4_TEST">CD4 Test Referral (सीडी4 जांच)</option>
              <option value="NUTRITION_SUPPORT">Nutritional Support (पोषण सहायता)</option>
              <option value="LEGAL_AID">Social Protection / Legal Support (सामाजिक सुरक्षा)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.serviceName}</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-plum focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.targetDueDate}</label>
            <input
              type="date"
              value={targetDueDate}
              onChange={(e) => setTargetDueDate(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-plum focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1 italic">
              Non-negotiable rule: Planned service is registered with status PLANNED. It becomes DELIVERED only upon recording an explicit delivered service record.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Action plan, ART center name, assigned volunteer..."
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
