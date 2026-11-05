const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const m = content.match(/yndk:\s*\[([\s\S]*?)\]/);
console.log('yndk:', m ? m[0] : 'not found');
