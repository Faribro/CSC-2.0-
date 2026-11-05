import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

def get_choices(key):
    m = re.search(r'"' + key + r'":\s*\[([\s\S]*?)\]\s*,', text)
    if not m:
        return []
    return re.findall(r'code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"', m.group(1))

for k in ['education', 'occupation', 'marital', 'income', 'relation', 'living', 'hivstat', 'artstat', 'idtype', 'route', 'artc_type', 'tb_status', 'who', 'condom', 'subfreq', 'disability', 'death_reason', 'death_place']:
    items = get_choices(k)
    print(f'=== {k} ({len(items)}) ===')
    for code, en, hi in items:
        print(f'   {code:6} | {en} | {hi}')
