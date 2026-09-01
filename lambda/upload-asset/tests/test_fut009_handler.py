#!/usr/bin/env python3
"""Tests for FUT-009 Lambda HTTP rename route."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import UploadConfig
from upload_core.fut009_service import (
    Fut009RequestError,
    handle_fut009_rename_request,
    is_fut009_rename_path,
    parse_fut009_payload,
)

TEST_SECRET = "test-upload-secret-do-not-commit"
GEN_B_SOURCE = (
    "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/"
    "20260817T172732Z_VIDEO_recAqoUbBKfDNtTLt_OffTheDribbleRaw.mp4"
)


def _config() -> UploadConfig:
    return UploadConfig(
        airtable_base_id="appn84sqPw03zEbTT",
        airtable_token="pat-test",
        s3_bucket="shooting-challenge-assets",
        aws_region="us-east-2",
        environment="Production",
        allow_route_keys=frozenset({"video_feedback"}),
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        athlete_slug_override=None,
        upload_webhook_secret=TEST_SECRET,
    )


def test_is_fut009_rename_path():
    assert is_fut009_rename_path({"rawPath": "/fut009/rename"})
    assert is_fut009_rename_path({"path": "/fut009/rename/"})
    assert not is_fut009_rename_path({"rawPath": "/file/recTest1234567890"})


def test_parse_fut009_payload_from_body():
    event = {"body": json.dumps({"videoFeedbackRecordId": "recVF1234567890AB"})}
    payload = parse_fut009_payload(event)
    assert payload["videoFeedbackRecordId"] == "recVF1234567890AB"


def test_parse_fut009_payload_missing_ids_raises():
    try:
        parse_fut009_payload({"body": "{}"})
        raise AssertionError("expected Fut009RequestError")
    except Fut009RequestError as exc:
        assert "Missing" in exc.message


def test_handler_routes_fut009_rename():
    from handler import lambda_handler

    env = {
        "AIRTABLE_BASE_ID": "appn84sqPw03zEbTT",
        "AIRTABLE_TOKEN": "pat-test",
        "UPLOAD_WEBHOOK_SECRET": TEST_SECRET,
        "ENVIRONMENT": "Production",
        "ALLOW_ROUTE_KEYS": "video_feedback",
    }
    ok_body = {
        "ok": True,
        "statusOut": "success",
        "actionOut": "renamed",
        "submissionAssetRecordId": "recAqoUbBKfDNtTLt",
    }
    event = {
        "rawPath": "/fut009/rename",
        "requestContext": {"http": {"method": "POST", "path": "/fut009/rename"}},
        "headers": {"X-Upload-Secret": TEST_SECRET},
        "body": json.dumps({"videoFeedbackRecordId": "recVF1234567890AB"}),
    }
    with mock.patch.dict(os.environ, env, clear=False):
        with mock.patch("handler.handle_fut009_rename_request", return_value=(200, ok_body)) as rename:
            resp = lambda_handler(event, None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["actionOut"] == "renamed"
    rename.assert_called_once()


def test_handler_fut009_unauthorized():
    from handler import lambda_handler

    env = {
        "AIRTABLE_BASE_ID": "appn84sqPw03zEbTT",
        "AIRTABLE_TOKEN": "pat-test",
        "UPLOAD_WEBHOOK_SECRET": TEST_SECRET,
        "ENVIRONMENT": "Production",
        "ALLOW_ROUTE_KEYS": "video_feedback",
    }
    event = {
        "rawPath": "/fut009/rename",
        "requestContext": {"http": {"method": "POST", "path": "/fut009/rename"}},
        "headers": {},
        "body": json.dumps({"videoFeedbackRecordId": "recVF1234567890AB"}),
    }
    with mock.patch.dict(os.environ, env, clear=False):
        with mock.patch("handler.handle_fut009_rename_request") as rename:
            resp = lambda_handler(event, None)
    assert resp["statusCode"] == 401
    rename.assert_not_called()


def test_handle_rename_dry_run():
    vf_fields = {
        "Custom Video File Name": "OffTheDribble",
        "Confirm S3 Video Rename": True,
        "Submission Asset": ["recAqoUbBKfDNtTLt"],
    }
    asset_fields = {
        "Storage Key": GEN_B_SOURCE,
        "Original File Name": "OffTheDribbleRaw.mp4",
        "Upload Status": "Uploaded",
        "Upload Destination": "Video Feedback",
        "Send to Make Trigger": False,
        "Activity Date": "2026-08-17",
        "Enrollment - Linked": ["recEnroll123456789"],
    }
    enrollment_fields = {
        "Athlete Last Name": "Boltz",
        "Athlete First Name": "Drew",
        "Program Instance": ["recPI12345678901"],
    }
    pi_fields = {"Name - Program Instance": "Shooting Challenge 2026-2027"}

    with mock.patch("upload_core.fut009_service.get_record") as get_record:
        with mock.patch("upload_core.fut009_service.get_enrollment") as get_enrollment:
            with mock.patch("upload_core.fut009_service.get_program_instance") as get_pi:
                get_record.side_effect = [
                    {"fields": vf_fields},
                    {"fields": asset_fields},
                ]
                get_enrollment.return_value = {"fields": enrollment_fields}
                get_pi.return_value = {"fields": pi_fields}

                status, body = handle_fut009_rename_request(
                    _config(),
                    {
                        "body": json.dumps(
                            {
                                "videoFeedbackRecordId": "recVF1234567890AB",
                                "coachConfirmed": True,
                                "dryRun": True,
                            }
                        )
                    },
                )

    assert status == 200
    assert body["actionOut"] == "dry_run_would_rename"
    assert body["destinationKey"].startswith("shooting-challenge/")


if __name__ == "__main__":
    test_is_fut009_rename_path()
    test_parse_fut009_payload_from_body()
    test_parse_fut009_payload_missing_ids_raises()
    test_handler_routes_fut009_rename()
    test_handler_fut009_unauthorized()
    test_handle_rename_dry_run()
    print("OK — fut009 handler tests passed")
