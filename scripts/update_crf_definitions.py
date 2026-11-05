# Update crfDefinitions.ts with exact dropdown options matching NACO CRF Guideline
import re

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update disc_from
old_disc = '''  "disc_from": [
    { code: "1", labelEn: "Health Facilities", labelHi: "स्वास्थ्य सुविधाएं" },
    { code: "2", labelEn: "Family Members", labelHi: "परिवार के सदस्य" },
    { code: "3", labelEn: "Local Goondas", labelHi: "स्थानीय गुंडे" },
    { code: "4", labelEn: "Police & Law Enforcement authorities", labelHi: "पुलिस एवं कानून प्रवर्तन प्राधिकरण" },
    { code: "5", labelEn: "Work Place", labelHi: "कार्यस्थल" },
    { code: "6", labelEn: "Educational Institution", labelHi: "शैक्षणिक संस्थान" },
    { code: "7", labelEn: "Social Gathering", labelHi: "सामाजिक कार्यक्रम" },
    { code: "8", labelEn: "Service delivery point", labelHi: "सेवा प्रदान करने का स्थान" },
    { code: "9", labelEn: "Others", labelHi: "अन्य" },
  ],'''

new_disc = '''  "disc_from": [
    { code: "1", labelEn: "1. Health Facilities", labelHi: "1. स्वास्थ्य सुविधाएं" },
    { code: "2", labelEn: "2. Family Members", labelHi: "2. परिवार के सदस्य" },
    { code: "3", labelEn: "3. Local Goondas", labelHi: "3. स्थानीय गुंडे" },
    { code: "4", labelEn: "4. Police & Law Enforcement authorities", labelHi: "4. पुलिस एवं कानून प्रवर्तन प्राधिकरण" },
    { code: "5", labelEn: "5. Work Place", labelHi: "5. कार्यस्थल" },
    { code: "6", labelEn: "6. Educational Institution", labelHi: "6. शैक्षणिक संस्थान" },
    { code: "7", labelEn: "7. Social Gathering", labelHi: "7. सामाजिक कार्यक्रम" },
    { code: "8", labelEn: "8. Service delivery point", labelHi: "8. सेवा प्रदान करने का स्थान" },
    { code: "9", labelEn: "9. Others", labelHi: "9. अन्य" },
  ],'''

# 2. Update disc_from_i
old_disc_i = '''  "disc_from_i": [
    { code: "1", labelEn: "Health facilities", labelHi: "स्वास्थ्य सुविधाएं" },
    { code: "2", labelEn: "Family members", labelHi: "परिवार के सदस्य" },
    { code: "3", labelEn: "Local goondas", labelHi: "स्थानीय गुंडे" },
    { code: "4", labelEn: "Police & law enforcement authorities", labelHi: "पुलिस एवं कानून प्रवर्तन प्राधिकरण" },
    { code: "5", labelEn: "Workplace", labelHi: "कार्यस्थल" },
    { code: "6", labelEn: "Educational institution", labelHi: "शैक्षणिक संस्थान" },
    { code: "7", labelEn: "Social gathering", labelHi: "सामाजिक कार्यक्रम" },
    { code: "8", labelEn: "Service delivery point", labelHi: "सेवा प्रदान करने का स्थान" },
    { code: "9", labelEn: "Others", labelHi: "अन्य" },
  ],'''

new_disc_i = '''  "disc_from_i": [
    { code: "1", labelEn: "1. Health facilities", labelHi: "1. स्वास्थ्य सुविधाएं" },
    { code: "2", labelEn: "2. Family members", labelHi: "2. परिवार के सदस्य" },
    { code: "3", labelEn: "3. Local goondas", labelHi: "3. स्थानीय गुंडे" },
    { code: "4", labelEn: "4. Police & law enforcement authorities", labelHi: "4. पुलिस एवं कानून प्रवर्तन प्राधिकरण" },
    { code: "5", labelEn: "5. Workplace", labelHi: "5. कार्यस्थल" },
    { code: "6", labelEn: "6. Educational institution", labelHi: "6. शैक्षणिक संस्थान" },
    { code: "7", labelEn: "7. Social gathering", labelHi: "7. सामाजिक कार्यक्रम" },
    { code: "8", labelEn: "8. Service delivery point", labelHi: "8. सेवा प्रदान करने का स्थान" },
    { code: "9", labelEn: "9. Others", labelHi: "9. अन्य" },
  ],'''

