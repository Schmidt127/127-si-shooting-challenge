"""READ-ONLY: Edge Needs Review handoff key collision analysis."""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

for p in [
    Path(__file__).with_name(".env"),
    ROOT.parent / ".env",
    ROOT.parent / "web" / ".env.local",
]:
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from season_simulation.airtable_client import AirtableClient  # noqa: E402
from season_simulation.constants import DEFAULT_BASE_ID  # noqa: E402

EDGE = "rectTQCRGIaK4W0IF"


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID)
    formula = (
        "AND({Status}='Needs Review',"
        f"{{Enrollment Record ID}}='{EDGE}')"
    )
    recs = c.list_records("Email Handoff Queue", formula=formula, max_records=20)
    keys = Counter()
    rows = []
    for r in recs:
        f = r["fields"]
        k = f.get("Handoff Key")
        keys[k] += 1
        rows.append(
            {
                "id": r["id"],
                "key": k,
                "attempts": f.get("Attempt Count"),
                "hub": f.get("Send to Hub?"),
                "test": f.get("Test Mode?"),
                "created": f.get("Created"),
            }
        )
    print(json.dumps({"needs_review": rows, "key_counts_in_nr": dict(keys)}, indent=2))
    for k in sorted(set(keys)):
        if not k:
            continue
        fr = c.list_records(
            "Email Handoff Queue",
            formula=f"{{Handoff Key}}='{k}'",
            max_records=10,
        )
        print(
            json.dumps(
                {
                    "key": k,
                    "all_statuses": [
                        {
                            "id": x["id"],
                            "status": x["fields"].get("Status"),
                            "created": x["fields"].get("Created"),
                        }
                        for x in fr
                    ],
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
