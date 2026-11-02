# scripts/build_crf_definitions.py
# Compiles XLSForm sheets into frontend/lib/crfDefinitions.ts

import zipfile
import json
import re
import sys
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crf_fields_extracted.json', encoding='utf-8') as f:
    fields = json.load(f)
with open('frontend/lib/crf_choices_extracted.json', encoding='utf-8') as f:
    choices = json.load(f)

# Clean labels from HTML tags like <span style="...">
def clean_html(text):
    if not text:
        return ''
    cleaned = re.sub(r'<[^>]+>', '', text)
    return cleaned.replace('&nbsp;', ' ').strip()

# Build TypeScript module
ts_lines = []
ts_lines.append('// frontend/lib/crfDefinitions.ts')
ts_lines.append('// Canonical CRF Field & Choice Definitions generated from CSC2_CRF_KoboToolbox_XLSForm_v2.xlsx\n')

ts_lines.append('export interface ChoiceOption {')
ts_lines.append('  code: string;')
ts_lines.append('  labelEn: string;')
ts_lines.append('  labelHi: string;')
ts_lines.append('}\n')

ts_lines.append('export interface CrfField {')
ts_lines.append('  name: string;')
ts_lines.append('  type: "text" | "number" | "select_one" | "select_multiple" | "date" | "boolean" | "note" | "calculate";')
ts_lines.append('  labelEn: string;')
ts_lines.append('  labelHi: string;')
ts_lines.append('  hintEn?: string;')
ts_lines.append('  hintHi?: string;')
ts_lines.append('  choiceList?: string;')
ts_lines.append('  required?: boolean;')
ts_lines.append('  tag?: "[SOURCE]" | "[OPEN]" | "[PROPOSED]";')
ts_lines.append('  openWarning?: string;')
ts_lines.append('}\n')

ts_lines.append('export interface CrfSection {')
ts_lines.append('  id: string;')
ts_lines.append('  code: string;')
ts_lines.append('  titleEn: string;')
ts_lines.append('  titleHi: string;')
ts_lines.append('  fields: CrfField[];')
ts_lines.append('}\n')

# Output Choice Lists
ts_lines.append('export const CHOICE_LISTS: Record<string, ChoiceOption[]> = {')
for list_name, opts in sorted(choices.items()):
    ts_lines.append(f'  "{list_name}": [')
    for opt in opts:
        code_esc = opt["name"].replace('"', '\\"')
        en_esc = clean_html(opt["label_en"]).replace('"', '\\"')
        hi_esc = clean_html(opt["label_hi"]).replace('"', '\\"')
        ts_lines.append(f'    {{ code: "{code_esc}", labelEn: "{en_esc}", labelHi: "{hi_esc}" }},')
    ts_lines.append('  ],')
ts_lines.append('};\n')

# Sections categorization
SECTIONS = [
  {"id": "sec-a", "code": "A", "titleEn": "A. Basic Profile", "titleHi": "A. बुनियादी प्रोफ़ाइल", "prefix": ["a0", "a1", "a_"]},
  {"id": "sec-b", "code": "B", "titleEn": "B. Family Members", "titleHi": "B. परिवार के सदस्य", "prefix": ["b1", "b2", "b3", "b4", "b_"]},
  {"id": "sec-c", "code": "C", "titleEn": "C. Testing & Treatment", "titleHi": "C. परीक्षण और उपचार", "prefix": ["c0", "c1", "c_"]},
  {"id": "sec-d", "code": "D", "titleEn": "D. Social Protection & Schemes", "titleHi": "D. सामाजिक सुरक्षा और योजनाएं", "prefix": ["d0", "d1", "d2", "d3", "d4", "d5", "d_"]},
  {"id": "sec-e", "code": "E", "titleEn": "E. Key Population & Risk Profile", "titleHi": "E. मुख्य जनसंख्या और जोखिम प्रोफ़ाइल", "prefix": ["e0", "e1", "e_"]},
  {"id": "sec-f", "code": "F", "titleEn": "F. Stigma & Discrimination", "titleHi": "F. कलंक और भेदभाव", "prefix": ["f0", "f1", "f_"]},
  {"id": "sec-g", "code": "G", "titleEn": "G. Disability Assessment", "titleHi": "G. विकलांगता मूल्यांकन", "prefix": ["g0", "g1", "g_"]},
  {"id": "sec-h", "code": "H", "titleEn": "H. Out-Migration / Death", "titleHi": "H. प्रवास / मृत्यु", "prefix": ["h0", "h1", "h_"]},
  {"id": "sec-j", "code": "J", "titleEn": "J. CRF Verification & Document Declarations", "titleHi": "J. सत्यापन और दस्तावेज़ घोषणा", "prefix": ["j0", "j1", "j2", "j3", "j4", "j_"]}
]

