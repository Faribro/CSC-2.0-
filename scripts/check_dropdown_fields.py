import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect sections and their fields
field_blocks = re.findall(r'\{\s*name:\s*"([^"]+)",[\s\S]*?labelEn:\s*"([^"]+)",[\s\S]*?type:\s*"([^"]+)"([\s\S]*?)\}', text)

print(f'Total fields parsed: {len(field_blocks)}')

dropdown_fields = []
for name, label, ftype, rest in field_blocks:
    cl_match = re.search(r'choiceList:\s*"([^"]+)"', rest)
    choice_list = cl_match.group(1) if cl_match else None
    if ftype in ['select', 'radio', 'checkbox'] or choice_list:
        dropdown_fields.append((name, label, ftype, choice_list))

print(f'Dropdown/Select/Choice fields: {len(dropdown_fields)}')
for name, label, ftype, cl in dropdown_fields:
    print(f'{name:25} | {ftype:10} | choiceList: {str(cl):15} | {label}')
