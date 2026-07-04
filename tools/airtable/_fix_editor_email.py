import io, zipfile
from pathlib import Path

PACKET = Path("_preview/newspaper-radio-prep/final-packets/01-belgrade-bozeman-manhattan-christian")
EMAIL_LINES = [
    "Subject: Local Manhattan Christian athletes recognized in 2025–2026 Shooting Challenge",
    "",
    "Hello,",
    "",
    "I wanted to submit a local youth sports/community achievement article for consideration.",
    "",
    "Several Manhattan Christian athletes were recognized in the 2025–2026 Shooting Challenge, a basketball development program run through 127 Sports Intensity. The program uses a level system that rewards shooting, consistency, homework, video feedback, Zoom participation, streaks, and overall commitment.",
    "",
    "I have attached:",
    "- Main article",
    "- Short article option",
    "- Photo captions",
    "- Athlete headshots",
    "",
    "The local angle is strong for Manhattan Christian and the Gallatin Valley, with several athletes earning major recognition, including Sharpshooter level, Hot Hand level, Conquered Goal Awards, and Grade Band Awards.",
    "",
    "Thank you for considering it.",
    "",
    "Coach Mike Schmidt",
    "127 Sports Intensity",
]
BODY_TEXT = "\n".join(EMAIL_LINES)

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def paragraph(text):
    if not text:
        return "<w:p/>"
    return f"<w:p><w:r><w:t xml:space=\"preserve\">{esc(text)}</w:t></w:r></w:p>"

def build_docx(lines):
    paras = "\n".join(paragraph(line) for line in lines)
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {paras}
  </w:body>
</w:document>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)
    return buf.getvalue()

docx_path = PACKET / "03 Editor Email.docx"
txt_path = PACKET / "03 Editor Email.txt"
docx_path.write_bytes(build_docx(EMAIL_LINES))
txt_path.write_text(BODY_TEXT + "\n", encoding="utf-8")
print("Wrote:", docx_path.resolve())
print("Wrote:", txt_path.resolve())
print("Bytes docx:", docx_path.stat().st_size)
print("Bytes txt:", txt_path.stat().st_size)
