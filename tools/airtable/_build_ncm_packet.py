import csv, io, json, re, zipfile
from pathlib import Path
import requests

from media_paths import NEWSPAPER_PREP, newspaper_packets

BASE = NEWSPAPER_PREP
PACKET = newspaper_packets() / "03-north-central-montana"
ZIP_NAME = "03-north-central-montana-SEND-READY.zip"
PHOTOS = PACKET / "Photos"
PHOTOS.mkdir(parents=True, exist_ok=True)
OUTLET = "Great Falls Tribune"
PASTE = "PASTE FINAL TEXT FROM CHATGPT HERE"

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip())

def parse_name(full):
    full = norm(full)
    parts = full.split()
    if len(parts) < 2:
        return parts[0] if parts else "Unknown", "Unknown"
    return parts[-1], parts[0]

def school_slug(school):
    return school.replace("'", "").replace(" ", "-")

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def paragraph(text):
    if not text:
        return "<w:p/>"
    return f'<w:p><w:r><w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'

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
  <w:body>{paras}</w:body>
</w:document>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)
    return buf.getvalue()

# Athletes assigned to Great Falls Tribune
plan_rows = []
with open(BASE / "packet-plan-newspapers.csv", newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row.get("outlet_name") == OUTLET:
            plan_rows.append(row)

# Match plan rows to master by athlete name + school
name_school_to_master = {}
for row in csv.DictReader(open(BASE / "athlete-master-export.csv", newline="", encoding="utf-8")):
    key = (norm(row["athlete_name"]).lower(), norm(row["school_name"]).lower())
    name_school_to_master[key] = row

athletes = []
for pr in plan_rows:
    key = (norm(pr["athlete_included"]).lower(), norm(pr["athlete_school"]).lower())
    if key in name_school_to_master:
        athletes.append(name_school_to_master[key])
    else:
        print("WARN missing master:", pr["athlete_included"], pr["athlete_school"])

enrollment_ids = {a["enrollment_id"] for a in athletes}
athletes.sort(key=lambda a: (-int(a["total_shots_counted"]), norm(a["athlete_name"]).lower()))

head_by_id = {}
with open(BASE / "headshot-inventory.csv", newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row["enrollment_id"] in enrollment_ids:
            head_by_id[row["enrollment_id"]] = row

photo_rows = []
for a in athletes:
    eid = a["enrollment_id"]
    name = norm(a["athlete_name"])
    last, first = parse_name(name)
    grade = a["grade"]
    slug = school_slug(a["school_name"])
    new_name = f"{last}_{first}_{slug}_Grade-{grade}.jpg"
    h = head_by_id.get(eid, {})
    url = h.get("headshot_url", "")
    orig = h.get("headshot_filename", "")
    dest = PHOTOS / new_name
    status, err, size = "failed", "", 0
    if h.get("headshot_available") == "Yes" and url:
        try:
            r = requests.get(url, timeout=120)
            r.raise_for_status()
            dest.write_bytes(r.content)
            size = dest.stat().st_size
            status = "success"
        except Exception as e:
            err = str(e)
    else:
        err = "no headshot URL"
    photo_rows.append({
        "Athlete Name": name, "Grade": grade, "School": a["school_name"],
        "Town": a.get("city_town", ""), "Original Airtable filename": orig,
        "New saved filename": new_name, "Download status": status,
        "File size": size, "Any error": err,
    })

with open(PHOTOS / "photo-download-checklist.csv", "w", newline="", encoding="utf-8") as fh:
    cols = ["Athlete Name","Grade","School","Town","Original Airtable filename","New saved filename","Download status","File size","Any error"]
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    w.writerows(sorted(photo_rows, key=lambda r: r["Athlete Name"].lower()))

paste_docx = build_docx([PASTE])
(PACKET / "01 Article - Main Version.docx").write_bytes(paste_docx)
(PACKET / "02 Article - Short Version.docx").write_bytes(paste_docx)
(PACKET / "03 Editor Email.docx").write_bytes(paste_docx)
(PACKET / "03 Editor Email.txt").write_text(PASTE + "\n", encoding="utf-8")
(PACKET / "04 Photo Captions.docx").write_bytes(paste_docx)

HEADSHOT_CHECK = [
    "Headshot checklist — 03-north-central-montana",
    f"Outlet: {OUTLET}",
    f"Coverage: North-central Montana",
    f"Athletes: {len(athletes)}",
    "",
]
for p in sorted(photo_rows, key=lambda x: x["Athlete Name"].lower()):
    HEADSHOT_CHECK.append(f"- {p['Athlete Name']} ({p['School']}, {p['Town']}) — {p['New saved filename']} — {p['Download status']}")

REVIEW = [
    "Manual review checklist — North-central Montana packet",
    "",
    "[ ] Paste final article text from ChatGPT into 01, 02, 03, and 04",
    "[ ] Rebuild SEND-READY zip after pasting final text",
    f"[ ] Verify all {len(athletes)} headshots match correct athletes",
    "[ ] Confirm Great Falls Tribune editor contact before emailing",
    "[ ] Do not use internal program terms in published copy",
    "[ ] Level-first language; shot totals second",
]

(PACKET / "05 Headshot Checklist.docx").write_bytes(build_docx(HEADSHOT_CHECK))
(PACKET / "06 Manual Review Checklist.docx").write_bytes(build_docx(REVIEW))

zip_path = PACKET.parent / ZIP_NAME
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for name in ["01 Article - Main Version.docx", "02 Article - Short Version.docx", "04 Photo Captions.docx"]:
        zf.write(PACKET / name, arcname=name)
    for photo in sorted(PHOTOS.glob("*.jpg")):
        zf.write(photo, arcname=f"Photos/{photo.name}")

schools = sorted({norm(a["school_name"]) for a in athletes})
towns = sorted({norm(a.get("city_town", "")) for a in athletes if norm(a.get("city_town", ""))})
report = {
    "working_folder": str(PACKET.resolve()),
    "send_ready_zip": str(zip_path.resolve()),
    "athletes": [norm(a["athlete_name"]) + " (" + a["school_name"] + ", " + a.get("city_town", "") + ")" for a in athletes],
    "schools": schools,
    "towns": towns,
    "photos_downloaded": sum(1 for p in photo_rows if p["Download status"] == "success"),
    "missing_photos": [p["Athlete Name"] for p in photo_rows if p["Download status"] != "success"],
}
print(json.dumps(report, indent=2))


