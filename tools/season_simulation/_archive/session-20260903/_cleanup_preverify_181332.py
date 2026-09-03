"""Pre-verify disposable ownership for SEASON-SIM-2027-20260902T181332Z-athlete1.

Read-only. Does not delete.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.cleanup import build_cleanup_plan  # noqa: E402
from season_simulation.constants import REFERENCE_TABLES, SAFE_EMAIL_RECIPIENT  # noqa: E402
from season_simulation.run_registry import load_registry  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T181332Z-athlete1"
ENROLL = "recD7sivJvlncZVex"
ATHLETE = "recU4HjofACTDwjK7"
EMAIL_IDS = ("recQU4aDux4XRtmbL", "rec776koIp0e5O95X")
ROOT = Path(__file__).resolve().parent
REG_DIR = ROOT / "run_registries"


def main() -> int:
    reg = load_registry(REG_DIR, RUN)
    plan = build_cleanup_plan(run_id=RUN, registry_dir=REG_DIR)
    c = AirtableClient(allow_writes=False)

    print("=== REGISTRY ===")
    print("run_id", reg.run_id)
    print("status", reg.status)
    print("athlete_id", reg.athlete_id, "expected", ATHLETE)
    print("enrollment_id", reg.enrollment_id, "expected", ENROLL)
    print("live_zoom", reg.meta.get("zoom_live_meeting_id"))
    print("rec_zoom", reg.meta.get("zoom_recorded_meeting_id"))
    print("attendees_patches meta", reg.meta.get("zoom_attendees_patches") or [])
    print("plan attendees_patches", plan.attendees_patches)
    print("plan total", plan.total_records())
    print("skipped_reference", plan.skipped_reference_tables)
    print("plan errors", plan.errors)
    print("plan warnings", plan.warnings)

    print("\n=== REGISTRY TARGETS BY TABLE ===")
    for table, ids in sorted(plan.targets.items(), key=lambda x: (-len(x[1]), x[0])):
        if not ids:
            continue
        print(f"{table}: {len(ids)}")
        for rid in ids:
            print(f"  {rid}")

    forbidden = set(REFERENCE_TABLES) - {"Zoom Meetings"}
    hit_forbidden = [t for t in plan.targets if t in forbidden and plan.targets[t]]
    print("\nforbidden tables in plan?", hit_forbidden or "none")

    ath = fields_of(c.get_record("Athletes", ATHLETE))
    enr = fields_of(c.get_record("Enrollments", ENROLL))
    print("\n=== DISPOSABLE IDENTITY ===")
    print("athlete", ath.get("First Name"), ath.get("Last Name"), ath.get("Parent Email"))
    print(
        "enrollment",
        enr.get("Athlete First Name"),
        enr.get("Athlete Last Name"),
        enr.get("Parent Email"),
        enr.get("School Year"),
    )
    ok_name = ath.get("First Name") == "Athlete" and str(ath.get("Last Name")) == "1"
    ok_email = (ath.get("Parent Email") or "").lower() == SAFE_EMAIL_RECIPIENT.lower()
    ok_enroll_email = (enr.get("Parent Email") or "").lower() == SAFE_EMAIL_RECIPIENT.lower()
    print("ok_name", ok_name, "ok_email", ok_email, "ok_enroll_email", ok_enroll_email)

    # Zoom meetings — must be registry sim-created
    for label, mid in (
        ("live", reg.meta.get("zoom_live_meeting_id")),
        ("rec", reg.meta.get("zoom_recorded_meeting_id")),
    ):
        m = fields_of(c.get_record("Zoom Meetings", mid))
        print(
            f"zoom_{label}",
            mid,
            "name=",
            m.get("Meeting Name"),
            "attendees=",
            m.get("Attendees"),
            "in_plan=",
            mid in (plan.targets.get("Zoom Meetings") or []),
        )

    xp = c.list_records(
        "XP Events",
        formula=f"{{Enrollment Record ID}}='{ENROLL}'",
        max_records=300,
    )
    print("\n=== XP EVENTS ===", len(xp))
    prefixes = Counter()
    foreign = []
    for r in xp:
        f = fields_of(r)
        sk = str(f.get("Source Key") or "")
        prefixes[sk.split("|")[0] if sk else "?"] += 1
        # Must reference this enrollment in Source Key or Enrollment Record ID
        if ENROLL not in sk and f.get("Enrollment Record ID") != ENROLL:
            # Enrollment Record ID formula may be string
            erid = f.get("Enrollment Record ID")
            if erid != ENROLL and ENROLL not in str(erid):
                foreign.append(r["id"])
    print("prefixes", dict(prefixes))
    print("foreign_xp", foreign or "none")

    eh = []
    for eid in EMAIL_IDS:
        try:
            r = c.get_record("Email Handoff Queue", eid)
            f = fields_of(r)
            eh.append(
                {
                    "id": eid,
                    "Event Type": f.get("Event Type"),
                    "Status": f.get("Status"),
                    "Enrollment Record ID": f.get("Enrollment Record ID"),
                    "Handoff Key": f.get("Handoff Key"),
                }
            )
        except Exception as exc:  # noqa: BLE001
            eh.append({"id": eid, "error": str(exc)[:120]})
    print("\n=== EMAIL HANDOFFS ===")
    print(json.dumps(eh, indent=2, default=str))

    out = {
        "run_id": RUN,
        "enrollment": ENROLL,
        "athlete": ATHLETE,
        "plan_total": plan.total_records(),
        "targets": {k: v for k, v in plan.targets.items() if v},
        "attendees_patches": plan.attendees_patches,
        "xp_count": len(xp),
        "xp_ids": [r["id"] for r in xp],
        "xp_prefixes": dict(prefixes),
        "email_handoffs": eh,
        "disposable_ok": bool(ok_name and ok_email and ok_enroll_email and not foreign and not hit_forbidden),
        "confirmation_token_required": f"CONFIRM-CLEANUP-{RUN}",
    }
    path = ROOT / "reports" / f"cleanup-preverify-{RUN}.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("\nwrote", path)
    print("DISPOSABLE_OK", out["disposable_ok"])
    return 0 if out["disposable_ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
