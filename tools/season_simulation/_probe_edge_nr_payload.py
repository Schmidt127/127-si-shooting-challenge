"""READ-ONLY: dump Payload JSON for Edge Needs Review handoffs."""
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

IDS = [
    "rec09ALPvmm92hwl4",
    "recIPKYEGzaI5zxc2",
    "recM2oXtQBKopz3xU",
]


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID)
    # Get all 6 via enrollment id
    formula = (
        "AND({Status}='Needs Review',"
        "{Enrollment Record ID}='rectTQCRGIaK4W0IF')"
    )
    recs = c.list_records("Email Handoff Queue", formula=formula, max_records=20)
    print("count", len(recs))
    for r in recs:
        f = r.get("fields") or {}
        payload = f.get("Payload JSON") or ""
        try:
            pj = json.loads(payload) if isinstance(payload, str) else payload
        except Exception:
            pj = {"raw": str(payload)[:500]}
        print(
            json.dumps(
                {
                    "id": r.get("id"),
                    "handoff_key": f.get("Handoff Key"),
                    "attempt": f.get("Attempt Count"),
                    "send_to_hub": f.get("Send to Hub?"),
                    "test_mode": f.get("Test Mode?"),
                    "payload_keys": sorted(pj.keys()) if isinstance(pj, dict) else type(pj).__name__,
                    "payload_error": (pj or {}).get("error")
                    if isinstance(pj, dict)
                    else None,
                    "payload_status": (pj or {}).get("status")
                    if isinstance(pj, dict)
                    else None,
                    "payload_reason": (pj or {}).get("reason")
                    or (pj or {}).get("needsReviewReason")
                    if isinstance(pj, dict)
                    else None,
                    "payload_snippet": {
                        k: (pj or {}).get(k)
                        for k in (
                            "error",
                            "errors",
                            "reason",
                            "status",
                            "message",
                            "validation",
                            "blockReason",
                            "needsReview",
                            "to",
                            "recipient",
                        )
                        if isinstance(pj, dict) and k in pj
                    },
                    "payload_preview": json.dumps(pj, default=str)[:800]
                    if pj
                    else "",
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main()
