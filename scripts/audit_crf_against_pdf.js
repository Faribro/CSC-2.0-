const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Find all choice lists defined in CRF_CHOICE_LISTS
const choiceListNames = [];
const clMatch = content.match(/export const CRF_CHOICE_LISTS[^{]*\{([\s\S]*?)\n\};/);
if (clMatch) {
  const clText = clMatch[1];
  const keys = clText.match(/^\s*['"]?([a-zA-Z0-9_]+)['"]?:\s*\[/gm);
  if (keys) {
    keys.forEach(k => {
      const name = k.replace(/^\s*['"]?/, '').replace(/['"]?:\s*\[/, '');
      choiceListNames.push(name);
    });
  }
}
console.log('Total choice lists:', choiceListNames.length, choiceListNames);

// Check sections
const secMatches = content.match(/titleEn:\s*"([^"]+)"/g);
console.log('Section title matches:', secMatches);
