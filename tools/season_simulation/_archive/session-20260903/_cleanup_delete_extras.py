"""Delete out-of-registry XP Events + Email Handoff for cleaned run."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

ENROLL = "recO6jPoGznNtO7tp"
EMAIL_IDS = ["recHhxlnAjvYTaV7Z", "recdHBm621onPGXsn"]
MEETING = "recMJE0t5aR6ia8vl"


def main() -> int:
    c = AirtableClient(allow_writes=True)
    formula = "FIND('" + ENROLL + "', {Source Key})"
    rows = c.list_records("XP Events", formula=formula, max_records=100)
    xp_ids = [r["id"] for r in rows]
    for r in rows:
        print("XP", r["id"], fields_of(r).get("Source Key"))
    if xp_ids:
        c.delete_records("XP Events", xp_ids)
        print("deleted XP", len(xp_ids))
    else:
        print("no XP to delete")

    email_ok = []
    for eid in EMAIL_IDS:
        try:
            c.get_record("Email Handoff Queue", eid)
            email_ok.append(eid)
            print("EMAIL", eid)
        except Exception as exc:  # noqa: BLE001
            print("EMAIL missing", eid, str(exc)[:80])
    if email_ok:
        c.delete_records("Email Handoff Queue", email_ok)
        print("deleted emails", len(email_ok))

    m = c.get_record("Zoom Meetings", MEETING)
    atts = (m.get("fields") or {}).get("Attendees") or []
    print("Attendees", atts)
    print("sim enroll still on attendees?", ENROLL in str(atts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
