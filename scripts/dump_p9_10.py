from pypdf import PdfReader
reader = PdfReader(r"C:\Users\fsayyed\.gemini\antigravity\brain\659ab4b7-0573-4914-b69a-94628454d01b\.user_uploaded\media_1793689549633_0ba7f313.pdf")
text_p9 = reader.pages[8].extract_text()
text_p10 = reader.pages[9].extract_text()

with open("scripts/page9_10.txt", "w", encoding="utf-8") as f:
    f.write("=== PAGE 9 ===\n" + text_p9 + "\n\n=== PAGE 10 ===\n" + text_p10)
print("Saved page 9 and 10")
