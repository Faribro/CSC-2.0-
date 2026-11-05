with open('frontend/components/forms/RegistrationForm.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{isSecB && (' in line:
        start = i
        for j in range(start, len(lines)):
            if '{/* SECTION D: REPEAT GROUP' in lines[j] or 'isSecD && (' in lines[j]:
                end = j
                print(f'Section B is from line {start+1} to {end+1}')
                with open('scripts/current_sec_b.txt', 'w', encoding='utf-8') as out:
                    out.writelines(lines[start:end])
                break
        break
