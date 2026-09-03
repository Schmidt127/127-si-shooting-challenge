"""Quick settle poll for XP + daily emails."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402

ENROLL = "recLlFgEVhhiCWSRY"


def main() -> int:
    c = AirtableClient(allow_writes=False)
    xp = c.list_records(
        "XP Events",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=500,
    )
    active = [r for r in xp if fields_of(r).get("Active?") is True]
    by = Counter(str(fields_of(r).get("XP Source")) for r in active)
    emails = c.list_records(
        "Email Handoff Queue",
        formula=f"FIND('{ENROLL}', {{Enrollment Record ID}} & '')",
        max_records=300,
    )
    et = Counter(str(fields_of(r).get("Event Type")) for r in emails)
    st = Counter(str(fields_of(r).get("Status")) for r in emails)
    print(
        json.dumps(
            {
                "xp_active": len(active),
                "xp_points": sum(float(fields_of(r).get("XP Points") or 0) for r in active),
                "by_source": dict(by),
                "emails": len(emails),
                "email_types": dict(et),
                "email_status": dict(st),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
