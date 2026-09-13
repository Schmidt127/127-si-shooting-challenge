"""READ-ONLY: summarize cleanup inventory for failed three-athlete run."""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.cleanup import cleanup_preview_three  # noqa: E402
from season_simulation.constants import SAFE_EMAIL_RECIPIENT  # noqa: E402
from season_simulation.run_registry import load_registry  # noqa: E402

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
REG_DIR = Path(__file__).resolve().parent / "run_registries"
SUFFIXES = ("athlete1-perfect", "athlete2-recovery", "athlete3-edge")


def main() -> None:
    preview = cleanup_preview_three(run_id=RUN, registry_dir=REG_DIR, client=None)
    plan = preview.plan
    by = Counter()
    all_ids: list[tuple[str, str, str]] = []
    emails: set[str] = set()
    athlete_names: set[str] = set()
    missing_marker = 0

    for suffix in SUFFIXES:
        rid = f"{RUN}__{suffix}"
        reg = load_registry(REG_DIR, rid)
        print(
            json.dumps(
                {
                    "registry": rid,
                    "exists": True,
                    "status": reg.status,
                    "record_count": len(reg.records),
                    "athlete_id": reg.athlete_id,
                    "enrollment_id": reg.enrollment_id,
                }
            )
        )
        for r in reg.records:
            by[r.table] += 1
            all_ids.append((r.table, r.record_id or "", r.dedupe_key or ""))
            snap = r.fields_snapshot or {}
            for key in ("Parent Email", "Athlete Email", "Parent Email - Cleaned"):
                if snap.get(key):
                    emails.add(str(snap.get(key)))
            for key in ("First Name", "Athlete First Name", "Last Name", "Athlete Last Name"):
                if snap.get(key):
                    athlete_names.add(f"{key}={snap.get(key)}")
            blob = f"{r.dedupe_key}|{r.notes}|{json.dumps(snap, default=str)}"
            if "20260912T222521Z" not in blob and RUN not in blob:
                # still owned via registry file namespace
                missing_marker += 1

    unsafe = sorted(e for e in emails if e and e.lower() != SAFE_EMAIL_RECIPIENT.lower())
    print(
        json.dumps(
            {
                "cleanup_preview_total_records": plan.get("total_records"),
                "cleanup_preview_warnings": plan.get("warnings"),
                "cleanup_preview_errors": plan.get("errors") or preview.errors,
                "skipped_reference_tables": plan.get("skipped_reference_tables"),
                "attendees_patches": len(plan.get("attendees_patches") or []),
                "targets_structure": {
                    k: (
                        list(v.keys())
                        if isinstance(v, dict)
                        else (len(v) if isinstance(v, list) else type(v).__name__)
                    )
                    for k, v in (plan.get("targets") or {}).items()
                }
                if isinstance(plan.get("targets"), dict)
                else type(plan.get("targets")).__name__,
                "by_table": dict(by.most_common()),
                "total_registry_owned_rows": sum(by.values()),
                "emails_in_snapshots": sorted(emails),
                "unsafe_emails": unsafe,
                "athlete_name_fields": sorted(athlete_names),
                "rows_without_run_token_in_blob": missing_marker,
                "safe_email_constant": SAFE_EMAIL_RECIPIENT,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
