const fs = require('fs');
const filePath = 'frontend/lib/crfDefinitions.ts';
let content = fs.readFileSync(filePath, 'utf8');

const isCrlf = content.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

// Replace the A12 block
const oldA12 = `      {
        name: "a12_res_type",
        type: "select_one",
        labelEn: "Type of residence",
        labelHi: "आवास का प्रकार",
        choiceList: "res_type",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_door",
        type: "text",
        labelEn: "House / door no., ward, colony, apartment",
        labelHi: "घर / दरवाजा संख्या, वार्ड, कॉलोनी, अपार्टमेंट",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_street",
        type: "text",
        labelEn: "Street",
        labelHi: "सड़क",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_village",
        type: "text",
        labelEn: "Village / City",
        labelHi: "गांव / शहर",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_block",
        type: "text",
        labelEn: "Taluk / Mandal / Block",
        labelHi: "तालुक / मंडल / ब्लॉक",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_landmark",
        type: "text",
        labelEn: "Landmark",
        labelHi: "पहचान चिह्न",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_district",
        type: "text",
        labelEn: "District",
        labelHi: "जिला",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_state",
        type: "text",
        labelEn: "State",
        labelHi: "राज्य",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_pin",
        type: "text",
        labelEn: "Pin code",
        labelHi: "पिन कोड",
        relevant: "\${a12_same}='no'",
        constraint: "regex(., '^[1-9][0-9]{5}$')",
        constraintMsgEn: "Pin code must be 6 digits.",
        constraintMsgHi: "पिन कोड 6 अंकों का होना चाहिए।",
      },
      {
        name: "a12_phone",
        type: "text",
        labelEn: "Contact number",
        labelHi: "संपर्क नंबर",
        relevant: "\${a12_same}='no'",
        constraint: "regex(., '^[6-9][0-9]{9}$')",
        constraintMsgEn: "Enter a valid 10-digit mobile number.",
        constraintMsgHi: "10 अंकों का वैध मोबाइल नंबर दर्ज करें।",
      },
      {
        name: "a12_addr_verified",
        type: "date",
        labelEn: "Address verified on",
        labelHi: "पता सत्यापित (तारीख)",
        relevant: "\${a12_same}='no'",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },
      {
        name: "a12_phone_verified",
        type: "date",
        labelEn: "Contact number verified on",
        labelHi: "संपर्क नंबर सत्यापित (तारीख)",
        relevant: "(\${a12_same}='no') and \${a12_phone}!=''",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },`;

const newA12 = `      {
        name: "a12_res_type",
        type: "select_one",
        labelEn: "Type of residence",
        labelHi: "आवास का प्रकार",
        choiceList: "res_type",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_phone",
        type: "text",
        labelEn: "Contact number",
        labelHi: "संपर्क नंबर",
        relevant: "\${a12_same}='no'",
        constraint: "regex(., '^[6-9][0-9]{9}$')",
        constraintMsgEn: "Enter a valid 10-digit mobile number.",
        constraintMsgHi: "10 अंकों का वैध मोबाइल नंबर दर्ज करें।",
      },
      {
        name: "a12_phone_verified",
        type: "date",
        labelEn: "Contact number verified on",
        labelHi: "संपर्क नंबर सत्यापित (तारीख)",
        relevant: "(\${a12_same}='no') and \${a12_phone}!=''",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },
      {
        name: "a12_door",
        type: "text",
        labelEn: "House / door no., ward, colony, apartment",
        labelHi: "घर / दरवाजा संख्या, वार्ड, कॉलोनी, अपार्टमेंट",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_street",
        type: "text",
        labelEn: "Street",
        labelHi: "सड़क",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_village",
        type: "text",
        labelEn: "Village / City",
        labelHi: "गांव / शहर",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_block",
        type: "text",
        labelEn: "Taluk / Mandal / Block",
        labelHi: "तालुक / मंडल / ब्लॉक",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_landmark",
        type: "text",
        labelEn: "Landmark",
        labelHi: "पहचान चिह्न",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_district",
        type: "text",
        labelEn: "District",
        labelHi: "जिला",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_state",
        type: "text",
        labelEn: "State",
        labelHi: "राज्य",
        relevant: "\${a12_same}='no'",
      },
      {
        name: "a12_pin",
        type: "text",
        labelEn: "Pin code",
        labelHi: "पिन कोड",
        relevant: "\${a12_same}='no'",
        constraint: "regex(., '^[1-9][0-9]{5}$')",
        constraintMsgEn: "Pin code must be 6 digits.",
        constraintMsgHi: "पिन कोड 6 अंकों का होना चाहिए।",
      },
      {
        name: "a12_addr_verified",
        type: "date",
        labelEn: "Address verified on",
        labelHi: "पता सत्यापित (तारीख)",
        relevant: "\${a12_same}='no'",
        constraint: ". <= today()",
        constraintMsgEn: "Date cannot be in the future.",
        constraintMsgHi: "तारीख भविष्य की नहीं हो सकती।",
      },`;

const normContent = content.replace(/\r\n/g, '\n');
const normOld = oldA12.replace(/\r\n/g, '\n');
const normNew = newA12.replace(/\r\n/g, '\n');

if (normContent.includes(normOld)) {
  const replaced = normContent.replace(normOld, normNew);
  fs.writeFileSync(filePath, isCrlf ? replaced.replace(/\n/g, '\r\n') : replaced, 'utf8');
  console.log('Successfully re-ordered A12 fields');
} else {
  console.error('Could not find normOld in content!');
}
