import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Parse sections
sec_pattern = r'id:\s*\"([^\"]+)\",\s*code:\s*\"([^\"]+)\",\s*titleEn:\s*\"([^\"]+)\"[\s\S]*?fields:\s*\[([\s\S]*?)\n    \]'
matches = list(re.finditer(sec_pattern, text))

for m in matches:
    sec_id = m.group(1)
    code = m.group(2)
    title = m.group(3)
    field_block = m.group(4)
    fields = re.findall(r'name:\s*\"([^\"]+)\",\s*type:\s*\"([^\"]+)\"(?:,\s*labelEn:\s*\"([^\"]+)\")?(?:[\s\S]*?choiceList:\s*\"([^\"]+)\")?', field_block)
    print(f'=== Section [{code}] {title} ({len(fields)} fields) ===')
    for fname, ftype, flabel, fcl in fields:
        cl_str = f' -> choiceList: {fcl}' if fcl else ''
        print(f'  {fname} ({ftype}): {flabel or ""}{cl_str}')
    print()
