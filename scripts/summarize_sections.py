import json
import re

with open('scripts/survey_questions.json', encoding='utf-8') as f:
    questions = json.load(f)

# Regex to strip emojis
EMOJI_REGEX = re.compile(
    r'[\U00010000-\U0010ffff]|[\u200d\u20e3\ufe0f]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50\u2b55\u2934\u2935]|[\u25aa-\u25fe]|[\u3030\u303d]|[\u3297\u3299]'
)

def clean_text(s):
    if not s:
        return ''
    # strip html
    s = re.sub(r'<[^>]+>', '', s)
    # strip emoji
    s = EMOJI_REGEX.sub('', s)
    # normalize spaces
    s = s.replace('&nbsp;', ' ')
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

groups = []
current_group = None
current_repeat = None

sections_summary = []
current_sec = None

for q in questions:
    t = q.get('type') or ''
    name = q.get('name') or ''
    label_en = clean_text(q.get('label::English (en)'))
    label_hi = clean_text(q.get('label::Hindi (hi)'))
    relevant = q.get('relevant')
    constraint = q.get('constraint')
    required = q.get('required')

    if t.startswith('begin_group'):
        current_sec = {
            'name': name,
            'label_en': label_en,
            'label_hi': label_hi,
            'questions': []
        }
        sections_summary.append(current_sec)
    elif t.startswith('end_group'):
        pass
    elif t.startswith('begin_repeat'):
        if current_sec:
            current_sec['questions'].append({'type': 'repeat_start', 'name': name, 'label_en': label_en, 'label_hi': label_hi})
    elif t.startswith('end_repeat'):
        if current_sec:
            current_sec['questions'].append({'type': 'repeat_end', 'name': name})
    elif name and not t in ['start', 'end', 'today', 'deviceid', 'phonenumber']:
        if current_sec:
            current_sec['questions'].append({
                'name': name,
                'type': t,
                'label_en': label_en,
                'label_hi': label_hi,
                'hint_en': clean_text(q.get('hint::English (en)')),
                'hint_hi': clean_text(q.get('hint::Hindi (hi)')),
                'relevant': relevant,
                'constraint': constraint,
                'constraint_message_en': clean_text(q.get('constraint_message::English (en)')),
                'required': str(required).lower() == 'yes' or str(required).lower() == 'true'
            })

print(f"Total sections detected: {len(sections_summary)}")
for s in sections_summary:
    print(f"Section: {s['name']} | Label: {s['label_en']} | Questions: {len(s['questions'])}")

with open('scripts/parsed_sections.json', 'w', encoding='utf-8') as f:
    json.dump(sections_summary, f, ensure_ascii=False, indent=2)
