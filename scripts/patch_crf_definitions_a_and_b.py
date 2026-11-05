import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update A16 and A17 to be always visible without relevant restriction
old_a16_17 = '''      {
        name: "a16_caretaker",
        type: "select_one",
        labelEn: "A16. Who takes care of the child?",
        labelHi: "A16. बच्चे की देखभाल कौन करता है?",
        choiceList: "caretaker",
        required: true,
        relevant: "(${a04_age}<18)",
      },
      {
        name: "a17_orphan",
        type: "select_one",
        labelEn: "A17. Orphan status",
        labelHi: "A17. अनाथ स्थिति",
        choiceList: "orphan",
        required: true,
        relevant: "(${a04_age}<18)",
      },'''

new_a16_17 = '''      {
        name: "a16_caretaker",
        type: "select_one",
        labelEn: "A16. If the client is a child, who takes care of the child?",
        labelHi: "A16. यदि रोगी बच्चा है, तो उसकी देखभाल कौन कर रहा है?",
        hintEn: "Applicable only for children (Parent / Caregiver).",
        hintHi: "केवल बच्चों के लिए लागू (माता-पिता / देखभालकर्ता)।",
        choiceList: "caretaker",
      },
      {
        name: "a17_orphan",
        type: "select_one",
        labelEn: "A17. Orphan status (applicable only for children)",
        labelHi: "A17. अनाथ स्थिति (केवल बच्चों के लिए लागू)",
        hintEn: "Single orphan, Double orphan, or Not an orphan.",
        hintHi: "एकल अनाथ, दोहरे अनाथ, या अनाथ नहीं।",
        choiceList: "orphan",
      },'''

if old_a16_17.replace('\n', '\r\n') in text:
    text = text.replace(old_a16_17.replace('\n', '\r\n'), new_a16_17.replace('\n', '\r\n'))
    print('A16 and A17 replaced (CRLF).')
elif old_a16_17 in text:
    text = text.replace(old_a16_17, new_a16_17)
    print('A16 and A17 replaced (LF).')
else:
    print('Warning: old_a16_17 block not matched directly, checking partial...')

# 2. Add A20 and A21 right after a19_occupation_other
old_a19 = '''      {
        name: "a19_occupation_other",
        type: "text",
        labelEn: "Specify other occupation",
        labelHi: "अन्य व्यवसाय बताएं",
        required: true,
        relevant: "${a19_occupation}='14'",
      },
    ],
  },
  {
    id: "sec-b",'''

new_a19_and_a20_a21 = '''      {
        name: "a19_occupation_other",
        type: "text",
        labelEn: "Specify other occupation",
        labelHi: "अन्य व्यवसाय बताएं",
        required: true,
        relevant: "${a19_occupation}='14'",
      },
      {
        name: "a20_marital",
        type: "select_one",
        labelEn: "A20. Marital status",
        labelHi: "A20. वैवाहिक स्थिति",
        choiceList: "marital",
        required: true,
        hintEn: "Single, Married, Live-in, Divorced/Separated, Widow/Widower, or Not applicable (<15 yrs).",
        hintHi: "अविवाहित, विवाहित, बिना विवाह साथ, तलाकशुदा/अलग, विधवा/विधुर, या लागू नहीं (<15 वर्ष)।",
      },
      {
        name: "a21_income",
        type: "select_one",
        labelEn: "A21. Average monthly family income",
        labelHi: "A21. औसत मासिक पारिवारिक आय",
        choiceList: "income",
        required: true,
        hintEn: "Select monthly family income range.",
        hintHi: "मासिक पारिवारिक आय सीमा चुनें।",
      },
    ],
  },
  {
    id: "sec-b",'''

if old_a19.replace('\n', '\r\n') in text:
    text = text.replace(old_a19.replace('\n', '\r\n'), new_a19_and_a20_a21.replace('\n', '\r\n'))
    print('A20 and A21 added (CRLF).')
elif old_a19 in text:
    text = text.replace(old_a19, new_a19_and_a20_a21)
    print('A20 and A21 added (LF).')
else:
    print('Warning: old_a19 block not matched!')

# 3. Add B5 note to Section B
old_b4 = '''      {
        name: "b4_note",
        type: "note",
        labelEn: "B4. Eligible for ICTC referral: ${b4_total_ictc}",
        labelHi: "B4. ICTC रेफरल के लिए पात्र: ${b4_total_ictc}",
        hintEn: "Alive and HIV status not tested / unknown.",
        hintHi: "जीवित और एचआईवी स्थिति परीक्षण नहीं हुआ / अज्ञात।",
      },
    ],
  },
  {
    id: "sec-c",'''

new_b4_and_b5 = '''      {
        name: "b4_note",
        type: "note",
        labelEn: "B4. Eligible for ICTC referral: ${b4_total_ictc}",
        labelHi: "B4. ICTC रेफरल के लिए पात्र: ${b4_total_ictc}",
        hintEn: "Alive and HIV status not tested / unknown.",
        hintHi: "जीवित और एचआईवी स्थिति परीक्षण नहीं हुआ / अज्ञात।",
      },
      {
        name: "b5_note",
        type: "note",
        labelEn: "B5. Pick the number as per column heading to fill the data in the table: Living (1. Alive, 2. Dead), HIV Status (1. Positive, 2. Negative, 3. Not Tested, 4. Don't Know), ART Status (1. Pre-ART, 2. On-ART, 3. New PLHIV), Type of ID (1. Pre ART reg., 2. On ART reg., 3. ICTC PID No). If more than one partner, fill it in the child row.",
        labelHi: "B5. तालिका में जानकारी भरने के लिए कॉलम शीर्षक के अनुसार संख्या चुनें: जीवित स्थिति (1. जीवित, 2. मृत), एचआईवी स्थिति (1. पॉजिटिव, 2. नेगेटिव, 3. परीक्षण नहीं हुआ, 4. पता नहीं), एआरटी स्थिति (1. प्री-एआरटी, 2. एआरटी पर, 3. नया PLHIV), आईडी का प्रकार (1. प्री-एआरटी पंजीकरण, 2. एआरटी पंजीकरण, 3. ICTC पीआईडी संख्या)। यदि एक से अधिक साथी हों, तो उसे बच्चे की पंक्ति में भरें।",
      },
    ],
  },
  {
    id: "sec-c",'''

if old_b4.replace('\n', '\r\n') in text:
    text = text.replace(old_b4.replace('\n', '\r\n'), new_b4_and_b5.replace('\n', '\r\n'))
    print('B5 added (CRLF).')
elif old_b4 in text:
    text = text.replace(old_b4, new_b4_and_b5)
    print('B5 added (LF).')
else:
    print('Warning: old_b4 block not matched!')

with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('crfDefinitions.ts patch finished.')
