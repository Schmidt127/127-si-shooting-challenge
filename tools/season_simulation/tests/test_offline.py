#!/usr/bin/env python3
"""Offline tests for season simulation infrastructure (no Airtable writes)."""

from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.confirmation import is_confirmed  # noqa: E402
from season_simulation.constants import (  # noqa: E402
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_END,
    SIM_START,
    SIMULATION_DAY_COUNT,
)
from season_simulation.recipient_safety import (  # noqa: E402
    assert_safe_recipient,
    evaluate_recipient,
    resolve_simulation_recipient,
)
from season_simulation.offline_helpers import pick_highest_goal  # noqa: E402
from season_simulation.reference_data import homework_covers_grade_band  # noqa: E402
from season_simulation.run_registry import (  # noqa: E402
    RunRegistry,
    filter_records_for_run,
    marker_matches,
    new_run_id,
    run_marker,
    validate_run_id,
)
from season_simulation.scenarios import (  # noqa: E402
    BACKDATE_ACTIVITY_DAY,
    BACKDATE_WRITE_DAY,
    MISS_DAYS,
    SAME_DAY_SUBMIT_DAY,
    build_athlete1_scenario,
)
from season_simulation.simulation_clock import (  # noqa: E402
    FIELD_ID_ACTIVITY_DATE,
    FIELD_ID_SEASON_SIM_CLOCK_NOW,
    FIELD_ID_SEASON_SIM_TEST_RECORD,
    FIELD_ID_VIDEO_UPLOAD_NOTE,
    SimulationClock,
    SubmissionTiming,
    assert_window_integrity,
    build_simulation_days,
    inspect_activity_date_is_future_formula,
    saturday_of,
    sunday_of,
    week_boundaries_for_dates,
)


class TestDateWindow(unittest.TestCase):
    def test_exactly_61_days(self):
        days = assert_window_integrity()
        self.assertEqual(len(days), SIMULATION_DAY_COUNT)
        self.assertEqual(SIMULATION_DAY_COUNT, (SIM_END - SIM_START).days + 1)

    def test_may1_through_june30_2027(self):
        days = build_simulation_days()
        self.assertEqual(days[0].activity_date, date(2027, 5, 1))
        self.assertEqual(days[-1].activity_date, date(2027, 6, 30))

    def test_day_numbering(self):
        days = build_simulation_days()
        for i, d in enumerate(days, start=1):
            self.assertEqual(d.day_number, i)
            self.assertEqual(d.activity_date, SIM_START + timedelta(days=i - 1))

    def test_sunday_saturday_boundaries(self):
        # 2027-05-01 is Saturday
        self.assertEqual(date(2027, 5, 1).strftime("%A"), "Saturday")
        self.assertEqual(sunday_of(date(2027, 5, 1)), date(2027, 4, 25))
        self.assertEqual(saturday_of(date(2027, 5, 1)), date(2027, 5, 1))
        # 2027-05-02 is Sunday
        self.assertEqual(sunday_of(date(2027, 5, 2)), date(2027, 5, 2))
        self.assertEqual(saturday_of(date(2027, 5, 2)), date(2027, 5, 8))
        days = build_simulation_days()
        for d in days:
            self.assertEqual(d.week_sunday, sunday_of(d.activity_date))
            self.assertEqual(d.week_saturday, saturday_of(d.activity_date))
            self.assertEqual((d.week_saturday - d.week_sunday).days, 6)

    def test_week_boundaries_unique(self):
        days = build_simulation_days()
        windows = week_boundaries_for_dates(d.activity_date for d in days)
        self.assertGreaterEqual(len(windows), 8)
        for sun, sat in windows:
            self.assertEqual(sun.weekday(), 6)  # Sunday
            self.assertEqual(sat.weekday(), 5)  # Saturday


class TestSimulationClock(unittest.TestCase):
    def test_same_day_and_backdated(self):
        clock = SimulationClock(
            enabled=True, current_date=date(2027, 5, 10), run_id="SEASON-SIM-2027-test-aaaaaa"
        )
        self.assertEqual(
            clock.classify_submission(date(2027, 5, 10)),
            SubmissionTiming.SAME_DAY,
        )
        self.assertEqual(
            clock.classify_submission(date(2027, 5, 8)),
            SubmissionTiming.BACKDATED,
        )
        self.assertEqual(
            clock.classify_submission(date(2027, 5, 8), missed=True),
            SubmissionTiming.MISSED,
        )
        with self.assertRaises(ValueError):
            clock.classify_submission(date(2027, 5, 11))

    def test_day_number(self):
        clock = SimulationClock(
            enabled=True, current_date=SIM_START, run_id="SEASON-SIM-2027-test-bbbbbb"
        )
        self.assertEqual(clock.day_number, 1)
        clock.advance_to(SIM_END)
        self.assertEqual(clock.day_number, 61)


