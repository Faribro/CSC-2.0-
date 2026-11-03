import openpyxl
import json
import re

wb = openpyxl.load_workbook('CSC2_CRF_KoboToolbox_XLSForm_v2.xlsx', data_only=True)

# 1. Survey questions
survey_sheet = wb['survey']
headers = [cell.value for cell in survey_sheet[1]]

questions = []
for row in survey_sheet.iter_rows(min_row=2, values_only=True):
    d = dict(zip(headers, row))
    if d.get('name') or d.get('type'):
        questions.append(d)

# 2. Choices
choices_sheet = wb['choices']
c_headers = [cell.value for cell in choices_sheet[1]]
choices_by_list = {}
for row in choices_sheet.iter_rows(min_row=2, values_only=True):
    d = dict(zip(c_headers, row))
    list_name = d.get('list_name')
    if list_name:
        if list_name not in choices_by_list:
            choices_by_list[list_name] = []
        choices_by_list[list_name].append({
            'name': str(d.get('name', '')),
            'label_en': str(d.get('label::English (en)', '') or ''),
            'label_hi': str(d.get('label::Hindi (hi)', '') or ''),
        })

print(f"Total survey rows: {len(questions)}")
print(f"Total choice lists: {len(choices_by_list)}")

with open('scripts/survey_questions.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

with open('scripts/choices.json', 'w', encoding='utf-8') as f:
    json.dump(choices_by_list, f, ensure_ascii=False, indent=2)

print("Exported survey_questions.json and choices.json successfully.")
