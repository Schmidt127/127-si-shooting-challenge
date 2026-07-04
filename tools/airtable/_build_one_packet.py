import csv, io, json, re, zipfile, sys
from pathlib import Path
import requests

folder, zip_name, outlet, coverage = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
from media_paths import NEWSPAPER_PREP

BASE = NEWSPAPER_PREP
PACKET = BASE / "final-packets" / folder
PHOTOS = PACKET / "Photos"
PHOTOS.mkdir(parents=True, exist_ok=True)
PASTE = "PASTE FINAL TEXT FROM CHATGPT HERE"

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip())

def parse_name(full):
    parts = norm(full).split()
    return (parts[-1], parts[0]) if len(parts) >= 2 else ("Unknown", "Unknown")

def school_slug(school):
    return school.replace("'", "").replace("&", "and").replace(" ", "-")

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def build_docx(lines):
    paras = "\n".join(f'<w:p><w:r><w:t xml:space="preserve">{esc(x)}</w:t></w:r></w:p>' if x else "<w:p/>" for x in lines)
    doc = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{paras}</w:body></w:document>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        zf.writestr("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        zf.writestr("word/document.xml", doc)
    return buf.getvalue()

master = {(norm(r["athlete_name"]).lower(), norm(r["school_name"]).lower()): r for r in csv.DictReader(open(BASE/"athlete-master-export.csv", newline="", encoding="utf-8"))}
seen = set(); athletes = []
for pr in csv.DictReader(open(BASE/"packet-plan-newspapers.csv", newline="", encoding="utf-8")):
    if pr.get("outlet_name") != outlet: continue
    key = (norm(pr["athlete_included"]).lower(), norm(pr["athlete_school"]).lower())
    if key in seen or key not in master: continue
    seen.add(key); athletes.append(master[key])
athletes.sort(key=lambda a: (-int(a["total_shots_counted"]), norm(a["athlete_name"]).lower()))
eids = {a["enrollment_id"] for a in athletes}
heads = {r["enrollment_id"]: r for r in csv.DictReader(open(BASE/"headshot-inventory.csv", newline="", encoding="utf-8")) if r["enrollment_id"] in eids}
photo_rows = []
for a in athletes:
    name = norm(a["athlete_name"]); last, first = parse_name(name)
    new_name = f"{last}_{first}_{school_slug(a['school_name'])}_Grade-{a['grade']}.jpg"
    h = heads.get(a["enrollment_id"], {}); url = h.get("headshot_url", ""); dest = PHOTOS / new_name
    status, err, size = "failed", "", 0
    if h.get("headshot_available") == "Yes" and url:
        try:
            r = requests.get(url, timeout=120); r.raise_for_status(); dest.write_bytes(r.content)
            size = dest.stat().st_size; status = "success"
        except Exception as e: err = str(e)
    else: err = "no headshot URL"
    photo_rows.append({"Athlete Name": name, "Grade": a["grade"], "School": a["school_name"], "Town": a.get("city_town",""), "Original Airtable filename": h.get("headshot_filename",""), "New saved filename": new_name, "Download status": status, "File size": size, "Any error": err})
with open(PHOTOS/"photo-download-checklist.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=["Athlete Name","Grade","School","Town","Original Airtable filename","New saved filename","Download status","File size","Any error"])
    w.writeheader(); w.writerows(sorted(photo_rows, key=lambda r: r["Athlete Name"].lower()))
paste = build_docx([PASTE])
for fn in ["01 Article - Main Version.docx","02 Article - Short Version.docx","03 Editor Email.docx","04 Photo Captions.docx"]:
    (PACKET/fn).write_bytes(paste)
(PACKET/"03 Editor Email.txt").write_text(PASTE+"\n", encoding="utf-8")
hc = [f"Headshot checklist - {folder}", f"Primary outlet: {outlet}", f"Coverage: {coverage}", f"Athletes: {len(athletes)}", ""]
hc += [f"- {p['Athlete Name']} ({p['School']}, {p['Town']}) - {p['New saved filename']} - {p['Download status']}" for p in sorted(photo_rows, key=lambda x: x['Athlete Name'].lower())]
rv = [f"Manual review checklist - {coverage}", "", "[ ] Paste final article text from ChatGPT into 01, 02, 03, and 04", "[ ] Rebuild SEND-READY zip after pasting final text", f"[ ] Verify all {len(athletes)} headshots", f"[ ] Confirm {outlet} editor contact", "[ ] No internal program terms", "[ ] Level-first language"]
(PACKET/"05 Headshot Checklist.docx").write_bytes(build_docx(hc))
(PACKET/"06 Manual Review Checklist.docx").write_bytes(build_docx(rv))
zip_path = BASE/"final-packets"/zip_name
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for fn in ["01 Article - Main Version.docx","02 Article - Short Version.docx","04 Photo Captions.docx"]:
        zf.write(PACKET/fn, arcname=fn)
    for photo in sorted(PHOTOS.glob("*.jpg")):
        zf.write(photo, arcname=f"Photos/{photo.name}")
print(json.dumps({"packet": folder, "athletes": [norm(a["athlete_name"]) for a in athletes], "photos": sum(1 for p in photo_rows if p["Download status"]=="success"), "missing": [p["Athlete Name"] for p in photo_rows if p["Download status"]!="success"]}))