class TestScenario(unittest.TestCase):
    def _scenario(self):
        return build_athlete1_scenario(
            run_id="SEASON-SIM-2027-20260101T000000Z-test01",
            grade_band_id="recBAND",
            goal_record_id="recGOAL",
            goal_total_shots=12000,
            homework=[
                {"record_id": "recHW1", "slot": "HW1"},
                {"record_id": "recHW2", "slot": "HW2"},
            ],
            zoom_meetings=[
                {"record_id": "recZ1", "display": "Z1"},
                {"record_id": "recZ2", "display": "Z2"},
            ],
        )

    def test_deterministic(self):
        a = self._scenario()
        b = self._scenario()
        self.assertEqual(a.to_dict()["days"], b.to_dict()["days"])
        self.assertEqual(a.intended_writes_summary, b.intended_writes_summary)

    def test_61_days_and_misses(self):
        s = self._scenario()
        self.assertEqual(len(s.days), 61)
        misses = [d for d in s.days if d.action == "miss"]
        self.assertEqual(len(misses), len(MISS_DAYS))

    def test_same_day_and_backdated_flags(self):
        s = self._scenario()
        same = next(d for d in s.days if d.day_number == SAME_DAY_SUBMIT_DAY)
        self.assertEqual(same.timing, "same_day")
        back = next(d for d in s.days if d.day_number == BACKDATE_ACTIVITY_DAY)
        self.assertEqual(back.timing, "backdated")
        self.assertEqual(back.write_on_day_number, BACKDATE_WRITE_DAY)

    def test_dedupe_keys_unique_for_subs(self):
        s = self._scenario()
        keys = [d.dedupe_key for d in s.days]
        self.assertEqual(len(keys), len(set(keys)))

    def test_dynamic_homework_and_zoom_ids(self):
        s = self._scenario()
        self.assertEqual(s.zoom_selected[0]["record_id"], "recZ1")
        hw_ids = {h["pha_record_id"] for d in s.days for h in d.homework}
        self.assertTrue(hw_ids.issubset({"recHW1", "recHW2"}))
        # Zoom placed on days 12 and 40
        z12 = next(d for d in s.days if d.day_number == 12)
        z40 = next(d for d in s.days if d.day_number == 40)
        self.assertEqual(z12.zoom_meeting_ids, ["recZ1"])
        self.assertEqual(z40.zoom_meeting_ids, ["recZ2"])

    def test_recipient_on_emails(self):
        s = self._scenario()
        for ev in s.intended_emails:
            self.assertEqual(ev["recipient"], SAFE_EMAIL_RECIPIENT)
            self.assertFalse(ev.get("send"))


class TestRunIdAndCleanupTargeting(unittest.TestCase):
    def test_run_id_and_marker(self):
        rid = new_run_id(suffix="athlete1")
        self.assertTrue(rid.startswith("SEASON-SIM-2027-"))
        validate_run_id(rid)
        marker = run_marker(rid)
        self.assertTrue(marker_matches(f"hello {marker} world", rid))
        self.assertFalse(marker_matches("other", rid))

    def test_filter_records_for_run(self):
        rid = "SEASON-SIM-2027-20260101T000000Z-abcd12"
        marker = run_marker(rid)
        records = [
            {"id": "recA", "fields": {"Notes": marker}},
            {"id": "recB", "fields": {"Notes": "unrelated"}},
            {"id": "recC", "fields": {"Notes": ""}},
        ]
        filtered = filter_records_for_run(records, rid, text_fields=["Notes"])
        self.assertEqual([r["id"] for r in filtered], ["recA"])
        filtered2 = filter_records_for_run(
            records, rid, text_fields=["Notes"], allowlist_ids={"recC"}
        )
        self.assertEqual({r["id"] for r in filtered2}, {"recA", "recC"})

    def test_registry_ids(self):
        rid = "SEASON-SIM-2027-20260101T000000Z-reg001"
        reg = RunRegistry(run_id=rid, created_at="t0")
        reg.add("Submissions", "recSUB1", dedupe_key="k1")
        reg.add("XP Events", "recXP1")
        self.assertEqual(reg.ids_by_table()["Submissions"], ["recSUB1"])
        with self.assertRaises(ValueError):
            reg.add("Submissions", "not-a-rec")


class TestRecipientSafety(unittest.TestCase):
    def test_allowlist(self):
        self.assertEqual(
            assert_safe_recipient(SAFE_EMAIL_RECIPIENT),
            SAFE_EMAIL_RECIPIENT.lower(),
        )
        with self.assertRaises(ValueError):
            assert_safe_recipient("other@example.com")
        bad = evaluate_recipient("x@y.com")
        self.assertFalse(bad.ok)

    def test_force_safe_mismatch(self):
        decision = resolve_simulation_recipient(
            enrollment_parent_email="someoneelse@example.com",
            force_safe=True,
        )
        self.assertFalse(decision.ok)


class TestHighestGoal(unittest.TestCase):
    def test_pick_highest(self):
        goals = [
            {"record_id": "a", "total_shot_target": 8000, "active": True},
            {"record_id": "b", "total_shot_target": 12000, "active": True},
            {"record_id": "c", "total_shot_target": 15000, "active": False},
        ]
        # inactive excluded
        top = pick_highest_goal(goals)
        self.assertEqual(top["record_id"], "b")
        goals2 = [
            {"record_id": "c", "total_shot_target": 15000, "active": True},
            {"record_id": "b", "total_shot_target": 12000, "active": True},
        ]
        self.assertEqual(pick_highest_goal(goals2)["record_id"], "c")