# 3. Update entitlements
old_ent = '''  "entitlements": [
    { code: "1", labelEn: "Ration card", labelHi: "राशन कार्ड" },
    { code: "2", labelEn: "Voter card", labelHi: "मतदाता पहचान पत्र" },
    { code: "3", labelEn: "Aadhaar card", labelHi: "आधार कार्ड" },
    { code: "4", labelEn: "Passport", labelHi: "पासपोर्ट" },
    { code: "5", labelEn: "PAN card", labelHi: "पैन कार्ड" },
    { code: "6", labelEn: "Caste certificate", labelHi: "जाति प्रमाण पत्र" },
    { code: "7", labelEn: "Birth certificate", labelHi: "जन्म प्रमाण पत्र" },
    { code: "8", labelEn: "Death certificate of husband or parents for widow or orphans", labelHi: "विधवा या अनाथ के लिए पति या माता-पिता का मृत्यु प्रमाण पत्र" },
    { code: "9", labelEn: "Marriage certificate", labelHi: "विवाह प्रमाण पत्र" },
    { code: "10", labelEn: "Income Certificate", labelHi: "आय प्रमाण पत्र" },
    { code: "11", labelEn: "Disability Certificate", labelHi: "दिव्यांगता प्रमाण पत्र" },
    { code: "12", labelEn: "Bank account", labelHi: "बैंक खाता" },
    { code: "13", labelEn: "Post Office account", labelHi: "डाकघर खाता" },
    { code: "14", labelEn: "Other (specify)", labelHi: "अन्य (विवरण दें)" },
  ],'''

new_ent = '''  "entitlements": [
    { code: "1", labelEn: "1. Ration card", labelHi: "1. राशन कार्ड" },
    { code: "2", labelEn: "2. Voter card", labelHi: "2. मतदाता पहचान पत्र" },
    { code: "3", labelEn: "3. Aadhaar card", labelHi: "3. आधार कार्ड" },
    { code: "4", labelEn: "4. Passport", labelHi: "4. पासपोर्ट" },
    { code: "5", labelEn: "5. PAN card", labelHi: "5. पैन कार्ड" },
    { code: "6", labelEn: "6. Caste certificate", labelHi: "6. जाति प्रमाण पत्र" },
    { code: "7", labelEn: "7. Birth certificate", labelHi: "7. जन्म प्रमाण पत्र" },
    { code: "8", labelEn: "8. Death certificate of husband or parents for widow or orphans", labelHi: "8. विधवा या अनाथ के लिए पति या माता-पिता का मृत्यु प्रमाण पत्र" },
    { code: "9", labelEn: "9. Marriage certificate", labelHi: "9. विवाह प्रमाण पत्र" },
    { code: "10", labelEn: "10. Income Certificate", labelHi: "10. आय प्रमाण पत्र" },
    { code: "11", labelEn: "11. Disability Certificate", labelHi: "11. दिव्यांगता प्रमाण पत्र" },
    { code: "12", labelEn: "12. Bank account", labelHi: "12. बैंक खाता" },
    { code: "13", labelEn: "13. Post Office account", labelHi: "13. डाकघर खाता" },
    { code: "14", labelEn: "14. Other (specify)", labelHi: "14. अन्य (विवरण दें)" },
  ],'''

