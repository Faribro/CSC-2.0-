const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const m = content.match(/"kp":\s*\[([\s\S]*?)\]/);
console.log('kp definition:', m ? m[0] : 'not found');
