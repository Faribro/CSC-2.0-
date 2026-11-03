// scripts/verify_wcag_tokens.js
// Verifies all color pairs in the Comic Theme tokens meet WCAG 2.2 AA requirements.

function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getRelativeLuminance(rgb) {
  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const tokenPairs = [
  { role: 'Body Text on Canvas', fg: '#3B2F3F', bg: '#FFFBF5', minRatio: 4.5 },
  { role: 'Muted Text on Canvas', fg: '#6B5B6E', bg: '#FFFBF5', minRatio: 4.5 },
  { role: 'Body Text on Surface', fg: '#3B2F3F', bg: '#FFFFFF', minRatio: 4.5 },
  { role: 'Muted Text on Surface', fg: '#6B5B6E', bg: '#FFFFFF', minRatio: 4.5 },
  { role: 'Primary Action Text (White on Coral)', fg: '#FFFFFF', bg: '#C8472F', minRatio: 4.5 },
  { role: 'Primary Action Hover Text (White on Dark Coral)', fg: '#FFFFFF', bg: '#B93A24', minRatio: 4.5 },
  { role: 'Plum Action Text (White on Plum)', fg: '#FFFFFF', bg: '#7B3F8C', minRatio: 4.5 },
  { role: 'Plum Text on Canvas', fg: '#7B3F8C', bg: '#FFFBF5', minRatio: 4.5 },
  { role: 'Plum Text on Surface', fg: '#7B3F8C', bg: '#FFFFFF', minRatio: 4.5 },
  { role: 'Ink on Sunshine Accent', fg: '#3B2F3F', bg: '#FFD166', minRatio: 4.5 },
  { role: 'Ink on Mint Tint', fg: '#3B2F3F', bg: '#BFEBDD', minRatio: 4.5 },
  { role: 'Ink on Lavender Tint', fg: '#3B2F3F', bg: '#E4D8F7', minRatio: 4.5 },
  { role: 'Ink on Peach Tint', fg: '#3B2F3F', bg: '#FFE1CC', minRatio: 4.5 },
  { role: 'Ink on Pink Tint', fg: '#3B2F3F', bg: '#FFD6E0', minRatio: 4.5 },
  { role: 'Success Text on Success Bg', fg: '#1F6B52', bg: '#E6F8F1', minRatio: 4.5 },
  { role: 'Warning Text on Warning Bg', fg: '#7A4A00', bg: '#FFF3C4', minRatio: 4.5 },
  { role: 'Error Text on Error Bg', fg: '#A3213C', bg: '#FFF0F3', minRatio: 4.5 },
  { role: 'Component Border on White Surface', fg: '#8A7A8D', bg: '#FFFFFF', minRatio: 3.0, isUiBoundary: true },
];

console.log('==================================================================');
console.log('▶ Running WCAG 2.2 AA Contrast Verification Suite on Comic Tokens');
console.log('==================================================================\n');

let failures = 0;

for (const pair of tokenPairs) {
  const ratio = getContrastRatio(pair.fg, pair.bg);
  const rounded = Math.round(ratio * 10) / 10;
  const passed = ratio >= pair.minRatio;
  const label = `${pair.role}: ${pair.fg} on ${pair.bg} -> ${rounded}:1 (min required: ${pair.minRatio}:1)`;

  if (passed) {
    console.log(`  ✓ PASS: ${label}`);
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failures++;
  }
}

console.log('\n------------------------------------------------------------------');
if (failures === 0) {
  console.log('🎉 ALL TOKEN PAIRS COMPLY WITH WCAG 2.2 AA CONTRAST REQUIREMENTS!');
  console.log('------------------------------------------------------------------');
  process.exit(0);
} else {
  console.error(`❌ ${failures} token pair(s) failed WCAG 2.2 AA requirements!`);
  console.log('------------------------------------------------------------------');
  process.exit(1);
}
