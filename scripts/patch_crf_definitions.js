const fs = require('fs');

const filePath = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add others to kp choice list if not present
if (!content.includes('code: "others", labelEn: "Others"')) {
  content = content.replace(
    '    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },',
    '    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },\n    { code: "others", labelEn: "Others", labelHi: "अन्य" },'
  );
  console.log('Added others to kp');
}

// 2. Ensure yndk has numeric and string options
const yndkTarget = `  "yndk": [
    { code: "yes", labelEn: "Yes", labelHi: "हाँ" },
    { code: "no", labelEn: "No", labelHi: "नहीं" },
    { code: "dk", labelEn: "Don't know", labelHi: "पता नहीं" },
  ],`;

const yndkReplacement = `  "yndk": [
    { code: "1", labelEn: "Yes", labelHi: "हाँ" },
    { code: "2", labelEn: "No", labelHi: "नहीं" },
    { code: "3", labelEn: "Don't know", labelHi: "पता नहीं" },
    { code: "yes", labelEn: "Yes", labelHi: "हाँ" },
    { code: "no", labelEn: "No", labelHi: "नहीं" },
    { code: "dk", labelEn: "Don't know", labelHi: "पता नहीं" },
  ],`;

if (content.includes(yndkTarget)) {
  content = content.replace(yndkTarget, yndkReplacement);
  console.log('Updated yndk with 1, 2, 3 and yes, no, dk');
}

// 3. Add a20_marital and a21_income to sec-a
const secATarget = `      {
        name: "a19_occupation_other",
        type: "text",
        labelEn: "Specify other occupation",
        labelHi: "अन्य व्यवसाय बताएं",
        required: true,
        relevant: "\${a19_occupation}='14'",
      },
    ],
  },
  {
    id: "sec-b",`;

const secAReplacement = `      {
        name: "a19_occupation_other",
        type: "text",
        labelEn: "Specify other occupation",
        labelHi: "अन्य व्यवसाय बताएं",
        required: true,
        relevant: "\${a19_occupation}='14'",
      },
      {
        name: "a20_marital",
        type: "select_one",
        labelEn: "A20. Marital status",
        labelHi: "A20. वैवाहिक स्थिति",
        choiceList: "marital",
        required: true,
      },
      {
        name: "a21_income",
        type: "select_one",
        labelEn: "A21. Average monthly family income",
        labelHi: "A21. परिवार की औसत मासिक आय",
        choiceList: "income",
        required: true,
      },
    ],
  },
  {
    id: "sec-b",`;

if (content.includes(secATarget)) {
  content = content.replace(secATarget, secAReplacement);
  console.log('Added a20_marital and a21_income to sec-a');
} else {
  console.error('Could not find secATarget!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Saved crfDefinitions.ts successfully');
