#!/usr/bin/env python3
"""S3 object-key shape, sanitization, replay, and retry persistence."""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fields import (
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_PROCESSING_STARTED_AT,
    FIELD_STORAGE_KEY,
    FIELD_UPLOAD_CLAIM_RUN_ID,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset, process_with_error_writeback
from upload_core.storage_key import (
    build_storage_key,
    folder_person_name,
    folder_program_instance,
    is_reusable_storage_key,
    path_token,
    resolve_storage_key,
    safe_filename,
)
from upload_core.util import sha256_hex

from season_support import DEFAULT_SEASON

EXAMPLE_CREATED = datetime(2026, 8, 17, 17, 27, 32, tzinfo=timezone.utc)
EXAMPLE_KEY = (
    "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/"
    "20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg"
)
HASH = sha256_hex(b"retry-bytes")
RECORD = "recAqoUbBKfDNtTLt"


def _example_key(**overrides) -> str:
    values = dict(
        record_id="recAqoUbBKfDNtTLt",
        athlete_folder="Schmidt_Xavier",
        program_instance_folder="Shooting_Challenge_2026-2027",
        created_at=EXAMPLE_CREATED,
        slot_token="HW1",
        filename="Straughn_Stetson_316.jpg",
    )
    values.update(overrides)
    return build_storage_key(**values)


class StorageKeyShapeTests(unittest.TestCase):
    def test_matches_required_example(self):
        self.assertEqual(_example_key(), EXAMPLE_KEY)

    def test_four_segments(self):
        parts = _example_key().split("/")
        self.assertEqual(len(parts), 4)
        self.assertEqual(parts[0], "Schmidt_Xavier")
        self.assertEqual(parts[1], "Shooting_Challenge_2026-2027")
        self.assertEqual(parts[2], "2026-08-17")
        self.assertTrue(parts[3].startswith("20260817T172732Z_HW1_recAqoUbBKfDNtTLt_"))

    def test_duplicate_athlete_names_isolated_by_record_id(self):
        key_a = _example_key(record_id="recAthleteA")
        key_b = _example_key(record_id="recAthleteB")
        self.assertNotEqual(key_a, key_b)
        self.assertTrue(key_a.startswith("Schmidt_Xavier/Shooting_Challenge_2026-2027/"))
        self.assertTrue(key_b.startswith("Schmidt_Xavier/Shooting_Challenge_2026-2027/"))
        self.assertIn("recAthleteA", key_a)
        self.assertIn("recAthleteB", key_b)

    def test_multiple_seasons_use_program_instance_folder(self):
        current = _example_key(
            program_instance_folder="Shooting_Challenge_2026-2027",
        )
        prior = _example_key(
            program_instance_folder="Shooting_Challenge_2025-2026",
        )
        self.assertIn("Shooting_Challenge_2026-2027", current)
        self.assertIn("Shooting_Challenge_2025-2026", prior)
        self.assertNotEqual(current, prior)

    def test_video_and_homework_share_folder_logic(self):
        homework = _example_key(slot_token="HW1", filename="hw.jpg")
        video = _example_key(slot_token="VIDEO", filename="clip.mp4")
        self.assertEqual(homework.rsplit("/", 1)[0], video.rsplit("/", 1)[0])
        self.assertIn("_HW1_", homework)
        self.assertIn("_VIDEO_", video)


class SanitizationTests(unittest.TestCase):
    def test_special_characters_in_names(self):
        self.assertEqual(folder_person_name("O'Brien", "José"), "O_Brien_Jose")
        self.assertEqual(
            folder_program_instance("Shooting Challenge | 2026-2027"),
            "Shooting_Challenge_2026-2027",
        )

    def test_path_traversal_stripped_from_filename(self):
        key = _example_key(filename="../../etc/passwd.jpg")
        self.assertNotIn("..", key)
        self.assertNotIn("etc/", key)
        self.assertTrue(key.endswith("_passwd.jpg"))

    def test_windows_and_null_path_pieces_rejected(self):
        self.assertEqual(path_token(".."), "Unknown")
        self.assertEqual(path_token("../secret"), "secret")
        self.assertEqual(safe_filename("..\\..\\weird name?.mp4"), "weird_name.mp4")
        self.assertNotIn("\\", safe_filename("a\\b.png"))
        self.assertEqual(Path(safe_filename("a/b/c.png")).name, "c.png")

    def test_original_filename_is_final_component_only(self):
        key = _example_key(filename="folder/Straughn_Stetson_316.jpg")
        self.assertEqual(key.split("/")[-1].split("_", 3)[-1], "Straughn_Stetson_316.jpg")
        self.assertEqual(len(key.split("/")), 4)


class ReplayAndRetryKeyTests(unittest.TestCase):
    def test_existing_storage_key_is_reused_exactly(self):
        fields = {FIELD_STORAGE_KEY: EXAMPLE_KEY, "Original File Name": "other.jpg"}
        key, reused = resolve_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            fields=fields,
            athlete_folder="Different_Name",
            program_instance_folder="Shooting_Challenge_2025-2026",
            now=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        self.assertTrue(reused)
        self.assertEqual(key, EXAMPLE_KEY)

    def test_old_format_key_is_reused_if_safe(self):
        old = (
            "shooting-challenge/2026-2027/shooting-challenge/schmidt-xavier/"
            "2026-08-17-homework-recAqoUbBKfDNtTLt-file.jpg"
        )
        self.assertTrue(is_reusable_storage_key(old, "recAqoUbBKfDNtTLt"))
        key, reused = resolve_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            fields={FIELD_STORAGE_KEY: old},
            athlete_folder="Schmidt_Xavier",
            program_instance_folder="Shooting_Challenge_2026-2027",
        )
        self.assertTrue(reused)
        self.assertEqual(key, old)

    def test_unsafe_existing_key_is_regenerated(self):
        unsafe = "../recAqoUbBKfDNtTLt/secret.jpg"
        self.assertFalse(is_reusable_storage_key(unsafe, "recAqoUbBKfDNtTLt"))
        key, reused = resolve_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            fields={
                FIELD_STORAGE_KEY: unsafe,
                "Created Time": "2026-08-17T17:27:32.000Z",
                "Asset Slot": "HW1",
                "Original File Name": "Straughn_Stetson_316.jpg",
            },
            athlete_folder="Schmidt_Xavier",
            program_instance_folder="Shooting_Challenge_2026-2027",
        )
        self.assertFalse(reused)
        self.assertEqual(key, EXAMPLE_KEY)

    def test_denver_created_time_converted_to_utc_stamp(self):
        key, reused = resolve_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            fields={
                "Created Time": "2026-08-17T11:27:32.000-06:00",
                "Asset Slot": "HW1",
                "Original File Name": "Straughn_Stetson_316.jpg",
            },
            athlete_folder="Schmidt_Xavier",
            program_instance_folder="Shooting_Challenge_2026-2027",
            now=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        self.assertFalse(reused)
        self.assertEqual(key, EXAMPLE_KEY)

    def test_missing_created_time_uses_injected_now_once(self):
        fields = {
            "Asset Slot": "HW1",
            "Original File Name": "Straughn_Stetson_316.jpg",
        }
        now = datetime(2026, 8, 17, 17, 27, 32, tzinfo=timezone.utc)
        key, reused = resolve_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            fields=fields,
            athlete_folder="Schmidt_Xavier",
            program_instance_folder="Shooting_Challenge_2026-2027",
            now=now,
        )
        self.assertFalse(reused)
        self.assertEqual(key, EXAMPLE_KEY)


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appn84sqPw03zEbTT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="PROD",
        allow_route_keys=frozenset({"video_feedback", "homework_completion"}),
        season_slug="2025-2026",
        challenge_slug="shooting-challenge",
        athlete_slug_override="should-not-appear",
        upload_webhook_secret=None,
    )


