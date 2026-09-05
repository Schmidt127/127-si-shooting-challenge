"""SC-168 offline tests — weekly email expectations + send-arm stage safety."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock

from season_simulation.expectations_weekly_email import (
    ROOT_CAUSE_CLASSIFICATION,
    WEEKLY_EVENT_TYPE,
    annotate_intended_weekly_emails,
    assert_zero_weekly_handoffs_ok_without_stage,
    classify_weekly_email_intent,
    expected_weekly_handoff_count_after_execute,
    handoff_key_for_was,
)
from season_simulation.weekly_email_stage import (
    _recipients_safe,
    apply_weekly_email_send_arm,
    evaluate_candidate,
)


class TestSc168Expectations(unittest.TestCase):
    def test_weekly_intent_not_expected_from_execute_alone(self):
        info = classify_weekly_email_intent(
            {"event_type": WEEKLY_EVENT_TYPE, "send": False}
        )
        self.assertTrue(info["is_weekly"])
        self.assertFalse(info["expected_from_execute_alone"])
        self.assertTrue(info["requires_weekly_email_stage"])
        self.assertFalse(info["send_armed_by_execute"])

    def test_non_weekly_intent(self):
        info = classify_weekly_email_intent({"event_type": "DAILY_SUBMISSION"})
        self.assertFalse(info["is_weekly"])
        self.assertFalse(info["requires_weekly_email_stage"])

    def test_zero_weekly_after_execute_is_ok(self):
        contract = expected_weekly_handoff_count_after_execute(
            enable_email_delivery=True,
            weekly_email_arms=6,
            weekly_email_stage_completed=False,
        )
        self.assertEqual(contract["expected_min"], 0)
        self.assertEqual(contract["expected_max"], 0)
        self.assertEqual(contract["classification"], ROOT_CAUSE_CLASSIFICATION)
        assert_zero_weekly_handoffs_ok_without_stage(
            observed_weekly_handoffs=0,
            enable_email_delivery=True,
            weekly_email_arms=6,
            weekly_email_stage_completed=False,
        )

    def test_t122531z_contract_matches_closeout(self):
        """Closeout: 6 arms, 0 WEEKLY, email on — expected harness gap."""
        assert_zero_weekly_handoffs_ok_without_stage(
            observed_weekly_handoffs=0,
            enable_email_delivery=True,
            weekly_email_arms=6,
            weekly_email_stage_completed=False,
        )

    def test_stage_completed_requires_handoffs(self):
        with self.assertRaises(AssertionError):
            assert_zero_weekly_handoffs_ok_without_stage(
                observed_weekly_handoffs=0,
                enable_email_delivery=True,
                weekly_email_arms=6,
                weekly_email_stage_completed=True,
            )

    def test_annotate_intended_emails(self):
        rows = annotate_intended_weekly_emails(
            [
                {"event_type": "DAILY_SUBMISSION"},
                {"event_type": WEEKLY_EVENT_TYPE, "day_number": 8},
            ]
        )
        self.assertNotIn("sc168", rows[0])
        self.assertIn("sc168", rows[1])
        self.assertTrue(rows[1]["sc168"]["requires_weekly_email_stage"])

    def test_handoff_key_shape(self):
        self.assertEqual(
            handoff_key_for_was("recABCDEFGHIJKLMN"),
            "WEEKLY_ATHLETE_SUMMARY|WEEKLY_ATHLETE_SUMMARY|recABCDEFGHIJKLMN",
        )


class TestSc168RecipientSafety(unittest.TestCase):
    def test_allowlist_ok(self):
        self.assertTrue(
            _recipients_safe("schmidt@fairfieldbasketballclub.com")
        )
        self.assertTrue(
            _recipients_safe(
                "schmidt@fairfieldbasketballclub.com, schmidt@fairfieldbasketballclub.com"
            )
        )

    def test_foreign_email_rejected(self):
        self.assertFalse(_recipients_safe("parent@example.com"))
        self.assertFalse(
            _recipients_safe(
                "schmidt@fairfieldbasketballclub.com, parent@example.com"
            )
        )

    def test_empty_rejected(self):
        self.assertFalse(_recipients_safe(""))
        self.assertFalse(_recipients_safe(None))


class TestSc168ApplyGates(unittest.TestCase):
    def test_apply_refuses_bad_confirm(self):
        client = MagicMock()
        client.allow_writes = True
        with self.assertRaises(ValueError) as ctx:
            apply_weekly_email_send_arm(
                client,
                run_id="SEASON-SIM-2027-20260905T122531Z-athlete1",
                registry_dir=MagicMock(),
                confirm="WRONG",
                confirm_disposable="WRONG",
            )
        self.assertIn("refused", str(ctx.exception).lower())

    def test_evaluate_skips_not_ready(self):
        client = MagicMock()
        client.get_record.return_value = {
            "id": "recWASTEST0000001",
            "fields": {
                "Enrollment": ["recENROLLTEST00001"],
                "Weekly Email Ready?": False,
                "Weekly Email Sent?": False,
                "Send to Make?": False,
                "Weekly Email Recipients": "schmidt@fairfieldbasketballclub.com",
                "Parent Email - Cleaned": ["schmidt@fairfieldbasketballclub.com"],
            },
        }
        cand = evaluate_candidate(
            client, "recWASTEST0000001", enrollment_id="recENROLLTEST00001"
        )
        self.assertEqual(cand.skip_reason, "not_ready")


if __name__ == "__main__":
    unittest.main()
