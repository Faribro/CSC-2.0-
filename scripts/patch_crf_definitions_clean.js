const fs = require('fs');
const filePath = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(filePath, 'utf8');
const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

// 1. Add others to kp
const kpTarget = `    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },`;
const kpNew = `    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },${nl}    { code: "others", labelEn: "Others", labelHi: "अन्य" },`;
if (content.includes(kpTarget) && !content.includes('code: "others", labelEn: "Others"')) {
  content = content.replace(kpTarget, kpNew);
  console.log('1. Added others to kp');
}

// 2. Add 1, 2, 3 to yndk
const yndkTarget = `  "yndk": [`;
const yndkNew = `  "yndk": [${nl}    { code: "1", labelEn: "Yes", labelHi: "हाँ" },${nl}    { code: "2", labelEn: "No", labelHi: "नहीं" },${nl}    { code: "3", labelEn: "Don't know", labelHi: "पता नहीं" },`;
if (content.includes(yndkTarget) && !content.includes('code: "1", labelEn: "Yes"')) {
  content = content.replace(yndkTarget, yndkNew);
  console.log('2. Added 1, 2, 3 to yndk');
}

// 3. Add a20_marital and a21_income
const a19EndTarget = `relevant: "\${a19_occupation}='14'",${nl}      },`;
const a20And21 = `relevant: "\${a19_occupation}='14'",${nl}      },${nl}      {${nl}        name: "a20_marital",${nl}        type: "select_one",${nl}        labelEn: "A20. Marital status",${nl}        labelHi: "A20. वैवाहिक स्थिति",${nl}        choiceList: "marital",${nl}        required: true,${nl}      },${nl}      {${nl}        name: "a21_income",${nl}        type: "select_one",${nl}        labelEn: "A21. Average monthly family income",${nl}        labelHi: "A21. परिवार की औसत मासिक आय",${nl}        choiceList: "income",${nl}        required: true,${nl}      },`;

if (content.includes(a19EndTarget) && !content.includes('name: "a20_marital"')) {
  content = content.replace(a19EndTarget, a20And21);
  console.log('3. Added a20_marital and a21_income to sec-a');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished updating crfDefinitions.ts');
