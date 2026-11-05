const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');
console.log('Has d5_scheme:', content.includes('"d5_scheme"'));
console.log('Has j5_purpose:', content.includes('"j5_purpose"'));
console.log('Has purpose:', content.includes('"purpose"'));
console.log('Has sws:', content.includes('"sws"'));
