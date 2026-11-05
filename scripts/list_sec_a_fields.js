const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');
const lines = content.split(/\r?\n/);

let inSecA = false;
const fields = [];

lines.forEach((l, i) => {
  if (l.includes('id: "sec-a"')) inSecA = true;
  if (l.includes('id: "sec-b"')) inSecA = false;
  if (inSecA) {
    const nameMatch = l.match(/name:\s*"([^"]+)"/);
    if (nameMatch) {
      fields.push({ line: i + 1, name: nameMatch[1] });
    }
  }
});

console.log('Fields in Section A:', fields.length);
fields.forEach(f => console.log(`${f.line}: ${f.name}`));
