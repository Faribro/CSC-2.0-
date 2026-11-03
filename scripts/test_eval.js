// Test evaluator for XLSForm relevant expressions
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
    // Check if expression is doing numeric comparison
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'boolean') {
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
    return true;
  }
}

const tests = [
  { expr: "${a04_age}!='' and (${a04_age}<18)", vals: { a04_age: 12 }, expected: true },
  { expr: "${a04_age}!='' and (${a04_age}<18)", vals: { a04_age: 25 }, expected: false },
  { expr: "${c1_hiv_confirmed}='yes'", vals: { c1_hiv_confirmed: 'yes' }, expected: true },
  { expr: "${c1_hiv_confirmed}='yes'", vals: { c1_hiv_confirmed: 'no' }, expected: false },
  { expr: "selected(${d1a_services},'15')", vals: { d1a_services: ['1', '15'] }, expected: true },
  { expr: "selected(${d1a_services},'15')", vals: { d1a_services: ['1', '2'] }, expected: false },
  { expr: "${c12_cd4_done}='yes' and ${a04_age}>=18", vals: { c12_cd4_done: 'yes', a04_age: '30' }, expected: true },
  { expr: "${c12_cd4_done}='yes' and (${a04_age}<18)", vals: { c12_cd4_done: 'yes', a04_age: '30' }, expected: false },
  { expr: "(${a14_kp}='fsw' or ${a14_kp}='msm' or ${a14_kp}='tgh') or (${a14_kp}='pwid')", vals: { a14_kp: 'fsw' }, expected: true },
  { expr: "(${a14_kp}='fsw' or ${a14_kp}='msm' or ${a14_kp}='tgh') or (${a14_kp}='pwid')", vals: { a14_kp: 'general' }, expected: false },
  { expr: "${h0_deceased}='yes' and ${h2_reason}='5'", vals: { h0_deceased: 'yes', h2_reason: '5' }, expected: true },
  { expr: "${h0_deceased}='yes' and ${h2_reason}='5'", vals: { h0_deceased: 'yes', h2_reason: '1' }, expected: false }
];

let allPassed = true;
for (const t of tests) {
  const result = evalRelevant(t.expr, t.vals);
  if (result !== t.expected) {
    console.error(`FAIL: ${t.expr} with ${JSON.stringify(t.vals)} expected ${t.expected} got ${result}`);
    allPassed = false;
  }
}
if (allPassed) {
  console.log(`ALL ${tests.length} TESTS PASSED!`);
}
