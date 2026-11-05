import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('scripts/choices.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for k in ['schemes_linked', 'entitlements', 'sws', 'disc_from', 'purpose', 'svc']:
    if k in d:
        print(f'{k}: {len(d[k])} items')
        for item in d[k]:
            print('  ', item)
    else:
        print(f'{k}: NOT IN choices.json')
    print()
