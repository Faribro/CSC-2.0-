import json
import re

with open('scripts/survey_questions.json', encoding='utf-8') as f:
    questions = json.load(f)

with open('scripts/choices.json', encoding='utf-8') as f:
    choices = json.load(f)

# Regex to strip emojis completely
EMOJI_REGEX = re.compile(
    r'[\U00010000-\U0010ffff]|[\u200d\u20e3\ufe0f]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50\u2b55\u2934\u2935]|[\u25aa-\u25fe]|[\u3030\u303d]|[\u3297\u3299]'
)

def clean(text):
    if not text:
        return ''
    t = str(text)
    t = re.sub(r'<[^>]+>', '', t)
    t = EMOJI_REGEX.sub('', t)
    t = t.replace('&nbsp;', ' ')
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

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
ts_lines.append('  type: string;')
ts_lines.append('  labelEn: string;')
ts_lines.append('  labelHi: string;')
ts_lines.append('  hintEn?: string;')
ts_lines.append('  hintHi?: string;')
ts_lines.append('  choiceList?: string;')
ts_lines.append('  required?: boolean;')
ts_lines.append('  relevant?: string;')
ts_lines.append('  constraint?: string;')
ts_lines.append('  constraintMsgEn?: string;')
ts_lines.append('  constraintMsgHi?: string;')
ts_lines.append('}\n')

ts_lines.append('export interface CrfSectionDef {')
ts_lines.append('  id: string;')
ts_lines.append('  code: string;')
ts_lines.append('  titleEn: string;')
ts_lines.append('  titleHi: string;')
ts_lines.append('  iconName: string;')
ts_lines.append('  fields: CrfField[];')
ts_lines.append('}\n')

# Output CHOICE_LISTS
ts_lines.append('export const CHOICE_LISTS: Record<string, ChoiceOption[]> = {')
for list_name, opts in sorted(choices.items()):
    ts_lines.append(f'  "{list_name}": [')
    for opt in opts:
        code_esc = opt["name"].replace('\\', '\\\\').replace('"', '\\"')
        en_esc = clean(opt["label_en"]).replace('\\', '\\\\').replace('"', '\\"')
        hi_esc = clean(opt["label_hi"]).replace('\\', '\\\\').replace('"', '\\"')
        ts_lines.append(f'    {{ code: "{code_esc}", labelEn: "{en_esc}", labelHi: "{hi_esc}" }},')
    ts_lines.append('  ],')
ts_lines.append('};\n')

# Categorize questions into sections A through J
SECTION_METAS = [
    {"code": "A", "id": "sec-a", "titleEn": "A. Basic Profile", "titleHi": "A. बुनियादी प्रोफ़ाइल", "icon": "User"},
    {"code": "B", "id": "sec-b", "titleEn": "B. Family History", "titleHi": "B. परिवार का विवरण", "icon": "Users"},
    {"code": "C", "id": "sec-c", "titleEn": "C. Testing & Treatment", "titleHi": "C. परीक्षण और उपचार", "icon": "Activity"},
    {"code": "D", "id": "sec-d", "titleEn": "D. Social Protection & Entitlements", "titleHi": "D. सामाजिक सुरक्षा और योजनाएं", "icon": "ShieldCheck"},
    {"code": "E", "id": "sec-e", "titleEn": "E. Key Population & Risk Profile", "titleHi": "E. मुख्य जनसंख्या और जोखिम प्रोफ़ाइल", "icon": "AlertCircle"},
    {"code": "F", "id": "sec-f", "titleEn": "F. Stigma & Discrimination", "titleHi": "F. कलंक और भेदभाव", "icon": "ShieldAlert"},
    {"code": "G", "id": "sec-g", "titleEn": "G. Disability Information", "titleHi": "G. विकलांगता मूल्यांकन", "icon": "Accessibility"},
    {"code": "H", "id": "sec-h", "titleEn": "H. Out-Migration / Death", "titleHi": "H. प्रवास / मृत्यु सूचना", "icon": "Flag"},
    {"code": "J", "id": "sec-j", "titleEn": "J. CRF Verification & Declarations", "titleHi": "J. सत्यापन और घोषणाएं", "icon": "CheckCircle2"}
]

