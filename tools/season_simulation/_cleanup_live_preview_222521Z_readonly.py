"""READ-ONLY live cleanup preview including automation descendants."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient  # noqa: E402
from season_simulation.cleanup import cleanup_preview_three  # noqa: E402
from season_simulation.constants import DEFAULT_BASE_ID, SAFE_EMAIL_RECIPIENT  # noqa: E402

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
REG_DIR = Path(__file__).resolve().parent / "run_registries"


def main() -> None:
    client = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    preview = cleanup_preview_three(run_id=RUN, registry_dir=REG_DIR, client=client)
    plan = preview.plan
    targets = plan.get("targets") or {}
    by_table = {k: len(v) for k, v in targets.items()}
    total = sum(by_table.values())
    print(
        json.dumps(
            {
                "mode": "live_readonly_preview",
                "allow_writes": False,
                "base_id": DEFAULT_BASE_ID,
                "run_id": RUN,
                "total_delete_targets": total,
                "by_table": dict(sorted(by_table.items(), key=lambda kv: (-kv[1], kv[0]))),
                "attendees_patches": len(plan.get("attendees_patches") or []),
                "errors": plan.get("errors") or preview.errors,
                "warnings_count": len(plan.get("warnings") or []),
                "warnings_sample": (plan.get("warnings") or [])[:20],
                "safe_email": SAFE_EMAIL_RECIPIENT,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
