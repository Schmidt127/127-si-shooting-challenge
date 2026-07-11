#!/usr/bin/env python3
"""Unit tests for DEV 070a homework Make webhook payload + response evaluation."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from c013_dev_make_homework_webhook_post import (  # noqa: E402
    AUTOMATION_NUMBER,
    ROUTE_KEY,
    TARGET_TABLE,
    UPLOAD_DESTINATION,
    build_homework_payload,
    evaluate_make_response,
    parse_make_body,
)


class TestBuildHomeworkPayload(unittest.TestCase):
    def test_shape_matches_070a_contract(self) -> None:
        payload = build_homework_payload(
            "recAssetHomework01",
            target_record_id="recHc01",
            sent_at_iso="2026-07-12T04:00:00.000Z",
        )
        self.assertEqual(payload["sourceName"], "Airtable Upload Engine")
        self.assertEqual(payload["automationNumber"], AUTOMATION_NUMBER)
        self.assertEqual(payload["routeKey"], ROUTE_KEY)
        self.assertEqual(payload["uploadDestination"], UPLOAD_DESTINATION)
        self.assertEqual(payload["sourceTable"], "Submission Assets")
        self.assertEqual(payload["submissionAssetRecordId"], "recAssetHomework01")
        self.assertEqual(payload["targetTable"], TARGET_TABLE)
        self.assertEqual(payload["targetRecordId"], "recHc01")
        self.assertEqual(payload["sentAtIso"], "2026-07-12T04:00:00.000Z")
        self.assertNotIn("submissionId", payload)

    def test_optional_submission_id(self) -> None:
        payload = build_homework_payload(
            "recAssetHomework01",
            target_record_id="recHc01",
            submission_id="recSub01",
            sent_at_iso="2026-07-12T04:00:00.000Z",
        )
        self.assertEqual(payload["submissionId"], "recSub01")


class TestEvaluateMakeResponse(unittest.TestCase):
    def test_uploaded_json_pass(self) -> None:
        body = json_dumps(
            {
                "statusOut": "success",
                "actionOut": "uploaded",
                "routeKey": "homework_completion",
                "automationNumber": "070a",
                "writebackVerification": {"allPass": True},
            }
        )
        result = evaluate_make_response(200, body)
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertFalse(result["acceptedAsync"])

    def test_wrong_route_fails(self) -> None:
        body = json_dumps(
            {
                "statusOut": "success",
                "actionOut": "uploaded",
                "routeKey": "video_feedback",
                "automationNumber": "070b",
            }
        )
        result = evaluate_make_response(200, body)
        self.assertFalse(result["pass"])

    def test_accepted_async_pass_with_note(self) -> None:
        result = evaluate_make_response(200, "Accepted")
        self.assertTrue(result["pass"])
        self.assertTrue(result["acceptedAsync"])
        self.assertIn("writeback", (result["note"] or "").lower())

    def test_http_error_fails(self) -> None:
        result = evaluate_make_response(502, '{"actionOut":"error_make_http_failure"}')
        self.assertFalse(result["pass"])

    def test_parse_wrapped_api_gateway_body(self) -> None:
        inner = {
            "actionOut": "uploaded",
            "routeKey": "homework_completion",
            "automationNumber": "070a",
        }
        wrapped = json_dumps({"body": json_dumps(inner)})
        parsed = parse_make_body(wrapped)
        self.assertEqual(parsed["actionOut"], "uploaded")


def json_dumps(obj: dict) -> str:
    import json

    return json.dumps(obj)


class TestH1SmokePreflightHelpers(unittest.TestCase):
    def test_required_env_tuple(self) -> None:
        from c013_dev_h1_homework_smoke import REQUIRED_ENV_PREFLIGHT, DEV_BASE, PROD_BASE

        self.assertIn("MAKE_DEV_UPLOAD_WEBHOOK_URL", REQUIRED_ENV_PREFLIGHT)
        self.assertIn("LAMBDA_FUNCTION_URL", REQUIRED_ENV_PREFLIGHT)
        self.assertNotEqual(DEV_BASE, PROD_BASE)


if __name__ == "__main__":
    unittest.main()
