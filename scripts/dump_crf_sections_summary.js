const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const secMatches = content.match(/id:\s*"sec-[a-j]"[\s\S]*?(?=(id:\s*"sec-[a-j]"|$))/g);
if (secMatches) {
  secMatches.forEach(sec => {
    const id = sec.match(/id:\s*"([^"]+)"/)[1];
    const title = sec.match(/titleEn:\s*"([^"]+)"/)[1];
    const fields = (sec.match(/name:\s*"([^"]+)"/g) || []).map(f => f.replace(/name:\s*"/, '').replace(/"/, ''));
    console.log(`\n=== ${id}: ${title} (${fields.length} fields) ===`);
    console.log(fields.join(', '));
  });
}
