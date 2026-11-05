const fs = require('fs');

// Read crfDefinitions.ts and choices.json
const defsText = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Let's find every choice list in CRF_CHOICE_LISTS
const choiceLists = {};
const clRegex = /"([a-zA-Z0-9_]+)":\s*\[([\s\S]*?)\n\s*\]/g;
let m;
while ((m = clRegex.exec(defsText)) !== null) {
  const name = m[1];
  const itemsText = m[2];
  const items = [];
  const itemRegex = /value:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"/g;
  let im;
  while ((im = itemRegex.exec(itemsText)) !== null) {
    items.push({ value: im[1], labelEn: im[2], labelHi: im[3] });
  }
  choiceLists[name] = items;
}

console.log('Parsed choice lists:', Object.keys(choiceLists).length);
for (const [k, v] of Object.entries(choiceLists)) {
  console.log(`- ${k}: ${v.length} options`);
}
