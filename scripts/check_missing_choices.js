const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const matches = content.match(/choiceList:\s*['"]([a-zA-Z0-9_]+)['"]/g);
const usedChoiceLists = new Set();
matches.forEach(m => {
  const name = m.replace(/choiceList:\s*['"]/, '').replace(/['"]/, '');
  usedChoiceLists.add(name);
});

// Check if these exist in CHOICE_LISTS
const defined = [];
const clStart = content.indexOf('export const CHOICE_LISTS');
const clContent = content.substring(clStart);
for (const name of usedChoiceLists) {
  const reg = new RegExp(`['"]?${name}['"]?:\\s*\\[`);
  if (!reg.test(clContent)) {
    console.log('MISSING CHOICE LIST DEFINITION:', name);
  }
}
console.log('Total unique choiceLists referenced in fields:', usedChoiceLists.size);
