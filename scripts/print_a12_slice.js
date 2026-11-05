const fs = require('fs');
let content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');
console.log(content.substring(41650, 44657));
