path = 'frontend/app/admin/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Filter out lines 253 to 261 (0-indexed 253 to 261)
# Let's inspect the lines around 250
new_lines = []
skip = False
for line in lines:
    if '// Dynamic Districts derived from roster, supervision tasks, and reference data' in line and not skip:
        # Check if roster is already declared before this line
        # If roster is not yet declared, skip this block
        if not any('const [roster, setRoster]' in l for l in new_lines):
            skip = True
            continue
    if skip and ']).sort();' in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Cleaned up first declaration.")
