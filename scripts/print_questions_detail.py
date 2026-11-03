import json
import sys

with open('scripts/parsed_sections.json', encoding='utf-8') as f:
    sections = json.load(f)

with open('scripts/questions_detail.txt', 'w', encoding='utf-8') as out:
    for sec in sections:
        out.write(f"\n==================== SECTION: {sec['name']} ({sec['label_en']}) ====================\n")
        for q in sec['questions']:
            if q.get('type') in ['repeat_start', 'repeat_end']:
                out.write(f"  REPEAT: {q.get('name')}\n")
                continue
            rel = f" [RELEVANT: {q['relevant']}]" if q.get('relevant') else ""
            con = f" [CONSTRAINT: {q['constraint']}]" if q.get('constraint') else ""
            req = " *" if q.get('required') else ""
            out.write(f"  {q['name']}{req} ({q['type']}): {q['label_en']}{rel}{con}\n")

print("Written to scripts/questions_detail.txt")