HW_FIELDS = {
    "Upload Destination": "Homework Completions",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [
        {"url": "https://example.com/file.jpg", "filename": "Straughn_Stetson_316.jpg"}
    ],
    "Homework Completions": ["recJE9WJiHfMeJ1cw"],
    "Enrollment - Linked": ["recEnroll1"],
    "Original File Name": "Straughn_Stetson_316.jpg",
    "Asset Slot": "HW1",
    "Asset Type": "Homework Image",
    "Created Time": "2026-08-17T17:27:32.000Z",
}

VF_FIELDS = {
    "Upload Destination": "Video Feedback",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [{"url": "https://example.com/file.mp4", "filename": "clip.mp4"}],
    "Video Feedback": ["recVf1"],
    "Enrollment - Linked": ["recEnroll1"],
    "Original File Name": "clip.mp4",
    "Asset Slot": "VIDEO",
    "Asset Type": "Video Feedback",
    "Created Time": "2026-08-17T17:27:32.000Z",
}


def _run(fields, *, route_key, automation_number, record_id=RECORD, matches=None, body=b"retry-bytes"):
    def get_impl(token, base_id, rec_id):
        return {"id": rec_id, "fields": dict(fields)}

    def patch_impl(token, base_id, rec_id, patch_fields):
        fields.update(patch_fields)
        return {"id": rec_id, "fields": fields}

    payload = {
        "submissionAssetRecordId": record_id,
        "routeKey": route_key,
        "automationNumber": automation_number,
    }
    with (
        patch("upload_core.processor.get_asset", side_effect=get_impl),
        patch("upload_core.processor.patch_asset", side_effect=patch_impl),
        patch("upload_core.processor.http_get_bytes", return_value=(body, "application/octet-stream")),
        patch(
            "upload_core.processor.upload_s3",
            return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
        ) as mock_s3,
        patch("upload_core.processor.lookup_duplicate_matches", return_value=list(matches or [])),
        patch("upload_core.processor.resolve_upload_season", return_value=DEFAULT_SEASON),
    ):
        result = process_upload_asset(_config(), payload)
    return result, mock_s3


