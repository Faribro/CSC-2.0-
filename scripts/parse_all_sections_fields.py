import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

sections = ['sec-a', 'sec-b', 'sec-c', 'sec-d', 'sec-e', 'sec-f', 'sec-g', 'sec-h', 'sec-j']

for i in range(len(sections)):
    sec_id = sections[i]
    start_idx = text.find(f'id: "{sec_id}"')
    end_idx = text.find(f'id: "{sections[i+1]}"') if i < len(sections)-1 else text.find('];\n\nexport const')
    sec_text = text[start_idx:end_idx]
    fields = re.findall(r'name:\s*\"([^\"]+)\"', sec_text)
    print(f'=== {sec_id} ({len(fields)} fields) ===')
    print(' ', fields)
    print()
