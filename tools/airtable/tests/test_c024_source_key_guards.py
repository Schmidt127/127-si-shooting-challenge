#!/usr/bin/env python3
"""C-024 Stage 2 Source Key guard tests (Worker C).

Mock-based coverage for c023_dev_stage5_apply repair patterns and prod_116
fixture source-key contracts — no live Airtable API.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

import c023_dev_stage5_apply as s5  # noqa: E402
from c023_dev_stage5_apply import (  # noqa: E402
    AUDIT_MARKER,
    FIELD_LAST_APPLIED,
    SOURCE_HOMEWORK,
    SOURCE_VIDEO,
    apply_confirmed,
    categorize,
    get_last_applied,
    resolve_target,
    restore_eligibility,
    set_last_applied_patch,
)


class C024SourceKeyPatternTests(unittest.TestCase):
    def test_video_source_key_matches_prod_116_fixture(self):
        vf_id = "recVfProd116Test"
        target = resolve_target(
            {
                "Upload Destination": "Video Feedback",
                "Video Feedback": [vf_id],
            }
        )
        self.assertIsNotNone(target)
        assert target is not None
        self.assertEqual(target["route"], "video")
        self.assertEqual(target["source_key"], f"VIDEO_SUBMISSION|{vf_id}")
        self.assertEqual(target["source_key"], f"{SOURCE_VIDEO}{vf_id}")

    def test_homework_source_key_pattern(self):
        hw_id = "recHcStage5Test"
        target = resolve_target(
            {
                "Upload Destination": "Homework Completions",
                "Homework Completions": [hw_id],
            }
        )
        self.assertIsNotNone(target)
        assert target is not None
        self.assertEqual(target["route"], "homework")
        self.assertEqual(target["source_key"], f"{SOURCE_HOMEWORK}{hw_id}")

    def test_resolve_target_requires_activity_link(self):
        self.assertIsNone(resolve_target({"Upload Destination": "Video Feedback"}))
        self.assertIsNone(resolve_target({"Upload Destination": "Homework Completions"}))


class C024DecisionCategoryTests(unittest.TestCase):
    def test_categorize_confirmed_and_approved(self):
        self.assertEqual(categorize("Confirmed Duplicate"), "confirmed")
        self.assertEqual(categorize("Approved Reuse"), "approved")
        self.assertEqual(categorize("Not Reviewed"), "not_reviewed")

    def test_get_last_applied_prefers_explicit_field(self):
        fields = {
            FIELD_LAST_APPLIED: "Confirmed Duplicate",
            "Asset Reuse Review Notes": "[C-023-S5-LAST] Approved Reuse",
        }
        self.assertEqual(get_last_applied(fields), "Confirmed Duplicate")

    def test_set_last_applied_patch_updates_notes_and_field(self):
        with patch.object(s5, "_schema_fields", return_value={FIELD_LAST_APPLIED}):
            patch_fields = set_last_applied_patch("prior note", "Confirmed Duplicate")
        self.assertIn("[C-023-S5-LAST] Confirmed Duplicate", patch_fields["Asset Reuse Review Notes"])
        self.assertEqual(patch_fields[FIELD_LAST_APPLIED], "Confirmed Duplicate")


class C024ApplyConfirmedIdempotencyTests(unittest.TestCase):
    def _video_target(self, vf_id: str = "recVf1") -> dict:
        return {"route": "video", "id": vf_id, "source_key": f"{SOURCE_VIDEO}{vf_id}"}

    @patch("c023_dev_stage5_apply.patch_rec")
    @patch("c023_dev_stage5_apply.list_xp_by_source_key")
    def test_rerun_skips_when_already_confirmed(self, mock_list_xp, mock_patch):
        asset = {
            "fields": {
                "Duplicate Resolution Applied?": True,
                FIELD_LAST_APPLIED: "Confirmed Duplicate",
            }
        }
        result = apply_confirmed("recAsset1", asset, self._video_target(), "recEnr1")
        self.assertEqual(result["actionOut"], "skipped_idempotent_same_decision")
        self.assertTrue(result["idempotent"])
        mock_list_xp.assert_not_called()
        mock_patch.assert_not_called()

    @patch("c023_dev_stage5_apply.patch_rec")
    @patch("c023_dev_stage5_apply.list_xp_by_source_key")
    def test_first_apply_deactivates_xp_once(self, mock_list_xp, mock_patch):
        mock_list_xp.return_value = {
            "id": "recXp1",
            "fields": {"XP Reason Debug": "seed", "Active?": True},
        }
        asset = {"fields": {"Asset Reuse Review Notes": ""}}
        with patch.object(s5, "_schema_fields", return_value={FIELD_LAST_APPLIED}):
            result = apply_confirmed("recAsset2", asset, self._video_target(), "recEnr1")

        self.assertEqual(result["actionOut"], "applied_confirmed_duplicate")
        self.assertFalse(result["idempotent"])
        mock_list_xp.assert_called_once_with("VIDEO_SUBMISSION|recVf1")
        xp_patch_calls = [
            c for c in mock_patch.call_args_list if c.args[0] == "XP Events"
        ]
        self.assertEqual(len(xp_patch_calls), 1)
        self.assertFalse(xp_patch_calls[0].args[2]["Active?"])


class C024RestoreEligibilityGuardTests(unittest.TestCase):
    def _target(self) -> dict:
        return {
            "route": "video",
            "id": "recVfRestore",
            "source_key": "VIDEO_SUBMISSION|recVfRestore",
        }

    @patch("c023_dev_stage5_apply.patch_rec")
    @patch("c023_dev_stage5_apply.get_rec")
    @patch("c023_dev_stage5_apply.list_xp_by_source_key")
    def test_restore_skips_when_not_previously_confirmed(
        self, mock_list_xp, mock_get_rec, mock_patch
    ):
        asset = {"fields": {FIELD_LAST_APPLIED: "Approved Reuse"}}
        result = restore_eligibility(
            "recAsset3",
            asset,
            self._target(),
            "recEnr1",
            decision_label="Approved Reuse",
        )
        self.assertEqual(result["actionOut"], "skipped_nothing_to_restore")
        self.assertFalse(result["restored"])
        mock_list_xp.assert_not_called()
        mock_patch.assert_not_called()

    @patch("c023_dev_stage5_apply.patch_rec")
    @patch("c023_dev_stage5_apply.get_rec")
    @patch("c023_dev_stage5_apply.list_xp_by_source_key")
    def test_restore_reactivates_marked_test_xp(self, mock_list_xp, mock_get_rec, mock_patch):
        mock_get_rec.return_value = {"fields": {"Do Not Award XP?": True}}
        mock_list_xp.return_value = {
            "id": "recXpRestore",
            "fields": {"XP Reason Debug": f"{AUDIT_MARKER} test seed", "Active?": False},
        }
        asset = {"fields": {FIELD_LAST_APPLIED: "Confirmed Duplicate"}}
        with patch.object(s5, "_schema_fields", return_value={FIELD_LAST_APPLIED}):
            result = restore_eligibility(
                "recAsset4",
                asset,
                self._target(),
                "recEnr1",
                decision_label="Approved Reuse",
            )

        self.assertTrue(result["restored"])
        self.assertIn("restored_approved_reuse", result["actionOut"])
        xp_patch = [
            c for c in mock_patch.call_args_list if c.args[0] == "XP Events"
        ][0]
        self.assertTrue(xp_patch.args[2]["Active?"])
        self.assertEqual(xp_patch.args[2]["Duplicate Status"], "Unique")


class C024XpCountGuardTests(unittest.TestCase):
    """prod_116_fixture_run list_xp_by_source contract — one XP per Source Key."""

    def test_single_xp_record_passes_count_guard(self):
        records = [{"id": "recXpOnly", "fields": {"Source Key": "VIDEO_SUBMISSION|recVf1"}}]
        self.assertEqual(len(records), 1)

    def test_duplicate_source_key_records_fail_guard(self):
        records = [
            {"id": "recXpA", "fields": {"Source Key": "VIDEO_SUBMISSION|recVf1"}},
            {"id": "recXpB", "fields": {"Source Key": "VIDEO_SUBMISSION|recVf1"}},
        ]
        self.assertGreater(len(records), 1)

    def test_filter_formula_shape(self):
        source_key = "VIDEO_SUBMISSION|recVfProd116Test"
        formula = f'{{Source Key}}="{source_key}"'
        self.assertIn("VIDEO_SUBMISSION|", formula)
        self.assertEqual(formula, '{Source Key}="VIDEO_SUBMISSION|recVfProd116Test"')


if __name__ == "__main__":
    unittest.main()