# 4. Update se_status
old_se_status = '''  "se_status": [
    { code: "1", labelEn: "Ration card", labelHi: "राशन कार्ड" },
    { code: "2", labelEn: "Voter card", labelHi: "मतदाता पहचान पत्र" },
    { code: "3", labelEn: "Aadhaar card", labelHi: "आधार कार्ड" },
    { code: "4", labelEn: "Passport", labelHi: "पासपोर्ट" },
    { code: "5", labelEn: "PAN card", labelHi: "पैन कार्ड" },
    { code: "6", labelEn: "Caste certificate", labelHi: "जाति प्रमाण पत्र" },
    { code: "7", labelEn: "Birth certificate", labelHi: "जन्म प्रमाण पत्र" },
    { code: "8", labelEn: "Death certificate of husband or parents (widow / orphans)", labelHi: "विधवा या अनाथ के लिए पति या माता-पिता का मृत्यु प्रमाण पत्र" },
    { code: "9", labelEn: "Marriage certificate", labelHi: "विवाह प्रमाण पत्र" },
    { code: "10", labelEn: "Income certificate", labelHi: "आय प्रमाण पत्र" },
    { code: "11", labelEn: "Disability certificate", labelHi: "दिव्यांगता प्रमाण पत्र" },
    { code: "12", labelEn: "Bank account", labelHi: "बैंक खाता" },
    { code: "13", labelEn: "Post office account", labelHi: "डाकघर खाता" },
    { code: "14", labelEn: "Other (specify)", labelHi: "अन्य (विवरण दें)" },
  ],'''

new_se_status = '''  "se_status": [
    { code: "1", labelEn: "1. Ration card", labelHi: "1. राशन कार्ड" },
    { code: "2", labelEn: "2. Voter card", labelHi: "2. मतदाता पहचान पत्र" },
    { code: "3", labelEn: "3. Aadhaar card", labelHi: "3. आधार कार्ड" },
    { code: "4", labelEn: "4. Passport", labelHi: "4. पासपोर्ट" },
    { code: "5", labelEn: "5. PAN card", labelHi: "5. पैन कार्ड" },
    { code: "6", labelEn: "6. Caste certificate", labelHi: "6. जाति प्रमाण पत्र" },
    { code: "7", labelEn: "7. Birth certificate", labelHi: "7. जन्म प्रमाण पत्र" },
    { code: "8", labelEn: "8. Death certificate of husband or parents (widow / orphans)", labelHi: "8. विधवा या अनाथ के लिए पति या माता-पिता का मृत्यु प्रमाण पत्र" },
    { code: "9", labelEn: "9. Marriage certificate", labelHi: "9. विवाह प्रमाण पत्र" },
    { code: "10", labelEn: "10. Income certificate", labelHi: "10. आय प्रमाण पत्र" },
    { code: "11", labelEn: "11. Disability certificate", labelHi: "11. दिव्यांगता प्रमाण पत्र" },
    { code: "12", labelEn: "12. Bank account", labelHi: "12. बैंक खाता" },
    { code: "13", labelEn: "13. Post office account", labelHi: "13. डाकघर खाता" },
    { code: "14", labelEn: "14. Other (specify)", labelHi: "14. अन्य (विवरण दें)" },
  ],'''

# 5. Update purpose & j5_purpose
old_purpose = '''  "purpose": [
    { code: "1", labelEn: "Counselling", labelHi: "परामर्श" },
    { code: "2", labelEn: "Support group meeting", labelHi: "सहायता समूह बैठक" },
    { code: "3", labelEn: "LFU tracked back to ART", labelHi: "LFU को एआरटी से पुनः जोड़ा गया" },
    { code: "4", labelEn: "Missed case follow up", labelHi: "छूटे हुए मामलों का फ़ॉलोअप" },
    { code: "5", labelEn: "Pre-ART registration", labelHi: "प्री-एआरटी पंजीकरण" },
    { code: "6", labelEn: "CD4 follow up", labelHi: "सीडी4 फ़ॉलोअप" },
    { code: "7", labelEn: "Link to TI", labelHi: "TI से जोड़ना" },
    { code: "8", labelEn: "Testing of partner/spouse, children and family member", labelHi: "साथी/पति-पत्नी, बच्चों और परिवार के सदस्यों का परीक्षण" },
    { code: "9", labelEn: "Hospital/clinical referrals (OI management, side effects, general ailment, TB, STI treatment)", labelHi: "अस्पताल/क्लिनिक रेफरल (ओआई प्रबंधन, दुष्प्रभाव, सामान्य बीमारी, टीबी, एसटीआई उपचार)" },
    { code: "10", labelEn: "Support for legal aid", labelHi: "कानूनी सहायता के लिए समर्थन" },
    { code: "11", labelEn: "Social protection", labelHi: "सामाजिक सुरक्षा" },
    { code: "12", labelEn: "Social entitlements", labelHi: "सामाजिक अधिकार" },
    { code: "13", labelEn: "Others (specify in remarks)", labelHi: "अन्य (टिप्पणी में विवरण दें)" },
  ],'''

