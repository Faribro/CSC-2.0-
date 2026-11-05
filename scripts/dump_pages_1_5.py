import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')

reader = pypdf.PdfReader('C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/.user_uploaded/media_1793689549633_0ba7f313.pdf')

for i in range(5):
    text = reader.pages[i].extract_text() or ''
    print(f'==================== PAGE {i+1} ====================')
    print(text)
