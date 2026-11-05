import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract CHOICE_LISTS object
m = re.search(r'export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = \{([\s\S]*?)\n\};', text)
if not m:
    print('Could not find CHOICE_LISTS')
    exit(1)

body = m.group(1)
choice_blocks = re.findall(r'"([^"]+)":\s*\[([\s\S]*?)\]', body)
print(f'Total choice lists: {len(choice_blocks)}')
for name, block in choice_blocks:
    items = re.findall(r'code:\s*"([^"]+)",\s*labelEn:\s*"([^"]+)",\s*labelHi:\s*"([^"]+)"', block)
    print(f'List: {name} ({len(items)} items)')
    for code, en, hi in items[:3]:
        print(f'   {code}: {en} / {hi}')
    if len(items) > 3:
        print(f'   ... {len(items)-3} more')
