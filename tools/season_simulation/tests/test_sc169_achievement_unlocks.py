#!/usr/bin/env python3
"""Offline tests for SC-169 achievement unlock expectations + cascade query."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.expectations_achievements import (  # noqa: E402
    ShotMilestoneDef,
    athlete1_t122531z_expectation,
    build_achievement_expectation,
    compare_unlock_source_keys,
    extract_grade_band_from_milestone_lookup,
    grade_band_matches,
    perfect_week_source_key,
    select_crossed_shot_milestones,
    shot_milestone_source_key,
)
from season_simulation.unlock_cascade_query import (  # noqa: E402
    broken_unlock_count_pattern_explanation,
    list_unlocks_for_enrollment,
    unlock_formulas_for_enrollment,
    unlock_source_keys,
)


class TestGradeBandMatch(unittest.TestCase):
    def test_id_match_preferred(self):
        self.assertTrue(
            grade_band_matches(
                enrollment_band_id="rec75ruo3XT5nSvaK",
                enrollment_band_name="9-12",
                milestone_band_id="rec75ruo3XT5nSvaK",
                milestone_band_name="other",
            )
        )

    def test_label_fallback_normalizes(self):
        self.assertTrue(
            grade_band_matches(
                enrollment_band_id="",
                enrollment_band_name="Grades 9–12",
                milestone_band_id="",
                milestone_band_name="9-12",
            )
        )

    def test_lookup_nested_mcp_shape(self):
        raw = {
            "linkedRecordIds": ["recHE7FhreD1jqfXm"],
            "valuesByLinkedRecordId": {
                "recHE7FhreD1jqfXm": [{"id": "rec75ruo3XT5nSvaK", "name": "9-12"}]
            },
        }
        band_id, band_name = extract_grade_band_from_milestone_lookup(raw)
        self.assertEqual(band_id, "rec75ruo3XT5nSvaK")
        self.assertEqual(band_name, "9-12")


class TestCrossedMilestones(unittest.TestCase):
    def setUp(self):
        self.ms = [
            ShotMilestoneDef("recA", 3000, 10, "25%", True, "recGB", "9-12"),
            ShotMilestoneDef("recB", 6000, 15, "50%", True, "recGB", "9-12"),
            ShotMilestoneDef("recC", 9000, 20, "75%", True, "recGB", "9-12"),
            ShotMilestoneDef("recD", 12000, 30, "100%", True, "recGB", "9-12"),
            ShotMilestoneDef("recE", 14400, 40, "120%", True, "recGB", "9-12"),
            ShotMilestoneDef("recF", 3000, 10, "wrong", True, "recOTHER", "3-4"),
            ShotMilestoneDef("recG", 1000, 5, "inactive", False, "recGB", "9-12"),
        ]

    def test_crosses_four_at_13906(self):
        crossed = select_crossed_shot_milestones(
            self.ms,
            total_shots=13906,
            grade_band_id="recGB",
            grade_band_name="9-12",
        )
        self.assertEqual([m.record_id for m in crossed], ["recA", "recB", "recC", "recD"])

    def test_scenario_must_cross_at_least_one_milestone(self):
        """Sim scenarios that intend unlock coverage must clear ≥1 threshold."""
        crossed = select_crossed_shot_milestones(
            self.ms,
            total_shots=3500,
            grade_band_id="recGB",
            grade_band_name="9-12",
        )
        self.assertGreaterEqual(len(crossed), 1)
        exp = build_achievement_expectation(
            enrollment_id="recEnr",
            grade_band_id="recGB",
            grade_band_name="9-12",
            total_shots_counted=3500,
            milestones=self.ms,
            perfect_week_eligible_count=0,
        )
        self.assertGreaterEqual(exp.expected_unlock_count, 1)
        self.assertTrue(
            all(u.source_key.startswith("SHOT_MILESTONE|") for u in exp.expected_shot_milestone_unlocks)
        )


class TestT122531ZExpectation(unittest.TestCase):
    def test_frozen_sim_expects_four_milestones_zero_pw(self):
        exp = athlete1_t122531z_expectation()
        self.assertEqual(exp.expected_unlock_count, 4)
        self.assertEqual(exp.expected_shot_milestone_xp_count, 4)
        self.assertEqual(exp.perfect_week_eligible_count, 0)
        self.assertEqual(len(exp.expected_perfect_week_unlocks), 0)
        self.assertFalse(exp.to_dict()["streaks_use_unlock_table"])
        keys = [u.source_key for u in exp.expected_shot_milestone_unlocks]
        self.assertEqual(
            keys,
            [
                "SHOT_MILESTONE|recmImoXTlKb5NWSY|recjHsGxBGVoZ1Atb",
                "SHOT_MILESTONE|recmImoXTlKb5NWSY|recbUUwpAA6M91mH6",
                "SHOT_MILESTONE|recmImoXTlKb5NWSY|recuLqXBSyB7PE7jC",
                "SHOT_MILESTONE|recmImoXTlKb5NWSY|recSiWHRSsdjKytFU",
            ],
        )

    def test_compare_matches_live_orphan_keys(self):
        exp = athlete1_t122531z_expectation()
        actual = [
            "SHOT_MILESTONE|recmImoXTlKb5NWSY|recjHsGxBGVoZ1Atb",
            "SHOT_MILESTONE|recmImoXTlKb5NWSY|recbUUwpAA6M91mH6",
            "SHOT_MILESTONE|recmImoXTlKb5NWSY|recuLqXBSyB7PE7jC",
            "SHOT_MILESTONE|recmImoXTlKb5NWSY|recSiWHRSsdjKytFU",
        ]
        cmp = compare_unlock_source_keys(exp.expected_shot_milestone_unlocks, actual)
        self.assertTrue(cmp["ok"])
        self.assertEqual(cmp["missing"], [])


class TestUnlockCascadeQuery(unittest.TestCase):
    def test_formulas_prefer_milestone_source_key(self):
        formulas = unlock_formulas_for_enrollment("recmImoXTlKb5NWSY")
        self.assertIn("Milestone Source Key", formulas[0])
        self.assertIn("Enrollment", formulas[1])
        self.assertNotIn("Enrollment Record ID", formulas[0])
        self.assertNotIn("Enrollment Record ID", formulas[1])

    def test_list_merges_formulas_and_ignores_missing_enrollment_record_id(self):
        calls: list[str] = []

        def fake_list(table, *, fields=None, formula=None, max_records=200):
            calls.append(formula or "")
            self.assertNotIn("Enrollment Record ID", fields or [])
            if "Milestone Source Key" in (formula or ""):
                return [
                    {
                        "id": "recU1",
                        "fields": {
                            "Milestone Source Key": "SHOT_MILESTONE|recE1|recM1",
                        },
                    }
                ]
            return []

        rows = list_unlocks_for_enrollment(fake_list, "recE1")
        self.assertEqual(len(rows), 1)
        self.assertEqual(unlock_source_keys(rows), ["SHOT_MILESTONE|recE1|recM1"])
        self.assertEqual(len(calls), 2)
        self.assertIn("Enrollment Record ID", broken_unlock_count_pattern_explanation())

    def test_cleanup_plan_merges_source_key_unlocks(self):
        import tempfile
        from datetime import datetime, timezone

        from season_simulation.cleanup import build_cleanup_plan
        from season_simulation.run_registry import RunRegistry, save_registry

        run_id = "SEASON-SIM-2027-20260905T999999Z-athlete1"
        tmp = tempfile.mkdtemp()
        registry_dir = Path(tmp)
        reg = RunRegistry(
            run_id=run_id,
            created_at=datetime.now(timezone.utc).isoformat(),
            enrollment_id="recEnrSC169Test01",
        )
        reg.add("Enrollments", "recEnrSC169Test01", dedupe_key=f"{run_id}|ENR")
        save_registry(reg, registry_dir)

        class FakeClient:
            def list_records(self, table, *, fields=None, formula=None, max_records=200):
                if table != "Athlete Achievement Unlocks":
                    return []
                if "Milestone Source Key" in (formula or ""):
                    return [
                        {
                            "id": "recUnlockOrphan01",
                            "fields": {
                                "Milestone Source Key": (
                                    "SHOT_MILESTONE|recEnrSC169Test01|recMs"
                                )
                            },
                        }
                    ]
                return []

            def get_record(self, table, record_id):
                return {"id": record_id, "fields": {}}

        plan = build_cleanup_plan(
            run_id=run_id,
            registry_dir=registry_dir,
            client=FakeClient(),
        )
        self.assertIn(
            "recUnlockOrphan01",
            plan.targets.get("Athlete Achievement Unlocks", []),
        )
        self.assertTrue(any("SC-169" in w for w in plan.warnings))

    def test_source_key_helpers(self):
        self.assertEqual(
            shot_milestone_source_key("recE", "recM"),
            "SHOT_MILESTONE|recE|recM",
        )
        self.assertEqual(
            perfect_week_source_key("recE", "recW"),
            "PERFECT_WEEK|recE|recW",
        )


if __name__ == "__main__":
    unittest.main()
