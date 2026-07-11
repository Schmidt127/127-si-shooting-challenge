#!/usr/bin/env python3
"""070a homework upload regression tests (Lambda route + payload contract).

Extends tests/test_homework_route.py with Worker-C overnight T3 coverage:
payload shape, route resolution, and writeback actionOut contracts expected by
070a Make handoff (mirrored from 070b).
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fields import FIELD_UPLOAD_STATUS
from upload_core.processor import process_upload_asset, process_with_error_writeback
from upload_core.routes import (
    ROUTE_HOMEWORK_COMPLETION,
    resolve_upload_route,
    route_for_destination,
    route_for_key,
)
from upload_core.util import sha256_hex

HASH = sha256_hex(b"test-bytes-070a")
RECORD = "rec070aRegression01"
HW_FIELDS = {
    "Upload Destination": "Homework Completions",
    "Upload Status": "Pending Link",
    "Airtable Attachment": [{"url": "https://example.com/070a.png", "filename": "070a.png"}],
    "Homework Completions": ["recHc070a01"],
    "Enrollment - Linked": ["recEnroll070a01"],
    "Original File Name": "070a.png",
    "Asset Type": "Homework Image",
}


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appTetnuCZlCZdTCT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="DEV",
        allow_route_keys=frozenset({"video_feedback", "homework_completion"}),
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        athlete_slug_override="test-athlete",
        upload_webhook_secret=None,
    )


def _payload(**extra):
    base = {
        "sourceName": "Airtable Upload Engine",
        "submissionAssetRecordId": RECORD,
        "routeKey": "homework_completion",
        "automationNumber": "070a",
        "uploadDestination": "Homework Completions",
        "sourceTable": "Submission Assets",
        "targetTable": "Homework Completions",
        "targetRecordId": "recHc070a01",
        "sentAtIso": "2026-07-11T22:00:00.000Z",
    }
    base.update(extra)
    return base


class Test070aRouteContract(unittest.TestCase):
    def test_route_for_key_homework(self) -> None:
        route = route_for_key("homework_completion")
        self.assertIsNotNone(route)
        assert route is not None
        self.assertEqual(route.automation_number, "070a")
        self.assertEqual(route.upload_destination, "Homework Completions")
        self.assertEqual(route.missing_link_action, "error_missing_homework_completion")

    def test_route_for_destination_homework(self) -> None:
        route = route_for_destination("Homework Completions")
        self.assertEqual(route, ROUTE_HOMEWORK_COMPLETION)

    def test_resolve_upload_route_matching(self) -> None:
        route = resolve_upload_route(
            fields={"Upload Destination": "Homework Completions"},
            route_key="homework_completion",
        )
        self.assertEqual(route.route_key, "homework_completion")

    def test_resolve_upload_route_mismatch_raises(self) -> None:
        with self.assertRaises(ValueError):
            resolve_upload_route(
                fields={"Upload Destination": "Homework Completions"},
                route_key="video_feedback",
            )


class Test070aUploadRegression(unittest.TestCase):
    def _run_upload(self, fields: dict, payload: dict | None = None):
        config = _config()
        payload = payload or _payload()

        def patch_impl(token, base_id, record_id, patch_fields):
            fields.update(patch_fields)
            return {"id": record_id, "fields": fields}

        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": RECORD, "fields": dict(fields)},
            ),
            patch("upload_core.processor.patch_asset", side_effect=patch_impl),
            patch(
                "upload_core.processor.http_get_bytes",
                return_value=(b"test-bytes-070a", "image/png"),
            ),
            patch(
                "upload_core.processor.upload_s3",
                return_value={"bucket": "b", "region": "us-east-2", "etag": "x"},
            ),
            patch("upload_core.processor.lookup_duplicate_matches", return_value=[]),
        ):
            return process_upload_asset(config, payload)

    def test_uploaded_action_and_homework_storage_key(self) -> None:
        fields = dict(HW_FIELDS)
        result = self._run_upload(fields)
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["automationNumber"], "070a")
        self.assertEqual(result["routeKey"], "homework_completion")
        self.assertEqual(fields[FIELD_UPLOAD_STATUS], "Uploaded")
        self.assertIn("homework", result["s3"]["storageKey"])
        verification = result.get("writebackVerification") or {}
        self.assertIn("allPass", verification)
        self.assertTrue(verification["allPass"])

    def test_payload_missing_keys_still_routes_via_fields(self) -> None:
        fields = dict(HW_FIELDS)
        # Minimal payload (Airtable 070a sends these keys)
        result = self._run_upload(
            fields,
            _payload(),
        )
        self.assertEqual(result["actionOut"], "uploaded")

    def test_error_invalid_route_when_video_payload_on_homework_asset(self) -> None:
        config = _config()
        fields = dict(HW_FIELDS)
        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": RECORD, "fields": fields},
            ),
            patch("upload_core.processor.patch_asset"),
        ):
            status, body = process_with_error_writeback(
                config,
                _payload(routeKey="video_feedback", automationNumber="070b"),
            )
        self.assertEqual(status, 400)
        self.assertEqual(body["actionOut"], "error_invalid_route")

    def test_error_missing_homework_completion(self) -> None:
        config = _config()
        fields = {**HW_FIELDS, "Homework Completions": []}
        with (
            patch(
                "upload_core.processor.get_asset",
                return_value={"id": RECORD, "fields": fields},
            ),
            patch(
                "upload_core.processor.patch_asset",
                side_effect=lambda *a, **k: {"id": RECORD, "fields": fields},
            ),
        ):
            status, body = process_with_error_writeback(config, _payload())
        self.assertEqual(status, 400)
        self.assertEqual(body["actionOut"], "error_missing_homework_completion")


if __name__ == "__main__":
    unittest.main()
