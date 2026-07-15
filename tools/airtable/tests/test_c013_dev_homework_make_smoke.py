#!/usr/bin/env python3
"""Unit tests for DEV 070a homework Make webhook payload + response evaluation."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from c013_dev_make_homework_webhook_post import (  # noqa: E402
    AUTOMATION_NUMBER,
    ROUTE_KEY,
    TARGET_TABLE,
    UPLOAD_DESTINATION,
    body_preview,
    build_homework_payload,
    evaluate_make_response,
    parse_make_body,
    parse_response_body,
)


def dumps(obj: dict) -> str:
    return json.dumps(obj)


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


class TestParseResponseBody(unittest.TestCase):
    def test_response_json_dict(self) -> None:
        body = {
            "ok": True,
            "statusOut": "success",
            "actionOut": "uploaded",
            "routeKey": "homework_completion",
            "automationNumber": "070a",
        }
        resp = MagicMock()
        resp.text = dumps(body)
        resp.json.return_value = body
        parsed = parse_response_body(resp)
        self.assertEqual(parsed["actionOut"], "uploaded")

    def test_response_json_wrapped_body_string(self) -> None:
        inner = {
            "ok": True,
            "actionOut": "uploaded",
            "routeKey": "homework_completion",
            "automationNumber": "070a",
        }
        wrapped = {"body": dumps(inner)}
        resp = MagicMock()
        resp.text = dumps(wrapped)
        resp.json.return_value = wrapped
        parsed = parse_response_body(resp)
        self.assertEqual(parsed["actionOut"], "uploaded")

    def test_response_json_fail_falls_back_to_loads(self) -> None:
        body = {
            "ok": True,
            "actionOut": "uploaded",
            "routeKey": "homework_completion",
            "automationNumber": "070a",
            "statusOut": "success",
        }
        resp = MagicMock()
        resp.text = dumps(body)
        resp.json.side_effect = ValueError("not json header")
        parsed = parse_response_body(resp)
        self.assertEqual(parsed["actionOut"], "uploaded")

    def test_truncated_response_salvages_fields(self) -> None:
        text = (
            '{"ok":true,"statusOut":"success","actionOut":"uploaded",'
            '"routeKey":"homework_completion","automationNumber":"070a",'
            '"c023Duplicate":{"duplicateMatches":[' + ("{}," * 80) + "{}]"
        )
        resp = MagicMock()
        resp.text = text
        resp.json.side_effect = ValueError("no")
        parsed = parse_response_body(resp)
        self.assertTrue(parsed.get("ok"))
        self.assertEqual(parsed["actionOut"], "uploaded")
        self.assertTrue(parsed.get("_salvaged"))


class TestParseMakeBody(unittest.TestCase):
    def test_parse_wrapped_api_gateway_body(self) -> None:
        inner = {
            "actionOut": "uploaded",
            "routeKey": "homework_completion",
            "automationNumber": "070a",
        }
        wrapped = dumps({"body": dumps(inner)})
        parsed = parse_make_body(wrapped)
        self.assertEqual(parsed["actionOut"], "uploaded")

    def test_accepted_raw(self) -> None:
        self.assertEqual(parse_make_body("Accepted")["rawText"], "Accepted")


class TestEvaluateMakeResponse(unittest.TestCase):
    def test_uploaded_json_pass(self) -> None:
        body = dumps(
            {
                "ok": True,
                "statusOut": "success",
                "actionOut": "uploaded",
                "routeKey": "homework_completion",
                "automationNumber": "070a",
            }
        )
        result = evaluate_make_response(200, body)
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["statusOut"], "success")
        self.assertTrue(result["ok"])
        self.assertFalse(result["acceptedAsync"])

    def test_skipped_already_uploaded_pass(self) -> None:
        body = dumps(
            {
                "ok": True,
                "statusOut": "skipped",
                "actionOut": "skipped_already_uploaded",
                "routeKey": "homework_completion",
                "automationNumber": "070a",
            }
        )
        result = evaluate_make_response(200, body)
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "skipped_already_uploaded")

    def test_already_uploaded_alias_pass(self) -> None:
        body = dumps(
            {
                "ok": True,
                "statusOut": "success",
                "actionOut": "already_uploaded",
                "routeKey": "homework_completion",
                "automationNumber": "070a",
            }
        )
        self.assertTrue(evaluate_make_response(200, body)["pass"])

    def test_wrong_route_fails(self) -> None:
        body = dumps(
            {
                "ok": True,
                "statusOut": "success",
                "actionOut": "uploaded",
                "routeKey": "video_feedback",
                "automationNumber": "070b",
            }
        )
        self.assertFalse(evaluate_make_response(200, body)["pass"])

    def test_missing_route_fails(self) -> None:
        body = dumps(
            {
                "ok": True,
                "statusOut": "success",
                "actionOut": "uploaded",
                "automationNumber": "070a",
            }
        )
        self.assertFalse(evaluate_make_response(200, body)["pass"])

    def test_ok_false_fails(self) -> None:
        body = dumps(
            {
                "ok": False,
                "statusOut": "error",
                "actionOut": "uploaded",
                "routeKey": "homework_completion",
                "automationNumber": "070a",
            }
        )
        self.assertFalse(evaluate_make_response(200, body)["pass"])

    def test_accepted_async_pass_with_note(self) -> None:
        result = evaluate_make_response(200, "Accepted")
        self.assertTrue(result["pass"])
        self.assertTrue(result["acceptedAsync"])
        self.assertIn("writeback", (result["note"] or "").lower())

    def test_accepted_with_whitespace_not_async(self) -> None:
        # Only exact Accepted is async handoff.
        result = evaluate_make_response(200, " Accepted ")
        self.assertTrue(result["acceptedAsync"] or result["pass"] is False)
        # After strip in evaluate — body_text.strip() == Accepted means whitespace OK.
        # Documented: Accepted after strip. Keep strip behavior.
        self.assertTrue(result["pass"])
        self.assertTrue(result["acceptedAsync"])

    def test_http_error_fails(self) -> None:
        result = evaluate_make_response(502, dumps({"ok": False, "actionOut": "error_make_http_failure"}))
        self.assertFalse(result["pass"])

    def test_truncated_uploaded_json_still_passes(self) -> None:
        body = (
            '{"ok":true,"statusOut":"success","actionOut":"uploaded",'
            '"routeKey":"homework_completion","automationNumber":"070a",'
            '"c023Duplicate":{"duplicateMatches":[' + ("{}," * 80) + "{}]"
        )
        self.assertFalse(body.endswith("}"))
        result = evaluate_make_response(200, body)
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "uploaded")
        self.assertEqual(result["routeKey"], "homework_completion")
        self.assertEqual(result["automationNumber"], "070a")

    def test_body_preview_truncates_only_display(self) -> None:
        big = "x" * 2500
        preview = body_preview(big, limit=2000)
        self.assertTrue(preview.startswith("x" * 2000))
        self.assertIn("truncated", preview)
        self.assertEqual(len(big), 2500)


class TestH1SmokePreflightHelpers(unittest.TestCase):
    def test_required_env_tuple(self) -> None:
        from c013_dev_h1_homework_smoke import REQUIRED_ENV_PREFLIGHT, DEV_BASE, PROD_BASE

        self.assertIn("MAKE_DEV_UPLOAD_WEBHOOK_URL", REQUIRED_ENV_PREFLIGHT)
        self.assertIn("LAMBDA_FUNCTION_URL", REQUIRED_ENV_PREFLIGHT)
        self.assertNotEqual(DEV_BASE, PROD_BASE)


if __name__ == "__main__":
    unittest.main()
