const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const m1 = content.match(/"marital":\s*\[([\s\S]*?)\]/);
console.log('marital:', m1 ? m1[0] : 'not found');

const m2 = content.match(/"income":\s*\[([\s\S]*?)\]/);
console.log('income:', m2 ? m2[0] : 'not found');
