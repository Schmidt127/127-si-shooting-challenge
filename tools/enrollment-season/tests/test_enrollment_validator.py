#!/usr/bin/env python3
"""Enrollment validation fixture tests — SC-060/063."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "enrollment-season"))

from enrollment_validator import validate_enrollment_payload  # noqa: E402

FIX = ROOT / "tests" / "fixtures" / "enrollment-season"


class TestEnrollmentValidator(unittest.TestCase):
    def test_valid_records(self):
        data = json.loads((FIX / "validation-valid.json").read_text(encoding="utf-8"))
        for row in data["records"]:
            with self.subTest(row["id"]):
                result = validate_enrollment_payload(row["payload"])
                self.assertEqual(result.overall, row["expectedOverall"], result.to_dict())

    def test_invalid_records(self):
        data = json.loads((FIX / "validation-invalid.json").read_text(encoding="utf-8"))
        for row in data["records"]:
            with self.subTest(row["id"]):
                result = validate_enrollment_payload(
                    row["payload"],
                    existing_match_keys=set(row.get("existingMatchKeys") or []),
                    current_season_enrollment_keys=set(
                        row.get("currentSeasonEnrollmentKeys") or []
                    ),
                )
                self.assertEqual(result.overall, row["expectedOverall"], result.to_dict())
                codes = {f.code for f in result.findings}
                for expected in row.get("expectedCodes") or []:
                    self.assertIn(expected, codes, result.to_dict())


if __name__ == "__main__":
    unittest.main()
