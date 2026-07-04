import csv, json, re, zipfile, requests
from pathlib import Path
from airtable_read import f, list_table, session

BASE = Path("_preview/newspaper-radio-prep")
PACKETS = [
    ("05-butte-anaconda", "05-butte-anaconda-SEND-READY.zip", {"Montana Standard"}),
    ("06-madison-county", "06-madison-county-SEND-READY.zip", {"Madisonian"}),
    ("07-bitterroot", "07-bitterroot-SEND-READY.zip", {"Ravalli Republic"}),
    ("08-declo-magic-valley", "08-declo-magic-valley-SEND-READY.zip", {"Times-News"}),
    ("09-wolf-point", "09-wolf-point-SEND-READY.zip", {"Wolf Point Herald-News"}),
]

def norm(s):
    return re.sub(r"\s+", " ", str(s or "").strip())

def head_url(v):
    if not v: return ""
    for it in (v if isinstance(v, list) else [v]):
        if isinstance(it, dict) and it.get("url"):
            return str(it["url"])
    return ""

def slug(school):
    return school.replace("'", "").replace(" and ", "-").replace(" ", "-")

master = {(norm(r["athlete_name"]).lower(), norm(r["school_name"]).lower()): r for r in csv.DictReader(open(BASE/"athlete-master-export.csv", newline="", encoding="utf-8"))}
plan = list(csv.DictReader(open(BASE/"packet-plan-newspapers.csv", newline="", encoding="utf-8")))
need_eids = set()
for folder, zip_name, outlets in PACKETS:
    seen = set()
    for pr in plan:
        if pr.get("outlet_name") not in outlets: continue
        key = (norm(pr["athlete_included"]).lower(), norm(pr["athlete_school"]).lower())
        if key in seen or key not in master: continue
        seen.add(key); need_eids.add(master[key]["enrollment_id"])
fresh = {r["id"]: head_url(f(r).get("Athlete Headshot")) for r in list_table(session(), "Enrollments", ["Athlete Headshot"]) if r["id"] in need_eids}
reports = []
for folder, zip_name, outlets in PACKETS:
    packet = BASE/"final-packets"/folder; photos = packet/"Photos"
    seen = set(); athletes = []
    for pr in plan:
        if pr.get("outlet_name") not in outlets: continue
        key = (norm(pr["athlete_included"]).lower(), norm(pr["athlete_school"]).lower())
        if key in seen or key not in master: continue
        seen.add(key); athletes.append(master[key])
    rows = []
    ok = 0
    for a in athletes:
        name = norm(a["athlete_name"]); parts = name.split()
        fn = f"{parts[-1]}_{parts[0]}_{slug(a['school_name'])}_Grade-{a['grade']}.jpg"
        dest = photos/fn; url = fresh.get(a["enrollment_id"], "")
        status, err, size = "failed", "", 0
        if url:
            try:
                r = requests.get(url, timeout=120); r.raise_for_status(); dest.write_bytes(r.content)
                size = dest.stat().st_size; status = "success"; ok += 1
            except Exception as e: err = str(e)
        else: err = "no fresh url"
        rows.append({"Athlete Name": name, "Grade": a["grade"], "School": a["school_name"], "Town": a.get("city_town",""), "Original Airtable filename": "", "New saved filename": fn, "Download status": status, "File size": size, "Any error": err})
    with open(photos/"photo-download-checklist.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(sorted(rows, key=lambda r: r["Athlete Name"].lower()))
    with zipfile.ZipFile(BASE/"final-packets"/zip_name, "w", zipfile.ZIP_DEFLATED) as zf:
        for fn in ["01 Article - Main Version.docx","02 Article - Short Version.docx","04 Photo Captions.docx"]:
            zf.write(packet/fn, arcname=fn)
        for photo in sorted(photos.glob("*.jpg")):
            zf.write(photo, arcname=f"Photos/{photo.name}")
    reports.append({"packet": folder, "photos": ok, "total": len(athletes), "missing": [r["Athlete Name"] for r in rows if r["Download status"] != "success"]})
print(json.dumps(reports, indent=2))
