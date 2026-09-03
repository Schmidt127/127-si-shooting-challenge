"""Delete XP / Email / Streak Occurrences extras for T213135Z after registry cleanup."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T213135Z-athlete1"
ENROLL = "recLlFgEVhhiCWSRY"
CONFIRM = f"CONFIRM-CLEANUP-{RUN}"
SAFE = "schmidt@fairfieldbasketballclub.com"
REG = Path(__file__).resolve().parent / "run_registries" / f"{RUN}.json"


def _enroll_match(value) -> bool:
    if value == ENROLL:
        return True
    if isinstance(value, list):
        return ENROLL in value or any(
            isinstance(x, dict) and x.get("id") == ENROLL for x in value
        )
    return ENROLL in str(value or "")


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != CONFIRM:
        print(f"Refused: pass {CONFIRM!r}")
        return 2
    reg = json.loads(REG.read_text(encoding="utf-8"))
    registry_ids = {r.get("record_id") for r in reg.get("records") or [] if r.get("record_id")}
    registry_ids.add(ENROLL)
    c = AirtableClient(allow_writes=True)

    xp = c.list_records(
        "XP Events",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=500,
    )
    emails = c.list_records(
        "Email Handoff Queue",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=300,
    )
    streaks = c.list_records(
        "Streak Occurrences",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=100,
    )

    xp_ids = []
    for r in xp:
        f = fields_of(r)
        sk = str(f.get("Source Key") or "")
        if not (
            _enroll_match(f.get("Enrollment Record ID"))
            or _enroll_match(f.get("Enrollment"))
            or any(sid in sk for sid in registry_ids if str(sid).startswith("rec"))
        ):
            print("ABORT XP", r["id"], sk[:80])
            return 3
        xp_ids.append(r["id"])

    email_ids = []
    for r in emails:
        f = fields_of(r)
        recip = str(f.get("Recipients JSON") or "").lower()
        if recip and SAFE not in recip:
            print("ABORT email recip", r["id"], recip[:80])
            return 3
        if not _enroll_match(f.get("Enrollment Record ID")):
            print("ABORT email", r["id"])
            return 3
        email_ids.append(r["id"])

    streak_ids = [r["id"] for r in streaks]

    for i in range(0, len(xp_ids), 10):
        c.delete_records("XP Events", xp_ids[i : i + 10])
        print("xp", i, len(xp_ids[i : i + 10]))
    for i in range(0, len(email_ids), 10):
        c.delete_records("Email Handoff Queue", email_ids[i : i + 10])
        print("email", i, len(email_ids[i : i + 10]))
    for i in range(0, len(streak_ids), 10):
        c.delete_records("Streak Occurrences", streak_ids[i : i + 10])
        print("streak", i, len(streak_ids[i : i + 10]))

    # verify
    left_xp = c.list_records(
        "XP Events",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=5,
    )
    left_email = c.list_records(
        "Email Handoff Queue",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=5,
    )
    left_streak = c.list_records(
        "Streak Occurrences",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=5,
    )
    print(
        json.dumps(
            {
                "deleted_xp": len(xp_ids),
                "deleted_email": len(email_ids),
                "deleted_streak": len(streak_ids),
                "left_xp": len(left_xp),
                "left_email": len(left_email),
                "left_streak": len(left_streak),
            },
            indent=2,
        )
    )
    return 0 if not left_xp and not left_email and not left_streak else 3


if __name__ == "__main__":
    raise SystemExit(main())
