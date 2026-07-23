#!/usr/bin/env python3
"""New/returning + sibling fixture tests — SC-061/062."""

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
    evaluate_enrollment_identity,
)

FIX = ROOT / "tests" / "fixtures" / "enrollment-season"


class TestNewReturning(unittest.TestCase):
    def test_cases(self):
        data = json.loads((FIX / "new-returning-cases.json").read_text(encoding="utf-8"))
        for case in data["cases"]:
            with self.subTest(case["id"]):
                athletes = [
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
                    for a in case.get("existingAthletes") or []
                ]
                allowed = set(EnrollmentIdentityInput.__dataclass_fields__.keys())
                enr_kwargs = {k: v for k, v in case["input"].items() if k in allowed}
                result = evaluate_enrollment_identity(
                    EnrollmentIdentityInput(**enr_kwargs),
                    athletes,
                    current_season_label=case["input"].get("school_year", ""),
                )
                self.assertEqual(result.status, case["expectedStatus"], result)
                if "expectWarningSubstring" in case:
                    self.assertTrue(
                        any(case["expectWarningSubstring"] in w for w in result.warnings),
                        result.warnings,
                    )


class TestSiblings(unittest.TestCase):
    def test_shared_parent_separate_athletes(self):
        data = json.loads((FIX / "sibling-cases.json").read_text(encoding="utf-8"))
        family = data["family"]
        athletes = [
            AthleteCandidate(
                athlete_id=a["athlete_id"],
                first_name=a["first_name"],
                last_name=a["last_name"],
                parent_email=family["parentEmail"],
                athlete_match_key=a["athlete_match_key"],
            )
            for a in family["athletes"]
        ]
        case = data["cases"][0]
        ids = []
        for enr in case["enrollments"]:
            result = evaluate_enrollment_identity(
                EnrollmentIdentityInput(**enr), athletes
            )
            self.assertEqual(result.status, "matched")
            ids.append(result.athlete_id)
        self.assertEqual(ids, case["expectedAthleteIds"])
        self.assertFalse(case["familyTableRequired"])

    def test_sibling_without_athlete_email(self):
        data = json.loads((FIX / "sibling-cases.json").read_text(encoding="utf-8"))
        family = data["family"]
        athletes = [
            AthleteCandidate(
                athlete_id=a["athlete_id"],
                first_name=a["first_name"],
                last_name=a["last_name"],
                parent_email=family["parentEmail"],
                athlete_match_key=a["athlete_match_key"],
            )
            for a in family["athletes"]
        ]
        case = next(c for c in data["cases"] if c["id"] == "one_sibling_without_athlete_email")
        result = evaluate_enrollment_identity(
            EnrollmentIdentityInput(**case["enrollment"]), athletes
        )
        self.assertEqual(result.status, case["expectedStatus"])
        self.assertEqual(result.athlete_id, case["expectedAthleteId"])


if __name__ == "__main__":
    unittest.main()
