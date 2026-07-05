"""One-off dry-run report for H-001 duplicate unlock groups. Read-only."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import requests

from run_final_090_audits import AuditContext, fields_of, first_id, linked_ids, load_token, txt

NONE = "NONE"


def main() -> None:
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {load_token()}"
    ctx = AuditContext(session)
    ctx.load()

    by_combo: dict[str, list] = defaultdict(list)
    by_source: dict[str, list] = defaultdict(list)
    empty_week_shot: list[dict] = []

    for unlock in ctx.unlocks:
        f = fields_of(unlock)
        enrollment_id = first_id(f.get("Enrollment"))
        if enrollment_id and enrollment_id not in ctx.active_ids:
            continue

        unlock_id = unlock["id"]
        achievement_id = first_id(f.get("Achievement"))
        week_id = first_id(f.get("Week"))
        shot_milestone_id = first_id(f.get("Shot Milestone"))
        source_key = txt(f.get("Milestone Source Key"))
        xp_status = txt(f.get("XP Award Status"))
        xp_ids = linked_ids(f.get("XP Events"))

        row = {
            "unlockId": unlock_id,
            "enrollmentId": enrollment_id,
            "achievementId": achievement_id,
            "weekId": week_id or NONE,
            "shotMilestoneId": shot_milestone_id,
            "sourceKey": source_key,
            "xpAwardStatus": xp_status,
            "xpEventIds": xp_ids,
            "xpEventCount": len(xp_ids),
        }

        if not week_id and shot_milestone_id:
            empty_week_shot.append(row)

        if enrollment_id and achievement_id:
            combo_key = f"{enrollment_id}|{achievement_id}|{week_id or NONE}"
            by_combo[combo_key].append(row)

        if source_key:
            by_source[source_key].append(row)

    dup_groups = [
        {"comboKey": key, "count": len(rows), "unlocks": rows}
        for key, rows in by_combo.items()
        if len(rows) > 1
    ]
    dup_source = [
        {
            "sourceKey": key,
            "count": len(rows),
            "unlockIds": [row["unlockId"] for row in rows],
        }
        for key, rows in by_source.items()
        if len(rows) > 1
    ]

    report = {
        "auditDate": "2026-07-05",
        "scopedUnlocks": sum(
            1
            for unlock in ctx.unlocks
            if not (eid := first_id(fields_of(unlock).get("Enrollment")))
            or eid in ctx.active_ids
        ),
        "duplicateEnrollmentAchievementWeekGroups": len(dup_groups),
        "duplicateMilestoneSourceKeyGroups": len(dup_source),
        "emptyWeekShotMilestoneCount": len(empty_week_shot),
        "duplicateGroups": dup_groups,
        "duplicateSourceKeyGroups": dup_source,
        "emptyWeekShotMilestoneSample": empty_week_shot[:15],
    }

    out_path = Path(__file__).resolve().parent / "_preview" / "h001-090f-dry-run.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
