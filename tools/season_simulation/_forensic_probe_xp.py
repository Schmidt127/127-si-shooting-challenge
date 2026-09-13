"""Probe XP Events link + dump Perfect athlete enrollment/WAS/Zoom."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))
sys.stdout.reconfigure(encoding="utf-8")

from season_simulation.airtable_client import AirtableClient, fields_of

ENROLL = "rec9pIjQFyKwgAJLG"
RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
OUT = ROOT / "reports" / f"forensic-probe-{RUN}.json"

c = AirtableClient(allow_writes=False)

# XP Events schema
xp_fields = []
for t in c.meta_tables():
    if t["name"] == "XP Events":
        for f in t["fields"]:
            xp_fields.append({"name": f["name"], "type": f["type"], "id": f["id"]})
            opts = f.get("options") or {}
            if f["type"] == "multipleRecordLinks":
                print("LINK", f["name"], opts.get("linkedTableId"))

# Try several formulas
formulas = [
    f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
    f"FIND('{ENROLL}', {{Enrollment}})",
    f"SEARCH('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
    f"{{Enrollment Record Id}} = '{ENROLL}'",
    f"FIND('{ENROLL}', {{Enrollment Record Id}} & '')",
    f"FIND('{ENROLL}', {{Enrollment Id}} & '')",
    f"FIND('SEASON-SIM|{RUN}|A1-PERFECT', {{Reason Debug}} & '')",
    f"FIND('{RUN}', {{Source Key}} & '')",
    f"FIND('{RUN}', {{Reason Debug}} & '')",
    f"FIND('A1-PERFECT', {{Reason Debug}} & '')",
    f"FIND('{ENROLL}', ARRAYJOIN({{Enrollments}}))",
]

results = {}
for formula in formulas:
    try:
        rows = c.list_records("XP Events", formula=formula, max_records=5)
        results[formula] = {"ok": True, "count_sample": len(rows), "ids": [r["id"] for r in rows]}
        print("OK", formula, len(rows))
        if rows:
            print("  sample fields", list(fields_of(rows[0]).keys())[:40])
            print("  Enrollment=", fields_of(rows[0]).get("Enrollment"))
            print("  Source Key=", fields_of(rows[0]).get("Source Key"))
            break
    except Exception as e:
        results[formula] = {"ok": False, "error": str(e)[:300]}
        print("FAIL", formula, str(e)[:120])

# Enrollment linked XP Events field?
enr = fields_of(c.get_record("Enrollments", ENROLL))
xp_link_keys = [k for k in enr if "xp" in k.lower() or "event" in k.lower()]
print("ENROLL XP-ish keys", xp_link_keys)
linked_xp = None
for k in xp_link_keys:
    v = enr.get(k)
    if isinstance(v, list) and v and str(v[0]).startswith("rec"):
        print(f"  linked list {k} len={len(v)} sample={v[:3]}")
        linked_xp = (k, v)

# If enrollment has linked XP events, fetch them
fetched = []
if linked_xp:
    key, ids = linked_xp
    for rid in ids:
        rec = c.get_record("XP Events", rid)
        f = fields_of(rec)
        fetched.append(
            {
                "id": rid,
                "Source Key": f.get("Source Key"),
                "XP Amount": f.get("XP Amount") or f.get("XP") or f.get("Amount"),
                "XP Source": f.get("XP Source") or f.get("Source"),
                "Rule Key": f.get("Rule Key"),
                "Status": f.get("Status"),
                "Voided?": f.get("Voided?"),
                "Reason Debug": str(f.get("Reason Debug") or "")[:200],
            }
        )

# Zoom attendance details
reg = json.loads((ROOT / "run_registries" / f"{RUN}__athlete1-perfect.json").read_text(encoding="utf-8"))
za = []
for zid in (reg.get("ids_by_table") or {}).get("Zoom Attendance") or []:
    f = fields_of(c.get_record("Zoom Attendance", zid))
    za.append({"id": zid, **{k: f.get(k) for k in f if any(x in k.lower() for x in ["name","mode","status","credit","perfect","meeting","enroll","attend","record","type","xp","week"])}})

# WAS compact
was = []
for rid in (reg.get("ids_by_table") or {}).get("Weekly Athlete Summary") or []:
    # prefer only challenge WAS - check Week Label
    f = fields_of(c.get_record("Weekly Athlete Summary", rid))
    was.append(
        {
            "id": rid,
            "Week Label": f.get("Week Label") or f.get("Week Name") or f.get("Name"),
            "Days Logged": f.get("Days Logged"),
            "Perfect Week Qualifying Days": f.get("Perfect Week Qualifying Days"),
            "eligible": f.get("Perfect Week Eligible?"),
            "daily_met": f.get("Perfect Week Daily Requirement Met?"),
            "hw_met": f.get("Perfect Week Homework Requirement Met?"),
            "video_met": f.get("Perfect Week Video Requirement Met?"),
            "zoom_met": f.get("Perfect Week Zoom Requirement Met?"),
            "status": f.get("Perfect Week Automation Status"),
            "error": f.get("Perfect Week Automation Error"),
            "detail": f.get("Perfect Week Daily Check Detail"),
            "hw_assigned": f.get("Perfect Week Homework Assigned Count"),
            "hw_sat": f.get("Perfect Week Homework Satisfactory Count"),
            "video": f.get("Perfect Week Video Count"),
            "zoom_meet": f.get("Perfect Week Zoom Meeting Count"),
            "zoom_att": f.get("Perfect Week Zoom Attendance Count"),
            "week_end": f.get("Week End Date"),
            "week_start": f.get("Week Start Date"),
            "shots": f.get("Weekly Shots") or f.get("Shots This Week") or f.get("Counted Shots This Week"),
            "target": f.get("Weekly Shot Target") or f.get("Shot Target"),
            "scaled": f.get("Scaled Weekly Shot Target"),
        }
    )

OUT.write_text(
    json.dumps(
        {
            "xp_field_names": [f["name"] for f in xp_fields],
            "formula_results": results,
            "linked_xp_field": linked_xp[0] if linked_xp else None,
            "linked_xp_count": len(linked_xp[1]) if linked_xp else 0,
            "fetched_xp_sample": fetched[:20],
            "fetched_xp_all_count": len(fetched),
            "xp_by_source": {},
            "zoom_attendance": za,
            "was": was,
            "gate": {
                "Gate Debug Summary": enr.get("Gate Debug Summary"),
                "Level Status": enr.get("Level Status"),
                "Current Level": enr.get("Current Level"),
                "Current Level - Public Facing Display": enr.get("Current Level - Public Facing Display"),
                "Next Level": enr.get("Next Level"),
                "Gate-Test Eligible Level": enr.get("Gate-Test Eligible Level"),
                "Lifetime XP Total": enr.get("Lifetime XP Total"),
                "Lifetime XP Earned": enr.get("Lifetime XP Earned"),
                "Total Zoom Attendances": enr.get("Total Zoom Attendances"),
                "Longest Streak": enr.get("Longest Streak"),
                "Current Shooting Streak": enr.get("Current Shooting Streak"),
            },
        },
        indent=2,
        default=str,
    ),
    encoding="utf-8",
)
print("WROTE", OUT)
print("linked xp count", len(fetched))
