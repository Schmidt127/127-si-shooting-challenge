"""Confirm 101 SCRIPT version; sample descendant ownership for Email Handoff Queue."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.cleanup import cleanup_preview_three, run_marker  # noqa: E402
from season_simulation.constants import DEFAULT_BASE_ID, SAFE_EMAIL_RECIPIENT  # noqa: E402

# 101 version
p = Path(
    r"C:\Users\mschmidt_fairfield\.cursor\projects\c-Users-mschmidt-fairfield-Documents-GitHub-127si-shooting-challenge\agent-tools\c872d81b-0de5-4d71-827c-3a5dd39aee1e.txt"
)
data = json.loads(p.read_text(encoding="utf-8"))
scripts = []


def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get("script"), str):
            scripts.append(o["script"])
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)


walk(data)
s = scripts[0].replace("\r\n", "\n")
for line in s.splitlines():
    if re.search(r"Version|version:|lastUpdated", line) and "Last Synced" not in line:
        if "GitHub" in line and "Version" not in line and "version:" not in line:
            continue
        print("101LINE", line[:140])
        if "version:" in line.lower() and "Last" not in line:
            break

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
REG_DIR = Path(__file__).resolve().parent / "run_registries"
ENROLLMENTS = {
    "perfect": "rec9pIjQFyKwgAJLG",
    "recovery": "recjZLSqtwvewN2Pn",
    "edge": "rectTQCRGIaK4W0IF",
}
ATHLETES = {
    "perfect": "recmqSM3317Q6eDuY",
    "recovery": "recIjEihQ13fw4UID",
    "edge": "recf1fPLBF5eQH6Wq",
}

client = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
preview = cleanup_preview_three(run_id=RUN, registry_dir=REG_DIR, client=client)
targets = preview.plan["targets"]

# Spot-check Athletes / Enrollments / sample emails
out = {
    "athletes": {},
    "enrollments": {},
    "email_sample": [],
    "xp_sample": [],
    "foreign_athlete_ids_in_delete": [],
    "foreign_enrollment_ids_in_delete": [],
}
allowed_athletes = set(ATHLETES.values())
allowed_enrollments = set(ENROLLMENTS.values())

for rid in targets.get("Athletes") or []:
    rec = client.get_record("Athletes", rid)
    f = fields_of(rec)
    out["athletes"][rid] = {
        "First Name": f.get("First Name"),
        "Last Name": f.get("Last Name"),
        "Parent Email": f.get("Parent Email") or f.get("Parent Email - Cleaned"),
    }
    if rid not in allowed_athletes:
        out["foreign_athlete_ids_in_delete"].append(rid)

for rid in targets.get("Enrollments") or []:
    rec = client.get_record("Enrollments", rid)
    f = fields_of(rec)
    out["enrollments"][rid] = {
        "Athlete Name": f.get("Athlete Name") or f.get("Name"),
        "Season Sim": f.get("Season Sim Test Record?") or f.get("Simulation Run Id"),
    }
    if rid not in allowed_enrollments:
        out["foreign_enrollment_ids_in_delete"].append(rid)

# Sample email handoffs
for rid in (targets.get("Email Handoff Queue") or [])[:8]:
    rec = client.get_record("Email Handoff Queue", rid)
    f = fields_of(rec)
    out["email_sample"].append(
        {
            "id": rid,
            "Handoff Key": f.get("Handoff Key"),
            "Enrollment Record ID": f.get("Enrollment Record ID"),
            "Recipients JSON": str(f.get("Recipients JSON") or "")[:120],
            "Status": f.get("Status") or f.get("Handoff Status"),
        }
    )

for rid in (targets.get("XP Events") or [])[:5]:
    rec = client.get_record("XP Events", rid)
    f = fields_of(rec)
    out["xp_sample"].append(
        {
            "id": rid,
            "Source Key": f.get("Source Key"),
            "XP Reason Debug": str(f.get("XP Reason Debug") or "")[:160],
        }
    )

# Ensure every email handoff ties to allowed enrollments
foreign_email = 0
for rid in targets.get("Email Handoff Queue") or []:
    rec = client.get_record("Email Handoff Queue", rid)
    f = fields_of(rec)
    blob = json.dumps(f, default=str)
    if not any(e in blob for e in allowed_enrollments):
        # also accept athlete ids / run marker
        if not any(a in blob for a in allowed_athletes) and "222521Z" not in blob and "SEASON-SIM" not in blob:
            foreign_email += 1
            if foreign_email <= 5:
                out.setdefault("foreign_email_examples", []).append(
                    {"id": rid, "Handoff Key": f.get("Handoff Key"), "Enrollment Record ID": f.get("Enrollment Record ID")}
                )

out["foreign_email_count"] = foreign_email
out["marker"] = run_marker(RUN)
out["safe_email"] = SAFE_EMAIL_RECIPIENT
print(json.dumps(out, indent=2, default=str))
