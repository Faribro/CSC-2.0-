"use client";

import React, { useState, useEffect } from 'react';
import { Language, translations } from '@/lib/translations';
import { CHOICE_LISTS } from '@/lib/crfDefinitions';

export interface FamilyMemberRow {
  id: string;
  name: string;
  relationship: string;
  age: string;
  gender: string;
  hivStatus: string;
  artNumber?: string;
}

export interface ReferralRequestRow {
  id: string;
  category: string;
  facility: string;
  targetDueDate: string;
  status: string;
  notes?: string;
}

export interface RegistrationFormData {
  // Section A: Basic Profile
  a01_full_name: string;
  a02_dob: string;
  a03_age: string;
  a04_gender: string;
  a05_marital_status: string;
  a06_phone: string;
  a07_address_current: string;
  a08_consent_status: boolean;
  a08_consent_home: boolean;
  a08_consent_sms: boolean;

  // Section B: Family Members Repeat
  b2_members: FamilyMemberRow[];

  // Section C: Testing & Treatment
  c01_hiv_status: string;
  c02_art_status: string;
  c03_art_number: string;
  c04_art_center: string;
  c05_regimen_line: string;
  c06_cd4_count: string;
  c07_cd4_percent: string;
  c08_viral_load: string;

  // Section D: Social Protection
  d01_ration_card: string;
  d02_pension: string;
  d03_insurance: string;
  d04_legal_aid: string;
  d5_referrals: ReferralRequestRow[];

  // Section E: Key Population
  e01_kp_group: string;
  e02_sub_pop: string;
  e03_risk_level: string;

  // Section F: Stigma & Discrimination
  f01_experienced_stigma: string;
  f02_stigma_setting: string;
  f03_action_taken: string;

  // Section G: Disability
  g01_has_disability: string;
  g02_disability_type: string;
  g03_cert_available: string;

  // Section H: Death / Migration
  h01_status: string;
  h02_date_of_death: string;
  h03_cause: string;

  // Section J: Document Declarations (Declarations Only, No Uploads)
  j_hiv_doc_sighted: boolean;
  j_art_doc_sighted: boolean;
  j_address_doc_sighted: boolean;
  j_caste_doc_sighted: boolean;
  j_income_doc_sighted: boolean;
  j_verification_date: string;
  j_verifier_notes: string;
}

