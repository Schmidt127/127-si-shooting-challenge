"""Delete XP + Email Handoff extras for T202049Z after registry cleanup.

Requires preverify JSON. Token: CONFIRM-CLEANUP-SEASON-SIM-2027-20260902T202049Z-athlete1
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ENROLL = "recekm0ke1bihWAc3"
CONFIRM = f"CONFIRM-CLEANUP-{RUN}"
PRE = Path(__file__).resolve().parent / "reports" / f"cleanup-preverify-{RUN}.json"
SAFE = "schmidt@fairfieldbasketballclub.com"


def _enroll_match(value: object) -> bool:
    if value == ENROLL:
        return True
    if isinstance(value, list):
        return ENROLL in value or any(
            isinstance(x, dict) and x.get("id") == ENROLL for x in value
        )
    return ENROLL in str(value or "")


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] != CONFIRM:
        print(f"Refused: pass exact token {CONFIRM!r}")
        return 2
    pre = json.loads(PRE.read_text(encoding="utf-8"))
    if pre.get("enrollment") != ENROLL or pre.get("run_id") != RUN:
        print("Refused: preverify identity mismatch")
        return 2

    xp_ids = list(pre.get("xp_ids") or [])
    email_ids = [e["id"] for e in (pre.get("email_handoffs") or []) if e.get("id")]
    reg = json.loads(
        (Path(__file__).resolve().parent / "run_registries" / f"{RUN}.json").read_text(
            encoding="utf-8"
        )
    )
    registry_ids = {r.get("record_id") for r in (reg.get("records") or []) if r.get("record_id")}
    registry_ids.add(ENROLL)
    c = AirtableClient(allow_writes=True)

    confirmed_xp: list[str] = []
    for rid in xp_ids:
        try:
            f = fields_of(c.get_record("XP Events", rid))
        except Exception as exc:  # noqa: BLE001
            print("skip missing XP", rid, exc)
            continue
        sk = str(f.get("Source Key") or "")
        sk_hits_registry = any(sid and sid in sk for sid in registry_ids if str(sid).startswith("rec"))
        if not (
            _enroll_match(f.get("Enrollment Record ID"))
            or _enroll_match(f.get("Enrollment"))
            or ENROLL in sk
            or RUN in sk
            or sk_hits_registry
        ):
            print("ABORT foreign XP", rid, sk[:100])
            return 3
        confirmed_xp.append(rid)

    confirmed_email: list[str] = []
    for rid in email_ids:
        try:
            f = fields_of(c.get_record("Email Handoff Queue", rid))
        except Exception as exc:  # noqa: BLE001
            print("skip missing email", rid, exc)
            continue
        recipients = str(f.get("Recipients JSON") or "").lower()
        hk = str(f.get("Handoff Key") or "")
        payload = str(f.get("Payload JSON") or "")
        source = str(f.get("Source Record ID") or "")
        if recipients and SAFE not in recipients:
            print("ABORT non-allowlisted email", rid, recipients[:120])
            return 3
        if not (
            _enroll_match(f.get("Enrollment Record ID"))
            or ENROLL in hk
            or RUN in hk
            or RUN in payload
            or source in registry_ids
            or any(sid in hk for sid in registry_ids if str(sid).startswith("rec"))
        ):
            print("ABORT foreign email", rid, f.get("Enrollment Record ID"), hk[:80])
            return 3
        confirmed_email.append(rid)

    for i in range(0, len(confirmed_xp), 10):
        batch = confirmed_xp[i : i + 10]
        c.delete_records("XP Events", batch)
        print("deleted_xp_batch", len(batch))
    for i in range(0, len(confirmed_email), 10):
        batch = confirmed_email[i : i + 10]
        c.delete_records("Email Handoff Queue", batch)
        print("deleted_email_batch", len(batch))

    print(
        json.dumps(
            {
                "deleted_xp": len(confirmed_xp),
                "deleted_email": len(confirmed_email),
                "run_id": RUN,
                "enrollment": ENROLL,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
