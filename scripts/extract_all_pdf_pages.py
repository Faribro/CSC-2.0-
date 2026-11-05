import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')
pdf_path = 'C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/.user_uploaded/media_1793689549633_0ba7f313.pdf'
reader = pypdf.PdfReader(pdf_path)

for i, page in enumerate(reader.pages):
    print(f'============================== PAGE {i+1} ==============================')
    print(page.extract_text())