# Map each question to a section
def get_section_code(name):
    if not name: return None
    n = name.lower()
    if n.startswith(('a0', 'a1', 'a_')): return 'A'
    if n.startswith(('b1', 'b2', 'b3', 'b4', 'b_')): return 'B'
    if n.startswith(('c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c_')): return 'C'
    if n.startswith(('d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd_')): return 'D'
    if n.startswith(('e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e_')): return 'E'
    if n.startswith(('f0', 'f1', 'f2', 'f_')): return 'F'
    if n.startswith(('g0', 'g1', 'g2', 'g3', 'g4', 'g_')): return 'G'
    if n.startswith(('h0', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h_')): return 'H'
    if n.startswith(('j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j_')): return 'J'
    return None

sections_data = {m['code']: [] for m in SECTION_METAS}

for q in questions:
    t = q.get('type') or ''
    name = q.get('name') or ''
    if not name or t in ['start', 'end', 'today', 'deviceid', 'phonenumber']:
        continue
    if t.startswith(('begin_group', 'end_group', 'begin_repeat', 'end_repeat')):
        continue
    
    sec_code = get_section_code(name)
    if not sec_code or sec_code not in sections_data:
        continue
    
    choice_list = None
    field_type = t
    if t.startswith('select_one '):
        field_type = 'select_one'
        choice_list = t.split()[1].strip()
    elif t.startswith('select_multiple '):
        field_type = 'select_multiple'
        choice_list = t.split()[1].strip()

    sections_data[sec_code].append({
        'name': name,
        'type': field_type,
        'labelEn': clean(q.get('label::English (en)')),
        'labelHi': clean(q.get('label::Hindi (hi)')),
        'hintEn': clean(q.get('hint::English (en)')),
        'hintHi': clean(q.get('hint::Hindi (hi)')),
        'choiceList': choice_list,
        'required': str(q.get('required', '')).lower() in ['yes', 'true'],
        'relevant': q.get('relevant'),
        'constraint': q.get('constraint'),
        'constraintMsgEn': clean(q.get('constraint_message::English (en)')),
        'constraintMsgHi': clean(q.get('constraint_message::Hindi (hi)')),
    })

ts_lines.append('export const REGISTRATION_SECTIONS: CrfSectionDef[] = [')
for meta in SECTION_METAS:
    fields = sections_data[meta['code']]
    ts_lines.append('  {')
    ts_lines.append(f'    id: "{meta["id"]}",')
    ts_lines.append(f'    code: "{meta["code"]}",')
    ts_lines.append(f'    titleEn: "{meta["titleEn"]}",')
    ts_lines.append(f'    titleHi: "{meta["titleHi"]}",')
    ts_lines.append(f'    iconName: "{meta["icon"]}",')
    ts_lines.append('    fields: [')
    for f in fields:
        name_esc = f["name"].replace('"', '\\"')
        t_esc = f["type"].replace('"', '\\"')
        en_esc = f["labelEn"].replace('\\', '\\\\').replace('"', '\\"')
        hi_esc = f["labelHi"].replace('\\', '\\\\').replace('"', '\\"')
        hint_en = f["hintEn"].replace('\\', '\\\\').replace('"', '\\"') if f["hintEn"] else ""
        hint_hi = f["hintHi"].replace('\\', '\\\\').replace('"', '\\"') if f["hintHi"] else ""
        cl_esc = f'"{f["choiceList"]}"' if f["choiceList"] else 'undefined'
        rel_esc = f'"{f["relevant"]}"' if f["relevant"] else 'undefined'
        con_esc = f'"{f["constraint"]}"' if f["constraint"] else 'undefined'
        cmsg_en = f'"{f["constraintMsgEn"]}"' if f["constraintMsgEn"] else 'undefined'
        cmsg_hi = f'"{f["constraintMsgHi"]}"' if f["constraintMsgHi"] else 'undefined'
        req_val = 'true' if f["required"] else 'false'

        ts_lines.append('      {')
        ts_lines.append(f'        name: {json.dumps(f["name"])},')
        ts_lines.append(f'        type: {json.dumps(f["type"])},')
        ts_lines.append(f'        labelEn: {json.dumps(f["labelEn"], ensure_ascii=False)},')
        ts_lines.append(f'        labelHi: {json.dumps(f["labelHi"], ensure_ascii=False)},')
        if f["hintEn"]: ts_lines.append(f'        hintEn: {json.dumps(f["hintEn"], ensure_ascii=False)},')
        if f["hintHi"]: ts_lines.append(f'        hintHi: {json.dumps(f["hintHi"], ensure_ascii=False)},')
        if f["choiceList"]: ts_lines.append(f'        choiceList: {json.dumps(f["choiceList"])},')
        if f["required"]: ts_lines.append('        required: true,')
        if f["relevant"]: ts_lines.append(f'        relevant: {json.dumps(f["relevant"])},')
        if f["constraint"]: ts_lines.append(f'        constraint: {json.dumps(f["constraint"])},')
        if f["constraintMsgEn"]: ts_lines.append(f'        constraintMsgEn: {json.dumps(f["constraintMsgEn"], ensure_ascii=False)},')
        if f["constraintMsgHi"]: ts_lines.append(f'        constraintMsgHi: {json.dumps(f["constraintMsgHi"], ensure_ascii=False)},')
        ts_lines.append('      },')
    ts_lines.append('    ],')
    ts_lines.append('  },')
ts_lines.append('];\n')

with open('frontend/lib/crfDefinitions.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(ts_lines))

print(f"Generated frontend/lib/crfDefinitions.ts with {sum(len(s) for s in sections_data.values())} total fields and {len(choices)} choice lists.")
