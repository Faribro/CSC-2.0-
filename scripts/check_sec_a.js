const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Print all fields in sec-a
const secAMatch = content.match(/id:\s*"sec-a"[\s\S]*?fields:\s*\[([\s\S]*?)\]\s*,\s*}/);
if (secAMatch) {
  const fieldsBlock = secAMatch[1];
  const fieldRegex = /\{\s*name:\s*"([^"]+)",\s*type:\s*"([^"]+)"[\s\S]*?labelEn:\s*"([^"]+)"(?:[\s\S]*?choiceList:\s*"([^"]+)")?/g;
  let m;
  console.log('--- Section A Fields ---');
  while ((m = fieldRegex.exec(fieldsBlock)) !== null) {
    console.log(`${m[1]} (${m[2]}): "${m[3]}" ${m[4] ? `[choiceList: ${m[4]}]` : ''}`);
  }
}
