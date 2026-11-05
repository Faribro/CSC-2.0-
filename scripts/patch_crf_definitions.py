import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Patch crfDefinitions.ts
with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Update artstat
text = text.replace(
    '  "artstat": [\n    { code: "1", labelEn: "Not on ART", labelHi: "एआरटी पर नहीं" },',
    '  "artstat": [\n    { code: "1", labelEn: "Pre-ART", labelHi: "प्री-एआरटी" },'
)
text = text.replace(
    '  "artstat": [\r\n    { code: "1", labelEn: "Not on ART", labelHi: "एआरटी पर नहीं" },',
    '  "artstat": [\r\n    { code: "1", labelEn: "Pre-ART", labelHi: "प्री-एआरटी" },'
)

# Update disc_from
disc_from_target = '''  "disc_from": [
    { code: "1", labelEn: "Health facilities", labelHi: "स्वास्थ्य सुविधाएं" },
    { code: "2", labelEn: "Local goondas / anti-social elements", labelHi: "स्थानीय असामाजिक तत्व" },
    { code: "3", labelEn: "Workplace", labelHi: "कार्यस्थल" },
    { code: "4", labelEn: "Social gathering", labelHi: "सामाजिक कार्यक्रम" },
    { code: "5", labelEn: "Family members", labelHi: "परिवार के सदस्य" },
  ],'''

