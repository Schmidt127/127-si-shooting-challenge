"""Regression tests for downstream settlement and business reconciliation."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from season_simulation.business_expectations import PERFECT_BUSINESS_EXPECTATIONS  # noqa: E402
from season_simulation.business_reconciliation import (  # noqa: E402
    bucketize_xp_events,
    duplicate_source_keys,
    stage_e2_business_success_hook,
)
from season_simulation.downstream_settlement import (  # noqa: E402
    classify_homework_completion,
    snapshot_downstream_checks,
)
from season_simulation.memory_client import MemoryAirtableClient  # noqa: E402
from season_simulation.run_registry import RunRegistry  # noqa: E402


class TestHomeworkClassification(unittest.TestCase):
    def test_settled_when_awarded_with_xp(self):
        st = classify_homework_completion(
            hc_id="recHC1",
            fields={
                "Award Status": "Awarded",
                "Homework XP Reconciliation Needed?": 0,
                "Weekly Athlete Summary Link": ["recWAS1"],
            },
            list_records=lambda *a, **k: [{"id": "recXP1"}],
        )
        self.assertTrue(st.ok)

    def test_pending_when_reconciliation_needed(self):
        st = classify_homework_completion(
            hc_id="recHC8",
            fields={
                "Award Status": "Pending",
                "Homework XP Reconciliation Needed?": 1,
            },
            list_records=lambda *a, **k: [],
        )
        self.assertFalse(st.ok)
        self.assertIn("Pending", st.detail)


class TestBusinessReconciliation(unittest.TestCase):
    def test_bucketize_perfect_submission_and_hw(self):
        events = [
            {
                "id": "rec1",
                "fields": {"Source Key": "SUBMISSION_XP|recS1", "XP Points": 20, "Active?": True},
            },
            {
                "id": "rec2",
                "fields": {"Source Key": "HOMEWORK_XP|recH1", "XP Points": 35, "Active?": True},
            },
        ]
        buckets = bucketize_xp_events(events)
        self.assertEqual(buckets["Submission XP"], 20)
        self.assertEqual(buckets["Homework XP"], 35)

    def test_e2_reads_live_events_not_zero_when_populated(self):
        client = MemoryAirtableClient(allow_writes=False)
        enr = "recEnrPerfect"
        client.tables.setdefault("XP Events", {})["recXpSub"] = {
            "id": "recXpSub",
            "fields": {
                "Source Key": "SUBMISSION_XP|recS1",
                "XP Points": 20,
                "Active?": True,
                "Enrollment": [enr],
            },
        }
        e2 = stage_e2_business_success_hook(
            client,
            enrollment_id=enr,
            profile="athlete1_perfect",
            cascade_complete=True,
            downstream_complete=True,
        )
        self.assertGreater(e2["actual_total_xp"], 0)
        self.assertNotEqual(e2["actual_total_xp"], 0)

    def test_e2_fails_when_buckets_short(self):
        client = MemoryAirtableClient(allow_writes=False)
        e2 = stage_e2_business_success_hook(
            client,
            enrollment_id="recEnrEmpty",
            profile="athlete1_perfect",
            cascade_complete=True,
            downstream_complete=True,
        )
        self.assertFalse(e2["pass"])
        self.assertEqual(e2["actual_total_xp"], 0)

    def test_no_duplicate_source_keys(self):
        events = [
            {"id": "a", "fields": {"Source Key": "HOMEWORK_XP|recH1", "Active?": True}},
            {"id": "b", "fields": {"Source Key": "HOMEWORK_XP|recH1", "Active?": True}},
        ]
        dupes = duplicate_source_keys(events)
        self.assertIn("HOMEWORK_XP|recH1", dupes)


class TestDownstreamSnapshot(unittest.TestCase):
    def test_streak_threshold_check_structure(self):
        client = MemoryAirtableClient(allow_writes=False)
        enr = "recEnr1"
        reg = RunRegistry(run_id="test", created_at="", enrollment_id=enr)
        reg.add("Homework Completions", "recHC1", dedupe_key="k1")
        client.tables["Enrollments"] = {
            enr: {
                "id": enr,
                "fields": {
                    "Current Shooting Streak": 67,
                    "Longest Streak Days": 40,
                    "Total Zoom Attendances": 1,
                },
            }
        }
        checks = snapshot_downstream_checks(
            client, reg, enrollment_id=enr, profile="athlete1_perfect"
        )
        names = {c.name for c in checks}
        self.assertIn("streak|50", names)
        self.assertIn("streak|60", names)
        self.assertIn("weekly_threshold_xp", names)
        self.assertIn("zoom_gate_effective", names)

    def test_perfect_expectations_total(self):
        self.assertEqual(PERFECT_BUSINESS_EXPECTATIONS["total_xp"], 4910)
        self.assertEqual(PERFECT_BUSINESS_EXPECTATIONS["buckets"]["Homework XP"], 630)
        self.assertEqual(PERFECT_BUSINESS_EXPECTATIONS["buckets"]["Weekly Threshold XP"], 480)


if __name__ == "__main__":
    unittest.main()