new_purpose = '''  "purpose": [
    { code: "1", labelEn: "1. Counselling", labelHi: "1. परामर्श" },
    { code: "2", labelEn: "2. Support group meeting", labelHi: "2. सहायता समूह बैठक" },
    { code: "3", labelEn: "3. LFU tracked back to ART", labelHi: "3. LFU को एआरटी से पुनः जोड़ा गया" },
    { code: "4", labelEn: "4. Missed case follow up", labelHi: "4. छूटे हुए मामलों का फ़ॉलोअप" },
    { code: "5", labelEn: "5. Pre-ART registration", labelHi: "5. प्री-एआरटी पंजीकरण" },
    { code: "6", labelEn: "6. CD4 follow up", labelHi: "6. सीडी4 फ़ॉलोअप" },
    { code: "7", labelEn: "7. Link to TI", labelHi: "7. TI से जोड़ना" },
    { code: "8", labelEn: "8. Testing of partner/spouse, children and family member", labelHi: "8. साथी/पति-पत्नी, बच्चों और परिवार के सदस्यों का परीक्षण" },
    { code: "9", labelEn: "9. Hospital/clinical referrals (OI management, side effects, general ailment, TB, STI treatment)", labelHi: "9. अस्पताल/क्लिनिकल रेफरल (ओआई प्रबंधन, दुष्प्रभाव, सामान्य बीमारी, टीबी, एसटीआई उपचार)" },
    { code: "10", labelEn: "10. Support for legal aid", labelHi: "10. कानूनी सहायता के लिए समर्थन" },
    { code: "11", labelEn: "11. Social protection", labelHi: "11. सामाजिक सुरक्षा" },
    { code: "12", labelEn: "12. Social entitlements", labelHi: "12. सामाजिक अधिकार" },
    { code: "13", labelEn: "13. Others (specify in remarks)", labelHi: "13. अन्य (टिप्पणी में विवरण दें)" },
  ],'''

# 6. Update j5_purpose
old_j5 = '''  "j5_purpose": [
    { code: "1", labelEn: "Counselling", labelHi: "परामर्श" },
    { code: "2", labelEn: "Support group meeting", labelHi: "सहायता समूह बैठक" },
    { code: "3", labelEn: "LFU tracked back to ART", labelHi: "LFU को एआरटी से पुनः जोड़ा गया" },
    { code: "4", labelEn: "Missed case follow up", labelHi: "छूटे हुए मामलों का फ़ॉलोअप" },
    { code: "5", labelEn: "Pre-ART registration", labelHi: "प्री-एआरटी पंजीकरण" },
    { code: "6", labelEn: "CD4 follow up", labelHi: "सीडी4 फ़ॉलोअप" },
    { code: "7", labelEn: "Link to TI", labelHi: "TI से जोड़ना" },
    { code: "8", labelEn: "Testing of partner/spouse, children and family member", labelHi: "साथी/पति-पत्नी, बच्चों और परिवार के सदस्यों का परीक्षण" },
    { code: "9", labelEn: "Hospital/clinical referrals (OI management, side effects, general ailment, TB, STI treatment)", labelHi: "अस्पताल/क्लिनिक रेफरल (ओआई प्रबंधन, दुष्प्रभाव, सामान्य बीमारी, टीबी, एसटीआई उपचार)" },
    { code: "10", labelEn: "Support for legal aid", labelHi: "कानूनी सहायता के लिए समर्थन" },
    { code: "11", labelEn: "Social protection", labelHi: "सामाजिक सुरक्षा" },
    { code: "12", labelEn: "Social entitlements", labelHi: "सामाजिक अधिकार" },
    { code: "13", labelEn: "Others (specify in remarks)", labelHi: "अन्य (टिप्पणी में विवरण दें)" },
  ],'''

