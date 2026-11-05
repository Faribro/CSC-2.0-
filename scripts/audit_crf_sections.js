const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

// Parse section titles and field counts
const sections = [];
const lines = content.split(/\r?\n/);

let currentSec = null;
let currentFields = [];

lines.forEach((line, idx) => {
  const secStart = line.match(/id:\s*['"](sec-[a-z])['"],/);
  if (secStart) {
    if (currentSec) {
      sections.push({ ...currentSec, fieldCount: currentFields.length, fields: currentFields });
    }
    currentSec = { id: secStart[1] };
    currentFields = [];
  }
  const titleEnMatch = line.match(/titleEn:\s*['"]([^'"]+)['"]/);
  if (titleEnMatch && currentSec && !currentSec.titleEn) {
    currentSec.titleEn = titleEnMatch[1];
  }
  const fieldNameMatch = line.match(/name:\s*['"]([a-zA-Z0-9_]+)['"]/);
  if (fieldNameMatch && currentSec) {
    currentFields.push(fieldNameMatch[1]);
  }
});
if (currentSec) {
  sections.push({ ...currentSec, fieldCount: currentFields.length, fields: currentFields });
}

console.log('Sections found in crfDefinitions:');
sections.forEach(s => {
  console.log(`- ${s.id} (${s.titleEn}): ${s.fieldCount} fields`);
});