disc_from_replacement = '''  "disc_from": [
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

text = text.replace(disc_from_target.replace('\n', '\r\n'), disc_from_replacement.replace('\n', '\r\n'))
text = text.replace(disc_from_target, disc_from_replacement)

# Update entitlements
entitlements_target = '''  "entitlements": [
    { code: "1", labelEn: "Ration Card", labelHi: "राशन कार्ड" },
    { code: "2", labelEn: "Passport", labelHi: "पासपोर्ट" },
    { code: "3", labelEn: "Birth Certificate", labelHi: "जन्म प्रमाण पत्र" },
    { code: "4", labelEn: "Income Certificate", labelHi: "आय प्रमाण पत्र" },
    { code: "5", labelEn: "Post Office Account", labelHi: "डाकघर खाता" },
    { code: "6", labelEn: "PAN Card", labelHi: "पैन कार्ड" },
    { code: "7", labelEn: "Voter ID", labelHi: "मतदाता पहचान पत्र" },
    { code: "8", labelEn: "Death Certificate", labelHi: "मृत्यु प्रमाण पत्र" },
    { code: "9", labelEn: "Legal Heir Certificate", labelHi: "वैध उत्तराधिकारी प्रमाण पत्र" },
    { code: "10", labelEn: "Bank Account", labelHi: "बैंक खाता" },
    { code: "11", labelEn: "Aadhaar Card", labelHi: "आधार कार्ड" },
    { code: "12", labelEn: "Caste Certificate", labelHi: "जाति प्रमाण पत्र" },
    { code: "13", labelEn: "Marriage Certificate", labelHi: "विवाह प्रमाण पत्र" },
    { code: "14", labelEn: "Disability Certificate", labelHi: "दिव्यांगता प्रमाण पत्र" },
    { code: "15", labelEn: "Other (specify)", labelHi: "अन्य (विवरण दें)" },
  ],'''

entitlements_replacement = '''  "entitlements": [
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

text = text.replace(entitlements_target.replace('\n', '\r\n'), entitlements_replacement.replace('\n', '\r\n'))
text = text.replace(entitlements_target, entitlements_replacement)

# Update se_status to include 14
se_target = '''    { code: "13", labelEn: "Post office account", labelHi: "डाकघर खाता" },
  ],'''
se_replacement = '''    { code: "13", labelEn: "Post office account", labelHi: "डाकघर खाता" },
    { code: "14", labelEn: "Other (specify)", labelHi: "अन्य (विवरण दें)" },
  ],'''
text = text.replace(se_target.replace('\n', '\r\n'), se_replacement.replace('\n', '\r\n'))
text = text.replace(se_target, se_replacement)

# Update typ_other to include migrant and trucker
typ_target = '''  "typ_other": [
    { code: "inmate", labelEn: "Inmates or OCS", labelHi: "बंदी या ओसीएस" },
    { code: "anc", labelEn: "ANC", labelHi: "ANC" },
    { code: "others", labelEn: "Others", labelHi: "अन्य" },
    { code: "na", labelEn: "NA", labelHi: "लागू नहीं" },
  ],'''

typ_replacement = '''  "typ_other": [
    { code: "migrant", labelEn: "Migrants", labelHi: "प्रवासी" },
    { code: "trucker", labelEn: "Truckers", labelHi: "ट्रक चालक" },
    { code: "inmate", labelEn: "Inmates or OCS", labelHi: "बंदी या ओसीएस" },
    { code: "anc", labelEn: "ANC", labelHi: "ANC" },
    { code: "others", labelEn: "Others", labelHi: "अन्य" },
    { code: "na", labelEn: "NA", labelHi: "लागू नहीं" },
  ],'''

text = text.replace(typ_target.replace('\n', '\r\n'), typ_replacement.replace('\n', '\r\n'))
text = text.replace(typ_target, typ_replacement)

# Add d5_scheme and j5_purpose to CHOICE_LISTS before yndk
yndk_target = '  "yndk": ['
aliases_block = '''  "d5_scheme": [
    { code: "w1a", labelEn: "Swarnajayanti Gram Swarozgar Yojana (SGSY)", labelHi: "स्वर्णजयंती ग्राम स्वरोजगार योजना (SGSY)" },
    { code: "w1b", labelEn: "Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)", labelHi: "महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार गारंटी अधिनियम (MGNREGA)" },
    { code: "w1c", labelEn: "Other income generation activity", labelHi: "अन्य आय सृजन गतिविधि" },
    { code: "w2a", labelEn: "Sarva Shiksha Abhiyan (SSA)", labelHi: "सर्व शिक्षा अभियान (SSA)" },
    { code: "w2b", labelEn: "Indira Gandhi Matritva Sahyog Yojana (IGMSY)", labelHi: "इंदिरा गांधी मातृत्व सहयोग योजना (IGMSY)" },
    { code: "w2c", labelEn: "Other education support (ICDS)", labelHi: "अन्य शिक्षा सहायता (ICDS)" },
    { code: "w3a", labelEn: "Antyodaya Anna Yojana (AAY)", labelHi: "अंत्योदय अन्न योजना (AAY)" },
    { code: "w3b", labelEn: "Integrated Child Development Scheme (ICDS)", labelHi: "समेकित बाल विकास योजना (ICDS)" },
    { code: "w3c", labelEn: "Other nutritional schemes", labelHi: "अन्य पोषण योजनाएं" },
    { code: "w4a", labelEn: "Indira Gandhi National Widow Pension Scheme (IGNWPS)", labelHi: "इंदिरा गांधी राष्ट्रीय विधवा पेंशन योजना (IGNWPS)" },
    { code: "w4b", labelEn: "Sanjay Gandhi Pension Yojana (SGPY)", labelHi: "संजय गांधी पेंशन योजना (SGPY)" },
    { code: "w4c", labelEn: "Other pension schemes", labelHi: "अन्य पेंशन योजनाएं" },
    { code: "w5a", labelEn: "Janani Suraksha Yojana (JSY)", labelHi: "जननी सुरक्षा योजना (JSY)" },
    { code: "w5b", labelEn: "Rashtriya Swasthya Bima Yojana (RSBY)", labelHi: "राष्ट्रीय स्वास्थ्य बीमा योजना (RSBY)" },
    { code: "w5c", labelEn: "Other health related schemes", labelHi: "अन्य स्वास्थ्य संबंधी योजनाएं" },
    { code: "w6a", labelEn: "District Legal Services Authority (DLSA)", labelHi: "जिला विधिक सेवा प्राधिकरण (DLSA)" },
    { code: "w6b", labelEn: "Other legal support", labelHi: "अन्य कानूनी सहायता" },
    { code: "w7a", labelEn: "Integrated Child Protection Scheme (ICPS)", labelHi: "समेकित बाल संरक्षण योजना (ICPS)" },
    { code: "w7b", labelEn: "Other children schemes", labelHi: "अन्य बाल योजनाएं" },
    { code: "w8", labelEn: "Adolescent schemes", labelHi: "किशोर योजनाएं" },
    { code: "w9", labelEn: "Women specific schemes", labelHi: "महिलाओं के लिए विशेष योजनाएं" },
    { code: "w10", labelEn: "CLHIV provided education & nutritional assistance", labelHi: "सीएलएचआईवी को प्रदान की गई शिक्षा एवं पोषण सहायता" },
    { code: "w11", labelEn: "CLHIV linked to care homes", labelHi: "सीएलएचआईवी को देखभाल गृहों से जोड़ा गया" },
    { code: "w12", labelEn: "Others", labelHi: "अन्य" },
  ],
  "j5_purpose": [
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
  ],
  "yndk": ['''

text = text.replace(yndk_target, aliases_block)

# In Section H, change h7_lfu choiceList to yn
text = text.replace(
    '        name: "h7_lfu",\n        type: "select_one",\n        labelEn: "H7. Was the client in MIS / LFU line list?",\n        labelHi: "H7. क्या क्लाइंट MIS / LFU सूची में था/थी?",\n        choiceList: "mis_lfu",',
    '        name: "h7_lfu",\n        type: "select_one",\n        labelEn: "H7. Was the client in MIS / LFU line list?",\n        labelHi: "H7. क्या क्लाइंट MIS / LFU सूची में था/थी?",\n        choiceList: "yn",'
)
text = text.replace(
    '        name: "h7_lfu",\r\n        type: "select_one",\r\n        labelEn: "H7. Was the client in MIS / LFU line list?",\r\n        labelHi: "H7. क्या क्लाइंट MIS / LFU सूची में था/थी?",\r\n        choiceList: "mis_lfu",',
    '        name: "h7_lfu",\r\n        type: "select_one",\r\n        labelEn: "H7. Was the client in MIS / LFU line list?",\r\n        labelHi: "H7. क्या क्लाइंट MIS / LFU सूची में था/थी?",\r\n        choiceList: "yn",'
)

with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('crfDefinitions.ts patched successfully!')
