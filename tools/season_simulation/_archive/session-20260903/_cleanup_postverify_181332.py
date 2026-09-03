"""Post-cleanup verification for SEASON-SIM-2027-20260902T181332Z-athlete1."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.cleanup import build_cleanup_plan  # noqa: E402
from season_simulation.run_registry import load_registry  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T181332Z-athlete1"
ENROLL = "recD7sivJvlncZVex"
ATHLETE = "recU4HjofACTDwjK7"
EMAIL_IDS = ("recQU4aDux4XRtmbL", "rec776koIp0e5O95X")
ROOT = Path(__file__).resolve().parent
REG_DIR = ROOT / "run_registries"


def _gone(c: AirtableClient, table: str, rid: str) -> bool:
    try:
        c.get_record(table, rid)
        return False
    except Exception:  # noqa: BLE001
        return True


def main() -> int:
    reg = load_registry(REG_DIR, RUN)
    plan = build_cleanup_plan(run_id=RUN, registry_dir=REG_DIR)
    c = AirtableClient(allow_writes=False)

    remaining: dict[str, list[str]] = {}
    for table, ids in plan.targets.items():
        for rid in ids:
            if not _gone(c, table, rid):
                remaining.setdefault(table, []).append(rid)

    xp = c.list_records(
        "XP Events",
        formula=f"{{Enrollment Record ID}}='{ENROLL}'",
        max_records=50,
    )
    email_remaining = []
    for eid in EMAIL_IDS:
        if not _gone(c, "Email Handoff Queue", eid):
            email_remaining.append(eid)

    # Spot-check Weeks / PHA unchanged existence (sample from preflight refs)
    weeks_ok = True
    try:
        # any Weeks table list shouldn't fail
        c.list_records("Weeks", max_records=1)
        c.list_records("Program Homework Assignments", max_records=1)
    except Exception as exc:  # noqa: BLE001
        weeks_ok = False
        print("schema_spotcheck_error", exc)

    out = {
        "run_id": RUN,
        "registry_remaining": remaining,
        "registry_remaining_count": sum(len(v) for v in remaining.values()),
        "xp_remaining": len(xp),
        "email_remaining": email_remaining,
        "athlete_gone": _gone(c, "Athletes", ATHLETE),
        "enrollment_gone": _gone(c, "Enrollments", ENROLL),
        "live_zoom_gone": _gone(c, "Zoom Meetings", reg.meta.get("zoom_live_meeting_id")),
        "rec_zoom_gone": _gone(c, "Zoom Meetings", reg.meta.get("zoom_recorded_meeting_id")),
        "weeks_pha_reachable": weeks_ok,
        "clean": (
            not remaining
            and len(xp) == 0
            and not email_remaining
            and _gone(c, "Athletes", ATHLETE)
            and _gone(c, "Enrollments", ENROLL)
        ),
    }
    path = ROOT / "reports" / f"cleanup-postverify-{RUN}.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps(out, indent=2))
    return 0 if out["clean"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