new_j5 = '''  "j5_purpose": [
    { code: "1", labelEn: "1. Counselling", labelHi: "1. परामर्श" },
    { code: "2", labelEn: "2. Support group meeting", labelHi: "2. सहायता समूह बैठक" },
    { code: "3", labelEn: "3. LFU tracked back to ART", labelHi: "3. LFU को एआरटी से पुनः जोड़ा गया" },
    { code: "4", labelEn: "4. Missed case follow up", labelHi: "4. छूटे हुए मामलों का फ़ॉलोअप" },
    { code: "5", labelEn: "5. Pre-ART registration", labelHi: "5. प्री-एआरटी पंजीकरण" },
    { code: "6", labelEn: "6. CD4 follow up", labelHi: "6. सीडी4 फ़ॉलोअप" },
    { code: "7", labelEn: "7. Link to TI", labelHi: "7. TI से जोड़ना" },
    { code: "8", labelEn: "8. Testing of partner/spouse, children and family member", labelHi: "8. साथी/पति-पत्नी, बच्चों और परिवार के सदस्यों का परीक्षण" },
    { code: "9", labelEn: "9. Hospital/clinical referrals (OI management, side effects, general ailment, TB, STI treatment)", labelHi: "9. अस्पताल/क्लिनिकल रेफरल (ओआई प्रबंधन, दुष्प्रभाव, सामान्य बीमारी, टीबी, एसटीआई उपचार)" },
    { code: "10", labelEn: "10. Support for legal aid", labelHi: "10. कानूनी सहायता के लिए समर्थन" },
    { code: "11", labelEn: "11. Social protection", labelHi: "11. सामाजिक सुरक्षा" },
    { code: "12", labelEn: "12. Social entitlements", labelHi: "12. सामाजिक अधिकार" },
    { code: "13", labelEn: "13. Others (specify in remarks)", labelHi: "13. अन्य (टिप्पणी में विवरण दें)" },
  ],'''

# 7. Add re14 to svc
old_re = '''    { code: "re13", labelEn: "R-E-13 Post office account", labelHi: "R-E-13 डाकघर खाता" },'''
new_re = '''    { code: "re13", labelEn: "R-E-13 Post office account", labelHi: "R-E-13 डाकघर खाता" },
    { code: "re14", labelEn: "R-E-14 Others (specify in remarks)", labelHi: "R-E-14 अन्य (टिप्पणी में विवरण दें)" },'''

# 8. Update d1a_services choiceList to sws
old_d1a = '''      {
        name: "d1a_services",
        type: "select_multiple",
        labelEn: "Which services were availed?",
        labelHi: "कौन सी सेवाएं मिलीं?",
        choiceList: "schemes_linked",
        required: true,
        relevant: "${d1_linked}='yes'",
      },'''

new_d1a = '''      {
        name: "d1a_services",
        type: "select_multiple",
        labelEn: "Which Social Welfare Schemes were availed?",
        labelHi: "किन सामाजिक कल्याण योजनाओं का लाभ उठाया गया?",
        choiceList: "sws",
        required: true,
        relevant: "${d1_linked}='yes'",
      },'''

# Standardize line endings to \n for replacement
orig_crlf = '\r\n' in content
c_clean = content.replace('\r\n', '\n')

replacements = [
    (old_disc, new_disc),
    (old_disc_i, new_disc_i),
    (old_ent, new_ent),
    (old_se_status, new_se_status),
    (old_purpose, new_purpose),
    (old_j5, new_j5),
    (old_re, new_re),
    (old_d1a, new_d1a),
]

for old, new in replacements:
    old_c = old.replace('\r\n', '\n')
    new_c = new.replace('\r\n', '\n')
    if old_c in c_clean:
        c_clean = c_clean.replace(old_c, new_c, 1)
        print("Replaced successfully")
    else:
        print("FAILED to find block:", old_c[:40])

if orig_crlf:
    c_clean = c_clean.replace('\n', '\r\n')

with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as f:
    f.write(c_clean)

print("Done updating crfDefinitions.ts")
