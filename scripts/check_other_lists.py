import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

def print_list(name):
    m = re.search(r'\"' + name + r'\":\s*\[([\s\S]*?)\]\s*,', text)
    if m:
        opts = re.findall(r'\{\s*code:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"(?:,\s*labelHi:\s*\"([^\"]+)\")?', m.group(1))
        print(f'=== {name} ({len(opts)} options) ===')
        for c, en, hi in opts:
            print(f'  {c}: {en} | {hi}')
    else:
        print(f'List {name} not found!')

for name in ['place', 'gender', 'relation', 'living', 'hivstat', 'artstat', 'idtype', 'route', 'artc_type', 'tb_status', 'who', 'death_reason', 'death_place', 'disability']:
    print_list(name)
