import csv
import io
import json
import re
import zipfile
from pathlib import Path

from media_paths import NEWSPAPER_PREP

BASE = NEWSPAPER_PREP
PACKET = BASE / "final-packets/04-billings-yellowstone-bridger-wibaux"
ZIP_NAME = "04-billings-yellowstone-bridger-wibaux-SEND-READY.zip"
PHOTOS = PACKET / "Photos"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_docx(lines):
    paras = "".join(
        f'<w:p><w:r><w:t xml:space="preserve">{esc(x)}</w:t></w:r></w:p>' if x else "<w:p/>"
        for x in lines
    )
    doc = (
        '<?xml version="1.0"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{paras}</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            "</Types>",
        )
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="word/document.xml"/></Relationships>',
        )
        zf.writestr("word/document.xml", doc)
    return buf.getvalue()


rows = list(csv.DictReader(open(PHOTOS / "photo-download-checklist.csv", newline="", encoding="utf-8")))
ok = sum(1 for row in rows if row["Download status"] == "success")

hc = [
    "Headshot checklist — 04-billings-yellowstone-bridger-wibaux",
    "Primary outlet: Billings Gazette",
    "Also serves: Carbon County News (Bridger), Wibaux County Pioneer",
    "Coverage: Billings / Yellowstone County / Bridger / Wibaux County",
    f"Athletes: {len(rows)}",
    "",
]
hc += [
    f"- {row['Athlete Name']} ({row['School']}, {row['Town']}) — {row['New saved filename']} — {row['Download status']}"
    for row in sorted(rows, key=lambda x: x["Athlete Name"].lower())
]
rv = [
    "Manual review checklist — Billings / Yellowstone / Bridger / Wibaux packet",
    "",
    "[ ] Paste final article text from ChatGPT into 01, 02, 03, and 04",
    "[ ] Rebuild SEND-READY zip after pasting final text",
    f"[ ] Verify all {len(rows)} headshots match correct athletes",
    "[ ] Confirm Billings Gazette / Wibaux County Pioneer editor contacts before emailing",
    "[ ] Do not use internal program terms in published copy",
    "[ ] Level-first language; shot totals second",
]

written = []
for name, content in [
    ("05 Headshot Checklist.docx", build_docx(hc)),
    ("06 Manual Review Checklist.docx", build_docx(rv)),
]:
    try:
        (PACKET / name).write_bytes(content)
        written.append(name)
    except PermissionError:
        pass

zip_path = BASE / "final-packets" / ZIP_NAME
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for fn in [
        "01 Article - Main Version.docx",
        "02 Article - Short Version.docx",
        "04 Photo Captions.docx",
    ]:
        zf.write(PACKET / fn, arcname=fn)
    for photo in sorted(PHOTOS.glob("*.jpg")):
        zf.write(photo, arcname=f"Photos/{photo.name}")

print(
    json.dumps(
        {
            "zip": str(zip_path.resolve()),
            "photos_in_zip": len(list(PHOTOS.glob("*.jpg"))),
            "photos_ok": ok,
            "checklists_written": written,
        },
        indent=2,
    )
)
