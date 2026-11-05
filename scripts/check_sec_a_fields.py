import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# find all field definitions in Section A
sec_a = re.search(r'id:\s*\"sec-a\"[\s\S]*?fields:\s*\[([\s\S]*?)\n    \]', text)
if sec_a:
    fields = re.findall(r'name:\s*\"([^\"]+)\",\s*type:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"', sec_a.group(1))
    for n, t, l in fields:
        print(f'{n} ({t}): {l}')
