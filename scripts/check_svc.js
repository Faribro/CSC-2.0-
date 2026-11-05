const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const m1 = content.match(/"svc_cat":\s*\[([\s\S]*?)\]/);
console.log('svc_cat:', m1 ? m1[0] : 'not found');

const m2 = content.match(/"svc":\s*\[([\s\S]*?)\]/);
console.log('svc count:', m2 ? (m2[0].match(/code:/g) || []).length : 0);
