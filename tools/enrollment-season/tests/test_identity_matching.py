#!/usr/bin/env python3
"""Identity matching tests — SC-060/061/062 coverage."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "enrollment-season"))

from identity_matching import (  # noqa: E402
    AthleteCandidate,
    EnrollmentIdentityInput,
    build_athlete_match_key,
    evaluate_enrollment_identity,
    normalize_email,
    normalize_text,
)

FIXTURE = (
    ROOT
    / "tests"
    / "fixtures"
    / "enrollment-season"
    / "identity-cases.json"
)


def _athletes(raw):
    return [
        AthleteCandidate(
            athlete_id=a["athlete_id"],
            first_name=a.get("first_name", ""),
            last_name=a.get("last_name", ""),
            parent_email=a.get("parent_email", ""),
            athlete_match_key=a.get("athlete_match_key", ""),
            active=a.get("active"),
            enrollment_ids=tuple(a.get("enrollment_ids") or ()),
            current_season_enrollment_ids=tuple(
                a.get("current_season_enrollment_ids") or ()
            ),
        )
        for a in raw
    ]


class TestIdentityMatching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.athletes = _athletes(cls.data["athletes"])

    def test_normalize_helpers(self):
        self.assertEqual(normalize_text("  Alice   B "), "alice b")
        self.assertEqual(
            normalize_email(' "Parent.Anderson@Example.COM" '),
            "parent.anderson@example.com",
        )
        self.assertEqual(
            normalize_email("Name <Parent@Example.com>"),
            "parent@example.com",
        )

    def test_match_key_format(self):
        key = build_athlete_match_key(
            " Parent@Example.com ", " Alice ", "Anderson"
        )
        self.assertEqual(key, "parent@example.com|alice|anderson")

    def test_fixture_scenarios(self):
        for scenario in self.data["scenarios"]:
            with self.subTest(scenario["scenarioId"]):
                enr = scenario["enrollment"]
                result = evaluate_enrollment_identity(
                    EnrollmentIdentityInput(**enr),
                    self.athletes,
                    current_season_label=enr.get("school_year", ""),
                )
                self.assertEqual(
                    result.status,
                    scenario["expectedStatus"],
                    msg=f"{scenario['scenarioId']}: {result}",
                )
                if "expectedMethod" in scenario:
                    self.assertEqual(result.match_method, scenario["expectedMethod"])
                if "expectedAthleteId" in scenario:
                    self.assertEqual(result.athlete_id, scenario["expectedAthleteId"])
                if "expectWarningSubstring" in scenario:
                    joined = " | ".join(result.warnings)
                    self.assertIn(scenario["expectWarningSubstring"], joined)

    def test_no_destructive_merge_on_ambiguous_names(self):
        # Same name different parent → create_candidate, never merge
        result = evaluate_enrollment_identity(
            EnrollmentIdentityInput(
                athlete_first_name="Alice",
                athlete_last_name="Anderson",
                parent_email="brand.new.parent@example.com",
            ),
            self.athletes,
        )
        self.assertEqual(result.status, "create_candidate")
        self.assertTrue(any("different parent" in w.lower() for w in result.warnings))


if __name__ == "__main__":
    unittest.main()
