#!/usr/bin/env python3
"""Unit tests for FUT-009 video rename worker (no live AWS/Airtable)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

ROOT = Path(__file__).resolve().parents[1] / "upload-asset"
sys.path.insert(0, str(ROOT))

from upload_core.fut007_basename import build_fut009_destination_key, Fut009DestinationInput
from upload_core.fut009_rename import (
    RenameContext,
    evaluate_rename_eligibility,
    process_video_rename,
)
from upload_core.s3_storage_key_format import classify_storage_key_generation, is_valid_storage_key_format

GEN_B_SOURCE = (
    "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/"
    "20260817T172732Z_VIDEO_recAqoUbBKfDNtTLt_OffTheDribbleRaw.mp4"
)
EXPECTED_DEST = (
    "shooting-challenge/Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/"
    "20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4"
)


def base_fields(**overrides):
    fields = {
        "Storage Key": GEN_B_SOURCE,
        "Original File Name": "OffTheDribbleRaw.mp4",
        "Upload Status": "Uploaded",
        "Upload Destination": "Video Feedback",
        "Send to Make Trigger": False,
    }
    fields.update(overrides)
    return fields


def base_ctx(**overrides):
    values = dict(
        record_id="recAqoUbBKfDNtTLt",
        asset_fields=base_fields(),
        custom_video_file_name="OffTheDribble",
        last_name="Boltz",
        first_name="Drew",
        program_instance_name="Shooting Challenge 2026-2027",
        activity_date="2026-08-17",
        coach_confirmed=True,
    )
    values.update(overrides)
    return RenameContext(**values)


class TestStorageKeyFormat(unittest.TestCase):
    def test_gen_b_grandfathered(self) -> None:
        self.assertTrue(is_valid_storage_key_format(GEN_B_SOURCE))
        self.assertEqual(classify_storage_key_generation(GEN_B_SOURCE), "gen_b")

    def test_fut007_option_d_valid(self) -> None:
        self.assertTrue(is_valid_storage_key_format(EXPECTED_DEST))
        self.assertEqual(classify_storage_key_generation(EXPECTED_DEST), "fut007")


class TestDestinationKey(unittest.TestCase):
    def test_option_d_destination_example(self) -> None:
        key = build_fut009_destination_key(
            Fut009DestinationInput(
                athlete_folder="Boltz_Drew",
                program_instance_folder="Shooting_Challenge_2026-2027",
                activity_date="2026-08-17",
                last_name="Boltz",
                first_name="Drew",
                custom_video_file_name="OffTheDribble",
                extension=".mp4",
            )
        )
        self.assertEqual(key, EXPECTED_DEST)

    def test_collision_suffix(self) -> None:
        key = build_fut009_destination_key(
            Fut009DestinationInput(
                athlete_folder="Boltz_Drew",
                program_instance_folder="Shooting_Challenge_2026-2027",
                activity_date="2026-08-17",
                last_name="Boltz",
                first_name="Drew",
                custom_video_file_name="OffTheDribble",
                extension=".mp4",
                existing_basenames=("20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4",),
            )
        )
        self.assertTrue(key.endswith("_OffTheDribble_2.mp4"))


class TestRenameEligibility(unittest.TestCase):
    def test_happy_path_gen_b(self) -> None:
        decision = evaluate_rename_eligibility(base_ctx(), confirm_flag=True)
        self.assertTrue(decision.should_copy)
        self.assertEqual(decision.destination_key, EXPECTED_DEST)

    def test_skips_without_confirmation(self) -> None:
        decision = evaluate_rename_eligibility(
            base_ctx(coach_confirmed=False),
            confirm_flag=False,
        )
        self.assertEqual(decision.action, "skipped_missing_confirmation")

    def test_skips_blank_custom_name(self) -> None:
        decision = evaluate_rename_eligibility(
            base_ctx(custom_video_file_name="—"),
            confirm_flag=True,
        )
        self.assertEqual(decision.action, "skipped_blank_custom_name")

    def test_skips_already_named(self) -> None:
        decision = evaluate_rename_eligibility(
            base_ctx(asset_fields=base_fields(**{"Storage Key": EXPECTED_DEST})),
            confirm_flag=True,
        )
        self.assertEqual(decision.action, "skipped_already_named")

    def test_skips_homework(self) -> None:
        decision = evaluate_rename_eligibility(
            base_ctx(
                asset_fields=base_fields(**{"Upload Destination": "Homework Completions"}),
            ),
            confirm_flag=True,
        )
        self.assertEqual(decision.action, "skipped_not_video")


class TestProcessRename(unittest.TestCase):
    def test_dry_run_no_copy(self) -> None:
        decision = process_video_rename(
            base_ctx(),
            bucket="shooting-challenge-assets",
            region="us-east-2",
            dry_run=True,
            confirm_flag=True,
        )
        self.assertEqual(decision.action, "dry_run_would_rename")

    def test_copy_failure_leaves_action_error(self) -> None:
        decision = process_video_rename(
            base_ctx(),
            bucket="shooting-challenge-assets",
            region="us-east-2",
            dry_run=False,
            confirm_flag=True,
            head_destination=lambda key: key == GEN_B_SOURCE,
            copy_object=lambda _s, _d: (False, "AccessDenied"),
        )
        self.assertEqual(decision.action, "error_copy_failed")

    def test_verify_failure_after_copy(self) -> None:
        decision = process_video_rename(
            base_ctx(),
            bucket="shooting-challenge-assets",
            region="us-east-2",
            dry_run=False,
            confirm_flag=True,
            copy_object=lambda _s, _d: (True, "ok"),
            head_destination=lambda key: key == GEN_B_SOURCE,
        )
        self.assertEqual(decision.action, "error_verify_failed")

    def test_airtable_recovery_when_destination_exists(self) -> None:
        patched = {}

        def patch(fields):
            patched.update(fields)

        decision = process_video_rename(
            base_ctx(),
            bucket="shooting-challenge-assets",
            region="us-east-2",
            dry_run=False,
            confirm_flag=True,
            head_destination=lambda _key: True,
            patch_airtable=patch,
        )
        self.assertEqual(decision.action, "airtable_only_recovery")
        self.assertEqual(patched.get("Storage Key"), EXPECTED_DEST)

    def test_successful_rename(self) -> None:
        patched = {}
        s3 = MagicMock()
        s3.head_object.return_value = {"ContentLength": 100}
        s3.copy_object.return_value = {}

        decision = process_video_rename(
            base_ctx(),
            bucket="shooting-challenge-assets",
            region="us-east-2",
            dry_run=False,
            confirm_flag=True,
            s3_client=s3,
            head_destination=lambda key: key == GEN_B_SOURCE,
            patch_airtable=lambda fields: patched.update(fields),
        )
        self.assertEqual(decision.action, "renamed")
        self.assertEqual(patched.get("Storage Key"), EXPECTED_DEST)
        self.assertIn("Canonical File URL", patched)
        # Production does not have Formatted Upload Name — omit by default
        self.assertNotIn("Formatted Upload Name", patched)
        s3.copy_object.assert_called_once()
        self.assertNotIn("DeleteObject", str(s3.method_calls))


if __name__ == "__main__":
    unittest.main()
