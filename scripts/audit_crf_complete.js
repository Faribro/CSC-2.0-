const fs = require('fs');

const fileContent = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Parse CHOICE_LISTS
const choiceListsMatch = fileContent.match(/export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = \{([\s\S]*?)\n\};/);
const clText = choiceListsMatch[1];
const clKeys = Array.from(clText.matchAll(/"([a-zA-Z0-9_]+)":\s*\[/g)).map(m => m[1]);

const CHOICE_LISTS = {};
for (let i = 0; i < clKeys.length; i++) {
  const k = clKeys[i];
  const startIdx = clText.indexOf(`"${k}":`);
  const nextIdx = i < clKeys.length - 1 ? clText.indexOf(`"${clKeys[i+1]}":`) : clText.length;
  const slice = clText.substring(startIdx, nextIdx);
  const opts = Array.from(slice.matchAll(/\{\s*code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)"(?:,\s*labelHi:\s*"([^"]+)")?/g))
    .map(m => ({ code: m[1], labelEn: m[2], labelHi: m[3] }));
  CHOICE_LISTS[k] = opts;
}

console.log(`Parsed ${Object.keys(CHOICE_LISTS).length} choice lists.`);

// Now parse sections
const secMatches = Array.from(fileContent.matchAll(/id:\s*"([^"]+)",\s*code:\s*"([^"]+)",\s*titleEn:\s*"([^"]+)",\s*titleHi:\s*"([^"]+)"/g));

console.log(`Found ${secMatches.length} sections:`);
secMatches.forEach(m => console.log(`  - [${m[2]}] ${m[3]} (id: ${m[1]})`));

// Parse all fields with choiceList
const fieldMatches = Array.from(fileContent.matchAll(/name:\s*"([^"]+)",\s*type:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)"[\s\S]*?choiceList:\s*"([^"]+)"/g));

console.log(`\nFound ${fieldMatches.length} fields with choiceList:`);
let missingCount = 0;
fieldMatches.forEach(m => {
  const [_, name, type, labelEn, choiceList] = m;
  const list = CHOICE_LISTS[choiceList];
  if (!list) {
    console.log(`  ❌ [MISSING] Field "${name}" (${labelEn}) -> "${choiceList}" does not exist in CHOICE_LISTS!`);
    missingCount++;
  } else {
    console.log(`  ✓ [OK] "${name}" (${type}) -> "${choiceList}" (${list.length} opts)`);
  }
});

console.log(`\nTotal fields with choiceList: ${fieldMatches.length}, Missing: ${missingCount}`);
