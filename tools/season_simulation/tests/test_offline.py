#!/usr/bin/env python3
"""Offline tests for season simulation infrastructure (no Airtable writes)."""

from __future__ import annotations

import sys
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

PACKAGE_PARENT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PACKAGE_PARENT))

from season_simulation.clock_override import (  # noqa: E402
    GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
    activity_date_is_future_gated,
    activity_date_is_future_production,
    assess_clock_override_readiness,
    sim_submission_override_fields,
    submitted_same_day_gated,
    submitted_same_day_production,
)
from season_simulation.confirmation import (  # noqa: E402
    is_confirmed,
    is_execute_fully_gated,
    require_cleanup_gates,
    require_execute_gates,
    ConfirmationError,
)
from season_simulation.constants import (  # noqa: E402
    CONFIRM_CLEANUP_TOKEN,
    CONFIRM_DISPOSABLE_TOKEN,
    CONFIRM_TOKEN,
    SAFE_EMAIL_RECIPIENT,
    SIM_END,
    SIM_START,
    SIMULATION_DAY_COUNT,
)
from season_simulation.execute import build_intended_writes  # noqa: E402
from season_simulation.recipient_safety import (  # noqa: E402
    assert_safe_recipient,
    evaluate_recipient,
    resolve_simulation_recipient,
)
from season_simulation.offline_helpers import pick_highest_goal  # noqa: E402
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
    LATE_HOMEWORK_PROBE_DAY,
    MISS_DAYS,
    SAME_DAY_SUBMIT_DAY,
    build_athlete1_scenario,
)
from season_simulation.season_policy import (  # noqa: E402
    COMMON_HOMEWORK_DUE_DATE,
    EXPECTED_ACTIVE_PHA_COUNT,
    evaluate_homework_week_ownership,
    evaluate_late_homework,
    is_early_bird_day,
    week_label_for_activity_date,
)
from season_simulation.simulation_clock import (  # noqa: E402
    SimulationClock,
    SubmissionTiming,
    assert_window_integrity,
    build_simulation_days,
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
        self.assertEqual(date(2027, 5, 1).strftime("%A"), "Saturday")
        self.assertEqual(sunday_of(date(2027, 5, 1)), date(2027, 4, 25))
        self.assertEqual(saturday_of(date(2027, 5, 1)), date(2027, 5, 1))
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
            self.assertEqual(sun.weekday(), 6)
            self.assertEqual(sat.weekday(), 5)


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


class TestClockOverride(unittest.TestCase):
    def test_production_blocks_2027_dates_before_window(self):
        wall = datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
        d = activity_date_is_future_production(date(2027, 5, 1), wall_now=wall)
        self.assertTrue(d.is_future)
        self.assertFalse(d.counts_for_submission)
        self.assertEqual(d.mode, "production_now")

    def test_production_allows_past_activity_date(self):
        wall = datetime(2027, 6, 15, 12, 0, tzinfo=timezone.utc)
        d = activity_date_is_future_production(date(2027, 5, 1), wall_now=wall)
        self.assertFalse(d.is_future)
        self.assertTrue(d.counts_for_submission)

    def test_gated_sim_allows_2027_when_override_active(self):
        wall = datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
        marker = "SEASON-SIM|SEASON-SIM-2027-20260101T000000Z-test01"
        d = activity_date_is_future_gated(
            date(2027, 5, 10),
            wall_now=wall,
            season_sim_test_record=True,
            video_upload_note=marker,
            season_sim_clock_now=date(2027, 5, 10),
        )
        self.assertFalse(d.is_future)
        self.assertTrue(d.counts_for_submission)
        self.assertEqual(d.mode, "simulation_gated")

    def test_gated_sim_still_blocks_activity_after_sim_clock(self):
        wall = datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
        marker = "SEASON-SIM|SEASON-SIM-2027-20260101T000000Z-test01"
        d = activity_date_is_future_gated(
            date(2027, 5, 15),
            wall_now=wall,
            season_sim_test_record=True,
            video_upload_note=marker,
            season_sim_clock_now=date(2027, 5, 10),
        )
        self.assertTrue(d.is_future)
        self.assertFalse(d.counts_for_submission)

    def test_normal_production_unaffected_without_gate(self):
        wall = datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
        # Checkbox alone is not enough
        d = activity_date_is_future_gated(
            date(2027, 5, 1),
            wall_now=wall,
            season_sim_test_record=True,
            video_upload_note="ordinary parent note",
            season_sim_clock_now=date(2027, 6, 30),
        )
        self.assertEqual(d.mode, "production_now")
        self.assertTrue(d.is_future)
        # Marker alone is not enough
        d2 = activity_date_is_future_gated(
            date(2027, 5, 1),
            wall_now=wall,
            season_sim_test_record=False,
            video_upload_note="SEASON-SIM|SEASON-SIM-2027-x",
            season_sim_clock_now=date(2027, 6, 30),
        )
        self.assertEqual(d2.mode, "production_now")

    def test_same_day_created_time_cannot_match_2027_from_2026(self):
        d = submitted_same_day_production(
            date(2027, 5, 8),
            submitted_at_date=date(2026, 9, 2),
        )
        self.assertFalse(d.same_day)
        self.assertEqual(d.mode, "production_created_time")

    def test_same_day_gated_uses_test_submitted_at(self):
        marker = "SEASON-SIM|SEASON-SIM-2027-20260101T000000Z-test01"
        d = submitted_same_day_gated(
            date(2027, 5, 8),
            submitted_at_date=date(2026, 9, 2),
            season_sim_test_record=True,
            video_upload_note=marker,
            season_sim_test_submitted_at=date(2027, 5, 8),
        )
        self.assertTrue(d.same_day)
        self.assertEqual(d.mode, "simulation_test_submitted_at")

    def test_readiness_blocks_early_execute_without_override(self):
        r = assess_clock_override_readiness(
            wall_date=date(2026, 9, 2),
            submission_field_names={"Activity Date", "Video Upload Note"},
            formula_text_activity_date_is_future=PRODUCTION_ACTIVITY_DATE_IS_FUTURE_FORMULA,
            formula_override_acknowledged=False,
        )
        self.assertFalse(r.ready_for_early_execute)
        self.assertTrue(any("Count This Submission" in b for b in r.blockers))

    def test_readiness_passes_with_fields_and_ack(self):
        fields = {
            "Season Sim Test Record?",
            "Season Sim Clock Now",
            "Season Sim Test Submitted At",
            "Activity Date Is Future?",
            "Video Upload Note",
        }
        r = assess_clock_override_readiness(
            wall_date=date(2026, 9, 2),
            submission_field_names=fields,
            formula_text_activity_date_is_future=GATED_ACTIVITY_DATE_IS_FUTURE_FORMULA,
            formula_override_acknowledged=True,
        )
        self.assertTrue(r.ready_for_early_execute)
        self.assertTrue(r.formula_override_detected)

    def test_override_fields_stamp_marker(self):
        fields = sim_submission_override_fields(
            run_marker="SEASON-SIM|SEASON-SIM-2027-x",
            simulated_now=date(2027, 5, 8),
            activity_date=date(2027, 5, 8),
            perfect_week_manual_exception=True,
        )
        self.assertTrue(fields["Season Sim Test Record?"])
        self.assertIn("SEASON-SIM|", fields["Video Upload Note"])
        self.assertTrue(fields["Perfect Week Manual Exception?"])


class TestSeasonPolicy(unittest.TestCase):
    def test_early_bird_may1(self):
        d = is_early_bird_day(date(2027, 5, 1))
        self.assertTrue(d.in_early_bird_window)
        self.assertTrue(d.countable)
        self.assertEqual(week_label_for_activity_date(date(2027, 5, 1)), "Early Bird")

    def test_week9_no_homework(self):
        # Week 9 starts 2027-06-27 (Sun) in this calendar model
        label = week_label_for_activity_date(date(2027, 6, 27))
        self.assertEqual(label, "Week 9")
        own = evaluate_homework_week_ownership("Week 9", 0)
        self.assertTrue(own.ok)
        self.assertFalse(own.expect_homework)
        bad = evaluate_homework_week_ownership("Week 9", 2)
        self.assertFalse(bad.ok)

    def test_eighteen_homework_expectation(self):
        self.assertEqual(EXPECTED_ACTIVE_PHA_COUNT, 18)
        early = evaluate_homework_week_ownership("Early Bird", 2)
        self.assertTrue(early.ok)
        w1 = evaluate_homework_week_ownership("Week 1", 2)
        self.assertTrue(w1.ok)

    def test_late_homework_after_due(self):
        on_time = evaluate_late_homework(
            submission_date=COMMON_HOMEWORK_DUE_DATE,
            due_date=COMMON_HOMEWORK_DUE_DATE,
        )
        self.assertTrue(on_time.credit_eligible)
        late = evaluate_late_homework(
            submission_date=date(2027, 6, 30),
            due_date=COMMON_HOMEWORK_DUE_DATE,
        )
        self.assertFalse(late.credit_eligible)
        self.assertEqual(late.timing_status, "late_ineligible")


class TestScenario(unittest.TestCase):
    def _scenario(self, hw_count: int = 18):
        return build_athlete1_scenario(
            run_id="SEASON-SIM-2027-20260101T000000Z-test01",
            grade_band_id="recBAND",
            goal_record_id="recGOAL",
            goal_total_shots=12000,
            homework=[
                {"record_id": f"recHW{i:02d}", "slot": "HW1" if i % 2 else "HW2"}
                for i in range(1, hw_count + 1)
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
        self.assertIn("PW_MANUAL_EXCEPTION", same.notes)
        back = next(d for d in s.days if d.day_number == BACKDATE_ACTIVITY_DAY)
        self.assertEqual(back.timing, "backdated")
        self.assertEqual(back.write_on_day_number, BACKDATE_WRITE_DAY)

    def test_week9_has_no_homework_attachments(self):
        s = self._scenario()
        week9_days = [
            d
            for d in s.days
            if week_label_for_activity_date(d.activity_date) == "Week 9"
        ]
        self.assertTrue(week9_days)
        for d in week9_days:
            self.assertEqual(d.homework, [])

    def test_early_bird_day_one(self):
        s = self._scenario()
        self.assertEqual(s.meta["early_bird_day_1"], "Early Bird")
        self.assertEqual(s.days[0].activity_date, date(2027, 5, 1))

    def test_late_homework_probe(self):
        s = self._scenario()
        late_day = next(d for d in s.days if d.day_number == LATE_HOMEWORK_PROBE_DAY)
        self.assertEqual(late_day.activity_date, date(2027, 6, 30))
        # May or may not attach HW depending on % 3; gate note should mention late if attached
        if late_day.homework:
            self.assertFalse(late_day.homework[0]["credit_eligible"])

    def test_eighteen_homework_selected(self):
        s = self._scenario(18)
        self.assertEqual(s.meta["homework_selected_count"], 18)

    def test_dedupe_keys_unique_for_subs(self):
        s = self._scenario()
        keys = [d.dedupe_key for d in s.days]
        self.assertEqual(len(keys), len(set(keys)))

    def test_dynamic_homework_and_zoom_ids(self):
        s = self._scenario(2)
        self.assertEqual(s.zoom_selected[0]["record_id"], "recZ1")
        z12 = next(d for d in s.days if d.day_number == 12)
        z40 = next(d for d in s.days if d.day_number == 40)
        self.assertEqual(z12.zoom_meeting_ids, ["recZ1"])
        self.assertEqual(z40.zoom_meeting_ids, ["recZ2"])

    def test_recipient_on_emails(self):
        s = self._scenario()
        for ev in s.intended_emails:
            self.assertEqual(ev["recipient"], SAFE_EMAIL_RECIPIENT)
            self.assertFalse(ev.get("send"))

    def test_intended_writes_include_sim_override_fields(self):
        s = self._scenario()
        clock = SimulationClock(enabled=True, current_date=SIM_START, run_id=s.run_id)
        writes = build_intended_writes(s, clock)
        subs = [w for w in writes if w.get("table") == "Submissions"]
        self.assertTrue(subs)
        f = subs[0]["fields"]
        self.assertTrue(f.get("Season Sim Test Record?"))
        self.assertIn("SEASON-SIM|", f.get("Video Upload Note", ""))
        self.assertIn("Season Sim Clock Now", f)


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

    def test_cleanup_refuses_without_cleanup_token(self):
        with self.assertRaises(ConfirmationError):
            require_cleanup_gates(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_cleanup="WRONG",
                simulation_id="SEASON-SIM-2027-20260101T000000Z-abcd12",
            )


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
        top = pick_highest_goal(goals)
        self.assertEqual(top["record_id"], "b")
        goals2 = [
            {"record_id": "c", "total_shot_target": 15000, "active": True},
            {"record_id": "b", "total_shot_target": 12000, "active": True},
        ]
        self.assertEqual(pick_highest_goal(goals2)["record_id"], "c")


class TestConfirmationAndDryRunSafety(unittest.TestCase):
    def test_confirm_token(self):
        self.assertFalse(is_confirmed(execute=False, confirm=CONFIRM_TOKEN))
        self.assertFalse(is_confirmed(execute=True, confirm="WRONG"))
        self.assertTrue(is_confirmed(execute=True, confirm=CONFIRM_TOKEN))

    def test_execute_requires_disposable_and_simulation_id(self):
        self.assertFalse(
            is_execute_fully_gated(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable="",
                simulation_id="SEASON-SIM-2027-20260101T000000Z-abcd12",
            )
        )
        self.assertTrue(
            is_execute_fully_gated(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                simulation_id="SEASON-SIM-2027-20260101T000000Z-abcd12",
            )
        )
        with self.assertRaises(ConfirmationError):
            require_execute_gates(
                execute=True,
                confirm=CONFIRM_TOKEN,
                confirm_disposable=CONFIRM_DISPOSABLE_TOKEN,
                simulation_id="bad-id",
            )

    def test_cleanup_token_constant(self):
        self.assertEqual(CONFIRM_CLEANUP_TOKEN, "CONFIRM-CLEANUP-SEASON-SIM")

    def test_airtable_client_blocks_writes(self):
        from season_simulation.airtable_client import AirtableClient, WriteBlockedError

        client = AirtableClient(token="patTEST", base_id="appTEST", allow_writes=False)
        with self.assertRaises(WriteBlockedError):
            client.create_records("Enrollments", [{"Athlete First Name": "X"}])
        with self.assertRaises(WriteBlockedError):
            client.delete_records("Enrollments", ["recX"])


if __name__ == "__main__":
    unittest.main()
