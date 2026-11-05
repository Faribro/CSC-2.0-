"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Language, translations } from '@/lib/translations';
import {
  REGISTRATION_SECTIONS,
  CHOICE_LISTS,
  CrfField,
  CrfSectionDef,
  ChoiceOption,
} from '@/lib/crfDefinitions';
import { isFieldRelevant, validateField } from '@/lib/crfLogic';
import { Icon } from '@/components/ui/Icon';
import { LocationFetchButton, LocationResult } from '@/components/ui/LocationFetchButton';

export interface FamilyMemberRow {
  id: string;
  name: string;
  relationship: string;
  age: string;
  gender: string;
  living: string;
  hivStatus: string;
  hivDate?: string;
  cd4?: string;
  vl?: string;
  artStatus?: string;
  artNumber?: string;
  idType?: string;
  idNumber?: string;
  registeredAtCsc?: string;
  cscId?: string;
}

export interface ReferralRequestRow {
  id: string;
  category: string;
  facility: string;
  targetDueDate: string;
  status: string;
  notes?: string;
}

export interface PlannedServiceRow {
  id: string;
  category: string;
  service: string;
  targetDueDate: string;
  facility?: string;
  notes?: string;
}

export interface RegistrationFormData {
  [key: string]: any;
  b2_members: FamilyMemberRow[];
  d5_referrals: ReferralRequestRow[];
  j5_services: PlannedServiceRow[];
}

