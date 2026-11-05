const fs = require('fs');

const path = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(path, 'utf8');
const isCRLF = content.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// Replace the A11 block in crfDefinitions.ts
const currentA11Pattern = `      {
        name: "a11_res_type",
        type: "select_one",
        labelEn: "Type of residence",
        labelHi: "आवास का प्रकार",
        choiceList: "res_type",
      },
      {
        name: "a11_phone",
        type: "text",
        labelEn: "Contact number",
        labelHi: "संपर्क नंबर",
        constraint: "regex(., '^[6-9][0-9]{9}$')",
        constraintMsgEn: "Enter a valid 10-digit mobile number.",
        constraintMsgHi: "10 अंकों का वैध मोबाइल नंबर दर्ज करें।",
      },
      {
        name: "a11_phone_verified",
        type: "date",
        labelEn: "Contact number verified on",
        labelHi: "संपर्क नंबर सत्यापित (तारीख)",
        relevant: "\${a11_phone}!=\'\'",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },
      {
        name: "a11_street",
        type: "text",
        labelEn: "Street",
        labelHi: "सड़क",
      },
      {
        name: "a11_village",
        type: "text",
        labelEn: "Village / City",
        labelHi: "गांव / शहर",
      },
      {
        name: "a11_block",
        type: "text",
        labelEn: "Taluk / Mandal / Block",
        labelHi: "तालुक / मंडल / ब्लॉक",
      },
      {
        name: "a11_landmark",
        type: "text",
        labelEn: "Landmark",
        labelHi: "पहचान चिह्न",
      },
      {
        name: "a11_district",
        type: "text",
        labelEn: "District",
        labelHi: "जिला",
      },
      {
        name: "a11_state",
        type: "text",
        labelEn: "State",
        labelHi: "राज्य",
      },
      {
        name: "a11_pin",
        type: "text",
        labelEn: "Pin code",
        labelHi: "पिन कोड",
        constraint: "regex(., '^[1-9][0-9]{5}$')",
        constraintMsgEn: "Pin code must be 6 digits.",
        constraintMsgHi: "पिन कोड 6 अंकों का होना चाहिए।",
      },
      {
        name: "a11_door",
        type: "text",
        labelEn: "House / door no., ward, colony, apartment",
        labelHi: "घर / दरवाजा संख्या, वार्ड, कॉलोनी, अपार्टमेंट",
      },
      {
        name: "a11_addr_verified",
        type: "date",
        labelEn: "Address verified on",
        labelHi: "पता सत्यापित (तारीख)",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },`;

const newA11Block = `      {
        name: "a11_res_type",
        type: "select_one",
        labelEn: "Type of residence",
        labelHi: "आवास का प्रकार",
        choiceList: "res_type",
      },
      {
        name: "a11_door",
        type: "text",
        labelEn: "House / door no., ward, colony, apartment",
        labelHi: "घर / दरवाजा संख्या, वार्ड, कॉलोनी, अपार्टमेंट",
      },
      {
        name: "a11_street",
        type: "text",
        labelEn: "Street",
        labelHi: "सड़क",
      },
      {
        name: "a11_village",
        type: "text",
        labelEn: "Village / City",
        labelHi: "गांव / शहर",
      },
      {
        name: "a11_block",
        type: "text",
        labelEn: "Taluk / Mandal / Block",
        labelHi: "तालुक / मंडल / ब्लॉक",
      },
      {
        name: "a11_landmark",
        type: "text",
        labelEn: "Landmark",
        labelHi: "पहचान चिह्न",
      },
      {
        name: "a11_district",
        type: "text",
        labelEn: "District",
        labelHi: "जिला",
      },
      {
        name: "a11_state",
        type: "text",
        labelEn: "State",
        labelHi: "राज्य",
      },
      {
        name: "a11_pin",
        type: "text",
        labelEn: "Pin code",
        labelHi: "पिन कोड",
        constraint: "regex(., '^[1-9][0-9]{5}$')",
        constraintMsgEn: "Pin code must be 6 digits.",
        constraintMsgHi: "पिन कोड 6 अंकों का होना चाहिए।",
      },
      {
        name: "a11_addr_verified",
        type: "date",
        labelEn: "Address verified on",
        labelHi: "पता सत्यापित (तारीख)",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },
      {
        name: "a11_phone",
        type: "text",
        labelEn: "Contact number",
        labelHi: "संपर्क नंबर",
        constraint: "regex(., '^[6-9][0-9]{9}$')",
        constraintMsgEn: "Enter a valid 10-digit mobile number.",
        constraintMsgHi: "10 अंकों का वैध मोबाइल नंबर दर्ज करें।",
      },
      {
        name: "a11_phone_verified",
        type: "date",
        labelEn: "Contact number verified on",
        labelHi: "संपर्क नंबर सत्यापित (तारीख)",
        relevant: "\${a11_phone}!=\'\'",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },`;

// Normalize line endings for replacement
const normContent = content.replace(/\r\n/g, '\n');
const normPattern = currentA11Pattern.replace(/\r\n/g, '\n');
const normNewBlock = newA11Block.replace(/\r\n/g, '\n');

if (!normContent.includes(normPattern)) {
  console.error('Pattern not found in content!');
  process.exit(1);
}

const updatedNorm = normContent.replace(normPattern, normNewBlock);
const finalContent = isCRLF ? updatedNorm.replace(/\n/g, '\r\n') : updatedNorm;

fs.writeFileSync(path, finalContent, 'utf8');
console.log('Successfully swapped A11 fields in crfDefinitions.ts!');
