"""Count enrollment-scoped XP / streaks / unlocks / emails for closeout."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from season_simulation.airtable_client import AirtableClient, fields_of

ENROLL = "recmImoXTlKb5NWSY"
RUN = "SEASON-SIM-2027-20260905T122531Z-athlete1"
SAFE = "schmidt@fairfieldbasketballclub.com"
OUT = Path(__file__).resolve().parent / "reports" / f"reconcile-cascade-counts-{RUN}.json"

c = AirtableClient(allow_writes=False)

# Prefer Enrollment Record ID text formula field used by prior cleanups
formulas = [
    f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
    f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}) & '')",
]

xp_rows = []
used = None
for formula in formulas:
    try:
        xp_rows = c.list_records(
            "XP Events",
            fields=["Source Key", "XP Points", "Active?", "Enrollment", "Enrollment Record ID"],
            formula=formula,
        )
        used = formula
        if len(xp_rows) >= 50:
            break
    except Exception as exc:  # noqa: BLE001
        print("xp formula fail", formula, exc)

pref = Counter(str(fields_of(r).get("Source Key") or "").split("|")[0] for r in xp_rows)
sub = {
    str(fields_of(r).get("Source Key"))
    for r in xp_rows
    if str(fields_of(r).get("Source Key") or "").startswith("SUBMISSION_XP|")
}
missing: list[str] = []

# If still incomplete, expand via registry submission IDs
reg = json.loads(
    (Path(__file__).resolve().parent / "run_registries" / f"{RUN}.json").read_text(
        encoding="utf-8"
    )
)
sub_ids = [
    r["record_id"]
    for r in reg["records"]
    if r["table"] == "Submissions" and "|SUB|D" in (r.get("dedupe_key") or "")
]
if len(sub) < 58 and sub_ids:
    # OR of FIND for each submission id is too long; chunk by listing all XP and filtering client-side
    # Fall back: page all XP created today is too broad. Use Source Key contains each batch.
    found = dict(sub)
    missing = []
    for sid in sub_ids:
        key = f"SUBMISSION_XP|{sid}"
        if key in found:
            continue
        rows = c.list_records(
            "XP Events",
            fields=["Source Key", "XP Points", "Active?", "Enrollment"],
            formula=f"{{Source Key}}='{key}'",
        )
        if rows:
            for r in rows:
                xp_rows.append(r)
                found[key] = r["id"]
        else:
            missing.append(sid)
    sub = set(found)
    pref = Counter(str(fields_of(r).get("Source Key") or "").split("|")[0] for r in xp_rows)

streaks = []
for formula in formulas:
    try:
        streaks = c.list_records(
            "Streak Occurrences",
            fields=["Enrollment", "Enrollment Record ID"],
            formula=formula,
        )
        if streaks:
            break
    except Exception:  # noqa: BLE001
        continue

unlocks = []
for formula in formulas:
    try:
        unlocks = c.list_records(
            "Athlete Achievement Unlocks",
            fields=["Enrollment", "Enrollment Record ID"],
            formula=formula,
        )
        if unlocks is not None:
            break
    except Exception:  # noqa: BLE001
        continue

emails = c.list_records(
    "Email Handoff Queue",
    fields=["Handoff Key", "Status", "Recipients JSON", "Enrollment Record ID", "Event Type"],
    formula=f"{{Enrollment Record ID}}='{ENROLL}'",
)

out = {
    "xp_formula_used": used,
    "xp_total": len(xp_rows),
    "xp_by_prefix": dict(pref),
    "submission_xp_unique": len(sub),
    "submission_xp_missing_submission_ids": missing if "missing" in dir() else [],
    "streaks": len(streaks),
    "unlocks": len(unlocks),
    "emails": len(emails),
    "email_statuses": dict(Counter(str(fields_of(r).get("Status") or "") for r in emails)),
    "email_events": dict(Counter(str(fields_of(r).get("Event Type") or "") for r in emails)),
    "xp_ids": [r["id"] for r in xp_rows],
    "streak_ids": [r["id"] for r in streaks],
    "unlock_ids": [r["id"] for r in unlocks],
    "email_ids": [r["id"] for r in emails],
}
OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
print(json.dumps({k: out[k] for k in out if not k.endswith("_ids")}, indent=2))
print("Wrote", OUT)
