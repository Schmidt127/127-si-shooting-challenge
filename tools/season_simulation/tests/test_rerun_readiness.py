"""SC-SEASON-SIM-001 clean-rerun readiness regression tests."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2]
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from season_simulation.business_expectations import (  # noqa: E402
    EDGE_BUSINESS_EXPECTATIONS,
    PERFECT_BUSINESS_EXPECTATIONS,
    RECOVERY_BUSINESS_EXPECTATIONS,
)
from season_simulation.business_reconciliation import stage_e2_business_success_hook  # noqa: E402
from season_simulation.constants import DEFAULT_STREAK_XP_THRESHOLDS  # noqa: E402
from season_simulation.downstream_settlement import classify_homework_completion  # noqa: E402
from season_simulation.production_readiness import (  # noqa: E402
    RERUN_REQUIRED_AUTOMATION_VERSIONS,
    verify_automation_pins,
    verify_effective_zoom_gate_schema,
)
from season_simulation.production_cleanup_scan import validate_cleanup_foreign_records  # noqa: E402


def _meta_with_zoom_gate(eff_id: str = "fldEFF") -> list[dict]:
    eff_if = f"IF({{{eff_id}}}, {{{eff_id}}}, {{fldLIVE}})"
    return [
        {
            "name": "Enrollments",
            "fields": [
                {
                    "name": "Effective Zoom Gate Meetings",
                    "id": eff_id,
                    "type": "number",
                    "options": {"precision": 0},
                },
                {
                    "name": "Total Zoom Attendances",
                    "id": "fldLIVE",
                    "type": "rollup",
                },
                {
                    "name": "Meets Gate: Zoom Meetings",
                    "type": "formula",
                    "options": {"formula": eff_if},
                },
                {
                    "name": "Gate Debug Summary",
                    "type": "formula",
                    "options": {"formula": '"Zoom " & ' + eff_if},
                },
                {
                    "name": "Public Missing Zoom",
                    "type": "formula",
                    "options": {"formula": eff_if + " >= 2"},
                },
            ],
        }
    ]


class TestRerunReadiness(unittest.TestCase):
    def test_perfect_oracle_4910(self):
        self.assertEqual(PERFECT_BUSINESS_EXPECTATIONS["total_xp"], 4910)
        self.assertEqual(PERFECT_BUSINESS_EXPECTATIONS["perfect_weeks"], 10)
        self.assertEqual(PERFECT_BUSINESS_EXPECTATIONS["public_level"], "G.O.A.T.")
        buckets = PERFECT_BUSINESS_EXPECTATIONS["buckets"]
        self.assertEqual(sum(buckets.values()), 4910)
        self.assertEqual(buckets["Homework XP"], 630)
        self.assertEqual(buckets["Weekly Threshold XP"], 480)
        self.assertEqual(buckets["Streak XP"], 455)
        self.assertEqual(buckets["Zoom XP"], 90)

    def test_recovery_edge_oracles(self):
        self.assertEqual(RECOVERY_BUSINESS_EXPECTATIONS["total_xp"], 2305)
        self.assertEqual(RECOVERY_BUSINESS_EXPECTATIONS["perfect_weeks"], 1)
        self.assertEqual(EDGE_BUSINESS_EXPECTATIONS["total_xp"], 3620)
        self.assertEqual(EDGE_BUSINESS_EXPECTATIONS["perfect_weeks"], 5)
        self.assertEqual(EDGE_BUSINESS_EXPECTATIONS["minimum_longest_streak_days"], 40)

    def test_streak_thresholds_include_50_60(self):
        self.assertIn(50, DEFAULT_STREAK_XP_THRESHOLDS)
        self.assertIn(60, DEFAULT_STREAK_XP_THRESHOLDS)

    def test_homework_settlement_awarded(self):
        st = classify_homework_completion(
            hc_id="recHC18",
            fields={
                "Award Status": "Awarded",
                "Homework XP Reconciliation Needed?": 0,
                "Weekly Athlete Summary Link": ["recWAS"],
            },
            list_records=lambda *a, **k: [{"id": "recXP1"}],
        )
        self.assertTrue(st.ok)

    def test_e2_cascade_complete_alone_cannot_pass(self):
        from season_simulation.memory_client import MemoryAirtableClient

        client = MemoryAirtableClient(allow_writes=False)
        enr = "recEnrPerfect"
        client.tables.setdefault("Enrollments", {})[enr] = {
            "id": enr,
            "fields": {"Public Level": "All-Star"},
        }
        out = stage_e2_business_success_hook(
            client,
            enrollment_id=enr,
            profile="athlete1_perfect",
            cascade_complete=True,
            downstream_complete=False,
        )
        self.assertFalse(out["pass"])
        self.assertIn("downstream_complete=false", out["errors"])

    def test_automation_pins_042_target(self):
        pins = verify_automation_pins(
            {"042": "4.1.3", "053": "5.6", "076": "8.15", "101": "6.9"}
        )
        self.assertTrue(pins["ok"])
        self.assertEqual(RERUN_REQUIRED_AUTOMATION_VERSIONS["042"], "4.1.3")

    def test_automation_pins_fail_old_042(self):
        pins = verify_automation_pins({"042": "4.1.2", "053": "5.6", "076": "8.15", "101": "6.9"})
        self.assertFalse(pins["ok"])

    def test_zoom_gate_schema_verify(self):
        r = verify_effective_zoom_gate_schema(_meta_with_zoom_gate())
        self.assertTrue(r["ok"])
        self.assertEqual(r["effective_field_id"], "fldEFF")

    def test_foreign_cleanup_zero_for_sim_only(self):
        class FakeClient:
            def get_record(self, table, rid):
                return {
                    "id": rid,
                    "fields": {
                        "Athlete First Name": "Sim",
                        "Athlete Last Name": "Perfect",
                        "Parent Email": "schmidt@fairfieldbasketballclub.com",
                    },
                }

        fc = validate_cleanup_foreign_records(
            FakeClient(),
            targets={"Enrollments": ["recE1"], "Submissions": ["recS1"]},
            enrollment_ids=["recE1"],
        )
        self.assertTrue(fc.ok)
        self.assertEqual(fc.foreign_count, 0)


if __name__ == "__main__":
    unittest.main()
