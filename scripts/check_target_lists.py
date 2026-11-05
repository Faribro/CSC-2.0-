import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = \{([\s\S]*?)\n\};', text)
body = m.group(1)

def get_list(name):
    bm = re.search(r'"' + name + r'":\s*\[([\s\S]*?)\]', body)
    if not bm:
        return []
    items = re.findall(r'code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"', bm.group(1))
    return items

for lst_name in ['purpose', 'sws', 'se_status', 'disc_from', 'disc_from_i', 'schemes_linked', 'entitlements']:
    items = get_list(lst_name)
    print(f'=== {lst_name} ({len(items)} items) ===')
    for code, en, hi in items:
        print(f'  {code}: {en} | {hi}')
    print()
