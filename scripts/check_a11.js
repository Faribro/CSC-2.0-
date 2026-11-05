const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('name:') && (line.includes('a11_') || line.includes('a10_') || line.includes('a12_') || line.includes('a13_') || line.includes('a14_') || line.includes('a15_') || line.includes('a16_') || line.includes('a17_') || line.includes('a18_') || line.includes('a19_') || line.includes('a20_') || line.includes('a21_'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
