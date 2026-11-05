import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'"svc":\s*\[([\s\S]*?)\]\s*,', text)
items = re.findall(r'code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"', m.group(1))

re_items = [x for x in items if x[0].startswith('re')]
print(f'Category re: {len(re_items)} items')
for code, en, hi in re_items:
    print(f'   {code:10} | {en} | {hi}')
