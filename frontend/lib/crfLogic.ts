// frontend/lib/crfLogic.ts
// Relevance (skip logic) and constraint (validation) engine for CSC 2.0 CRF

import { CrfField } from './crfDefinitions';
import { Language } from './translations';

/**
 * Evaluates whether a field should be shown based on its XLSForm relevant expression.
 */
export function isFieldRelevant(field: CrfField, values: Record<string, any>): boolean {
  if (!field.relevant) {
    return true;
  }

  const expr = field.relevant.trim();
  if (!expr) return true;

  // 1. Replace selected(${var}, 'val')
  let transformed = expr.replace(/selected\(\s*\$\{(\w+)\}\s*,\s*'([^']+)'\s*\)/g, (_match, v, opt) => {
    const val = values[v];
    if (Array.isArray(val)) return val.includes(opt) ? 'true' : 'false';
    return val === opt ? 'true' : 'false';
  });

  // 2. Replace ${var} with values
  transformed = transformed.replace(/\$\{(\w+)\}/g, (_match, v) => {
    const val = values[v];
    if (val === undefined || val === null || val === '') return "''";
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean' && String(val).trim() !== '') {
      return String(num);
    }
    return JSON.stringify(String(val));
  });

  // 3. Operators replacement:
  // Convert = (not preceded by !, <, > and not followed by =) to ==
  transformed = transformed.replace(/(?<![!<>=])=(?!=)/g, '==');
  transformed = transformed.replace(/\band\b/g, '&&');
  transformed = transformed.replace(/\bor\b/g, '||');
  transformed = transformed.replace(/\bnot\b/g, '!');

  try {
    return Boolean(new Function('return (' + transformed + ');')());
  } catch (_e) {
    return true;
  }
}

/**
 * Validates a single field value against its required status and constraints.
 * Returns an error string if invalid, or null if valid.
 */
export function validateField(
  field: CrfField,
  val: any,
  allValues: Record<string, any>,
  lang: Language
): string | null {
  const isHi = lang === 'hi';
  const strVal = val != null ? String(val).trim() : '';

  // Required validation: only required if relevant
  if (field.required && isFieldRelevant(field, allValues)) {
    if (strVal === '' || (Array.isArray(val) && val.length === 0)) {
      return isHi ? 'यह फ़ील्ड आवश्यक है।' : 'This field is required.';
    }
  }

  if (strVal === '') {
    return null; // Empty optional field is valid
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const con = field.constraint || '';

  // Date constraints: <= today()
  if (field.type === 'date' && con.includes('. <= today()')) {
    if (strVal > todayStr) {
      return isHi ? 'तारीख आज या उससे पहले की होनी चाहिए।' : 'Date cannot be in the future.';
    }
  }

  // Phone number constraint: ^[6-9][0-9]{9}$
  if (con.includes("^[6-9][0-9]{9}$")) {
    const cleanPhone = strVal.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return isHi
        ? 'वैध 10 अंकों का मोबाइल नंबर दर्ज करें (6-9 से शुरू)।'
        : 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    }
  }

  // Pin code constraint: ^[1-9][0-9]{5}$
  if (con.includes("^[1-9][0-9]{5}$")) {
    if (!/^[1-9]\d{5}$/.test(strVal)) {
      return isHi
        ? 'वैध 6 अंकों का पिन कोड दर्ज करें।'
        : 'Enter a valid 6-digit Indian PIN code.';
    }
  }

  // ABHA ID constraint: 14 digits or XX-XXXX-XXXX-XXXX
  if (con.includes("^[0-9]{14}$")) {
    const cleanAbha = strVal.replace(/\D/g, '');
    if (cleanAbha.length !== 14) {
      return isHi
        ? 'ABHA आईडी 14 अंकों की होनी चाहिए।'
        : 'ABHA ID must be 14 digits (e.g. 12-3456-7890-1234).';
    }
  }

  // Age constraint: 0 <= age <= 120
  if (field.name === 'a04_age' || field.name === 'b2_age') {
    const ageNum = Number(strVal);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      return isHi
        ? 'उम्र 0 से 120 वर्ष के बीच होनी चाहिए।'
        : 'Age must be between 0 and 120 years.';
    }
  }

  // Height constraint: 30 to 230 cm
  if (field.name === 'c10_height' || field.name === 'ig_height') {
    const h = Number(strVal);
    if (!isNaN(h) && (h < 30 || h > 230)) {
      return isHi ? 'ऊंचाई 30 से 230 सेमी के बीच होनी चाहिए।' : 'Height must be between 30 and 230 cm.';
    }
  }

  // Weight constraint: 1 to 200 kg
  if (field.name === 'c11_weight' || field.name === 'if_weight') {
    const w = Number(strVal);
    if (!isNaN(w) && (w < 1 || w > 200)) {
      return isHi ? 'वजन 1 से 200 किग्रा के बीच होना चाहिए।' : 'Weight must be between 1 and 200 kg.';
    }
  }

  // MUAC constraint: 0 < muac <= 30 cm
  if (field.name === 'c_muac' || field.name === 'ih_muac') {
    const m = Number(strVal);
    if (!isNaN(m) && (m <= 0 || m > 30)) {
      return isHi ? 'MUAC 0 से 30 सेमी के बीच होना चाहिए।' : 'MUAC must be between 0 and 30 cm.';
    }
  }

  // CD4 count: 0 <= cd4 <= 5000
  if (field.name === 'c12b_cd4_count' || field.name === 'b2_cd4' || field.name === 'id_cd4') {
    const cd4 = Number(strVal);
    if (!isNaN(cd4) && (cd4 < 0 || cd4 > 5000)) {
      return isHi ? 'CD4 गणना 0 से 5000 के बीच होनी चाहिए।' : 'CD4 count must be between 0 and 5000 cells/mm3.';
    }
  }

  // CD4 %: 0 <= cd4_pct <= 100
  if (field.name === 'c12b_cd4_pct' || field.name === 'id_cd4_pct') {
    const pct = Number(strVal);
    if (!isNaN(pct) && (pct < 0 || pct > 100)) {
      return isHi ? 'CD4 % 0 से 100 के बीच होना चाहिए।' : 'CD4 percentage must be between 0 and 100%.';
    }
  }

  // Viral load: >= 0
  if (field.name === 'c13b_vl_count' || field.name === 'b2_vl') {
    const vl = Number(strVal);
    if (!isNaN(vl) && vl < 0) {
      return isHi ? 'वायरल लोड 0 या अधिक होना चाहिए।' : 'Viral load must be 0 or greater.';
    }
  }

  return null;
}
