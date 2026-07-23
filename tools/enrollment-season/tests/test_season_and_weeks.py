#!/usr/bin/env python3
"""Season date + Weeks seed tests — SC-064/065/066."""

from __future__ import annotations

import json
import unittest
from datetime import datetime
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools" / "enrollment-season"))

from season_date_boundaries import (  # noqa: E402
    SeasonCalendar,
    WeekWindow,
    evaluate_intake_state,
    evaluate_submission_eligibility,
    parse_date,
)
from weeks_seed_validator import (  # noqa: E402
    load_weeks_csv,
    validate_weeks_seed,
)

FIX = ROOT / "tests" / "fixtures" / "enrollment-season"


class TestSeasonDates(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(
            (FIX / "season-date-boundary-cases.json").read_text(encoding="utf-8")
        )
        c = cls.data["calendar"]
        cls.calendar = SeasonCalendar(
            enrollment_open=parse_date(c["enrollment_open"]),
            enrollment_close=parse_date(c["enrollment_close"]),
            challenge_start=parse_date(c["challenge_start"]),
            challenge_end=parse_date(c["challenge_end"]),
            early_bird_start=parse_date(c["early_bird_start"])
            if c.get("early_bird_start")
            else None,
            early_bird_end=parse_date(c["early_bird_end"])
            if c.get("early_bird_end")
            else None,
            preseason_access_start=parse_date(c["preseason_access_start"])
            if c.get("preseason_access_start")
            else None,
            allow_late_enrollment=bool(c.get("allow_late_enrollment")),
            late_enrollment_close=parse_date(c["late_enrollment_close"])
            if c.get("late_enrollment_close")
            else None,
            allow_backdated_submission=bool(c.get("allow_backdated_submission")),
            backdate_max_days=int(c.get("backdate_max_days") or 0),
            timezone=c.get("timezone") or "America/Denver",
        )

    def test_boundary_cases(self):
        for case in self.data["cases"]:
            with self.subTest(case["caseId"]):
                if "activityDate" in case:
                    week = None
                    if case.get("coveringWeek"):
                        w = case["coveringWeek"]
                        week = WeekWindow(
                            week_name=w["week_name"],
                            start=parse_date(w["start"]),
                            end=parse_date(w["end"]),
                            intake_open=w.get("intake_open", True),
                        )
                    result = evaluate_submission_eligibility(
                        self.calendar,
                        activity_date=parse_date(case["activityDate"]),
                        as_of=datetime.fromisoformat(case["asOf"]),
                        covering_week=week,
                    )
                    self.assertEqual(
                        result["submissionAllowed"], case["expectedSubmissionAllowed"]
                    )
                    continue

                state = evaluate_intake_state(
                    self.calendar, datetime.fromisoformat(case["asOf"])
                )
                if "expectedIntakeStatus" in case:
                    self.assertEqual(state["intakeStatus"], case["expectedIntakeStatus"])
                if "expectedEnrollmentAllowed" in case:
                    self.assertEqual(
                        state["enrollmentAllowed"], case["expectedEnrollmentAllowed"]
                    )
                if "expectedIsIntakeOpenDay" in case:
                    self.assertEqual(
                        state["isIntakeOpenDay"], case["expectedIsIntakeOpenDay"]
                    )
                if "expectedIsIntakeCloseDay" in case:
                    self.assertEqual(
                        state["isIntakeCloseDay"], case["expectedIsIntakeCloseDay"]
                    )
                if "expectedChallengeActive" in case:
                    self.assertEqual(
                        state["challengeActive"], case["expectedChallengeActive"]
                    )
                if "expectedIsChallengeStartDay" in case:
                    self.assertEqual(
                        state["isChallengeStartDay"],
                        case["expectedIsChallengeStartDay"],
                    )
                if "expectedIsChallengeEndDay" in case:
                    self.assertEqual(
                        state["isChallengeEndDay"], case["expectedIsChallengeEndDay"]
                    )
                if "expectedAsOfDate" in case:
                    self.assertEqual(state["asOfDate"], case["expectedAsOfDate"])

    def test_early_bird_is_mike_decision(self):
        state = evaluate_intake_state(
            self.calendar, datetime.fromisoformat("2026-08-05T12:00:00-06:00")
        )
        self.assertEqual(state["earlyBirdDecision"], "MIKE_DECISION_REQUIRED")
        self.assertTrue(state["earlyBirdPeriod"])


class TestWeeksSeed(unittest.TestCase):
    def test_valid_seed(self):
        rows = load_weeks_csv(FIX / "weeks-seed-valid.csv")
        report = validate_weeks_seed(rows)
        self.assertEqual(report.overall, "WARNING")  # gap between early bird and week 1
        self.assertFalse(any(f.code == "overlap" for f in report.findings))

    def test_invalid_seed(self):
        rows = load_weeks_csv(FIX / "weeks-seed-invalid.csv")
        report = validate_weeks_seed(rows)
        self.assertEqual(report.overall, "FAIL")
        codes = {f.code for f in report.findings}
        self.assertIn("overlap", codes)
        self.assertIn("duplicate_sequence", codes)
        self.assertIn("end_before_start", codes)


if __name__ == "__main__":
    unittest.main()
