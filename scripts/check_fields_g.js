const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('name:') && (l.includes('g4_') || l.includes('g3_') || l.includes('g5_') || l.includes('a20_') || l.includes('a21_') || l.includes('marital') || l.includes('income'))) {
    console.log(`${idx + 1}: ${l}`);
  }
});
