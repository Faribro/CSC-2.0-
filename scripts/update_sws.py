# Update sws in crfDefinitions.ts to match Image 3 Table 1
with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_sws = '''  "sws": [
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
  ],'''

new_sws = '''  "sws": [
    { code: "w1a", labelEn: "1a. Swarnajayanti Gram Swarozgar Yojana (SGSY)", labelHi: "1a. स्वर्णजयंती ग्राम स्वरोजगार योजना (SGSY)" },
    { code: "w1b", labelEn: "1b. Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)", labelHi: "1b. महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार गारंटी अधिनियम (MGNREGA)" },
    { code: "w1c", labelEn: "1c. Other income generation activity", labelHi: "1c. अन्य आय सृजन गतिविधि" },
    { code: "w2a", labelEn: "2a. Sarva Siksha Abhiyan (SSA)", labelHi: "2a. सर्व शिक्षा अभियान (SSA)" },
    { code: "w2b", labelEn: "2b. Indira Gandhi Matritva Sahyog Yojana (IGMSY)", labelHi: "2b. इंदिरा गांधी मातृत्व सहयोग योजना (IGMSY)" },
    { code: "w2c", labelEn: "2c. Other education support (ICDS)", labelHi: "2c. अन्य शिक्षा सहायता (ICDS)" },
    { code: "w3a", labelEn: "3a. Antyodaya Anna Yojana (AAY)", labelHi: "3a. अंत्योदय अन्न योजना (AAY)" },
    { code: "w3b", labelEn: "3b. Integrated Child Development Scheme (ICDS)", labelHi: "3b. समेकित बाल विकास योजना (ICDS)" },
    { code: "w3c", labelEn: "3c. Other nutritional schemes", labelHi: "3c. अन्य पोषण योजनाएं" },
    { code: "w4a", labelEn: "4a. Indira Gandhi National Widow Pension Scheme (IGNWPS)", labelHi: "4a. इंदिरा गांधी राष्ट्रीय विधवा पेंशन योजना (IGNWPS)" },
    { code: "w4b", labelEn: "4b. Sanjay Gandhi Pension Yojna (SGPY)", labelHi: "4b. संजय गांधी पेंशन योजना (SGPY)" },
    { code: "w4c", labelEn: "4c. Other pension schemes", labelHi: "4c. अन्य पेंशन योजनाएं" },
    { code: "w5a", labelEn: "5a. Janani Suraksha Yojana (JSY)", labelHi: "5a. जननी सुरक्षा योजना (JSY)" },
    { code: "w5b", labelEn: "5b. Rashtriya Swasthya Bima Yojana (RSBY)", labelHi: "5b. राष्ट्रीय स्वास्थ्य बीमा योजना (RSBY)" },
    { code: "w5c", labelEn: "5c. Other health related schemes", labelHi: "5c. अन्य स्वास्थ्य संबंधी योजनाएं" },
    { code: "w6a", labelEn: "6a. District Legal Service Authority (DALSA)", labelHi: "6a. जिला विधिक सेवा प्राधिकरण (DALSA)" },
    { code: "w6b", labelEn: "6b. Other Legal Support", labelHi: "6b. अन्य कानूनी सहायता" },
    { code: "w7a", labelEn: "7a. Integrated Child Protection Scheme (ICPS)", labelHi: "7a. समेकित बाल संरक्षण योजना (ICPS)" },
    { code: "w7b", labelEn: "7b. Other children schemes", labelHi: "7b. अन्य बाल योजनाएं" },
    { code: "w8", labelEn: "8. Adolescent schemes", labelHi: "8. किशोर योजनाएं" },
    { code: "w9", labelEn: "9. Women specific schemes", labelHi: "9. महिलाओं के लिए विशेष योजनाएं" },
    { code: "w10", labelEn: "10. CLHIV provided education & nutritional assistance", labelHi: "10. सीएलएचआईवी को प्रदान की गई शिक्षा एवं पोषण सहायता" },
    { code: "w11", labelEn: "11. CLHIV linked to care homes", labelHi: "11. सीएलएचआईवी को देखभाल गृहों से जोड़ा गया" },
    { code: "w12", labelEn: "12. Others", labelHi: "12. अन्य" },
  ],'''

orig_crlf = '\r\n' in content
c_clean = content.replace('\r\n', '\n')
old_clean = old_sws.replace('\r\n', '\n')
new_clean = new_sws.replace('\r\n', '\n')

if old_clean in c_clean:
    c_clean = c_clean.replace(old_clean, new_clean, 1)
    if orig_crlf:
        c_clean = c_clean.replace('\n', '\r\n')
    with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as f:
        f.write(c_clean)
    print("SWS updated successfully!")
else:
    print("Could not find old_sws in crfDefinitions.ts")
