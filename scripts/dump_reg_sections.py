import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect REGISTRATION_SECTIONS
reg_idx = text.find('export const REGISTRATION_SECTIONS')
reg_text = text[reg_idx:]

sections = re.findall(r'id:\s*"([^"]+)",\s*titleEn:\s*"([^"]+)",[\s\S]*?fields:\s*\[([\s\S]*?)\n\s*\]\s*\}', reg_text)

print(f'Total sections: {len(sections)}')

for sec_id, sec_title, fields_block in sections:
    print(f'\n==================== SECTION {sec_id}: {sec_title} ====================')
    # find field objects
    # match each { ... } block
    raw_fields = re.findall(r'\{\s*name:\s*"([^"]+)"([\s\S]*?)\}', fields_block)
    for fname, fcontent in raw_fields:
        len_m = re.search(r'labelEn:\s*"([^"]+)"', fcontent)
        len_val = len_m.group(1) if len_m else ''
        type_m = re.search(r'type:\s*"([^"]+)"', fcontent)
        type_val = type_m.group(1) if type_m else ''
        cl_m = re.search(r'choiceList:\s*"([^"]+)"', fcontent)
        cl_val = cl_m.group(1) if cl_m else ''
        print(f'  {fname:25} | {type_val:12} | {cl_val:15} | {len_val}')
