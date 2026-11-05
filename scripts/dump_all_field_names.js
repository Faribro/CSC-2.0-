const fs = require('fs');

const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');
const lines = content.split(/\r?\n/);

let currentSec = null;
const secMap = {};

lines.forEach((l, i) => {
  const m = l.match(/id:\s*"(sec-[a-z])"/);
  if (m) {
    currentSec = m[1];
    secMap[currentSec] = [];
  }
  const nm = l.match(/name:\s*"([^"]+)"/);
  if (nm && currentSec) {
    // get labelEn if on same or next few lines
    secMap[currentSec].push(nm[1]);
  }
});

for (const [sec, flist] of Object.entries(secMap)) {
  console.log(`\n### ${sec} (${flist.length} fields):`);
  console.log(flist.join(', '));
}
