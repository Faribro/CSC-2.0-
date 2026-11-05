const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const m = content.match(/"purpose":\s*\[([\s\S]*?)\]/);
console.log('purpose:', m ? m[0] : 'not found');
