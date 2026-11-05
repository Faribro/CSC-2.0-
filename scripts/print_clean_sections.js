const fs = require('fs');
const buf = fs.readFileSync('scripts/pdf_sections_found.txt');
const text = buf.toString('utf8').replace(/[^\x20-\x7E\n]/g, '');
console.log(text);