interface RegistrationFormProps {
  initialData?: Partial<RegistrationFormData>;
  lang: Language;
  onDataChange: (data: RegistrationFormData) => void;
  onSubmit: (data: RegistrationFormData) => void;
  isSubmitting?: boolean;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  initialData,
  lang,
  onDataChange,
  onSubmit,
  isSubmitting = false
}) => {
  const t = translations[lang];

  const [formData, setFormData] = useState<RegistrationFormData>({
    a01_full_name: initialData?.a01_full_name || '',
    a02_dob: initialData?.a02_dob || '',
    a03_age: initialData?.a03_age || '',
    a04_gender: initialData?.a04_gender || 'female',
    a05_marital_status: initialData?.a05_marital_status || '1',
    a06_phone: initialData?.a06_phone || '',
    a07_address_current: initialData?.a07_address_current || '',
    a08_consent_status: initialData?.a08_consent_status ?? true,
    a08_consent_home: initialData?.a08_consent_home ?? true,
    a08_consent_sms: initialData?.a08_consent_sms ?? true,

    b2_members: initialData?.b2_members || [
      { id: 'b2-1', name: 'Ramesh Sharma', relationship: '1', age: '32', gender: 'male', hivStatus: 'negative' }
    ],

    c01_hiv_status: initialData?.c01_hiv_status || 'positive',
    c02_art_status: initialData?.c02_art_status || 'on_art',
    c03_art_number: initialData?.c03_art_number || '',
    c04_art_center: initialData?.c04_art_center || 'ART Center LNJP Delhi',
    c05_regimen_line: initialData?.c05_regimen_line || '1',
    c06_cd4_count: initialData?.c06_cd4_count || '',
    c07_cd4_percent: initialData?.c07_cd4_percent || '',
    c08_viral_load: initialData?.c08_viral_load || '',

    d01_ration_card: initialData?.d01_ration_card || 'yes',
    d02_pension: initialData?.d02_pension || 'no',
    d03_insurance: initialData?.d03_insurance || 'yes',
    d04_legal_aid: initialData?.d04_legal_aid || 'no',
    d5_referrals: initialData?.d5_referrals || [
      { id: 'd5-1', category: 'social_entitlement', facility: 'District Welfare Office', targetDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], status: 'PENDING' }
    ],

    e01_kp_group: initialData?.e01_kp_group || 'none',
    e02_sub_pop: initialData?.e02_sub_pop || '',
    e03_risk_level: initialData?.e03_risk_level || 'standard',

    f01_experienced_stigma: initialData?.f01_experienced_stigma || 'no',
    f02_stigma_setting: initialData?.f02_stigma_setting || '',
    f03_action_taken: initialData?.f03_action_taken || '',

    g01_has_disability: initialData?.g01_has_disability || 'no',
    g02_disability_type: initialData?.g02_disability_type || '',
    g03_cert_available: initialData?.g03_cert_available || '',

    h01_status: initialData?.h01_status || 'active',
    h02_date_of_death: initialData?.h02_date_of_death || '',
    h03_cause: initialData?.h03_cause || '',

    j_hiv_doc_sighted: initialData?.j_hiv_doc_sighted ?? true,
    j_art_doc_sighted: initialData?.j_art_doc_sighted ?? true,
    j_address_doc_sighted: initialData?.j_address_doc_sighted ?? true,
    j_caste_doc_sighted: initialData?.j_caste_doc_sighted ?? false,
    j_income_doc_sighted: initialData?.j_income_doc_sighted ?? false,
    j_verification_date: initialData?.j_verification_date || new Date().toISOString().split('T')[0],
    j_verifier_notes: initialData?.j_verifier_notes || 'All identity and treatment documents physically verified by outreach worker.'
  });

  const handleChange = (field: keyof RegistrationFormData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onDataChange(updated);
  };

  // Repeat B2 Handlers
  const handleAddMember = () => {
    const newRow: FamilyMemberRow = {
      id: `b2-${Date.now()}`,
      name: '',
      relationship: '1',
      age: '',
      gender: 'female',
      hivStatus: 'unknown'
    };
    handleChange('b2_members', [...formData.b2_members, newRow]);
  };

  const handleRemoveMember = (id: string) => {
    handleChange('b2_members', formData.b2_members.filter(m => m.id !== id));
  };

  const handleUpdateMember = (id: string, field: keyof FamilyMemberRow, val: string) => {
    const updated = formData.b2_members.map(m => m.id === id ? { ...m, [field]: val } : m);
    handleChange('b2_members', updated);
  };

  // Repeat D5 Handlers
  const handleAddReferral = () => {
    const newRow: ReferralRequestRow = {
      id: `d5-${Date.now()}`,
      category: 'medical',
      facility: '',
      targetDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'PENDING'
    };
    handleChange('d5_referrals', [...formData.d5_referrals, newRow]);
  };

  const handleRemoveReferral = (id: string) => {
    handleChange('d5_referrals', formData.d5_referrals.filter(r => r.id !== id));
  };

  const handleUpdateReferral = (id: string, field: keyof ReferralRequestRow, val: string) => {
    const updated = formData.d5_referrals.map(r => r.id === id ? { ...r, [field]: val } : r);
    handleChange('d5_referrals', updated);
  };

  // Calculated B3 & B4 (Shown as source values only)
  const b3CalculatedTotalFamily = formData.b2_members.length;
  const b4CalculatedHivPositiveFamily = formData.b2_members.filter(m => m.hivStatus === 'positive').length;

  return (
    <div className="space-y-8 pb-32">
      {/* ---------------------------------------------------- */}
      {/* SECTION A: BASIC PROFILE */}
      {/* ---------------------------------------------------- */}
      <section id="sec-a" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>A. {lang === 'hi' ? 'बुनियादी प्रोफ़ाइल (Basic Profile)' : 'Basic Profile'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Section A: Baseline Beneficiary Identification & Contact</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="field-a01" className="block text-xs font-bold text-slate-700 mb-1">
              a01_full_name <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-a01"
              type="text"
              required
              value={formData.a01_full_name}
              onChange={(e) => handleChange('a01_full_name', e.target.value)}
              placeholder="Full Name / पूरा नाम"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-a02" className="block text-xs font-bold text-slate-700 mb-1">
              a02_dob (Date of Birth)
            </label>
            <input
              id="field-a02"
              type="date"
              value={formData.a02_dob}
              onChange={(e) => handleChange('a02_dob', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-a03" className="block text-xs font-bold text-slate-700 mb-1">
              a03_age (Years) <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-a03"
              type="number"
              min="0"
              max="120"
              required
              value={formData.a03_age}
              onChange={(e) => handleChange('a03_age', e.target.value)}
              placeholder="e.g. 28"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
            {parseInt(formData.a03_age) < 18 && (
              <p className="text-[11px] text-amber-700 mt-1 font-medium bg-amber-50 p-1.5 rounded border border-amber-200">
                ⚠️ [OPEN] Beneficiary age &lt;18 indicates adolescent/pediatric protocol. Programmatic review required.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="field-a04" className="block text-xs font-bold text-slate-700 mb-1">
              a04_gender <span className="text-rose-500">*</span>
            </label>
            <select
              id="field-a04"
              value={formData.a04_gender}
              onChange={(e) => handleChange('a04_gender', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px] bg-white"
            >
              <option value="female">Female / महिला</option>
              <option value="male">Male / पुरुष</option>
              <option value="tg">Transgender / तृतीय लिंग</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-a05" className="block text-xs font-bold text-slate-700 mb-1">
              a05_marital_status
            </label>
            <select
              id="field-a05"
              value={formData.a05_marital_status}
              onChange={(e) => handleChange('a05_marital_status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px] bg-white"
            >
              <option value="1">Never Married / अविवाहित</option>
              <option value="2">Married / विवाहित</option>
              <option value="3">Widowed / विधवा/विधुर</option>
              <option value="4">Divorced / तलाकशुदा</option>
              <option value="5">Separated / अलग रह रहे</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-a06" className="block text-xs font-bold text-slate-700 mb-1">
              a06_phone (Primary Contact)
            </label>
            <input
              id="field-a06"
              type="tel"
              value={formData.a06_phone}
              onChange={(e) => handleChange('a06_phone', e.target.value)}
              placeholder="e.g. 9876543210 (Synthetic)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="field-a07" className="block text-xs font-bold text-slate-700 mb-1">
              a07_address_current
            </label>
            <input
              id="field-a07"
              type="text"
              value={formData.a07_address_current}
              onChange={(e) => handleChange('a07_address_current', e.target.value)}
              placeholder="Current Residential Address / वर्तमान पता"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          {/* Consents: Home Visit vs Messaging (Strict Domain Distinction) */}
          <div className="md:col-span-2 lg:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              {t.consentTitle} (CRF Section A.08)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.a08_consent_status}
                  onChange={(e) => handleChange('a08_consent_status', e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Registration Consent Granted</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.a08_consent_home}
                  onChange={(e) => handleChange('a08_consent_home', e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">{t.homeVisitConsent}</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.a08_consent_sms}
                  onChange={(e) => handleChange('a08_consent_sms', e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">{t.messagingConsent}</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION B: FAMILY MEMBERS (REPEAT B2) */}
      {/* ---------------------------------------------------- */}
      <section id="sec-b" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>B. {lang === 'hi' ? 'परिवार के सदस्य (Repeat B2)' : 'Family Members (Repeat B2)'}</span>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                [SOURCE]
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Section B2: Related Family Member Records (Never Numbered Columns)</p>
          </div>

          <button
            type="button"
            onClick={handleAddMember}
            className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg min-h-[40px] transition-colors"
          >
            {t.addFamilyMember}
          </button>
        </div>

        {/* Calculated B3 & B4 Context Strip */}
        <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500">Calculated B3 (Total Family Members):</span>{' '}
            <strong className="text-slate-900">{b3CalculatedTotalFamily}</strong>
          </div>
          <div>
            <span className="text-slate-500">Calculated B4 (Total HIV+ Members):</span>{' '}
            <strong className="text-rose-700">{b4CalculatedHivPositiveFamily}</strong>
            <span className="text-[10px] text-slate-400 ml-2">[OPEN source values only]</span>
          </div>
        </div>

        {/* Repeat Table Rows */}
        <div className="space-y-3">
          {formData.b2_members.map((member, idx) => (
            <div key={member.id} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-3 items-center text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Name</label>
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) => handleUpdateMember(member.id, 'name', e.target.value)}
                  placeholder="Member Name"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Relationship</label>
                <select
                  value={member.relationship}
                  onChange={(e) => handleUpdateMember(member.id, 'relationship', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="1">Spouse / पति-पत्नी</option>
                  <option value="2">Child / बच्चा</option>
                  <option value="3">Parent / माता-पिता</option>
                  <option value="4">Sibling / भाई-बहन</option>
                  <option value="5">Other / अन्य</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Age</label>
                <input
                  type="number"
                  value={member.age}
                  onChange={(e) => handleUpdateMember(member.id, 'age', e.target.value)}
                  placeholder="Age"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">HIV Status</label>
                <select
                  value={member.hivStatus}
                  onChange={(e) => handleUpdateMember(member.id, 'hivStatus', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="positive">Positive (+)</option>
                  <option value="negative">Negative (-)</option>
                  <option value="unknown">Unknown</option>
                  <option value="not_tested">Not Tested</option>
                </select>
              </div>

              <div className="flex items-center justify-end pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-rose-700 hover:text-rose-900 font-bold text-xs p-1"
                >
                  ✕ {t.removeRow}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION C: TESTING & TREATMENT */}
      {/* ---------------------------------------------------- */}
      <section id="sec-c" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>C. {lang === 'hi' ? 'परीक्षण और उपचार (Testing & Treatment)' : 'Testing & Treatment'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Section C: HIV Status, ART Regimen & Clinical Biomarkers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="field-c01" className="block text-xs font-bold text-slate-700 mb-1">
              c01_hiv_status <span className="text-rose-500">*</span>
            </label>
            <select
              id="field-c01"
              value={formData.c01_hiv_status}
              onChange={(e) => handleChange('c01_hiv_status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px] bg-white"
            >
              <option value="positive">Positive / एचआईवी पॉजिटिव</option>
              <option value="negative">Negative / एचआईवी नेगेटिव</option>
              <option value="unknown">Unknown / अज्ञात</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-c02" className="block text-xs font-bold text-slate-700 mb-1">
              c02_art_status <span className="text-rose-500">*</span>
            </label>
            <select
              id="field-c02"
              value={formData.c02_art_status}
              onChange={(e) => handleChange('c02_art_status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px] bg-white"
            >
              <option value="on_art">On ART / एआरटी पर</option>
              <option value="pre_art">Pre-ART / प्री-एआरटी</option>
              <option value="lfu">LFU (Lost to Follow-up) / एलएफयू</option>
              <option value="not_on_art">Not on ART / एआरटी पर नहीं</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-c03" className="block text-xs font-bold text-slate-700 mb-1">
              c03_art_number
            </label>
            <input
              id="field-c03"
              type="text"
              value={formData.c03_art_number}
              onChange={(e) => handleChange('c03_art_number', e.target.value)}
              placeholder="e.g. ART-DL-10442"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-c04" className="block text-xs font-bold text-slate-700 mb-1">
              c04_art_center
            </label>
            <input
              id="field-c04"
              type="text"
              value={formData.c04_art_center}
              onChange={(e) => handleChange('c04_art_center', e.target.value)}
              placeholder="ART Center LNJP Hospital"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-c05" className="block text-xs font-bold text-slate-700 mb-1">
              c05_regimen_line
            </label>
            <select
              id="field-c05"
              value={formData.c05_regimen_line}
              onChange={(e) => handleChange('c05_regimen_line', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px] bg-white"
            >
              <option value="1">First line / प्रथम पंक्ति</option>
              <option value="2">Alternate first line / वैकल्पिक प्रथम पंक्ति</option>
              <option value="3">Second line / द्वितीय पंक्ति</option>
            </select>
          </div>

          {/* CD4 Count vs CD4 Percentage (Strict Semantic Separation) */}
          <div>
            <label htmlFor="field-c06" className="block text-xs font-bold text-slate-700 mb-1">
              {t.cd4Count}
            </label>
            <input
              id="field-c06"
              type="number"
              value={formData.c06_cd4_count}
              onChange={(e) => handleChange('c06_cd4_count', e.target.value)}
              placeholder="e.g. 480"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-c07" className="block text-xs font-bold text-slate-700 mb-1">
              {t.cd4Percent}
            </label>
            <input
              id="field-c07"
              type="number"
              step="0.1"
              value={formData.c07_cd4_percent}
              onChange={(e) => handleChange('c07_cd4_percent', e.target.value)}
              placeholder="e.g. 24.5%"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-c08" className="block text-xs font-bold text-slate-700 mb-1">
              {t.viralLoad}
            </label>
            <input
              id="field-c08"
              type="number"
              value={formData.c08_viral_load}
              onChange={(e) => handleChange('c08_viral_load', e.target.value)}
              placeholder="e.g. 20 (&lt;50 target)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px]"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION D: SOCIAL PROTECTION & SCHEMES (REPEAT D5) */}
      {/* ---------------------------------------------------- */}
      <section id="sec-d" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>D. {lang === 'hi' ? 'सामाजिक सुरक्षा एवं कल्याण योजनाएं (Repeat D5)' : 'Social Protection & Schemes (Repeat D5)'}</span>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                [SOURCE]
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Section D5: Referral Requests & Scheme Linkages</p>
          </div>

          <button
            type="button"
            onClick={handleAddReferral}
            className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg min-h-[40px] transition-colors"
          >
            {t.addReferral}
          </button>
        </div>

        {/* General Schemes Yes/No */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs">
          <div>
            <label htmlFor="field-d01" className="block font-semibold text-slate-600 mb-1">Ration Card Linkage</label>
            <select
              id="field-d01"
              value={formData.d01_ration_card}
              onChange={(e) => handleChange('d01_ration_card', e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
            >
              <option value="yes">Yes / हाँ</option>
              <option value="no">No / नहीं</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-d02" className="block font-semibold text-slate-600 mb-1">Pension Scheme Linkage</label>
            <select
              id="field-d02"
              value={formData.d02_pension}
              onChange={(e) => handleChange('d02_pension', e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
            >
              <option value="yes">Yes / हाँ</option>
              <option value="no">No / नहीं</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-d03" className="block font-semibold text-slate-600 mb-1">Health Insurance (PM-JAY)</label>
            <select
              id="field-d03"
              value={formData.d03_insurance}
              onChange={(e) => handleChange('d03_insurance', e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
            >
              <option value="yes">Yes / हाँ</option>
              <option value="no">No / नहीं</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-d04" className="block font-semibold text-slate-600 mb-1">Legal Aid Support</label>
            <select
              id="field-d04"
              value={formData.d04_legal_aid}
              onChange={(e) => handleChange('d04_legal_aid', e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
            >
              <option value="yes">Yes / हाँ</option>
              <option value="no">No / नहीं</option>
            </select>
          </div>
        </div>

        {/* Repeat D5 Referrals Table */}
        <div className="space-y-3">
          {formData.d5_referrals.map((ref) => (
            <div key={ref.id} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Facility / Provider</label>
                <input
                  type="text"
                  value={ref.facility}
                  onChange={(e) => handleUpdateReferral(ref.id, 'facility', e.target.value)}
                  placeholder="Facility Name (e.g. DLSA Office)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Category</label>
                <select
                  value={ref.category}
                  onChange={(e) => handleUpdateReferral(ref.id, 'category', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="medical">Medical / Health</option>
                  <option value="social_entitlement">Social Entitlement</option>
                  <option value="legal_aid">Legal Aid</option>
                  <option value="nutrition">Nutrition Support</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Target Due Date</label>
                <input
                  type="date"
                  value={ref.targetDueDate}
                  onChange={(e) => handleUpdateReferral(ref.id, 'targetDueDate', e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={() => handleRemoveReferral(ref.id)}
                  className="text-rose-700 hover:text-rose-900 font-bold text-xs p-1"
                >
                  ✕ {t.removeRow}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION E: KEY POPULATION & RISK PROFILE */}
      {/* ---------------------------------------------------- */}
      <section id="sec-e" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>E. {lang === 'hi' ? 'मुख्य जनसंख्या एवं जोखिम प्रोफ़ाइल' : 'Key Population & Risk Profile'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Section E: Key Population Grouping (Advisory Only; Not Used For Profiling)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label htmlFor="field-e01" className="block text-xs font-bold text-slate-700 mb-1">e01_kp_group</label>
            <select
              id="field-e01"
              value={formData.e01_kp_group}
              onChange={(e) => handleChange('e01_kp_group', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:outline-hidden min-h-[44px] bg-white"
            >
              <option value="none">General Population / सामान्य</option>
              <option value="fsw">FSW (Female Sex Worker)</option>
              <option value="msm">MSM (Men who have Sex with Men)</option>
              <option value="tg">Transgender / Hijra</option>
              <option value="idu">IDU (People Who Inject Drugs)</option>
              <option value="single_woman">Single Woman / एकल महिला</option>
              <option value="trucker">Trucker / Long-distance driver</option>
              <option value="migrant">Migrant Worker / प्रवासी</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-e02" className="block text-xs font-bold text-slate-700 mb-1">e02_sub_pop</label>
            <input
              id="field-e02"
              type="text"
              value={formData.e02_sub_pop}
              onChange={(e) => handleChange('e02_sub_pop', e.target.value)}
              placeholder="Sub-population category if applicable"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-e03" className="block text-xs font-bold text-slate-700 mb-1">e03_risk_level</label>
            <select
              id="field-e03"
              value={formData.e03_risk_level}
              onChange={(e) => handleChange('e03_risk_level', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px] bg-white"
            >
              <option value="standard">Standard Follow-Up</option>
              <option value="adherence_challenge">Adherence Challenge</option>
              <option value="high_support">High Support Needed</option>
            </select>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION F: STIGMA & DISCRIMINATION */}
      {/* ---------------------------------------------------- */}
      <section id="sec-f" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>F. {lang === 'hi' ? 'कलंक और भेदभाव (Stigma & Discrimination)' : 'Stigma & Discrimination'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Section F: Incidents of Stigma in Healthcare, Community or Family</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label htmlFor="field-f01" className="block text-xs font-bold text-slate-700 mb-1">f01_experienced_stigma</label>
            <select
              id="field-f01"
              value={formData.f01_experienced_stigma}
              onChange={(e) => handleChange('f01_experienced_stigma', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px] bg-white"
            >
              <option value="no">No Stigma Reported / नहीं</option>
              <option value="yes">Yes, Experienced Stigma / हाँ</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-f02" className="block text-xs font-bold text-slate-700 mb-1">f02_stigma_setting</label>
            <input
              id="field-f02"
              type="text"
              value={formData.f02_stigma_setting}
              onChange={(e) => handleChange('f02_stigma_setting', e.target.value)}
              placeholder="Healthcare facility, family, workplace, community"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-f03" className="block text-xs font-bold text-slate-700 mb-1">f03_action_taken</label>
            <input
              id="field-f03"
              type="text"
              value={formData.f03_action_taken}
              onChange={(e) => handleChange('f03_action_taken', e.target.value)}
              placeholder="Counselling, DLSA complaint, mediation"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION G: DISABILITY */}
      {/* ---------------------------------------------------- */}
      <section id="sec-g" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>G. {lang === 'hi' ? 'विकलांगता मूल्यांकन (Disability Assessment)' : 'Disability Assessment'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Section G: PwD Status & Disability Certification</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label htmlFor="field-g01" className="block text-xs font-bold text-slate-700 mb-1">g01_has_disability</label>
            <select
              id="field-g01"
              value={formData.g01_has_disability}
              onChange={(e) => handleChange('g01_has_disability', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px] bg-white"
            >
              <option value="no">No / नहीं</option>
              <option value="yes">Yes / हाँ</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-g02" className="block text-xs font-bold text-slate-700 mb-1">g02_disability_type</label>
            <input
              id="field-g02"
              type="text"
              value={formData.g02_disability_type}
              onChange={(e) => handleChange('g02_disability_type', e.target.value)}
              placeholder="Locomotor, visual, hearing, intellectual, multiple"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-g03" className="block text-xs font-bold text-slate-700 mb-1">g03_cert_available</label>
            <select
              id="field-g03"
              value={formData.g03_cert_available}
              onChange={(e) => handleChange('g03_cert_available', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px] bg-white"
            >
              <option value="no">No Certificate</option>
              <option value="yes">UDID / Disability Certificate Available</option>
            </select>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION H: OUT-MIGRATION / DEATH */}
      {/* ---------------------------------------------------- */}
      <section id="sec-h" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>H. {lang === 'hi' ? 'प्रवास / मृत्यु (Out-Migration / Death)' : 'Out-Migration / Death'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Section H: Case Status Tracking (Active / Migrated / Deceased)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label htmlFor="field-h01" className="block text-xs font-bold text-slate-700 mb-1">h01_status</label>
            <select
              id="field-h01"
              value={formData.h01_status}
              onChange={(e) => handleChange('h01_status', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px] bg-white"
            >
              <option value="active">Active In Center / सक्रिय</option>
              <option value="migrated_out">Migrated Out / अन्यत्र प्रवास</option>
              <option value="deceased">Deceased / मृत्यु</option>
            </select>
          </div>

          <div>
            <label htmlFor="field-h02" className="block text-xs font-bold text-slate-700 mb-1">h02_date_of_death</label>
            <input
              id="field-h02"
              type="date"
              value={formData.h02_date_of_death}
              onChange={(e) => handleChange('h02_date_of_death', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-h03" className="block text-xs font-bold text-slate-700 mb-1">h03_cause</label>
            <input
              id="field-h03"
              type="text"
              value={formData.h03_cause}
              onChange={(e) => handleChange('h03_cause', e.target.value)}
              placeholder="Cause of death / Destination center"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION J: CRF VERIFICATION & DOCUMENT DECLARATIONS */}
      {/* ---------------------------------------------------- */}
      <section id="sec-j" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs scroll-mt-32">
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span>J. {lang === 'hi' ? 'सीआरएफ सत्यापन और दस्तावेज़ घोषणाएं' : 'CRF Verification & Document Declarations'}</span>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [SOURCE]
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">{t.docDeclarationOnly}</p>
        </div>

        {/* Declarations Checkboxes (Zero File Uploads per Rule) */}
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 mb-6 space-y-3">
          <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider mb-2">
            Physical Document Sighting Attestations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.j_hiv_doc_sighted}
                onChange={(e) => handleChange('j_hiv_doc_sighted', e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">{t.hivDeclaration}</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.j_art_doc_sighted}
                onChange={(e) => handleChange('j_art_doc_sighted', e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">{t.artDeclaration}</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.j_address_doc_sighted}
                onChange={(e) => handleChange('j_address_doc_sighted', e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">{t.addrDeclaration}</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.j_caste_doc_sighted}
                onChange={(e) => handleChange('j_caste_doc_sighted', e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">{t.casteDeclaration}</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.j_income_doc_sighted}
                onChange={(e) => handleChange('j_income_doc_sighted', e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">{t.incomeDeclaration}</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label htmlFor="field-j-date" className="block text-xs font-bold text-slate-700 mb-1">Verification Date</label>
            <input
              id="field-j-date"
              type="date"
              value={formData.j_verification_date}
              onChange={(e) => handleChange('j_verification_date', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="field-j-notes" className="block text-xs font-bold text-slate-700 mb-1">Verifier Attestation Notes</label>
            <input
              id="field-j-notes"
              type="text"
              value={formData.j_verifier_notes}
              onChange={(e) => handleChange('j_verifier_notes', e.target.value)}
              placeholder="Verified by caseworker / counselor"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg min-h-[44px]"
            />
          </div>
        </div>

        {/* Bottom Form Submission Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <p className="text-xs text-slate-500">
            {lang === 'hi'
              ? 'कृपया सबमिट करने से पहले सभी प्रविष्टियों की पुष्टि करें।'
              : 'All sections A–H and J complete. Sighted declarations will be recorded in audit log.'}
          </p>
          <button
            type="button"
            onClick={() => onSubmit(formData)}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all min-h-[44px] flex items-center justify-center gap-2"
          >
            <span>📋</span> {t.reviewBeforeSubmit} →
          </button>
        </div>
      </section>
    </div>
  );
};
