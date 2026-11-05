const fs = require('fs');
const filePath = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(filePath, 'utf8');
const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

// In kp, add others
const oldKp = `    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },${nl}    { code: "na", labelEn: "NA (not a KP)", labelHi: "लागू नहीं" },`;
const newKp = `    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },${nl}    { code: "others", labelEn: "Others", labelHi: "अन्य" },${nl}    { code: "na", labelEn: "NA (not a KP)", labelHi: "लागू नहीं" },`;

if (content.includes(oldKp)) {
  content = content.replace(oldKp, newKp);
  console.log('Added others to kp');
}

// In yndk, add 1, 2, 3
const oldYndk = `  "yndk": [${nl}    { code: "yes", labelEn: "Yes", labelHi: "हाँ" },`;
const newYndk = `  "yndk": [${nl}    { code: "1", labelEn: "Yes", labelHi: "हाँ" },${nl}    { code: "2", labelEn: "No", labelHi: "नहीं" },${nl}    { code: "3", labelEn: "Don't know", labelHi: "पता नहीं" },${nl}    { code: "yes", labelEn: "Yes", labelHi: "हाँ" },`;

if (content.includes(oldYndk)) {
  content = content.replace(oldYndk, newYndk);
  console.log('Added 1, 2, 3 to yndk');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated kp and yndk');
