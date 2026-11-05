const fs = require('fs');

const path = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(path, 'utf8');
const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';
const lines = content.split(nl);

function findFieldIndices(name) {
  const nameLineIdx = lines.findIndex(l => l.includes(`name: "${name}",`));
  if (nameLineIdx === -1) throw new Error(`Field ${name} not found`);
  
  let startIdx = nameLineIdx;
  while (startIdx >= 0 && !lines[startIdx].includes('      {')) {
    startIdx--;
  }

  let endIdx = nameLineIdx;
  while (endIdx < lines.length && !lines[endIdx].includes('      },')) {
    endIdx++;
  }

  return { start: startIdx, end: endIdx };
}

const phoneRange = findFieldIndices('a11_phone');
const phoneVerRange = findFieldIndices('a11_phone_verified');
const doorRange = findFieldIndices('a11_door');
const addrVerRange = findFieldIndices('a11_addr_verified');

const doorLines = lines.slice(doorRange.start, doorRange.end + 1);
const phoneLines = lines.slice(phoneRange.start, phoneVerRange.end + 1);

// Build new lines array
const part1 = lines.slice(0, phoneRange.start);
const part2 = lines.slice(phoneVerRange.end + 1, doorRange.start);
const part3 = lines.slice(doorRange.end + 1, addrVerRange.end + 1);
const part4 = lines.slice(addrVerRange.end + 1);

const newLines = [
  ...part1,
  ...doorLines,
  ...part2,
  ...part3,
  ...phoneLines,
  ...part4
];

fs.writeFileSync(path, newLines.join(nl), 'utf8');
console.log('Successfully swapped A11 fields cleanly!');
