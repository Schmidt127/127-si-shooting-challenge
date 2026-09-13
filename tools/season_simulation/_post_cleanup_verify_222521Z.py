"""Post-cleanup verification: zero remnants for failed three-athlete run."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from season_simulation.airtable_client import AirtableClient, fields_of  # noqa: E402
from season_simulation.cleanup import (  # noqa: E402
    cleanup_preview_three,
    discover_automation_descendants,
    run_marker,
)
from season_simulation.constants import DEFAULT_BASE_ID  # noqa: E402

RUN = "SEASON-SIM-2027-20260912T222521Z-threeathlete"
REG_DIR = Path(__file__).resolve().parent / "run_registries"
ENROLLMENTS = [
    "rec9pIjQFyKwgAJLG",
    "recjZLSqtwvewN2Pn",
    "rectTQCRGIaK4W0IF",
]
ATHLETES = [
    "recmqSM3317Q6eDuY",
    "recIjEihQ13fw4UID",
    "recf1fPLBF5eQH6Wq",
]


def main() -> None:
    c = AirtableClient(base_id=DEFAULT_BASE_ID, allow_writes=False)
    marker = run_marker(RUN)
    out: dict = {"marker": marker, "enrollment_gone": {}, "athlete_gone": {}, "tables": {}}

    for eid in ENROLLMENTS:
        try:
            c.get_record("Enrollments", eid)
            out["enrollment_gone"][eid] = False
        except Exception as exc:  # noqa: BLE001
            out["enrollment_gone"][eid] = True
            out.setdefault("enrollment_errors", {})[eid] = str(exc)[:120]

    for aid in ATHLETES:
        try:
            c.get_record("Athletes", aid)
            out["athlete_gone"][aid] = False
        except Exception as exc:  # noqa: BLE001
            out["athlete_gone"][aid] = True
            out.setdefault("athlete_errors", {})[aid] = str(exc)[:120]

    # Descendants for deleted enrollments should be empty
    descendants, warnings = discover_automation_descendants(
        c, run_id=RUN, enrollment_ids=ENROLLMENTS
    )
    out["descendant_counts"] = {k: len(v) for k, v in descendants.items()}
    out["descendant_warnings"] = warnings[:20]

    # Marker scans on key tables
    for table, field in (
        ("XP Events", "XP Reason Debug"),
        ("XP Events", "Source Key"),
        ("Submissions", "Video Upload Note"),
        ("Email Handoff Queue", "Handoff Key"),
        ("Email Handoff Queue", "Recipients JSON"),
    ):
        formula = f"FIND('{marker}', {{{field}}} & '')"
        try:
            rows = c.list_records(table, formula=formula, max_records=20)
            out["tables"][f"{table}:{field}"] = len(rows)
        except Exception as exc:  # noqa: BLE001
            # Also try run id token without SEASON-SIM| prefix
            out["tables"][f"{table}:{field}"] = f"error:{exc}"[:160]

    # Broader run token
    for table, field in (
        ("Submissions", "Video Upload Note"),
        ("XP Events", "Source Key"),
        ("Email Handoff Queue", "Enrollment Record ID"),
    ):
        formula = f"FIND('20260912T222521Z', {{{field}}} & '')"
        try:
            rows = c.list_records(table, formula=formula, max_records=20)
            out["tables"][f"{table}:{field}:token"] = len(rows)
        except Exception as exc:  # noqa: BLE001
            out["tables"][f"{table}:{field}:token"] = f"error:{exc}"[:160]

    # Enrollment-id residue in XP / Email / Streaks
    for eid in ENROLLMENTS:
        for table, formula in (
            ("XP Events", f"FIND('{eid}', {{Source Key}} & '')"),
            (
                "Email Handoff Queue",
                f"OR({{Enrollment Record ID}}='{eid}', FIND('{eid}', {{Recipients JSON}} & ''))",
            ),
            (
                "Streak Occurrences",
                f"OR(FIND('{eid}', ARRAYJOIN({{Enrollment}}) & ''), FIND('{eid}', {{Streak Occurrence Key}} & ''))",
            ),
            (
                "Weekly Athlete Summary",
                f"FIND('{eid}', ARRAYJOIN({{Enrollment}}) & '')",
            ),
            (
                "Submissions",
                f"FIND('{eid}', ARRAYJOIN({{Enrollment}}) & '')",
            ),
        ):
            try:
                rows = c.list_records(table, formula=formula, max_records=5)
                key = f"residue:{table}:{eid}"
                out.setdefault("residue", {})[key] = len(rows)
            except Exception as exc:  # noqa: BLE001
                out.setdefault("residue", {})[f"residue:{table}:{eid}"] = f"err:{exc}"[:100]

    # Cleanup preview should now be empty (or only missing IDs)
    preview = cleanup_preview_three(run_id=RUN, registry_dir=REG_DIR, client=c)
    plan = preview.plan
    targets = plan.get("targets") or {}
    out["post_cleanup_preview_total"] = sum(len(v) for v in targets.values())
    out["post_cleanup_preview_by_table"] = {k: len(v) for k, v in targets.items()}
    out["post_cleanup_preview_warnings_sample"] = (plan.get("warnings") or [])[:15]
    out["post_cleanup_errors"] = plan.get("errors") or preview.errors

    print(json.dumps(out, indent=2, default=str))


if __name__ == "__main__":
    main()
