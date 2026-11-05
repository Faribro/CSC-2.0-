import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')
pdf_path = 'C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/.user_uploaded/media_1793689549633_0ba7f313.pdf'
reader = pypdf.PdfReader(pdf_path)

print(f'Total pages in PDF: {len(reader.pages)}')

for i, page in enumerate(reader.pages):
    lines = [l.strip() for l in page.extract_text().split('\n') if l.strip()]
    print(f'\n--- PAGE {i+1} ({len(lines)} lines) ---')
    for l in lines[:6]:
        print('  ', l[:80])
