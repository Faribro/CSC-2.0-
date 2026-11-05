import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's see Section A fields
sec_a_idx = text.find('id: "sec-a"')
sec_b_idx = text.find('id: "sec-b"')
sec_a_text = text[sec_a_idx:sec_b_idx]

field_names = re.findall(r'name:\s*\"([^\"]+)\"', sec_a_text)
print(f'Section A has {len(field_names)} fields: {field_names}')
