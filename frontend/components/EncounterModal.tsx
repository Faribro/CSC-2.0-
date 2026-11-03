"use client";

import React, { useState } from 'react';
import { Language, translations } from '@/lib/translations';
import { Icon } from '@/components/ui/Icon';

interface EncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    observationDate: string;
    encounterType: string;
    artAdherence: string;
    nutrition: string;
    notes: string;
    cd4?: number;
    viralLoad?: number;
  }) => void;
  lang: Language;
  clientName: string;
  clientRef: string;
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  lang,
  clientName,
  clientRef
}) => {
  const t = translations[lang];
  const [observationDate, setObservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [encounterType, setEncounterType] = useState('HOME_VISIT');
  const [artAdherence, setArtAdherence] = useState('Good (95%+)');
  const [nutrition, setNutrition] = useState('Adequate');
  const [cd4, setCd4] = useState<string>('');
  const [viralLoad, setViralLoad] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      observationDate,
      encounterType,
      artAdherence,
      nutrition,
      notes,
      cd4: cd4 ? parseInt(cd4, 10) : undefined,
      viralLoad: viralLoad ? parseInt(viralLoad, 10) : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" role="dialog" aria-modal="true" aria-labelledby="encounter-modal-title">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
        <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
          <div>
            <h2 id="encounter-modal-title" className="text-lg font-bold text-slate-900">{t.recordEncounter} (CRF Section I)</h2>
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.observationDate} (Date visit clinically occurred)</label>
            <input
              type="date"
              value={observationDate}
              onChange={(e) => setObservationDate(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-plum focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-400 mt-0.5">Note: System automatically records clock_timestamp separately as entry timestamp.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.encounterType}</label>
            <select
              value={encounterType}
              onChange={(e) => setEncounterType(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-plum focus:outline-none"
            >
              <option value="HOME_VISIT">{t.homeVisit}</option>
              <option value="CSC_VISIT">{t.cscVisit}</option>
              <option value="PHONE_COUNSELING">{t.phoneCounseling}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.artAdherence}</label>
              <select
                value={artAdherence}
                onChange={(e) => setArtAdherence(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-plum focus:outline-none"
              >
                <option value="Good (95%+)">Good (95%+ adherence)</option>
                <option value="Moderate (85-94%)">Moderate (85-94%)</option>
                <option value="Poor (<85%)">Poor (&lt;85% - Missed doses)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.nutritionAssessment}</label>
              <select
                value={nutrition}
                onChange={(e) => setNutrition(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-plum focus:outline-none"
              >
                <option value="Adequate">Adequate / Normal</option>
                <option value="Mild Malnutrition">Mild Underweight</option>
                <option value="Severe Malnutrition">Severe Malnutrition (SAM)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.cd4Count}</label>
              <input
                type="number"
                min="0"
                max="5000"
                value={cd4}
                onChange={(e) => setCd4(e.target.value)}
                placeholder="e.g. 450"
                className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-plum focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.viralLoad}</label>
              <input
                type="number"
                min="0"
                value={viralLoad}
                onChange={(e) => setViralLoad(e.target.value)}
                placeholder="e.g. 0 (Undetectable)"
                className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-plum focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Clinical observation summary, family support, barriers identified..."
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
