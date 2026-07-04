import csv, io, json, re, zipfile
from pathlib import Path
import requests

BASE = Path("_preview/newspaper-radio-prep")
PACKET = BASE / "final-packets" / "01-belgrade-bozeman-manhattan-christian"
PHOTOS = PACKET / "Photos"
PHOTOS.mkdir(parents=True, exist_ok=True)

HEADSHOT_CSV = BASE / "headshot-inventory.csv"
MASTER_CSV = BASE / "athlete-master-export.csv"

def norm_name(s):
    return re.sub(r"\s+", " ", str(s or "").strip())

def parse_name(full):
    full = norm_name(full)
    parts = full.split()
    if len(parts) < 2:
        return parts[0] if parts else "Unknown", "Unknown"
    return parts[-1], parts[0]

# grades from master export
grades = {}
with open(MASTER_CSV, newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row.get("school_name") == "Manhattan Christian":
            grades[norm_name(row["athlete_name"]).lower()] = row.get("grade", "")

expected = [
    "Allie Heidema","Blake Hubers","Brayden Elders","Carson Hubers","Dawson Schutter",
    "Jackson Elders","Kinsley Heidema","Koen Kimm","Liam Kimm","Lyle Kimm",
    "Mckinley Hubers","Ryder Elders","Tracen Heidema","Tristan Schutter",
]

rows = []
with open(HEADSHOT_CSV, newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row.get("school_name") != "Manhattan Christian":
            continue
        name = norm_name(row["athlete_name"])
        last, first = parse_name(name)
        grade = grades.get(name.lower(), "")
        new_name = f"{last}_{first}_Manhattan-Christian_Grade-{grade}.jpg"
        url = row.get("headshot_url", "")
        orig = row.get("headshot_filename", "")
        dest = PHOTOS / new_name
        status = "pending"; err = ""; size = 0
        if row.get("headshot_available") != "Yes" or not url:
            status = "failed"; err = "no headshot URL"
        else:
            try:
                r = requests.get(url, timeout=120)
                r.raise_for_status()
                dest.write_bytes(r.content)
                size = dest.stat().st_size
                status = "success"
            except Exception as e:
                status = "failed"; err = str(e)
        rows.append({
            "Athlete Name": name,
            "Grade": grade,
            "Original Airtable filename": orig,
            "New saved filename": new_name,
            "Download status": status,
            "File size": size,
            "Any error": err,
        })

# verify expected athletes
found = {r["Athlete Name"].lower() for r in rows}
for exp in expected:
    if norm_name(exp).lower() not in found:
        rows.append({
            "Athlete Name": norm_name(exp), "Grade": grades.get(norm_name(exp).lower(), ""),
            "Original Airtable filename": "", "New saved filename": "",
            "Download status": "failed", "File size": 0,
            "Any error": "not found in headshot-inventory.csv",
        })

checklist_path = PHOTOS / "photo-download-checklist.csv"
cols = ["Athlete Name","Grade","Original Airtable filename","New saved filename","Download status","File size","Any error"]
with open(checklist_path, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    w.writerows(sorted(rows, key=lambda r: r["Athlete Name"].lower()))

def minimal_docx(title, body):
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
    safe_title = title.replace("&", "&amp;").replace("<", "&lt;")
    safe_body = body.replace("&", "&amp;").replace("<", "&lt;")
    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{safe_title}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{safe_body}</w:t></w:r></w:p>
  </w:body>
</w:document>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)
    return buf.getvalue()

DOC_FILES = [
    ("00 Full Submission Packet - Review Copy.docx", "Manhattan Christian Test Packet", "Review copy placeholder for Belgrade News / Bozeman Daily Chronicle test packet."),
    ("01 Article - Main Version.docx", "Main Article", "Level-focused main article draft placeholder."),
    ("02 Article - Short Version.docx", "Short Article", "Short version article placeholder."),
    ("03 Editor Email.docx", "Editor Email", "Editor outreach email placeholder."),
    ("04 Photo Captions.docx", "Photo Captions", "Photo captions for Manhattan Christian athletes."),
    ("05 Headshot Checklist.docx", "Headshot Checklist", "See Photos/photo-download-checklist.csv for download results."),
    ("06 Manual Review Checklist.docx", "Manual Review Checklist", "Coach Schmidt manual review items."),
    ("README.docx", "README", "Test packet README for 01-belgrade-bozeman-manhattan-christian."),
]
for fname, title, body in DOC_FILES:
    (PACKET / fname).write_bytes(minimal_docx(title, body))

zip_path = BASE / "final-packets" / "01-belgrade-bozeman-manhattan-christian-WITH-PHOTOS.zip"
if zip_path.exists():
    zip_path.unlink()
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for doc in DOC_FILES:
        zf.write(PACKET / doc[0], doc[0])
    for photo in sorted(PHOTOS.glob("*.jpg")):
        zf.write(photo, f"Photos/{photo.name}")
    zf.write(checklist_path, "Photos/photo-download-checklist.csv")

success = sum(1 for r in rows if r["Download status"] == "success")
failed = [r for r in rows if r["Download status"] != "success"]
report = {
    "zip_path": str(zip_path.resolve()),
    "photos_downloaded": success,
    "failed": [{"name": r["Athlete Name"], "error": r["Any error"]} for r in failed],
}
print(json.dumps(report, indent=2))
