const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const clIdx = content.indexOf('export const CHOICE_LISTS');
const clSlice = content.substring(clIdx);
const lines = clSlice.split('\n');
const keys = [];
lines.forEach(l => {
  const m = l.match(/^\s*["']?([a-zA-Z0-9_]+)["']?:\s*\[/);
  if (m) keys.push(m[1]);
});
console.log('CHOICE_LISTS keys count:', keys.length);
console.log(keys);