class TestHomeworkGradeBandMatch(unittest.TestCase):
    def test_multi_band_pha_includes_9_12_when_first_link_is_k2(self):
        # Live Production shape: K-2, 3-4, 5-6, 7-8, 9-12 on one PHA row.
        band_9_12 = "rec75ruo3XT5nSvaK"
        links = [
            "recK7BDVSpHy2ipCS",  # K-2 first
            "reclWDQZzKbVBtdhG",
            "recv9aWnHanY2sRgk",
            "rec2VQFfGJa1ofA06",
            band_9_12,
        ]
        self.assertTrue(
            homework_covers_grade_band(links, required_grade_band_id=band_9_12)
        )
        self.assertFalse(
            homework_covers_grade_band(
                links[:1], required_grade_band_id=band_9_12
            )
        )
        self.assertTrue(
            homework_covers_grade_band(links, required_grade_band_id=None)
        )


class TestActivityDateFutureFormulaInspect(unittest.TestCase):
    def _meta(self, formula: str, *, with_gate_fields: bool = True) -> list[dict]:
        fields = [
            {
                "id": "fldyFAjhbfaC4LlPb",
                "name": "Activity Date Is Future?",
                "type": "formula",
                "options": {"formula": formula},
            },
            {"id": FIELD_ID_ACTIVITY_DATE, "name": "Activity Date", "type": "date"},
            {
                "id": FIELD_ID_VIDEO_UPLOAD_NOTE,
                "name": "Video Upload Note",
                "type": "multilineText",
            },
        ]
        if with_gate_fields:
            fields.extend(
                [
                    {
                        "id": FIELD_ID_SEASON_SIM_TEST_RECORD,
                        "name": "Season Sim Test Record?",
                        "type": "checkbox",
                    },
                    {
                        "id": FIELD_ID_SEASON_SIM_CLOCK_NOW,
                        "name": "Season Sim Clock Now",
                        "type": "dateTime",
                    },
                    {
                        "id": "fldD5fW93bsK42pPR",
                        "name": "Season Sim Test Submitted At",
                        "type": "dateTime",
                    },
                ]
            )
        return [{"name": "Submissions", "fields": fields}]

    def test_now_only_is_blocker_not_gated(self):
        formula = (
            "IF({fldpkkSBsx8kQRZos}, IF({fldpkkSBsx8kQRZos} > NOW(), 1, 0), BLANK())"
        )
        status = inspect_activity_date_is_future_formula(self._meta(formula))
        self.assertTrue(status.uses_now)
        self.assertFalse(status.gated_season_sim_active)
        self.assertTrue(
            any("NOW() only" in b or "to NOW()" in b for b in status.blockers)
        )

    def test_gated_formula_detected_as_active(self):
        formula = (
            "IF(\n"
            "  AND(\n"
            f"    {{{FIELD_ID_SEASON_SIM_TEST_RECORD}}},\n"
            f'    FIND("SEASON-SIM|", {{{FIELD_ID_VIDEO_UPLOAD_NOTE}}} & "") > 0\n'
            "  ),\n"
            "  IF(\n"
            f"    {{{FIELD_ID_SEASON_SIM_CLOCK_NOW}}},\n"
            f"    IF({{{FIELD_ID_ACTIVITY_DATE}}} > {{{FIELD_ID_SEASON_SIM_CLOCK_NOW}}}, 1, 0),\n"
            "    0\n"
            "  ),\n"
            f"  IF({{{FIELD_ID_ACTIVITY_DATE}}}, IF({{{FIELD_ID_ACTIVITY_DATE}}} > NOW(), 1, 0), BLANK())\n"
            ")"
        )
        status = inspect_activity_date_is_future_formula(self._meta(formula))
        self.assertTrue(status.gated_season_sim_active)
        self.assertTrue(status.uses_now)
        self.assertTrue(status.safe_for_normal_athletes)
        self.assertTrue(any("Season Sim gated" in n for n in status.notes))
        self.assertFalse(any("NOW() only" in b for b in status.blockers))


class TestConfirmationAndDryRunSafety(unittest.TestCase):
    def test_confirm_token(self):
        self.assertFalse(is_confirmed(execute=False, confirm=CONFIRM_TOKEN))
        self.assertFalse(is_confirmed(execute=True, confirm="WRONG"))
        self.assertTrue(is_confirmed(execute=True, confirm=CONFIRM_TOKEN))

    def test_airtable_client_blocks_writes(self):
        from season_simulation.airtable_client import AirtableClient, WriteBlockedError

        client = AirtableClient(token="patTEST", base_id="appTEST", allow_writes=False)
        with self.assertRaises(WriteBlockedError):
            client.create_records("Enrollments", [{"Athlete First Name": "X"}])
        with self.assertRaises(WriteBlockedError):
            client.delete_records("Enrollments", ["recX"])


if __name__ == "__main__":
    unittest.main()
