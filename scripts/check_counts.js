const fs = require('fs');
const content = fs.readFileSync('frontend/lib/crfDefinitions.ts', 'utf8');

const occurrences = (str) => {
  let count = 0;
  let pos = 0;
  while ((pos = content.indexOf(str, pos)) !== -1) {
    count++;
    pos += str.length;
  }
  return count;
};

console.log('REGISTRATION_SECTIONS occurrences:', occurrences('REGISTRATION_SECTIONS'));
console.log('a12_res_type occurrences:', occurrences('a12_res_type'));
console.log('a12_door occurrences:', occurrences('a12_door'));
console.log('a20_marital occurrences:', occurrences('a20_marital'));
