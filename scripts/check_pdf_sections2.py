from pypdf import PdfReader
reader = PdfReader(r"C:\Users\fsayyed\.gemini\antigravity\brain\659ab4b7-0573-4914-b69a-94628454d01b\.user_uploaded\media_1793689549633_0ba7f313.pdf")
out_lines = [f"Total pages: {len(reader.pages)}"]
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    for line in text.splitlines():
        if "SECTION" in line.upper() or "SEC " in line.upper() or "PART " in line.upper():
            out_lines.append(f"Page {i+1}: {line.strip()}")

with open("scripts/pdf_sections_found.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))
print("Wrote sections")
