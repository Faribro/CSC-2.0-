import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader('C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/.user_uploaded/media_1793689549633_0ba7f313.pdf')

for page_no in [2, 3, 4, 7, 8]:
    text = reader.pages[page_no-1].extract_text() or ''
    print(f'==================== PAGE {page_no} ====================')
    print(text)
