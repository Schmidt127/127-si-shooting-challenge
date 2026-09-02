#!/usr/bin/env python3
"""Tests for America/Denver Week date parsing and Week index ownership."""

from __future__ import annotations

import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.constants import DENVER  # noqa: E402
from season_simulation.reference_data import parse_date_value  # noqa: E402
from season_simulation.scenarios import build_athlete1_scenario  # noqa: E402
from season_simulation.writer import (  # noqa: E402
    assert_weeks_do_not_overlap,
    build_execute_context_from_reference,
    build_week_date_index,
)

# Live Production-shaped UTC instants (America/Denver midnight / 23:59).
PROD_WEEKS_UTC = [
    {
        "record_id": "recBrZ1sV8byWEHZU",
        "name": "Early Bird",
        "start": "2027-04-25T06:00:00.000Z",
        "end": "2027-05-02T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "rec2Rewxt21z7dI9f",
        "name": "Week 1",
        "start": "2027-05-02T06:00:00.000Z",
        "end": "2027-05-09T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "rec7RpUMVLbcrmn4h",
        "name": "Week 2",
        "start": "2027-05-09T06:00:00.000Z",
        "end": "2027-05-16T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "recCCpyqPKA580sdk",
        "name": "Week 3",
        "start": "2027-05-16T06:00:00.000Z",
        "end": "2027-05-23T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "recEapVpi6u0oxuPy",
        "name": "Week 4",
        "start": "2027-05-23T06:00:00.000Z",
        "end": "2027-05-30T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "recKJMGYbEzGHyXfd",
        "name": "Week 5",
        "start": "2027-05-30T06:00:00.000Z",
        "end": "2027-06-06T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "recRp4y42EpLvtwk5",
        "name": "Week 6",
        "start": "2027-06-06T06:00:00.000Z",
        "end": "2027-06-13T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "recW3irij491AIPrl",
        "name": "Week 7",
        "start": "2027-06-13T06:00:00.000Z",
        "end": "2027-06-20T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "recfu3dpVJAnVBvCB",
        "name": "Week 8",
        "start": "2027-06-20T06:00:00.000Z",
        "end": "2027-06-27T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
    {
        "record_id": "rech8lgJkNMStWh9A",
        "name": "Week 9",
        "start": "2027-06-27T06:00:00.000Z",
        "end": "2027-07-01T05:59:00.000Z",
        "program_instance_id": "rec5mEM0YPqPqq0hZ",
    },
]


class TestParseDateValueDenver(unittest.TestCase):
    def test_utc_boundary_early_bird_end_is_may_1(self):
        self.assertEqual(parse_date_value("2027-05-02T05:59:00.000Z"), date(2027, 5, 1))

    def test_utc_boundary_week1_start_is_may_2(self):
        self.assertEqual(parse_date_value("2027-05-02T06:00:00.000Z"), date(2027, 5, 2))

    def test_aware_datetime_object(self):
        dt = datetime(2027, 5, 2, 5, 59, tzinfo=timezone.utc)
        self.assertEqual(parse_date_value(dt), date(2027, 5, 1))

    def test_naive_datetime_treated_as_utc(self):
        dt = datetime(2027, 5, 2, 5, 59, 0)
        self.assertEqual(parse_date_value(dt), date(2027, 5, 1))

    def test_date_only_string_preserved(self):
        self.assertEqual(parse_date_value("2027-05-01"), date(2027, 5, 1))
        self.assertEqual(parse_date_value("2027-06-30"), date(2027, 6, 30))

    def test_date_object_preserved(self):
        self.assertEqual(parse_date_value(date(2027, 5, 8)), date(2027, 5, 8))

    def test_zoneinfo_constant_is_denver(self):
        self.assertEqual(DENVER, ZoneInfo("America/Denver"))


class TestWeekIndexDenverOwnership(unittest.TestCase):
    def setUp(self):
        self.by_date, self.by_id, self.errors = build_week_date_index(PROD_WEEKS_UTC)

    def test_no_overlap_errors(self):
        self.assertEqual(self.errors, [])
        assert_weeks_do_not_overlap(PROD_WEEKS_UTC)

    def test_early_bird_owns_may_1(self):
        self.assertEqual(self.by_date["2027-05-01"], "recBrZ1sV8byWEHZU")
        self.assertEqual(self.by_id["recBrZ1sV8byWEHZU"]["end"], date(2027, 5, 1))

    def test_week1_owns_may_2_through_may_8(self):
        for d in (
            date(2027, 5, 2),
            date(2027, 5, 3),
            date(2027, 5, 4),
            date(2027, 5, 5),
            date(2027, 5, 6),
            date(2027, 5, 7),
            date(2027, 5, 8),
        ):
            self.assertEqual(self.by_date[d.isoformat()], "rec2Rewxt21z7dI9f", d)
        self.assertNotEqual(self.by_date.get("2027-05-09"), "rec2Rewxt21z7dI9f")

    def test_week2_begins_may_9(self):
        self.assertEqual(self.by_date["2027-05-09"], "rec7RpUMVLbcrmn4h")
        self.assertEqual(self.by_id["rec7RpUMVLbcrmn4h"]["start"], date(2027, 5, 9))

    def test_week9_through_june_30(self):
        self.assertEqual(self.by_id["rech8lgJkNMStWh9A"]["start"], date(2027, 6, 27))
        self.assertEqual(self.by_id["rech8lgJkNMStWh9A"]["end"], date(2027, 6, 30))
        self.assertEqual(self.by_date["2027-06-27"], "rech8lgJkNMStWh9A")
        self.assertEqual(self.by_date["2027-06-30"], "rech8lgJkNMStWh9A")

    def test_naive_utc_truncation_would_have_overlapped(self):
        """Document the old bug: UTC [:10] collides; Denver does not."""
        naive_end = date.fromisoformat("2027-05-02T05:59:00.000Z"[:10])
        naive_start = date.fromisoformat("2027-05-02T06:00:00.000Z"[:10])
        self.assertEqual(naive_end, naive_start)
        self.assertNotEqual(
            parse_date_value("2027-05-02T05:59:00.000Z"),
            parse_date_value("2027-05-02T06:00:00.000Z"),
        )

    def test_date_only_inputs_still_index(self):
        weeks = [
            {
                "record_id": "recEB",
                "name": "Early Bird",
                "start": "2027-04-25",
                "end": "2027-05-01",
                "program_instance_id": "recPI",
            },
            {
                "record_id": "recW1",
                "name": "Week 1",
                "start": date(2027, 5, 2),
                "end": date(2027, 5, 8),
                "program_instance_id": "recPI",
            },
        ]
        by_date, _by_id, errors = build_week_date_index(weeks)
        self.assertEqual(errors, [])
        self.assertEqual(by_date["2027-05-01"], "recEB")
        self.assertEqual(by_date["2027-05-02"], "recW1")

    def test_dry_run_and_execute_share_week_index(self):
        """Dry-run index builder and execute context use the same mapping."""
        dry_by_date, dry_by_id, dry_errors = build_week_date_index(PROD_WEEKS_UTC)
        self.assertEqual(dry_errors, [])
        scenario = build_athlete1_scenario(
            run_id="SEASON-SIM-2027-20260101T000000Z-weekidx",
            grade_band_id="recBAND",
            goal_record_id="recGOAL",
            goal_total_shots=12000,
            homework=[{"record_id": f"recHW{i}", "slot": "HW1"} for i in range(18)],
            zoom_meetings=[
                {"record_id": "recZ1", "display": "A"},
                {"record_id": "recZ2", "display": "B"},
            ],
            weeks=PROD_WEEKS_UTC,
        )
        ctx = build_execute_context_from_reference(
            scenario=scenario,
            weeks=PROD_WEEKS_UTC,
            school_year="2026-2027",
        )
        self.assertEqual(ctx.week_id_by_date, dry_by_date)
        self.assertEqual(
            {k: v["record_id"] for k, v in ctx.weeks_by_id.items()},
            {k: v["record_id"] for k, v in dry_by_id.items()},
        )
        self.assertEqual(ctx.week_for(date(2027, 5, 1)), "recBrZ1sV8byWEHZU")
        self.assertEqual(ctx.week_for(date(2027, 5, 2)), "rec2Rewxt21z7dI9f")
        self.assertEqual(ctx.week_for(date(2027, 6, 30)), "rech8lgJkNMStWh9A")


if __name__ == "__main__":
    unittest.main()