export interface RegistrationFormProps {
  mode?: 'create' | 'edit' | 'view';
  initialData?: Partial<RegistrationFormData>;
  lang: Language;
  onDataChange?: (data: RegistrationFormData) => void;
  onSubmit?: (data: RegistrationFormData, changeReason?: string) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSwitchToEdit?: () => void;
  canEdit?: boolean;
  version?: number;
  clientRef?: string;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  mode = 'create',
  initialData,
  lang,
  onDataChange,
  onSubmit,
  isSubmitting = false,
  onCancel,
  onSwitchToEdit,
  canEdit = true,
  version = 1,
  clientRef = 'NEW',
}) => {
  const isHi = lang === 'hi';
  const t = translations[lang];
  const isReadOnly = mode === 'view';

  // Initialize form data with defaults and initialData
  const [formData, setFormData] = useState<RegistrationFormData>(() => {
    const base: RegistrationFormData = {
      // Baseline core fields
      a01_reg_date: new Date().toISOString().split('T')[0],
      a02_reg_place: '1',
      a03_name: '',
      a04_age: '30',
      a05_gender: '2',
      a06_marital: '1',
      a07_aadhaar: '',
      a08_abha: '',
      a08_consent: 'yes',
      a09_address: '',
      a10_csc_name: 'Central Delhi CSC',
      a10_pincode: '',
      a11_phone: '',
      a12_same: 'yes',
      a13_client_type: '2',
      a14_kp: 'na',
      a15_typ_other: 'na',
      a15_risk: 'low',
      a16_caretaker: '',
      a17_orphan: '',
      a18_education: '4',
      a18_in_school: 'no',
      a19_occupation: '5',
      a19_occupation_other: '',
      a20_marital: '1',
      a21_income: '2',

      // Section B: Family Members Repeat
      b1_family_id: '',
      b2_members: [
        {
          id: 'b2-1',
          name: 'Ramesh Sharma',
          relationship: '1',
          age: '34',
          gender: 'male',
          living: '1',
          hivStatus: 'negative',
          artStatus: '1',
        },
      ],

      // Section C: Clinical
      c1_hiv_confirmed: 'yes',
      c2_confirm_date: new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0],
      c2_ictc_tested: 'yes',
      c6_artc_name: 'LNJP Hospital ART Centre Delhi',
      c8_art_status: '1',
      c9_art_no: 'DL-LNJP-8899',
      c9_art_date: new Date(Date.now() - 300 * 86400000).toISOString().split('T')[0],
      c10_height: '165',
      c11_weight: '58',
      c12_cd4_done: 'yes',
      c12a_cd4_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
      c12b_cd4_count: '450',
      c12b_cd4_pct: '26',
      c13_vl_done: 'yes',
      c13a_vl_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
      c13b_vl_count: '0',
      c14_tb_history: 'no',
      c15_tb_status: '2',

      // Section D: Social Protection
      d1_linked: 'yes',
      d1a_services: ['1', '3'],
      d2_has_ent: 'yes',
      d2a_docs: ['1', '2'],
      d3_assessed: 'yes',
      d4_willing: 'yes',
      d5_referrals: [
        {
          id: 'd5-1',
          category: 'social_protection',
          facility: 'District Social Welfare Office',
          targetDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          status: 'PENDING',
          notes: 'Ration card scheme application assistance',
        },
      ],

      // Section E: Key Population
      e1_risk_level: 'standard',
      e2_ost: 'no',
      e3_needle: 'no',
      e10_diabetes: 'no',
      e11_htn: 'no',

      // Section F: Stigma
      f1_discrimination: 'no',

      // Section G: Disability
      g1_disability: 'no',

      // Section H: Status
      h0_deceased: 'no',

      // Section J: Verification & Declarations
      j1_checked: new Date().toISOString().split('T')[0],
      j2_clh: 'Dr. Sunita Rao',
      j3_coord: 'Vikram Mehta',
      j4_comments: 'Physical identity documents and treatment book sighted at intake visit.',
      j_docs: 'yes',
      j_doc_hiv: true,
      j_doc_addr: true,
      j_doc_art: true,
      j_dln: 'no',
      j_verification_date: new Date().toISOString().split('T')[0],
      j5_services: [
        {
          id: 'j5-1',
          category: '1',
          service: 'Monthly ART adherence counseling and pill count check',
          targetDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          facility: 'LNJP Hospital ART Centre Delhi',
          notes: 'Follow-up on adherence and nutrition',
        },
      ],
      ...initialData,
    };
    return base;
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<string>('sec-a');
  const [changeReason, setChangeReason] = useState<string>('');
  const [showReasonModal, setShowReasonModal] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Sync initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  // Handle simple input change
  const handleFieldChange = (name: string, value: any) => {
    if (isReadOnly) return;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (onDataChange) {
      onDataChange(updated);
    }
  };

  // Repeat Group Handlers: Family Members
  const handleAddMember = () => {
    if (isReadOnly) return;
    const newId = `b2-${Date.now()}`;
    const newMember: FamilyMemberRow = {
      id: newId,
      name: '',
      relationship: '1',
      age: '',
      gender: 'female',
      living: '1',
      hivStatus: 'unknown',
      artStatus: '1',
    };
    handleFieldChange('b2_members', [...(formData.b2_members || []), newMember]);
    setTimeout(() => {
      const el = document.getElementById(`member-first-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 100);
  };

  const handleRemoveMember = (id: string) => {
    if (isReadOnly) return;
    handleFieldChange(
      'b2_members',
      (formData.b2_members || []).filter((m) => m.id !== id)
    );
  };

  const handleUpdateMember = (id: string, field: keyof FamilyMemberRow, val: any) => {
    if (isReadOnly) return;
    const updated = (formData.b2_members || []).map((m) =>
      m.id === id ? { ...m, [field]: val } : m
    );
    handleFieldChange('b2_members', updated);
  };

  // Repeat Group Handlers: Referral Requests
  const handleAddReferral = () => {
    if (isReadOnly) return;
    const newId = `d5-${Date.now()}`;
    const newReferral: ReferralRequestRow = {
      id: newId,
      category: 'social_protection',
      facility: '',
      targetDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'PENDING',
      notes: '',
    };
    handleFieldChange('d5_referrals', [...(formData.d5_referrals || []), newReferral]);
    setTimeout(() => {
      const el = document.getElementById(`referral-first-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 100);
  };

  const handleRemoveReferral = (id: string) => {
    if (isReadOnly) return;
    handleFieldChange(
      'd5_referrals',
      (formData.d5_referrals || []).filter((r) => r.id !== id)
    );
  };

  const handleUpdateReferral = (id: string, field: keyof ReferralRequestRow, val: any) => {
    if (isReadOnly) return;
    const updated = (formData.d5_referrals || []).map((r) =>
      r.id === id ? { ...r, [field]: val } : r
    );
    handleFieldChange('d5_referrals', updated);
  };

  // Repeat Group Handlers: Planned Services
  const handleAddService = () => {
    if (isReadOnly) return;
    const newId = `j5-${Date.now()}`;
    const newService: PlannedServiceRow = {
      id: newId,
      category: '1',
      service: '',
      targetDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      facility: '',
      notes: '',
    };
    handleFieldChange('j5_services', [...(formData.j5_services || []), newService]);
    setTimeout(() => {
      const el = document.getElementById(`service-first-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 100);
  };

  const handleRemoveService = (id: string) => {
    if (isReadOnly) return;
    handleFieldChange(
      'j5_services',
      (formData.j5_services || []).filter((s) => s.id !== id)
    );
  };

  const handleUpdateService = (id: string, field: keyof PlannedServiceRow, val: any) => {
    if (isReadOnly) return;
    const updated = (formData.j5_services || []).map((s) =>
      s.id === id ? { ...s, [field]: val } : s
    );
    handleFieldChange('j5_services', updated);
  };

  // Validation & Relevance Calculation
  const fieldValidationMap = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const section of REGISTRATION_SECTIONS) {
      const isSecB = section.code === 'B';
      const isSecD = section.code === 'D';
      const isSecJ = section.code === 'J';
      for (const field of section.fields) {
        if (isSecB && field.name.startsWith('b2_')) continue;
        if (isSecD && field.name.startsWith('d5_')) continue;
        if (isSecJ && field.name.startsWith('j5_')) continue;
        if (isFieldRelevant(field, formData)) {
          const err = validateField(field, formData[field.name], formData, lang);
          if (err) {
            errors[field.name] = err;
          }
        }
      }
    }
    return errors;
  }, [formData, lang]);

  // Section completion statistics
  const sectionStats = useMemo(() => {
    return REGISTRATION_SECTIONS.map((section) => {
      let relevantCount = 0;
      let completedCount = 0;
      let errorCount = 0;
      const isSecB = section.code === 'B';
      const isSecD = section.code === 'D';
      const isSecJ = section.code === 'J';

      for (const field of section.fields) {
        if (isSecB && field.name.startsWith('b2_')) continue;
        if (isSecD && field.name.startsWith('d5_')) continue;
        if (isSecJ && field.name.startsWith('j5_')) continue;
        if (isFieldRelevant(field, formData)) {
          relevantCount++;
          const val = formData[field.name];
          if (val !== undefined && val !== null && val !== '') {
            completedCount++;
          }
          if (fieldValidationMap[field.name]) {
            errorCount++;
          }
        }
      }

      return {
        id: section.id,
        code: section.code,
        titleEn: section.titleEn,
        titleHi: section.titleHi,
        iconName: section.iconName,
        relevantCount,
        completedCount,
        errorCount,
        isComplete: relevantCount > 0 && completedCount >= relevantCount && errorCount === 0,
      };
    });
  }, [formData, fieldValidationMap]);

  const totalRelevant = sectionStats.reduce((sum, s) => sum + s.relevantCount, 0);
  const totalCompleted = sectionStats.reduce((sum, s) => sum + s.completedCount, 0);
  const totalErrors = Object.keys(fieldValidationMap).length;
  const overallPercentage = totalRelevant > 0 ? Math.min(100, Math.round((totalCompleted / totalRelevant) * 100)) : 100;

  // Horizontal Section Slider Controls
  const sliderRef = useRef<HTMLDivElement>(null);
  const handleSlideLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };
  const handleSlideRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  // Handle GPS Auto-Fetched Address
  const handleLocationFetched = (loc: LocationResult) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({
      ...prev,
      a11_door: loc.houseNumber || (loc.fullAddress ? loc.fullAddress.split(',')[0] : prev.a11_door),
      a11_street: loc.road || prev.a11_street,
      a11_village: loc.locality || prev.a11_village,
      a11_block: loc.subLocality || loc.locality || prev.a11_block,
      a11_landmark: loc.colony || prev.a11_landmark,
      a11_district: loc.district || prev.a11_district,
      a11_state: loc.state || prev.a11_state,
      a11_pin: loc.pincode || prev.a11_pin,
      a11_addr_verified: todayStr,
    }));
  };

  // Jump smoothly to a section
  const scrollToSection = (secId: string) => {
    setActiveSection(secId);
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Submit Handler
  const handleTriggerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isReadOnly) return;

    // Mark all relevant fields as touched to display errors
    const allTouched: Record<string, boolean> = {};
    for (const section of REGISTRATION_SECTIONS) {
      for (const f of section.fields) {
        allTouched[f.name] = true;
      }
    }
    setTouched(allTouched);

    if (totalErrors > 0) {
      // Find first error and scroll to it
      const firstErrorField = Object.keys(fieldValidationMap)[0];
      const el = document.getElementById(`field-${firstErrorField}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      alert(
        isHi
          ? `कृपया प्रपत्र में छूटी हुई या अमान्य ${totalErrors} जानकारी को ठीक करें।`
          : `Please resolve the ${totalErrors} required or invalid fields before submitting.`
      );
      return;
    }

    if (mode === 'edit') {
      setShowReasonModal(true);
    } else if (onSubmit) {
      onSubmit(formData);
    }
  };

  const handleConfirmEditSubmit = () => {
    if (!changeReason.trim()) {
      alert(isHi ? 'कृपया संशोधन का कारण दर्ज करें।' : 'Please provide a reason for this profile change.');
      return;
    }
    setShowReasonModal(false);
    if (onSubmit) {
      onSubmit(formData, changeReason.trim());
    }
  };

  // Render a single form field dynamically based on its definition
  const renderField = (field: CrfField) => {
    if (!isFieldRelevant(field, formData)) {
      return null;
    }

    const fieldId = `field-${field.name}`;
    const value = formData[field.name];
    const isTouched = touched[field.name];
    const error = isTouched ? fieldValidationMap[field.name] : null;
    const choices = field.choiceList ? CHOICE_LISTS[field.choiceList] || [] : [];
    const label = isHi ? field.labelHi || field.labelEn : field.labelEn || field.labelHi;
    const hint = isHi ? field.hintHi || field.hintEn : field.hintEn || field.hintHi;

    // Field Type 1: Note (Informational Banner)
    if (field.type === 'note') {
      return (
        <div
          key={field.name}
          className="col-span-full bg-canvas border border-border/40 rounded-xl p-4 my-2 text-xs text-ink flex items-start gap-2.5"
        >
          <Icon name="help" className="w-4 h-4 text-plum shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{label}</p>
            {hint && <p className="text-ink-muted mt-0.5">{hint}</p>}
          </div>
        </div>
      );
    }

    // Field Type 2: Calculate (Computed Read-Only Badge)
    if (field.type === 'calculate') {
      return null; // Evaluated internally without cluttering UI
    }

    // Read-only View Mode Rendering
    if (isReadOnly) {
      let displayVal = '—';
      if (value !== undefined && value !== null && value !== '') {
        if (field.type === 'select_one' && choices.length > 0) {
          const match = choices.find((c) => c.code === String(value));
          displayVal = match ? (isHi ? match.labelHi : match.labelEn) : String(value);
        } else if (field.type === 'select_multiple' && Array.isArray(value)) {
          const labels = value.map((code) => {
            const m = choices.find((c) => c.code === code);
            return m ? (isHi ? m.labelHi : m.labelEn) : code;
          });
          displayVal = labels.join(', ');
        } else if (typeof value === 'boolean') {
          displayVal = value ? (isHi ? 'हाँ' : 'Yes') : (isHi ? 'नहीं' : 'No');
        } else {
          displayVal = String(value);
        }
      }

      return (
        <div key={field.name} className="py-2 border-b border-slate-100 last:border-b-0">
          <span className="block text-[11px] font-medium text-slate-500">{label}</span>
          <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{displayVal}</span>
        </div>
      );
    }

    // Interactive Edit / Create Mode Rendering
    const fieldElement = (
      <div key={field.name} className="space-y-1.5" id={`wrapper-${field.name}`}>
        <label htmlFor={fieldId} className="block text-xs font-bold text-slate-800">
          {label} {field.required && <span className="text-rose-500">*</span>}
        </label>
        {hint && <p className="text-[11px] text-slate-500 italic leading-snug">{hint}</p>}

        {/* Control: Select One */}
        {field.type === 'select_one' ? (
          choices.length <= 4 && choices.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1" role="radiogroup">
              {choices.map((opt) => {
                const isSelected = String(value) === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleFieldChange(field.name, opt.code)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all min-h-[44px] flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isHi ? opt.labelHi : opt.labelEn}
                  </button>
                );
              })}
            </div>
          ) : (
            <select
              id={fieldId}
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 text-xs font-medium border rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden min-h-[44px] bg-white ${
                error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              }`}
            >
              <option value="">{isHi ? '-- चयन करें --' : '-- Select --'}</option>
              {choices.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {isHi ? opt.labelHi : opt.labelEn}
                </option>
              ))}
            </select>
          )
        ) : field.type === 'select_multiple' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {choices.map((opt) => {
              const selectedArr: string[] = Array.isArray(value) ? value : [];
              const isChecked = selectedArr.includes(opt.code);
              return (
                <label
                  key={opt.code}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-mint/40 border-mint text-success-ink'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleFieldChange(field.name, [...selectedArr, opt.code]);
                      } else {
                        handleFieldChange(
                          field.name,
                          selectedArr.filter((c) => c !== opt.code)
                        );
                      }
                    }}
                    className="w-4 h-4 rounded text-plum focus:ring-plum border-slate-300"
                  />
                  <span>{isHi ? opt.labelHi : opt.labelEn}</span>
                </label>
              );
            })}
          </div>
        ) : field.type === 'date' ? (
          <input
            id={fieldId}
            type="date"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`w-full px-3 py-2 text-xs font-medium border rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden min-h-[44px] bg-white ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
            }`}
          />
        ) : field.type === 'integer' || field.type === 'decimal' ? (
          <input
            id={fieldId}
            type="number"
            step={field.type === 'decimal' ? '0.1' : '1'}
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder="0"
            className={`w-full px-3 py-2 text-xs font-medium border rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden min-h-[44px] bg-white ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
            }`}
          />
        ) : (
          <input
            id={fieldId}
            type="text"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={isHi ? 'उत्तर दर्ज करें...' : 'Enter answer...'}
            className={`w-full px-3 py-2 text-xs font-medium border rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden min-h-[44px] bg-white ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
            }`}
          />
        )}

        {/* Inline Validation Error */}
        {error && (
          <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
            <Icon name="AlertCircle" className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );

    // If this is the "Address verified on" field, insert the LocationFetchButton right beside it
    if (field.name === 'a11_addr_verified') {
      return (
        <div key="addr-verification-block" className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
          {fieldElement}
          {!isReadOnly && (
            <div className="space-y-1.5" id="wrapper-fetch-address-btn">
              <span className="block text-xs font-bold text-slate-800 invisible select-none">
                {isHi ? 'पता खोजें' : 'Fetch Address'}
              </span>
              <LocationFetchButton
                onLocationFetched={handleLocationFetched}
                lang={lang}
              />
            </div>
          )}
        </div>
      );
    }

    return fieldElement;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-28">
      {/* ------------------------------------------------------------------ */}
      {/* 1. ENKETO FORM HEADER CARD */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            {(mode === 'view' || mode === 'edit') && (
              <div className="flex items-center gap-2 mb-1">
                {mode === 'view' && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-lavender text-plum border border-border/40">
                    {isHi ? 'केवल दृश्य (Read Only)' : 'Read Only'}
                  </span>
                )}
                {mode === 'edit' && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {isHi ? `संशोधन v${version}` : `Editing v${version}`}
                  </span>
                )}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              {isHi
                ? 'CSC 2.0 देखभाल और सहायता केंद्र पंजीकरण एवं फॉलो-अप प्रपत्र'
                : 'CSC 2.0 Care & Support Centre Intake and Follow-Up Form'}
            </h1>
            {clientRef && clientRef !== 'NEW' && (
              <p className="text-xs text-slate-500 mt-0.5">
                Ref: <strong className="font-mono text-slate-800">{clientRef}</strong>
              </p>
            )}
          </div>

          {/* Action Button for View Mode */}
          {mode === 'view' && canEdit && onSwitchToEdit && (
            <button
              type="button"
              onClick={onSwitchToEdit}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors shrink-0 min-h-[44px]"
            >
              <Icon name="edit" className="w-4 h-4" />
              <span>{isHi ? 'संशोधन करें (Edit)' : 'Edit Beneficiary Record'}</span>
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 2. HORIZONTAL SECTION PILL RUNNER (ENKETO JUMP TABS) */}
        {/* ------------------------------------------------------------------ */}
        <div className="relative flex items-center gap-2 pt-1 pb-1">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={handleSlideLeft}
            aria-label={isHi ? 'बाएं स्क्रॉल करें' : 'Scroll left'}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors shrink-0 shadow-xs cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            <Icon name="ChevronLeft" className="w-4 h-4" />
          </button>

          {/* Pill Slider with sleek invisible scrollbar (navigable via Chevrons and swipe) */}
          <div
            ref={sliderRef}
            className="flex-1 overflow-x-auto py-1 px-1 scroll-smooth scrollbar-none no-scrollbar"
          >
            <div className="flex items-center gap-2 min-w-max">
              {sectionStats.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer min-h-[40px] ${
                      isActive
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon name={sec.iconName} className="w-3.5 h-3.5" />
                    <span>
                      {sec.code}. {isHi ? sec.titleHi.split('.')[1] || sec.titleHi : sec.titleEn.split('.')[1] || sec.titleEn}
                    </span>
                    {sec.errorCount > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title={`${sec.errorCount} errors`} />
                    ) : sec.isComplete ? (
                      <span className="w-2 h-2 rounded-full bg-mint" title="Completed" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={handleSlideRight}
            aria-label={isHi ? 'दाएं स्क्रॉल करें' : 'Scroll right'}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors shrink-0 shadow-xs cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            <Icon name="ChevronRight" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. CONTINUOUS FORM BODY: ALL SECTIONS A THROUGH J */}
      {/* ------------------------------------------------------------------ */}
      <form onSubmit={handleTriggerSubmit} className="space-y-6">
        {REGISTRATION_SECTIONS.map((section) => {
          const stats = sectionStats.find((s) => s.id === section.id);
          const isSecB = section.code === 'B';
          const isSecD = section.code === 'D';
          const isSecJ = section.code === 'J';

          return (
            <section
              key={section.id}
              id={section.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 scroll-mt-24"
            >
              {/* Section Header */}
              <div className="border-b border-slate-100 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-lavender text-plum flex items-center justify-center font-bold">
                    <Icon name={section.iconName} className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {isHi ? section.titleHi : section.titleEn}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Section {section.code} • {stats?.completedCount || 0} of {stats?.relevantCount || 0} questions answered
                    </p>
                  </div>
                </div>

                {stats?.isComplete && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-ink bg-mint/50 px-2.5 py-1 rounded-full border border-mint">
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>{isHi ? 'पूर्ण' : 'Completed'}</span>
                  </span>
                )}
              </div>

              {/* Normal Section Fields (Excluding Repeat Row Items handled in cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {section.fields
                  .filter((f) => !f.name.startsWith('b2_') && !f.name.startsWith('d5_') && !f.name.startsWith('j5_'))
                  .map((f) => renderField(f))}
              </div>

              {/* SECTION B: REPEAT GROUP B2 (Family Members) & B5 CODING GUIDE */}
              {isSecB && (
                <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
                  {/* B5. Reference Legend / Coding Guide from NACO CRF Page 4 */}
                  <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-3.5 text-xs text-slate-800 space-y-2">
                    <div className="font-black text-amber-950 flex items-center gap-2">
                      <Icon name="Info" className="w-4 h-4 text-amber-700" />
                      <span>B5. {isHi ? 'तालिका में जानकारी भरने के लिए कॉलम शीर्षक के अनुसार संख्या चुनें' : 'Pick the number as per column heading to fill the data in the table'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2e. {isHi ? 'जीवित स्थिति (Living)' : 'Living Status'}:</span>
                        <span className="text-slate-600">1. {isHi ? 'जीवित' : 'Alive'} • 2. {isHi ? 'मृत' : 'Dead'}</span>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2g. {isHi ? 'एचआईवी स्थिति' : 'HIV Status'}:</span>
                        <span className="text-slate-600">1. +ve • 2. -ve • 3. Not Tested • 4. Don&apos;t Know</span>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2j. {isHi ? 'एआरटी स्थिति' : 'ART Status'}:</span>
                        <span className="text-slate-600">1. Pre-ART • 2. On-ART • 3. New PLHIV</span>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-amber-200">
                        <span className="font-bold text-slate-900 block mb-0.5">B2k. {isHi ? 'आईडी प्रकार' : 'Type of ID'}:</span>
                        <span className="text-slate-600">1. Pre-ART • 2. On-ART • 3. ICTC PID</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-900/90 font-medium italic">
                      {isHi
                        ? 'नोट: यदि एक से अधिक साथी हों, तो उसे बच्चे की पंक्ति में भरें। गैर-पारंपरिक परिवार सदस्य (MSM/TG/अन्य साथी) भी यहाँ दर्ज करें।'
                        : 'Note: If more than one partner, fill it in the child row. Include non-traditional household members (MSM/TG/other sexual partners).'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>B2. {isHi ? 'परिवार के सदस्य और आश्रित' : 'Family Members & Dependents'}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({formData.b2_members?.length || 0} {isHi ? 'सदस्य' : (formData.b2_members?.length === 1 ? '1 member' : `${formData.b2_members?.length || 0} members`)})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isHi
                          ? 'कॉलम B2a से B2l तक सभी विवरण भरें (पिता, माता, पति/पत्नी, साथी, बच्चे, गैर-पारंपरिक सदस्य)।'
                          : 'Record columns B2a through B2l for each household member (Father, Mother, Spouse, Partner, Children, Non-traditional members).'}
                      </p>
                    </div>
                  </div>

                  {formData.b2_members && formData.b2_members.length > 0 ? (
                    <div className="space-y-4">
                      {formData.b2_members.map((member, idx) => (
                        <div
                          key={member.id}
                          className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              #{idx + 1} • {member.name || (isHi ? 'नया सदस्य' : 'Family Member')}
                            </span>
                            {!isReadOnly && formData.b2_members.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1"
                              >
                                <Icon name="delete" className="w-3.5 h-3.5" />
                                <span>{isHi ? 'हटाएं' : 'Remove'}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                            {/* B2a. Relationship */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2a. {isHi ? 'रिश्ता' : 'Relationship'}
                              </label>
                              <select
                                id={`member-first-${member.id}`}
                                disabled={isReadOnly}
                                value={member.relationship}
                                onChange={(e) => handleUpdateMember(member.id, 'relationship', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-medium"
                              >
                                {(CHOICE_LISTS['relation'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2b. Full Name */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2b. {isHi ? 'नाम' : 'Full Name'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={member.name}
                                onChange={(e) => handleUpdateMember(member.id, 'name', e.target.value)}
                                placeholder="Name"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2c. Age (years) */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2c. {isHi ? 'उम्र (पूर्ण वर्ष)' : 'Age (Complete years)'}
                              </label>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={member.age}
                                onChange={(e) => handleUpdateMember(member.id, 'age', e.target.value)}
                                placeholder="Age"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2d. Gender */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2d. {isHi ? 'लिंग' : 'Gender'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.gender}
                                onChange={(e) => handleUpdateMember(member.id, 'gender', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                {(CHOICE_LISTS['gender'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2e. Living Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2e. {isHi ? 'जीवित स्थिति' : 'Living Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.living || '1'}
                                onChange={(e) => handleUpdateMember(member.id, 'living', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                {(CHOICE_LISTS['living'] || [
                                  { code: '1', labelEn: 'Alive', labelHi: 'जीवित' },
                                  { code: '2', labelEn: 'Dead', labelHi: 'मृत' },
                                ]).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2f. Date of HIV Testing */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2f. {isHi ? 'हाल के HIV टेस्ट की तारीख' : 'Date of HIV Test'}
                              </label>
                              <input
                                type="date"
                                disabled={isReadOnly}
                                value={member.hivDate || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'hivDate', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2g. HIV Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2g. {isHi ? 'एचआईवी स्थिति' : 'HIV Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={
                                  member.hivStatus === 'positive'
                                    ? '1'
                                    : member.hivStatus === 'negative'
                                    ? '2'
                                    : member.hivStatus === 'unknown'
                                    ? '4'
                                    : member.hivStatus || '3'
                                }
                                onChange={(e) => handleUpdateMember(member.id, 'hivStatus', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-bold"
                              >
                                {(CHOICE_LISTS['hivstat'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2h. Latest CD4 count */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2h. {isHi ? 'नवीनतम CD4 (यदि +ve)' : 'Latest CD4 (If +ve)'}
                              </label>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={member.cd4 || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'cd4', e.target.value)}
                                placeholder="0–5000"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2i. Latest Viral Load */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2i. {isHi ? 'नवीनतम VL (यदि +ve)' : 'Latest Viral Load (If +ve)'}
                              </label>
                              <input
                                type="number"
                                disabled={isReadOnly}
                                value={member.vl || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'vl', e.target.value)}
                                placeholder="Copies / mL"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2j. ART Status */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2j. {isHi ? 'एआरटी स्थिति' : 'ART Status'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.artStatus || '1'}
                                onChange={(e) => handleUpdateMember(member.id, 'artStatus', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 font-medium"
                              >
                                {(CHOICE_LISTS['artstat'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2k. Type of ID */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2k. {isHi ? 'आईडी प्रकार' : 'Type of ID'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.idType || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'idType', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                <option value="">{isHi ? '-- चुनें --' : '-- Select --'}</option>
                                {(CHOICE_LISTS['idtype'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code}. {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* B2k. ID Number */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2k. {isHi ? 'आईडी संख्या' : 'ID Number'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={member.idNumber || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'idNumber', e.target.value)}
                                placeholder="ID Number"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            {/* B2l. Registered at CSC? */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2l. {isHi ? 'CSC में पंजीकृत?' : 'Registered at CSC?'}
                              </label>
                              <select
                                disabled={isReadOnly}
                                value={member.registeredAtCsc || 'no'}
                                onChange={(e) => handleUpdateMember(member.id, 'registeredAtCsc', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                <option value="no">{isHi ? '1. नहीं (No)' : '1. No'}</option>
                                <option value="yes">{isHi ? '2. हाँ (Yes)' : '2. Yes'}</option>
                              </select>
                            </div>

                            {/* B2l. Client CSC ID */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                B2l. {isHi ? 'क्लाइंट CSC आईडी' : 'Client CSC ID'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly || member.registeredAtCsc !== 'yes'}
                                value={member.cscId || ''}
                                onChange={(e) => handleUpdateMember(member.id, 'cscId', e.target.value)}
                                placeholder={member.registeredAtCsc === 'yes' ? 'CSC ID (e.g. DL-01-0023)' : isHi ? 'पंजीकृत होने पर भरें' : 'If registered at CSC'}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isHi ? 'कोई परिवार का सदस्य दर्ज नहीं है।' : 'No family members recorded.'}
                    </p>
                  )}

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer py-3 px-4"
                    >
                      <Icon name="add" className="w-4 h-4 text-slate-700" />
                      <span>{isHi ? '+ सदस्य जोड़ें' : '+ Add Member'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* SECTION D: REPEAT GROUP D5 (Referrals) */}
              {isSecD && (
                <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>D5. {isHi ? 'रेफरल और लिंकेज अनुरोध' : 'Referral & Linkage Requests'}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({formData.d5_referrals?.length || 0} {isHi ? 'अनुरोध' : (formData.d5_referrals?.length === 1 ? '1 request' : `${formData.d5_referrals?.length || 0} requests`)})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Structured referrals to social protection, legal aid, nutrition, and medical schemes.
                      </p>
                    </div>
                  </div>

                  {formData.d5_referrals && formData.d5_referrals.length > 0 ? (
                    <div className="space-y-3">
                      {formData.d5_referrals.map((refItem, idx) => (
                        <div
                          key={refItem.id}
                          className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              #{idx + 1} • {refItem.category || 'Referral'}
                            </span>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveReferral(refItem.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1"
                              >
                                <Icon name="delete" className="w-3.5 h-3.5" />
                                <span>{isHi ? 'हटाएं' : 'Remove'}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'योजना / श्रेणी' : 'Scheme / Category'}
                              </label>
                              <select
                                id={`referral-first-${refItem.id}`}
                                disabled={isReadOnly}
                                value={refItem.category}
                                onChange={(e) => handleUpdateReferral(refItem.id, 'category', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                {(CHOICE_LISTS['sws'] || CHOICE_LISTS['d5_scheme'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'लक्षित संस्था / केंद्र' : 'Target Facility / Office'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={refItem.facility}
                                onChange={(e) => handleUpdateReferral(refItem.id, 'facility', e.target.value)}
                                placeholder="Facility name"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'लक्ष्य तिथि' : 'Target Due Date'}
                              </label>
                              <input
                                type="date"
                                disabled={isReadOnly}
                                value={refItem.targetDueDate}
                                onChange={(e) => handleUpdateReferral(refItem.id, 'targetDueDate', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'टिप्पणी' : 'Notes / Status'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={refItem.notes || ''}
                                onChange={(e) => handleUpdateReferral(refItem.id, 'notes', e.target.value)}
                                placeholder="Notes"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isHi ? 'कोई रेफरल अनुरोध दर्ज नहीं है।' : 'No referral requests logged.'}
                    </p>
                  )}

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddReferral}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer py-3 px-4"
                    >
                      <Icon name="add" className="w-4 h-4 text-slate-700" />
                      <span>{isHi ? '+ रेफरल जोड़ें' : '+ Add Referral'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* SECTION J: REPEAT GROUP J5 (Planned Services) */}
              {isSecJ && (
                <div className="mt-8 border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>J5. {isHi ? 'नियोजित अनुवर्ती सेवाएं' : 'Planned Follow-Up Services'}</span>
                        <span className="text-xs font-normal text-slate-500">
                          ({formData.j5_services?.length || 0} {isHi ? 'सेवाएं' : (formData.j5_services?.length === 1 ? '1 service' : `${formData.j5_services?.length || 0} services`)})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Schedule upcoming routine adherence visits, viral load tests, and entitlement check-ins.
                      </p>
                    </div>
                  </div>

                  {formData.j5_services && formData.j5_services.length > 0 ? (
                    <div className="space-y-3">
                      {formData.j5_services.map((svc, idx) => (
                        <div
                          key={svc.id}
                          className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              #{idx + 1} • {svc.service || 'Planned Service'}
                            </span>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveService(svc.id)}
                                className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1"
                              >
                                <Icon name="delete" className="w-3.5 h-3.5" />
                                <span>{isHi ? 'हटाएं' : 'Remove'}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'सेवा श्रेणी' : 'Service Purpose'}
                              </label>
                              <select
                                id={`service-first-${svc.id}`}
                                disabled={isReadOnly}
                                value={svc.category}
                                onChange={(e) => handleUpdateService(svc.id, 'category', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              >
                                {(CHOICE_LISTS['purpose'] || CHOICE_LISTS['j5_purpose'] || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {isHi ? c.labelHi : c.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'लक्ष्य नियत तारीख' : 'Target Due Date'}
                              </label>
                              <input
                                type="date"
                                disabled={isReadOnly}
                                value={svc.targetDueDate}
                                onChange={(e) => handleUpdateService(svc.id, 'targetDueDate', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                {isHi ? 'विवरण / योजना' : 'Description / Notes'}
                              </label>
                              <input
                                type="text"
                                disabled={isReadOnly}
                                value={svc.service}
                                onChange={(e) => handleUpdateService(svc.id, 'service', e.target.value)}
                                placeholder="Describe scheduled task"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isHi ? 'कोई सेवा नियोजित नहीं है।' : 'No services scheduled.'}
                    </p>
                  )}

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer py-3 px-4"
                    >
                      <Icon name="add" className="w-4 h-4 text-slate-700" />
                      <span>{isHi ? '+ सेवा जोड़ें' : '+ Add Service'}</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {/* ------------------------------------------------------------------ */}
        {/* 4. STICKY ENKETO BOTTOM ACTION BAR */}
        {/* ------------------------------------------------------------------ */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl py-3 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Completion Meter & Indicator */}
            <div className="flex items-center gap-3">
              <div className="w-28 sm:w-36 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    totalErrors > 0 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                <span>{overallPercentage}%</span> •{' '}
                {totalErrors > 0 ? (
                  <span className="text-rose-600 font-bold">
                    {totalErrors} {isHi ? 'त्रुटियां' : 'errors'}
                  </span>
                ) : (
                  <span className="text-success-ink font-bold">
                    {isHi ? 'वैध' : 'All valid'}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2.5 justify-end">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-50 min-h-[44px]"
                >
                  {isHi ? 'रद्द करें' : 'Cancel'}
                </button>
              )}

              {mode === 'view' ? (
                canEdit && onSwitchToEdit && (
                  <button
                    type="button"
                    onClick={onSwitchToEdit}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md min-h-[44px]"
                  >
                    <Icon name="edit" className="w-4 h-4" />
                    <span>{isHi ? 'संशोधन करें (Edit)' : 'Edit Beneficiary Record'}</span>
                  </button>
                )
              ) : mode === 'edit' ? (
                <button
                  type="button"
                  onClick={handleTriggerSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all min-h-[44px] disabled:opacity-50"
                >
                  <Icon name="save" className="w-4 h-4" />
                  <span>{isSubmitting ? (isHi ? 'सहेजा जा रहा है...' : 'Saving Revision...') : (isHi ? 'संशोधन सहेजें' : 'Save Profile Revision')}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all min-h-[44px] disabled:opacity-50"
                >
                  <Icon name="check" className="w-4 h-4" />
                  <span>{isSubmitting ? (isHi ? 'जमा हो रहा है...' : 'Submitting...') : (isHi ? 'पंजीकरण जमा करें' : 'Submit Registration')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ------------------------------------------------------------------ */}
      {/* 5. AUDIT REASON DIALOG FOR EDIT MODE */}
      {/* ------------------------------------------------------------------ */}
      {showReasonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-left border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isHi ? 'संशोधन का कारण आवश्यक है' : 'Reason for Profile Modification'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  CSC 2.0 clinical governance requires an audit rationale for updating historical client records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReasonModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="cancel" className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label htmlFor="change-reason-input" className="block text-xs font-bold text-slate-700">
                {isHi ? 'संशोधन का विवरण / कारण' : 'Change Reason / Notes'} <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="change-reason-input"
                rows={3}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder={isHi ? 'उदा. हालिया वायरल लोड रिपोर्ट के आधार पर अद्यतन...' : 'e.g. Updated ART status and phone number as per hospital visit.'}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-plum focus:outline-hidden"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
              >
                {isHi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmEditSubmit}
                disabled={!changeReason.trim() || isSubmitting}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (isHi ? 'सहेजा जा रहा है...' : 'Saving...') : (isHi ? 'पुष्टि करें और सहेजें' : 'Confirm & Save Revision')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
