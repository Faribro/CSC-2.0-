const fs = require('fs');
const filePath = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(filePath, 'utf8');

const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

// 1. Add others to kp choice list if not present
if (!content.includes('code: "others", labelEn: "Others"')) {
  const truckerLine = `    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },`;
  const addition = `    { code: "others", labelEn: "Others", labelHi: "अन्य" },`;
  content = content.replace(truckerLine, truckerLine + nl + addition);
  console.log('Added others to kp');
}

// 2. Add yndk numeric codes if needed
if (!content.includes('code: "1", labelEn: "Yes"')) {
  const yndkOpen = `  "yndk": [`;
  const yndkAdd = `${nl}    { code: "1", labelEn: "Yes", labelHi: "हाँ" },${nl}    { code: "2", labelEn: "No", labelHi: "नहीं" },${nl}    { code: "3", labelEn: "Don't know", labelHi: "पता नहीं" },`;
  content = content.replace(yndkOpen, yndkOpen + yndkAdd);
  console.log('Added 1, 2, 3 to yndk');
}

// 3. Add a20_marital and a21_income to sec-a
if (!content.includes('name: "a20_marital"')) {
  const occTarget = `relevant: "\${a19_occupation}='14'",${nl}      },`;
  const addition = `${nl}      {${nl}        name: "a20_marital",${nl}        type: "select_one",${nl}        labelEn: "A20. Marital status",${nl}        labelHi: "A20. वैवाहिक स्थिति",${nl}        choiceList: "marital",${nl}        required: true,${nl}      },${nl}      {${nl}        name: "a21_income",${nl}        type: "select_one",${nl}        labelEn: "A21. Average monthly family income",${nl}        labelHi: "A21. परिवार की औसत मासिक आय",${nl}        choiceList: "income",${nl}        required: true,${nl}      },`;
  content = content.replace(occTarget, occTarget + addition);
  console.log('Added a20_marital and a21_income to sec-a');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched crfDefinitions.ts');
