// scripts/lint_no_banned_colors.js
// Grep/lint test that verifies no blue or dark-green colors exist in frontend source files outside the logo.

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Allowed exceptions:
// 1. alliance-india-logo
// 2. tokens.css definition comments
// 3. node_modules, .next, dist
const IGNORED_PATHS = [
  'node_modules',
  '.next',
  '.git',
  'public',
  'package-lock.json',
  'tsconfig.tsbuildinfo',
];

const BANNED_PATTERNS = [
  // Banned Tailwind utility prefixes
  /\b(bg|text|border|ring|stroke|fill)-(blue|sky|cyan|indigo)-(?:400|500|600|700|800|900|950)\b/i,
  /\b(bg|text|border|ring)-(emerald|green|teal)-(?:700|800|900|950)\b/i,

  // Banned hex codes for blue shades
  /#(?:1[eE]40[aA][fF]|2563[eE][bB]|3[bB]82[fF]6|1[dD]4[eE][dD]8|1[eE]3[aA]8[aA]|0284[cC]7|0369[aA]1|3730[aA]3|4338[cC]a|4[fF]46[eE]5|6366[fF]1)/i,

  // Banned hex codes for dark green shades
  /#(?:064[eE]3[bB]|065[fF]46|047857|059669|044434|14532[dD]|166534|15803[dD]|134[eE]4[aA]|115[eE]59|0[fF]766[eE])/i,
];

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (IGNORED_PATHS.some(ignored => fullPath.includes(ignored))) {
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else if (/\.(tsx|ts|js|jsx|css)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

console.log('==================================================================');
console.log('▶ Running Banned Colors (Blue & Dark-Green) Linter on Frontend');
console.log('==================================================================\n');

const files = scanDirectory(path.join(FRONTEND_DIR, 'app'))
  .concat(scanDirectory(path.join(FRONTEND_DIR, 'components')))
  .concat([path.join(FRONTEND_DIR, 'tailwind.config.ts')]);

let violations = 0;

for (const filePath of files) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments mentioning banned colors
    if (line.includes('//') && line.toLowerCase().includes('banned')) return;
    if (line.includes('/*') && line.toLowerCase().includes('banned')) return;
    if (line.includes('logo')) return;

    for (const pattern of BANNED_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        console.error(`  ❌ VIOLATION [${relativePath}:${index + 1}]: Banned color pattern "${match[0]}" found:`);
        console.error(`     Line: ${line.trim()}`);
        violations++;
      }
    }
  });
}

console.log('\n------------------------------------------------------------------');
if (violations === 0) {
  console.log(`🎉 PASSED: Zero blue or dark-green color occurrences across ${files.length} scanned frontend files!`);
  console.log('------------------------------------------------------------------');
  process.exit(0);
} else {
  console.error(`❌ FAILED: Found ${violations} banned blue/dark-green color violation(s)!`);
  console.log('------------------------------------------------------------------');
  process.exit(1);
}
