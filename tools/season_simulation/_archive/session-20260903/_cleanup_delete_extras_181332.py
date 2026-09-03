"""Delete verified out-of-registry XP + Email Handoff for 181332Z run only.

Requires preverify JSON from _cleanup_preverify_181332.py.
Authorized by: CONFIRM-CLEANUP-SEASON-SIM-2027-20260902T181332Z-athlete1
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T181332Z-athlete1"
ENROLL = "recD7sivJvlncZVex"
CONFIRM = f"CONFIRM-CLEANUP-{RUN}"
ROOT = Path(__file__).resolve().parent
PRE = ROOT / "reports" / f"cleanup-preverify-{RUN}.json"


def _enrollment_matches(value: object, enroll: str) -> bool:
    if value == enroll:
        return True
    if isinstance(value, list):
        return enroll in value or any(
            isinstance(x, dict) and x.get("id") == enroll for x in value
        )
    return enroll in str(value or "")


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != CONFIRM:
        print(f"Refused: pass exact token {CONFIRM!r}")
        return 2
    pre = json.loads(PRE.read_text(encoding="utf-8"))
    if not pre.get("disposable_ok"):
        print("Refused: preverify disposable_ok is false")
        return 2
    if pre.get("enrollment") != ENROLL or pre.get("run_id") != RUN:
        print("Refused: preverify identity mismatch")
        return 2

    xp_ids = list(pre.get("xp_ids") or [])
    email_ids = [e["id"] for e in (pre.get("email_handoffs") or []) if e.get("id") and not e.get("error")]
    if len(xp_ids) != 87:
        print(f"Refused: expected 87 XP ids, got {len(xp_ids)}")
        return 2
    if len(email_ids) != 2:
        print(f"Refused: expected 2 email ids, got {len(email_ids)}")
        return 2

    c = AirtableClient(allow_writes=True)

    # Re-confirm each XP still belongs to this enrollment only.
    confirmed_xp: list[str] = []
    for rid in xp_ids:
        f = fields_of(c.get_record("XP Events", rid))
        erid = f.get("Enrollment Record ID")
        sk = str(f.get("Source Key") or "")
        enroll_links = f.get("Enrollment")
        if not (
            _enrollment_matches(erid, ENROLL)
            or ENROLL in sk
            or _enrollment_matches(enroll_links, ENROLL)
        ):
            print("ABORT foreign XP", rid, erid, sk[:80])
            return 3
        confirmed_xp.append(rid)

    confirmed_email: list[str] = []
    for rid in email_ids:
        f = fields_of(c.get_record("Email Handoff Queue", rid))
        if not _enrollment_matches(f.get("Enrollment Record ID"), ENROLL):
            print("ABORT foreign email", rid, f.get("Enrollment Record ID"))
            return 3
        confirmed_email.append(rid)

    # Delete XP in batches of 10
    deleted_xp: list[str] = []
    for i in range(0, len(confirmed_xp), 10):
        batch = confirmed_xp[i : i + 10]
        c.delete_records("XP Events", batch)
        deleted_xp.extend(batch)
        print("deleted XP batch", len(batch), "total", len(deleted_xp))

    c.delete_records("Email Handoff Queue", confirmed_email)
    print("deleted email", confirmed_email)

    out = {
        "run_id": RUN,
        "confirmation": CONFIRM,
        "deleted_xp": len(deleted_xp),
        "deleted_email": confirmed_email,
    }
    path = ROOT / "reports" / f"cleanup-extras-result-{RUN}.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
