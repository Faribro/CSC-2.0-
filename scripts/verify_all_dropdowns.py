import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Parse CHOICE_LISTS
cl_match = re.search(r'export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = \{([\s\S]*?)\n\};', text)
cl_text = cl_match.group(1) if cl_match else ''
pattern = r'\"([a-zA-Z0-9_]+)\":\s*\['
matches = list(re.finditer(pattern, cl_text))

choice_lists = {}
for i, m in enumerate(matches):
    key = m.group(1)
    start = m.end()
    end = matches[i+1].start() if i+1 < len(matches) else len(cl_text)
    list_content = cl_text[start:end]
    options = re.findall(r'\{\s*code:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"(?:,\s*labelHi:\s*\"([^\"]+)\")?', list_content)
    choice_lists[key] = options

print(f'Parsed {len(choice_lists)} choice lists.')

# Find all field definitions in REGISTRATION_SECTIONS
# Each field has id, name, labelEn, labelHi, type, choiceList, etc.
field_blocks = re.findall(r'\{\s*id:\s*\"([^\"]+)\"([\s\S]*?)\}', text)

print(f'Parsed {len(field_blocks)} fields across sections.')

missing_choice_lists = []
select_fields = []
for fid, fbody in field_blocks:
    type_match = re.search(r'type:\s*\"([^\"]+)\"', fbody)
    ftype = type_match.group(1) if type_match else 'unknown'
    cl_match = re.search(r'choiceList:\s*\"([^\"]+)\"', fbody)
    cl_name = cl_match.group(1) if cl_match else None
    
    if cl_name:
        select_fields.append((fid, ftype, cl_name))
        if cl_name not in choice_lists:
            missing_choice_lists.append((fid, cl_name))

print(f'Total fields with choiceList: {len(select_fields)}')
if missing_choice_lists:
    print('WARNING: Missing choice lists!')
    for fid, cl in missing_choice_lists:
        print(f'  Field {fid} references missing choiceList: {cl}')
else:
    print('All referenced choice lists exist in CHOICE_LISTS!')

print('\nBreakdown of fields by choice list:')
from collections import defaultdict
by_cl = defaultdict(list)
for fid, ftype, cl in select_fields:
    by_cl[cl].append(fid)

for cl, fids in sorted(by_cl.items()):
    opts = choice_lists.get(cl, [])
    print(f'Choice list \"{cl}\" ({len(opts)} options) used by {len(fids)} field(s): {fids[:4]} {"..." if len(fids)>4 else ""}')
