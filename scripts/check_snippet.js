const fs = require('fs');
let content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const targetIdx = content.indexOf('a19_occupation_other');
console.log('targetIdx:', targetIdx);
if (targetIdx !== -1) {
  const snippet = content.substring(targetIdx - 50, targetIdx + 300);
  console.log('Snippet:\n', JSON.stringify(snippet));
}
