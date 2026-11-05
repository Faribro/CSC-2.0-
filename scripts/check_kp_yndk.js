const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const kpIdx = content.indexOf('"kp": [');
console.log('kp slice:\n', content.substring(kpIdx, kpIdx + 450));

const yndkIdx = content.indexOf('"yndk": [');
console.log('yndk slice:\n', content.substring(yndkIdx, yndkIdx + 300));
