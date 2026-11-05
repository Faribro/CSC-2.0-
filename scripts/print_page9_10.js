const fs = require('fs');
const content = fs.readFileSync('scripts/page9_10.txt', 'utf8');
console.log(content.replace(/[^\x20-\x7E\n]/g, ' '));
