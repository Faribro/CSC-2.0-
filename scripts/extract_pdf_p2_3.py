import pypdf
import sys

sys.stdout.reconfigure(encoding='utf-8')
pdf_path = 'C:/Users/fsayyed/.gemini/antigravity/brain/659ab4b7-0573-4914-b69a-94628454d01b/.user_uploaded/media_1793689549633_0ba7f313.pdf'
reader = pypdf.PdfReader(pdf_path)

for p_idx in [1, 2]: # pages 2 and 3 (0-indexed 1 and 2)
    print(f'=== PAGE {p_idx+1} ===')
    print(reader.pages[p_idx].extract_text())
