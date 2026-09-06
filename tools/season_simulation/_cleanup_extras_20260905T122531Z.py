"""Delete enrollment-scoped XP / Email / Streak / Unlock extras after registry cleanup."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260905T122531Z-athlete1"
ENROLL = "recmImoXTlKb5NWSY"
ATHLETE = "recMuAvqA0zH1eGFj"
CONFIRM = f"CONFIRM-CLEANUP-{RUN}"
SAFE = "schmidt@fairfieldbasketballclub.com"
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
OUT = Path(__file__).resolve().parent / "reports" / f"cleanup-extras-{RUN}.json"


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != CONFIRM:
        print(f"Refused: pass {CONFIRM!r}")
        return 2

    c = AirtableClient(allow_writes=True)
    formula = f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')"

    xp = c.list_records("XP Events", formula=formula)
    emails = c.list_records(
        "Email Handoff Queue",
        formula=f"{{Enrollment Record ID}}='{ENROLL}'",
    )
    streaks = c.list_records("Streak Occurrences", formula=formula)
    try:
        unlocks = c.list_records(
            "Athlete Achievement Unlocks",
            formula=f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}) & '')",
        )
    except Exception as exc:  # noqa: BLE001
        print("unlocks list skipped:", exc)
        unlocks = []

    bad = []
    email_ids = []
    for r in emails:
        f = fields_of(r)
        recip = str(f.get("Recipients JSON") or "")
        for e in EMAIL_RE.findall(recip):
            if e.lower() != SAFE:
                bad.append({"id": r["id"], "email": e})
        email_ids.append(r["id"])
    if bad:
        print("ABORT non-allowlisted email", bad)
        return 3

    xp_ids = [r["id"] for r in xp]
    streak_ids = [r["id"] for r in streaks]
    unlock_ids = [r["id"] for r in unlocks]

    deleted = {"XP Events": [], "Email Handoff Queue": [], "Streak Occurrences": [], "Athlete Achievement Unlocks": []}
    for label, ids in [
        ("XP Events", xp_ids),
        ("Email Handoff Queue", email_ids),
        ("Streak Occurrences", streak_ids),
        ("Athlete Achievement Unlocks", unlock_ids),
    ]:
        for i in range(0, len(ids), 10):
            chunk = ids[i : i + 10]
            c.delete_records(label, chunk)
            deleted[label].extend(chunk)
            print("deleted", label, len(chunk))

    # Verify athlete/enrollment gone (registry cleanup should have removed)
    leftovers = {"athlete": False, "enrollment": False}
    try:
        c.get_record("Athletes", ATHLETE)
        leftovers["athlete"] = True
    except Exception:
        pass
    try:
        c.get_record("Enrollments", ENROLL)
        leftovers["enrollment"] = True
    except Exception:
        pass

    report = {
        "run_id": RUN,
        "enrollment_id": ENROLL,
        "deleted_counts": {k: len(v) for k, v in deleted.items()},
        "deleted": deleted,
        "leftovers": leftovers,
        "email_bad_recipients": bad,
    }
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["deleted_counts"], indent=2))
    print("leftovers", leftovers)
    print("Wrote", OUT)
    return 1 if any(leftovers.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