# Field mapping helper
def map_type(raw_type):
    t = raw_type.split()[0].lower()
    if t == 'select_one': return 'select_one'
    if t == 'select_multiple': return 'select_multiple'
    if t in ['integer', 'decimal']: return 'number'
    if t == 'date': return 'date'
    if t == 'note': return 'note'
    if t == 'calculate': return 'calculate'
    return 'text'

# Build Section definitions
ts_lines.append('export const REGISTRATION_SECTIONS: CrfSection[] = [')

for sec in SECTIONS:
    ts_lines.append('  {')
    ts_lines.append(f'    id: "{sec["id"]}",')
    ts_lines.append(f'    code: "{sec["code"]}",')
    ts_lines.append(f'    titleEn: "{sec["titleEn"]}",')
    ts_lines.append(f'    titleHi: "{sec["titleHi"]}",')
    ts_lines.append('    fields: [')

    sec_fields = []
    for f in fields:
        name = f['name']
        ftype = f['type']
        if any(name.startswith(p) for p in sec["prefix"]):
            if ftype in ['begin_group', 'end_group', 'begin_repeat', 'end_repeat']:
                continue
            choice_list = ftype.split()[1] if 'select_' in ftype and len(ftype.split()) > 1 else ''
            
            # Clinical safety tag check
            tag = "[SOURCE]"
            warning = None
            if 'age' in name or 'limit' in name or 'risk' in name or 'threshold' in name or 'b3' in name or 'b4' in name:
                tag = "[OPEN]"
                warning = "Eligibility / threshold guideline subject to programmatic confirmation; shown as advisory warning."

            mapped_t = map_type(ftype)
            label_en = clean_html(f['label_en']).replace('"', '\\"')
            label_hi = clean_html(f['label_hi']).replace('"', '\\"')
            hint_en = clean_html(f['hint_en']).replace('"', '\\"')
            hint_hi = clean_html(f['hint_hi']).replace('"', '\\"')

            field_obj = f'      {{ name: "{name}", type: "{mapped_t}", labelEn: "{label_en}", labelHi: "{label_hi}", choiceList: "{choice_list}", required: {str(f["required"]).lower()}, tag: "{tag}"'
            if warning:
                field_obj += f', openWarning: "{warning}"'
            if hint_en:
                field_obj += f', hintEn: "{hint_en}"'
            if hint_hi:
                field_obj += f', hintHi: "{hint_hi}"'
            field_obj += ' },'
            ts_lines.append(field_obj)

    ts_lines.append('    ]')
    ts_lines.append('  },')

ts_lines.append('];\n')

# Section I & J5 definitions for Follow-Up Tab
ts_lines.append('export const FOLLOW_UP_SECTION_I: CrfField[] = [')
for f in fields:
    name = f['name']
    ftype = f['type']
    if name.startswith('i') and not ftype in ['begin_group', 'end_group', 'begin_repeat', 'end_repeat']:
        choice_list = ftype.split()[1] if 'select_' in ftype and len(ftype.split()) > 1 else ''
        mapped_t = map_type(ftype)
        label_en = clean_html(f['label_en']).replace('"', '\\"')
        label_hi = clean_html(f['label_hi']).replace('"', '\\"')
        ts_lines.append(f'  {{ name: "{name}", type: "{mapped_t}", labelEn: "{label_en}", labelHi: "{label_hi}", choiceList: "{choice_list}", required: {str(f["required"]).lower()}, tag: "[SOURCE]" }},')
ts_lines.append('];\n')

ts_lines.append('export const FOLLOW_UP_SECTION_J5: CrfField[] = [')
for f in fields:
    name = f['name']
    ftype = f['type']
    if name.startswith('j5') and not ftype in ['begin_group', 'end_group', 'begin_repeat', 'end_repeat']:
        choice_list = ftype.split()[1] if 'select_' in ftype and len(ftype.split()) > 1 else ''
        mapped_t = map_type(ftype)
        label_en = clean_html(f['label_en']).replace('"', '\\"')
        label_hi = clean_html(f['label_hi']).replace('"', '\\"')
        ts_lines.append(f'  {{ name: "{name}", type: "{mapped_t}", labelEn: "{label_en}", labelHi: "{label_hi}", choiceList: "{choice_list}", required: {str(f["required"]).lower()}, tag: "[SOURCE]" }},')
ts_lines.append('];\n')

with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as out:
    out.write('\n'.join(ts_lines))

print('Successfully written frontend/lib/crfDefinitions.ts')
