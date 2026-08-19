#!/usr/bin/env python3
"""Program Instance season resolution for Lambda uploads."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fields import (
    FIELD_CANONICAL_FILE_URL,
    FIELD_FILE_CONTENT_HASH,
    FIELD_STORAGE_KEY,
    FIELD_UPLOAD_STATUS,
)
from upload_core.processor import process_upload_asset, process_with_error_writeback
from upload_core.season import SeasonResolutionError, normalize_season_slug, resolve_upload_season
from upload_core.util import sha256_hex

PI_2027 = "recPi202627"
PI_2026 = "recPi202526"
ENROLL_2027 = "recEnroll2027"
ENROLL_2026 = "recEnroll2026"
RECORD = "recSeasonAsset01"
HASH = sha256_hex(b"season-bytes")

ASSET_FIELDS = {
    "Upload Destination": "Video Feedback",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [{"url": "https://example.com/file.mp4", "filename": "file.mp4"}],
    "Video Feedback": ["recVf1"],
    "Enrollment - Linked": [ENROLL_2027],
    "Original File Name": "file.mp4",
    "Created Time": "2026-08-17T17:27:32.000Z",
}


def _config(**overrides) -> UploadConfig:
    values = dict(
        airtable_base_id="appn84sqPw03zEbTT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="PROD",
        allow_route_keys=frozenset({"video_feedback", "homework_completion"}),
        season_slug="2025-2026",
        challenge_slug="shooting-challenge",
        athlete_slug_override="schmidt-testing",
        upload_webhook_secret=None,
        allow_season_slug_fallback=False,
    )
    values.update(overrides)
    return UploadConfig(**values)


def _enrollment(pi_ids, school_year="2026-2027"):
    return {
        "id": ENROLL_2027,
        "fields": {
            "Program Instance": list(pi_ids),
            "School Year": school_year,
            "Athlete Last Name": "Schmidt",
            "Athlete First Name": "Testing",
        },
    }


def _program_instance(pi_id, school_year, name=""):
    return {
        "id": pi_id,
        "fields": {
            "School Year - Linked": school_year,
            "Name - Program Instance": name or f"Shooting Challenge | {school_year}",
        },
    }


def _resolve(asset_fields=None, payload=None, config=None, enrollment=None, program_instance=None):
    return resolve_upload_season(
        asset_fields=asset_fields or dict(ASSET_FIELDS),
        payload=payload or {},
        config=config or _config(),
        get_enrollment=lambda _id: enrollment or _enrollment([PI_2027]),
        get_program_instance=lambda _id: program_instance
        or _program_instance(_id, "2026-2027"),
    )


class NormalizeSeasonSlugTests(unittest.TestCase):
    def test_ascii_hyphen(self):
        self.assertEqual(normalize_season_slug("2026-2027"), "2026-2027")

    def test_en_dash_and_spaces(self):
        self.assertEqual(normalize_season_slug(" 2026–2027 "), "2026-2027")

    def test_single_select_object(self):
        self.assertEqual(normalize_season_slug({"name": "2025-2026"}), "2025-2026")

    def test_rejects_filename_and_date(self):
        self.assertEqual(normalize_season_slug("2026-08-17-homework.mp4"), "")
        self.assertEqual(normalize_season_slug("file.mp4"), "")


class ResolveSeasonTests(unittest.TestCase):
    def test_current_program_instance_2026_2027(self):
        resolved = _resolve()
        self.assertEqual(resolved.season_slug, "2026-2027")
        self.assertEqual(resolved.program_instance_id, PI_2027)
        self.assertEqual(resolved.source, "program_instance")
        self.assertFalse(resolved.fallback_used)
        self.assertEqual(resolved.athlete_folder, "Schmidt_Testing")
        self.assertEqual(resolved.program_instance_folder, "Shooting_Challenge_2026-2027")

    def test_older_program_instance_2025_2026(self):
        resolved = _resolve(
            asset_fields={**ASSET_FIELDS, "Enrollment - Linked": [ENROLL_2026]},
            enrollment=_enrollment([PI_2026], "2025-2026"),
            program_instance=_program_instance(PI_2026, "2025-2026"),
        )
        self.assertEqual(resolved.season_slug, "2025-2026")
        self.assertEqual(resolved.program_instance_id, PI_2026)
        self.assertFalse(resolved.fallback_used)

    def test_env_season_does_not_override_airtable(self):
        resolved = _resolve(config=_config(season_slug="2025-2026"))
        self.assertEqual(resolved.season_slug, "2026-2027")
        self.assertEqual(resolved.source, "program_instance")

    def test_missing_season_rejected(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(program_instance=_program_instance(PI_2027, ""))
        self.assertEqual(raised.exception.action_out, "error_missing_season")

    def test_ambiguous_program_instance_rejected(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(enrollment=_enrollment([PI_2027, PI_2026]))
        self.assertEqual(raised.exception.action_out, "error_ambiguous_program_instance")

    def test_missing_program_instance_rejected(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(enrollment=_enrollment([]))
        self.assertEqual(raised.exception.action_out, "error_missing_program_instance")

    def test_cross_season_mismatch_enrollment_vs_pi(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(
                enrollment=_enrollment([PI_2027], "2025-2026"),
                program_instance=_program_instance(PI_2027, "2026-2027"),
            )
        self.assertEqual(raised.exception.action_out, "error_cross_season_mismatch")

    def test_payload_season_mismatch_rejected(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(payload={"seasonSlug": "2025-2026"})
        self.assertEqual(raised.exception.action_out, "error_cross_season_mismatch")

    def test_payload_program_instance_mismatch_rejected(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(payload={"programInstanceId": PI_2026})
        self.assertEqual(raised.exception.action_out, "error_program_instance_mismatch")

    def test_missing_athlete_name_rejected(self):
        blank = _enrollment([PI_2027])
        blank["fields"]["Athlete Last Name"] = ""
        blank["fields"]["Athlete First Name"] = ""
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(enrollment=blank)
        self.assertEqual(raised.exception.action_out, "error_missing_athlete_name")

    def test_prod_does_not_use_env_fallback(self):
        with self.assertRaises(SeasonResolutionError) as raised:
            _resolve(
                config=_config(allow_season_slug_fallback=True, season_slug="2026-2027"),
                program_instance=_program_instance(PI_2027, ""),
            )
        self.assertEqual(raised.exception.action_out, "error_missing_season")

    def test_dev_fallback_only_when_explicitly_enabled(self):
        resolved = _resolve(
            config=_config(
                environment="DEV",
                allow_season_slug_fallback=True,
                season_slug="2026-2027",
            ),
            program_instance=_program_instance(PI_2027, ""),
        )
        self.assertEqual(resolved.season_slug, "2026-2027")
        self.assertTrue(resolved.fallback_used)
        self.assertEqual(resolved.source, "env_fallback")


class ProcessorSeasonIntegrationTests(unittest.TestCase):
    def _run(self, fields, *, enrollment, program_instance, payload=None, config=None):
        def get_impl(token, base_id, record_id):
            return {"id": record_id, "fields": dict(fields)}

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        with (
            patch("upload_core.processor.get_asset", side_effect=get_impl),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch("upload_core.processor.http_get_bytes", return_value=(b"season-bytes", "video/mp4")),
            patch(
                "upload_core.processor.upload_s3",
                return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
            ),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
            patch("upload_core.processor.get_enrollment", return_value=enrollment),
            patch("upload_core.processor.get_program_instance", return_value=program_instance),
        ):
            return process_upload_asset(
                config or _config(),
                payload
                or {
                    "submissionAssetRecordId": RECORD,
                    "routeKey": "video_feedback",
                    "automationNumber": "070b",
                    "enrollmentId": fields["Enrollment - Linked"][0],
                    "programInstanceId": program_instance["id"],
                },
            )

    def test_s3_key_uses_resolved_2026_2027(self):
        fields = {**ASSET_FIELDS, "Enrollment - Linked": [ENROLL_2027]}
        result = self._run(
            fields,
            enrollment=_enrollment([PI_2027], "2026-2027"),
            program_instance=_program_instance(PI_2027, "2026-2027"),
        )
        key = result["s3"]["storageKey"]
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertIn("Shooting_Challenge_2026-2027", key)
        self.assertNotIn("Shooting_Challenge_2025-2026", key)
        self.assertIn("Schmidt_Testing/", key)
        self.assertEqual(result["season"]["slug"], "2026-2027")
        self.assertFalse(result["season"]["fallbackUsed"])
        self.assertEqual(fields[FIELD_STORAGE_KEY], key)

    def test_s3_key_uses_older_season(self):
        fields = {**ASSET_FIELDS, "Enrollment - Linked": [ENROLL_2026]}
        result = self._run(
            fields,
            enrollment=_enrollment([PI_2026], "2025-2026"),
            program_instance=_program_instance(PI_2026, "2025-2026"),
        )
        self.assertIn("Shooting_Challenge_2025-2026", result["s3"]["storageKey"])
        self.assertNotIn("Shooting_Challenge_2026-2027", result["s3"]["storageKey"])
        self.assertEqual(result["season"]["slug"], "2025-2026")

    def test_replay_keeps_original_season_key(self):
        fields = {**ASSET_FIELDS, "Enrollment - Linked": [ENROLL_2027]}
        first = self._run(
            fields,
            enrollment=_enrollment([PI_2027], "2026-2027"),
            program_instance=_program_instance(PI_2027, "2026-2027"),
        )
        original_key = first["s3"]["storageKey"]
        fields[FIELD_UPLOAD_STATUS] = "Uploaded"
        fields[FIELD_CANONICAL_FILE_URL] = first["s3"]["canonicalFileUrl"]
        fields[FIELD_FILE_CONTENT_HASH] = HASH
        second = self._run(
            fields,
            enrollment=_enrollment([PI_2026], "2025-2026"),
            program_instance=_program_instance(PI_2026, "2025-2026"),
        )
        self.assertEqual(second["actionOut"], "skipped_already_uploaded")
        self.assertEqual(fields[FIELD_STORAGE_KEY], original_key)
        self.assertIn("Shooting_Challenge_2026-2027", original_key)

    def test_missing_season_fails_closed_before_s3(self):
        fields = dict(ASSET_FIELDS)
        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": RECORD, "fields": fields},
            ),
            patch(
                "upload_core.processor.patch_asset",
                return_value={"id": RECORD, "fields": fields},
            ),
            patch(
                "upload_core.processor.get_enrollment",
                return_value=_enrollment([PI_2027], "2026-2027"),
            ),
            patch(
                "upload_core.processor.get_program_instance",
                return_value=_program_instance(PI_2027, ""),
            ),
            patch("upload_core.processor.upload_s3") as mock_s3,
        ):
            status, body = process_with_error_writeback(
                _config(),
                {
                    "submissionAssetRecordId": RECORD,
                    "routeKey": "video_feedback",
                    "automationNumber": "070b",
                },
            )
        self.assertEqual(status, 400)
        self.assertEqual(body["actionOut"], "error_missing_season")
        mock_s3.assert_not_called()


if __name__ == "__main__":
    unittest.main()
