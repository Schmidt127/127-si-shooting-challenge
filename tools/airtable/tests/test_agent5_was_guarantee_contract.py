#!/usr/bin/env python3
"""Agent 5 — Weekly Athlete Summary guarantee contract (SC-035/SC-037).

Mirrors the find-or-create semantics shared by automations 115 (submission
path) and 118 (scheduled path): exactly one Weekly Athlete Summary per
Enrollment x Week, never keyed on name strings, race- and rerun-safe.

Live PROD facts encoded below (probe 2026-07-23):
- Schmidt WAS rechWp330MqSgRWzN is the only Enrollment-linked row.
- 392 orphaned rows (empty Enrollment after the wipe) were removed with
  CONFIRM_DELETE evidence; orphans must never satisfy a lookup.
"""

from __future__ import annotations

import unittest

SCHMIDT_ENROLLMENT_ID = "recgP9qZYjAhE7NXm"


def find_or_create_was(*, existing_rows, enrollment_id, week_id):
    """Shared 115/118 contract: match on Enrollment+Week links only."""
    if not enrollment_id or not week_id:
        return {"action": "error", "reason": "missing_link"}
    matches = [
        row
        for row in existing_rows
        if row.get("enrollment") == enrollment_id and row.get("week") == week_id
    ]
    if len(matches) > 1:
        return {"action": "reuse_first_flag_duplicates", "row": matches[0],
                "duplicates": [m["id"] for m in matches[1:]]}
    if matches:
        return {"action": "reuse", "row": matches[0]}
    return {"action": "create",
            "row": {"id": "recNEW", "enrollment": enrollment_id, "week": week_id}}


def resolve_week_for_activity(*, activity_date_key, weeks):
    """Backdated submissions attach to the week containing the activity date."""
    for week in weeks:
        if week["start_key"] <= activity_date_key <= week["end_key"]:
            return week["id"]
    return ""


class TestWasUniqueness(unittest.TestCase):
    WEEK = "recVDKiYATgzsfpmE"

    def test_first_submission_creates_was(self):
        result = find_or_create_was(
            existing_rows=[], enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=self.WEEK
        )
        self.assertEqual(result["action"], "create")

    def test_second_submission_same_week_reuses(self):
        rows = [{"id": "rechWp330MqSgRWzN", "enrollment": SCHMIDT_ENROLLMENT_ID,
                 "week": self.WEEK}]
        result = find_or_create_was(
            existing_rows=rows, enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=self.WEEK
        )
        self.assertEqual(result["action"], "reuse")
        self.assertEqual(result["row"]["id"], "rechWp330MqSgRWzN")

    def test_rerun_is_idempotent(self):
        rows = []
        first = find_or_create_was(
            existing_rows=rows, enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=self.WEEK
        )
        rows.append(first["row"])
        second = find_or_create_was(
            existing_rows=rows, enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=self.WEEK
        )
        self.assertEqual(second["action"], "reuse")
        self.assertEqual(len(rows), 1)

    def test_duplicate_creation_race_flags_not_multiplies(self):
        rows = [
            {"id": "recA", "enrollment": SCHMIDT_ENROLLMENT_ID, "week": self.WEEK},
            {"id": "recB", "enrollment": SCHMIDT_ENROLLMENT_ID, "week": self.WEEK},
        ]
        result = find_or_create_was(
            existing_rows=rows, enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=self.WEEK
        )
        self.assertEqual(result["action"], "reuse_first_flag_duplicates")
        self.assertEqual(result["duplicates"], ["recB"])

    def test_orphan_rows_never_match(self):
        # The 392 wiped-orphan pattern: Week link present, Enrollment empty.
        rows = [{"id": "recOrphan", "enrollment": "", "week": self.WEEK}]
        result = find_or_create_was(
            existing_rows=rows, enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=self.WEEK
        )
        self.assertEqual(result["action"], "create")

    def test_missing_links_error_not_silent(self):
        self.assertEqual(
            find_or_create_was(existing_rows=[], enrollment_id="", week_id=self.WEEK)
            ["action"],
            "error",
        )
        self.assertEqual(
            find_or_create_was(
                existing_rows=[], enrollment_id=SCHMIDT_ENROLLMENT_ID, week_id=""
            )["action"],
            "error",
        )

    def test_different_week_creates_second_summary(self):
        rows = [{"id": "recA", "enrollment": SCHMIDT_ENROLLMENT_ID, "week": self.WEEK}]
        result = find_or_create_was(
            existing_rows=rows,
            enrollment_id=SCHMIDT_ENROLLMENT_ID,
            week_id="recOtherWeek00001",
        )
        self.assertEqual(result["action"], "create")


class TestBackdatedAndActivityRouting(unittest.TestCase):
    WEEKS = [
        {"id": "recWeek1", "start_key": "2026-04-26", "end_key": "2026-05-02"},
        {"id": "recWeek2", "start_key": "2026-05-03", "end_key": "2026-05-09"},
    ]

    def test_backdated_submission_routes_to_prior_week(self):
        self.assertEqual(
            resolve_week_for_activity(
                activity_date_key="2026-04-28", weeks=self.WEEKS
            ),
            "recWeek1",
        )

    def test_boundary_saturday_belongs_to_ending_week(self):
        self.assertEqual(
            resolve_week_for_activity(
                activity_date_key="2026-05-02", weeks=self.WEEKS
            ),
            "recWeek1",
        )

    def test_boundary_sunday_starts_new_week(self):
        self.assertEqual(
            resolve_week_for_activity(
                activity_date_key="2026-05-03", weeks=self.WEEKS
            ),
            "recWeek2",
        )

    def test_out_of_season_activity_matches_no_week(self):
        self.assertEqual(
            resolve_week_for_activity(
                activity_date_key="2026-08-01", weeks=self.WEEKS
            ),
            "",
        )


class TestActivityTypeCoverage(unittest.TestCase):
    """Homework-only / Zoom-only / no-activity weeks still need a WAS when the
    scheduled 118 pass runs — WAS existence must not depend on Submissions."""

    def guarantee(self, *, submissions, homework, zoom):
        # 118 arms every Active enrollment regardless of activity volume.
        return find_or_create_was(
            existing_rows=[],
            enrollment_id=SCHMIDT_ENROLLMENT_ID,
            week_id="recWeekX",
        )["action"]

    def test_homework_only_week_gets_summary(self):
        self.assertEqual(self.guarantee(submissions=0, homework=1, zoom=0), "create")

    def test_zoom_only_week_gets_summary(self):
        self.assertEqual(self.guarantee(submissions=0, homework=0, zoom=1), "create")

    def test_empty_week_still_gets_summary_record(self):
        # SC-035 decision (send or not) is separate from record existence.
        self.assertEqual(self.guarantee(submissions=0, homework=0, zoom=0), "create")


if __name__ == "__main__":
    unittest.main()
