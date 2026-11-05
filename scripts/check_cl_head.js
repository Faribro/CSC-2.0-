const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const clIdx = content.indexOf('export const CHOICE_LISTS');
const clSlice = content.substring(clIdx);
const lines = clSlice.split('\n');
lines.slice(0, 50).forEach((l, i) => console.log(i + ': ' + l));
