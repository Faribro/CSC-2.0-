import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# find all field definitions
fields = re.findall(r'name:\s*\"([^\"]+)\",\s*type:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"', text)

for name, ftype, label in fields:
    if any(k in name.lower() for k in ['res', 'care', 'orphan', 'edu', 'marit', 'income', 'route', 'who', 'att', 'tb', 'disc', 'f2', 'g2', 'disab', 'death', 'h2', 'h6']):
        print(f'{name} ({ftype}): {label}')