class ProcessorStorageKeyTests(unittest.TestCase):
    def test_homework_070a_uses_canonical_shape(self):
        fields = dict(HW_FIELDS)
        result, _ = _run(fields, route_key="homework_completion", automation_number="070a")
        key = result["s3"]["storageKey"]
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(
            key,
            "Test_Athlete/Shooting_Challenge_2026-2027/2026-08-17/"
            "20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg",
        )
        self.assertEqual(fields[FIELD_STORAGE_KEY], key)
        self.assertFalse(result["season"]["storageKeyReused"])
        self.assertNotIn("should-not-appear", key)

    def test_video_070b_uses_same_folder_logic(self):
        fields = dict(VF_FIELDS)
        result, _ = _run(
            fields,
            route_key="video_feedback",
            automation_number="070b",
            record_id="recVideoAsset01",
        )
        key = result["s3"]["storageKey"]
        self.assertTrue(key.startswith("Test_Athlete/Shooting_Challenge_2026-2027/2026-08-17/"))
        self.assertIn("_VIDEO_recVideoAsset01_", key)
        self.assertTrue(key.endswith("_clip.mp4"))

    def test_replay_after_upload_keeps_storage_key(self):
        fields = dict(HW_FIELDS)
        first, _ = _run(fields, route_key="homework_completion", automation_number="070a")
        original = first["s3"]["storageKey"]
        fields[FIELD_UPLOAD_STATUS] = "Uploaded"
        fields[FIELD_CANONICAL_FILE_URL] = first["s3"]["canonicalFileUrl"]
        fields[FIELD_FILE_CONTENT_HASH] = HASH
        second, mock_s3 = _run(fields, route_key="homework_completion", automation_number="070a")
        self.assertEqual(second["actionOut"], "skipped_already_uploaded")
        mock_s3.assert_not_called()
        self.assertEqual(fields[FIELD_STORAGE_KEY], original)

    def test_retry_reuses_persisted_key_even_if_filename_changes(self):
        fields = dict(HW_FIELDS)
        first, _ = _run(fields, route_key="homework_completion", automation_number="070a")
        original = first["s3"]["storageKey"]

        fields[FIELD_UPLOAD_STATUS] = "Pending Link"
        fields[FIELD_CANONICAL_FILE_URL] = ""
        fields[FIELD_FILE_CONTENT_HASH] = ""
        fields[FIELD_UPLOAD_CLAIM_RUN_ID] = ""
        fields[FIELD_PROCESSING_STARTED_AT] = ""
        fields["Original File Name"] = "totally-different.png"
        fields["Asset Slot"] = "HW2"
        fields["Created Time"] = "2025-01-01T00:00:00.000Z"

        second, mock_s3 = _run(fields, route_key="homework_completion", automation_number="070a")
        self.assertEqual(second["actionOut"], "uploaded")
        self.assertTrue(second["season"]["storageKeyReused"])
        self.assertEqual(second["s3"]["storageKey"], original)
        self.assertNotIn("totally-different", original)
        mock_s3.assert_called()
        self.assertEqual(mock_s3.call_args.args[2], original)

    def test_s3_failure_still_persists_storage_key_for_retry(self):
        fields = dict(HW_FIELDS)

        def get_impl(token, base_id, rec_id):
            return {"id": rec_id, "fields": dict(fields)}

        def patch_impl(token, base_id, rec_id, patch_fields):
            fields.update(patch_fields)
            return {"id": rec_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", side_effect=get_impl),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch("upload_core.processor.http_get_bytes", return_value=(b"retry-bytes", "image/jpeg")),
            patch("upload_core.processor.upload_s3", side_effect=RuntimeError("s3 timeout")),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
            patch("upload_core.processor.resolve_upload_season", return_value=DEFAULT_SEASON),
        ):
            status, body = process_with_error_writeback(
                _config(),
                {
                    "submissionAssetRecordId": RECORD,
                    "routeKey": "homework_completion",
                    "automationNumber": "070a",
                },
            )
        self.assertEqual(status, 500)
        self.assertEqual(body["actionOut"], "error_internal")
        self.assertTrue(fields[FIELD_STORAGE_KEY])
        self.assertEqual(
            fields[FIELD_STORAGE_KEY],
            "Test_Athlete/Shooting_Challenge_2026-2027/2026-08-17/"
            "20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg",
        )


if __name__ == "__main__":
    unittest.main()
