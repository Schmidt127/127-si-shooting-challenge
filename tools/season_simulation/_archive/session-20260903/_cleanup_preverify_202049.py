"""Preverify XP + Email Handoff extras for SEASON-SIM-2027-20260902T202049Z-athlete1."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

RUN = "SEASON-SIM-2027-20260902T202049Z-athlete1"
ENROLL = "recekm0ke1bihWAc3"
ATHLETE = "recGTljTSqelacjyp"
MARKER = f"SEASON-SIM|{RUN}"
OUT = Path(__file__).resolve().parent / "reports" / f"cleanup-preverify-{RUN}.json"


def _enroll_match(value: object) -> bool:
    if value == ENROLL:
        return True
    if isinstance(value, list):
        return ENROLL in value or any(
            isinstance(x, dict) and x.get("id") == ENROLL for x in value
        )
    return ENROLL in str(value or "")


def main() -> int:
    c = AirtableClient(allow_writes=False)
    formulas = [
        f"FIND('{MARKER}', {{Source Key}} & '')",
        f"FIND('{RUN}', {{Source Key}} & '')",
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        f"FIND('{ENROLL}', ARRAYJOIN({{Enrollment}}))",
    ]
    xp_ids: list[str] = []
    seen: set[str] = set()
    strat: dict = {}
    for formula in formulas:
        try:
            rows = c.list_records("XP Events", formula=formula, max_records=500)
        except Exception as exc:  # noqa: BLE001
            strat[formula] = {"error": str(exc)}
            continue
        strat[formula] = {"count": len(rows)}
        for r in rows:
            if r["id"] in seen:
                continue
            f = fields_of(r)
            if not (
                _enroll_match(f.get("Enrollment Record ID"))
                or _enroll_match(f.get("Enrollment"))
                or ENROLL in str(f.get("Source Key") or "")
                or RUN in str(f.get("Source Key") or "")
                or MARKER in str(f.get("Source Key") or "")
            ):
                continue
            seen.add(r["id"])
            xp_ids.append(r["id"])

    email_formulas = [
        f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        f"FIND('{RUN}', {{Handoff Key}} & '')",
        f"FIND('{RUN}', {{Payload JSON}} & '')",
        f"FIND('rec6jdIPEkloW1rNK', {{Handoff Key}} & '')",
    ]
    emails: list[dict] = []
    eseen: set[str] = set()
    for formula in email_formulas:
        try:
            rows = c.list_records("Email Handoff Queue", formula=formula, max_records=200)
        except Exception as exc:  # noqa: BLE001
            continue
        for r in rows:
            if r["id"] in eseen:
                continue
            f = fields_of(r)
            if not (
                _enroll_match(f.get("Enrollment Record ID"))
                or RUN in str(f.get("Handoff Key") or "")
                or RUN in str(f.get("Payload JSON") or "")
                or ENROLL in str(f.get("Handoff Key") or "")
                or "rec6jdIPEkloW1rNK" in str(f.get("Handoff Key") or "")
            ):
                continue
            eseen.add(r["id"])
            emails.append(
                {
                    "id": r["id"],
                    "Handoff Key": f.get("Handoff Key"),
                    "Status": f.get("Status"),
                    "Enrollment Record ID": f.get("Enrollment Record ID"),
                    "Recipients JSON": f.get("Recipients JSON"),
                    "Event Type": f.get("Event Type"),
                }
            )

    from season_simulation.airtable_client import load_token

    hub = AirtableClient(token=load_token(), base_id="appYG1t5DBRimHBCT", allow_writes=False)
    allow = hub.list_records("tblLaT13IVSPeyOnM", max_records=100)
    allow_rows = []
    for r in allow:
        f = fields_of(r)
        allow_rows.append(
            {
                "id": r["id"],
                "address": f.get("fldiJc0ocPefGcdSB") or f.get("Address") or f.get("Email"),
                "active": f.get("fldBzuQfi67dzub0b", f.get("Active?")),
                "channel": f.get("fld4NVeqJg3RjvJUj", f.get("Channel")),
                "raw": f,
            }
        )

    report = {
        "run_id": RUN,
        "enrollment": ENROLL,
        "athlete": ATHLETE,
        "xp_ids": xp_ids,
        "xp_count": len(xp_ids),
        "xp_strategies": strat,
        "email_handoffs": emails,
        "email_count": len(emails),
        "hub_allowlist_rows": allow_rows,
        "disposable_ok": True,
    }
    OUT.write_text(json.dumps(report, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["run_id", "xp_count", "email_count", "disposable_ok"]}, indent=2))
    print("emails", [(e["id"], e["Event Type"], e["Status"]) for e in emails])
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
