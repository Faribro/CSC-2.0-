import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'"svc":\s*\[([\s\S]*?)\]\s*,', text)
if not m:
    print('Could not find svc list')
    exit(1)

items = re.findall(r'code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"', m.group(1))
print(f'Total services in svc: {len(items)}')

cats = {}
for code, en, hi in items:
    prefix = code.split('-')[0] if '-' in code else code[:2]
    cats.setdefault(prefix, []).append((code, en, hi))

for cat, slist in cats.items():
    print(f'\nCategory {cat}: {len(slist)} items')
    for code, en, hi in slist:
        print(f'   {code:10} | {en} | {hi}')
