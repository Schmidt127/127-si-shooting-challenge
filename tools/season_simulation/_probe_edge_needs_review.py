"""READ-ONLY: diagnose Edge Needs Review email handoffs for failed sim run."""
from __future__ import annotations

import json
import os
import sys
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

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
EDGE = "rectTQCRGIaK4W0IF"


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID)
    # Pull handoffs mentioning run marker (Notes / Subject / Handoff Key).
    formula = (
        f"AND("
        f"OR("
        f"FIND('{RUN}', {{Notes}} & ''),"
        f"FIND('{RUN}', {{Handoff Key}} & ''),"
        f"FIND('{RUN}', {{Subject}} & '')"
        f"),"
        f"{{Status}}='Needs Review'"
        f")"
    )
    try:
        recs = c.list_records("Email Handoff Queue", formula=formula, max_records=50)
    except Exception as exc:  # noqa: BLE001
        print("formula_failed", exc)
        # Broader pull then filter locally
        recs = c.list_records(
            "Email Handoff Queue",
            formula=f"{{Status}}='Needs Review'",
            max_records=200,
        )
        recs = [
            r
            for r in recs
            if RUN in json.dumps(r.get("fields") or {})
            or EDGE in json.dumps(r.get("fields") or {})
        ]

    out = []
    for r in recs:
        f = r.get("fields") or {}
        out.append(
            {
                "id": r.get("id"),
                "type": f.get("Email Type") or f.get("Type") or f.get("Handoff Type"),
                "status": f.get("Status"),
                "to": f.get("To") or f.get("Recipient Email") or f.get("To Email"),
                "handoff_key": f.get("Handoff Key") or f.get("Dedupe Key"),
                "review_reason": f.get("Needs Review Reason")
                or f.get("Review Reason")
                or f.get("Error")
                or f.get("Last Error")
                or f.get("Build Error")
                or f.get("Validation Message"),
                "field_keys": sorted(f.keys())[:40],
                "snippet": {
                    k: f.get(k)
                    for k in sorted(f.keys())
                    if any(
                        x in k.lower()
                        for x in (
                            "error",
                            "review",
                            "reason",
                            "to",
                            "recipient",
                            "status",
                            "type",
                            "key",
                            "subject",
                            "safe",
                            "allow",
                        )
                    )
                },
            }
        )
    print(json.dumps({"count": len(out), "records": out}, indent=2, default=str)[:12000])


if __name__ == "__main__":
    main()
