import csv, io, json, re, zipfile
from pathlib import Path
import requests

from media_paths import NEWSPAPER_PREP, newspaper_packets

BASE = NEWSPAPER_PREP
PACKET = newspaper_packets() / "02-missoula-area-st-joes-frenchtown"
PHOTOS = PACKET / "Photos"
PHOTOS.mkdir(parents=True, exist_ok=True)

MISSOULA_SCHOOLS = {"St. Joe's", "Frenchtown", "Hellgate", "Loyola Sacred Heart"}

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
  <w:body>{paras}</w:body>
</w:document>"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)
    return buf.getvalue()

# Load athletes
athletes = []
awards = {}
with open(BASE / "athlete-master-export.csv", newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row.get("school_name") in MISSOULA_SCHOOLS:
            athletes.append(row)
with open(BASE / "award-recognition-export.csv", newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row.get("school_name") in MISSOULA_SCHOOLS:
            awards[row["enrollment_id"]] = row.get("major_awards", "")

# Riley override stats per user direction
RILEY_ID = "recNe84xp4corSBmm"

def athlete_stats(a):
    name = norm(a["athlete_name"])
    if a["enrollment_id"] == RILEY_ID:
        return {
            "name": name, "school": a["school_name"], "grade": a["grade"],
            "level": "G.O.A.T.", "shots": 15404, "homework": 18, "video": 17,
            "zoom": 2, "streak": 60, "awards": awards.get(a["enrollment_id"], ""),
        }
    return {
        "name": name, "school": a["school_name"], "grade": a["grade"],
        "level": a["final_level"], "shots": int(a["total_shots_counted"]),
        "homework": int(a["homework_count"]), "video": int(a["video_count"]),
        "zoom": int(a["zoom_count"]), "streak": int(a["longest_streak_days"]),
        "awards": awards.get(a["enrollment_id"], ""),
    }

stats = [athlete_stats(a) for a in athletes]
# Sort: Riley first, then by shots desc
stats.sort(key=lambda s: (0 if s["name"] == "Riley Geraghty" else 1, -s["shots"], s["name"]))

# Download headshots
head_by_id = {}
with open(BASE / "headshot-inventory.csv", newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        if row.get("school_name") in MISSOULA_SCHOOLS:
            head_by_id[row["enrollment_id"]] = row

photo_rows = []
id_by_name = {a["enrollment_id"]: a for a in athletes}
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
        "Original Airtable filename": orig, "New saved filename": new_name,
        "Download status": status, "File size": size, "Any error": err,
    })

with open(PHOTOS / "photo-download-checklist.csv", "w", newline="", encoding="utf-8") as fh:
    cols = ["Athlete Name","Grade","School","Original Airtable filename","New saved filename","Download status","File size","Any error"]
    w = csv.DictWriter(fh, fieldnames=cols)
    w.writeheader()
    w.writerows(sorted(photo_rows, key=lambda r: r["Athlete Name"].lower()))

# Articles
MAIN = [
    "Missoula County athletes recognized in 2025–2026 Shooting Challenge",
    "",
    "By Coach Mike Schmidt / 127 Sports Intensity",
    "",
    "MISSOULA COUNTY — Riley Geraghty of St. Joseph's School in Missoula became the only athlete in the 2025–2026 127 Sports Intensity Shooting Challenge to reach G.O.A.T. level, the program's highest achievement.",
    "",
    "The G.O.A.T. level is not a shooting contest alone. Athletes earn it by completing the full challenge: counted shots, consistency, homework, coach video feedback, Zoom participation, streaks, and accountability across the offseason.",
    "",
    "Geraghty finished at G.O.A.T. level with 15,404 counted shots. She also completed 18 homework assignments, reviewed 17 coach videos, attended 2 Zoom meetings, and built a longest streak of 60 days. She earned major recognition including Conquered Goal Award, Daily Shot Submission Award, and Grade Band Champion Award.",
    "",
    "Several other Missoula County athletes also earned strong recognition in the same program.",
    "",
    "Frenchtown",
    "",
    "Camden Clark reached Pro level with 16,850 counted shots, one of the highest shot totals in the challenge. He earned Conquered Goal Award and Grade Band Runner-Up Award while completing homework, video reviews, and Zoom participation.",
    "",
    "McKinley Clark reached Hot Hand level with 13,633 counted shots and earned Conquered Goal Award along with strong program participation awards.",
    "",
    "St. Joseph's (Missoula)",
    "",
    "Jacob Schwenk reached Hot Hand level with 8,280 counted shots and earned Conquered Goal Award.",
    "",
    "Colbie Schwenk reached Dangerous Shooter level with 5,841 counted shots.",
    "",
    "Cash Wieler reached Rookie Shooter level with 738 counted shots as a younger participant building habits in the program.",
    "",
    "Hellgate (Missoula)",
    "",
    "Sam Tingley reached Developing Shooter level with 3,250 counted shots and completed homework and video work during the challenge.",
    "",
    "Loyola Sacred Heart (Missoula)",
    "",
    "Jensen Klimkiewicz participated in the challenge and earned Thanks for Playing recognition while building a foundation in the level system.",
    "",
    "About the program",
    "",
    "The 2025–2026 Shooting Challenge uses a level system that rewards complete player development — not just shot totals. Levels recognize shooting volume alongside homework, video feedback, Zoom meetings, streaks, and accountability.",
    "",
    "For more information: 127 Sports Intensity.",
]

SHORT = [
    "Missoula County Shooting Challenge standouts",
    "",
    "Riley Geraghty of St. Joseph's School is the only athlete in the 2025–2026 127 Sports Intensity Shooting Challenge to reach G.O.A.T. level — earned through shots, consistency, homework, videos, Zooms, and streaks, not shooting alone. She logged 15,404 counted shots, 18 homework completions, 17 reviewed videos, 2 Zoom meetings, and a 60-day longest streak.",
    "",
    "Other Missoula County athletes recognized include Frenchtown's Camden Clark (Pro level, 16,850 shots) and McKinley Clark (Hot Hand, 13,633 shots); St. Joe's Jacob Schwenk (Hot Hand, 8,280) and Colbie Schwenk (Dangerous Shooter, 5,841); Hellgate's Sam Tingley (Developing Shooter, 3,250); and Loyola's Jensen Klimkiewicz.",
]

EDITOR = [
    "Subject: Missoula County athletes recognized in 2025–2026 Shooting Challenge",
    "",
    "Hello,",
    "",
    "I wanted to submit a local youth sports/community achievement article for consideration in the Missoulian.",
    "",
    "Several Missoula County athletes were recognized in the 2025–2026 Shooting Challenge, a basketball development program run through 127 Sports Intensity. The program uses a level system that rewards shooting, consistency, homework, video feedback, Zoom participation, streaks, and overall commitment.",
    "",
    "The lead local story is Riley Geraghty of St. Joseph's School, the only athlete in the challenge to reach G.O.A.T. level. The article also recognizes Frenchtown athletes Camden and McKinley Clark, plus other St. Joe's, Hellgate, and Loyola Sacred Heart participants.",
    "",
    "I have attached:",
    "- Main article",
    "- Short article option",
    "- Photo captions",
    "- Athlete headshots",
    "",
    "Thank you for considering it.",
    "",
    "Coach Mike Schmidt",
    "127 Sports Intensity",
]

CAPTIONS = ["Photo captions — Missoula County / Missoulian packet", ""]
for s in stats:
    fn = next((p["New saved filename"] for p in photo_rows if p["Athlete Name"] == s["name"]), "")
    CAPTIONS += [
        f"{s['name']} ({s['school']}, Grade {s['grade']})",
        f"Caption: {s['name']} of {s['school']} reached {s['level']} level in the 2025–2026 127 Sports Intensity Shooting Challenge with {s['shots']:,} counted shots.",
        f"File: Photos/{fn}" if fn else "File: (see checklist)",
        "",
    ]

HEADSHOT_CHECK = [
    "Headshot checklist — 02-missoula-county-st-joes-frenchtown",
    "Outlet: Missoulian",
    "",
]
for p in sorted(photo_rows, key=lambda x: x["Athlete Name"].lower()):
    HEADSHOT_CHECK.append(f"- {p['Athlete Name']} ({p['School']}) — {p['New saved filename']} — {p['Download status']}")

REVIEW = [
    "Manual review checklist — Missoula County packet",
    "",
    "[ ] Confirm Riley Geraghty G.O.A.T. stats and awards",
    "[ ] Confirm Camden Clark Pro level and 16,850 shots",
    "[ ] Confirm McKinley Clark Hot Hand and 13,633 shots",
    "[ ] Verify all 8 headshots match correct athletes",
    "[ ] Replace placeholder docx formatting if needed before send",
    "[ ] Confirm Missoulian editor contact before emailing",
    "[ ] Do not use internal program terms in published copy",
    "[ ] Level-first language; shot totals second",
]

(PACKET / "01 Article - Main Version.docx").write_bytes(build_docx(MAIN))
(PACKET / "02 Article - Short Version.docx").write_bytes(build_docx(SHORT))
(PACKET / "03 Editor Email.docx").write_bytes(build_docx(EDITOR))
(PACKET / "03 Editor Email.txt").write_text("\n".join(EDITOR) + "\n", encoding="utf-8")
(PACKET / "04 Photo Captions.docx").write_bytes(build_docx(CAPTIONS))
(PACKET / "05 Headshot Checklist.docx").write_bytes(build_docx(HEADSHOT_CHECK))
(PACKET / "06 Manual Review Checklist.docx").write_bytes(build_docx(REVIEW))

report = {
    "folder": str(PACKET.resolve()),
    "athletes": [s["name"] + " (" + s["school"] + ")" for s in stats],
    "photos_downloaded": sum(1 for p in photo_rows if p["Download status"] == "success"),
    "missing_photos": [p["Athlete Name"] for p in photo_rows if p["Download status"] != "success"],
}
print(json.dumps(report, indent=2))
