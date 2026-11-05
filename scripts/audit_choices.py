import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all choice list definitions
cl_match = re.search(r'export const CHOICE_LISTS: Record<string, ChoiceOption\[\]> = \{([\s\S]*?)\n\};', text)
if not cl_match:
    print('Could not find CHOICE_LISTS')
    sys.exit(1)

cl_text = cl_match.group(1)

# Split by choice list keys
pattern = r'\"([a-zA-Z0-9_]+)\":\s*\['
matches = list(re.finditer(pattern, cl_text))
print(f'Total choice lists found: {len(matches)}\n')

for i, m in enumerate(matches):
    key = m.group(1)
    start = m.end()
    end = matches[i+1].start() if i+1 < len(matches) else len(cl_text)
    list_content = cl_text[start:end]
    options = re.findall(r'\{\s*code:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"(?:,\s*labelHi:\s*\"([^\"]+)\")?', list_content)
    print(f'=== {key} ({len(options)} options) ===')
    for code, en, hi in options[:10]:
        print(f'  {code}: {en} / {hi}')
    if len(options) > 10:
        print(f'  ... and {len(options)-10} more')
    print()
