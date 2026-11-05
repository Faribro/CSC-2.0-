import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader('C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/.user_uploaded/media_1793689549633_0ba7f313.pdf')
print(f'Total pages: {len(reader.pages)}')

for i, page in enumerate(reader.pages):
    text = page.extract_text() or ''
    if 'Section-D' in text or 'Section D' in text or 'Social Protection' in text or 'Social Welfare' in text:
        print(f'--- PAGE {i+1} ---')
        print(text[:2000])
