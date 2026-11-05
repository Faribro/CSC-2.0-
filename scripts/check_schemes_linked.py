import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/crfDefinitions.ts', 'r', encoding='utf-8') as f:
    text = f.read()

m1 = re.search(r'\"schemes_linked\":\s*\[([\s\S]*?)\]\s*,', text)
m2 = re.search(r'\"sws\":\s*\[([\s\S]*?)\]\s*,', text)

opts1 = re.findall(r'\{\s*code:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"', m1.group(1)) if m1 else []
opts2 = re.findall(r'\{\s*code:\s*\"([^\"]+)\",\s*labelEn:\s*\"([^\"]+)\"', m2.group(1)) if m2 else []

print(f'schemes_linked ({len(opts1)} options):')
for c, en in opts1[:5]:
    print(f'  {c}: {en}')

print(f'\nsws ({len(opts2)} options):')
for c, en in opts2[:5]:
    print(f'  {c}: {en}')
