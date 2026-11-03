const fs = require('fs');

function evalRelevant(expr, vals) {
  if (!expr) return true;

  // 1. Replace selected(${var}, 'val')
  let transformed = expr.replace(/selected\(\s*\$\{(\w+)\}\s*,\s*'([^']+)'\s*\)/g, (match, v, opt) => {
    const val = vals[v];
    if (Array.isArray(val)) return val.includes(opt) ? 'true' : 'false';
    return val === opt ? 'true' : 'false';
  });

  // 2. Replace ${var} with values
  transformed = transformed.replace(/\$\{(\w+)\}/g, (match, v) => {
    const val = vals[v];
    if (val === undefined || val === null || val === '') return "''";
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean' && val !== '') {
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
  } catch (e) {
    console.error('Eval error on:', expr, '->', transformed, e.message);
    return false;
  }
}

const allExprs = [
  "${a04_age}!='' and (${a04_age}<18)",
  "${a11_phone}!=''",
  "${a12_same}='no'",
  "(${a12_same}='no') and ${a12_phone}!=''",
  '(${a04_age}<18)',
  '${a04_age}>=5 and (${a04_age}<18)',
  "${a19_occupation}='14'",
  "${a03_name}!=''",
  "${b2_hiv}='1' or ${b2_hiv}='2'",
  "${b2_hiv}='1' and ${b2_living}='1'",
  "${b2_hiv}='1'",
  "${b2_idtype}!=''",
  "${b2_at_csc}='yes'",
  "${c1_hiv_confirmed}='yes'",
  "${c6_artc_name}!=''",
  "${c7_preart_date}!=''",
  "${c8_art_status}='1'",
  '${a04_age}<5',
  "${c12_cd4_done}='yes'",
  "${c12_cd4_done}='yes' and ${a04_age}>=18",
  "${c12_cd4_done}='yes' and (${a04_age}<18)",
  "${c13_vl_done}='yes'",
  "${c14_tb_history}='yes'",
  "${c14_tb_history}='yes' and ${c14b_att_started}='yes'",
  "${c15_tb_status}='1' or ${c15_tb_status}='3'",
  "${d1_linked}='yes'",
  "${d1_linked}='yes' and selected(${d1a_services},'15')",
  "${d2_has_ent}='yes'",
  "${d2_has_ent}='yes' and selected(${d2a_docs},'15')",
  "(${a14_kp}='fsw' or ${a14_kp}='msm' or ${a14_kp}='tgh') or (${a14_kp}='pwid')",
  "${a14_kp}='fsw' or ${a14_kp}='msm' or ${a14_kp}='tgh'",
  "${a14_kp}='pwid'",
  "(${a14_kp}='pwid') and ${e2_ost}='yes'",
  '${a04_age}>=15',
  '${a04_age}>=10',
  "${e10_diabetes}='yes'",
  "${e11_htn}='yes'",
  "${f1_discrimination}='yes'",
  "${g1_disability}='yes'",
  "${g1_disability}='yes' and ${g4_benefit}='yes'",
  "${h0_deceased}='yes'",
  "${h0_deceased}='yes' and ${h2_reason}='5'",
  "${h0_deceased}='yes' and ${h4_reported}='yes'",
  "${h0_deceased}='yes' and ${h6_place}='4'",
  "${j_dln}='yes'",
  "${j5_cat}!=''",
  "${j5_done_date}!='' "
];

const mockVals = {
  a04_age: 28,
  a11_phone: '9876543210',
  a12_same: 'no',
  a12_phone: '9876543211',
  a19_occupation: '14',
  a03_name: 'Test',
  b2_hiv: '1',
  b2_living: '1',
  b2_idtype: '1',
  b2_at_csc: 'yes',
  c1_hiv_confirmed: 'yes',
  c6_artc_name: 'LNJP',
  c7_preart_date: '2024-01-01',
  c8_art_status: '1',
  c12_cd4_done: 'yes',
  c13_vl_done: 'yes',
  c14_tb_history: 'yes',
  c14b_att_started: 'yes',
  c15_tb_status: '1',
  d1_linked: 'yes',
  d1a_services: ['15'],
  d2_has_ent: 'yes',
  d2a_docs: ['15'],
  a14_kp: 'pwid',
  e2_ost: 'yes',
  e10_diabetes: 'yes',
  e11_htn: 'yes',
  f1_discrimination: 'yes',
  g1_disability: 'yes',
  g4_benefit: 'yes',
  h0_deceased: 'yes',
  h2_reason: '5',
  h4_reported: 'yes',
  h6_place: '4',
  j_dln: 'yes',
  j5_cat: 'med',
  j5_done_date: '2026-10-01'
};

let errors = 0;
for (const expr of allExprs) {
  try {
    const res = evalRelevant(expr, mockVals);
    // Also test with empty vals
    const resEmpty = evalRelevant(expr, {});
  } catch (e) {
    console.error('Crash on:', expr, e);
    errors++;
  }
}
console.log(`Evaluated ${allExprs.length} expressions with 0 crashes, errors = ${errors}`);
