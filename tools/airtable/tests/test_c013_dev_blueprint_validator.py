#!/usr/bin/env python3
"""Offline unit tests for C-013 DEV Make blueprint validator + payload matrix."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
REPO_ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

from c013_dev_blueprint_validator import (  # noqa: E402
    DEFAULT_BLUEPRINT,
    evaluate_make_response_for_route,
    load_blueprint,
    validate_blueprint_file,
    validate_blueprint_structure,
    validate_payload_file,
    validate_webhook_payload,
)

FIXTURES = REPO_ROOT / "make" / "test-payloads" / "fixtures"
HOMEWORK_SAMPLE = REPO_ROOT / "make" / "test-payloads" / "homework-completion-070a-dev.sample.json"
VIDEO_SAMPLE = REPO_ROOT / "make" / "test-payloads" / "video-feedback-070b-dev.sample.json"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(read_text(path))


class TestBlueprintStructure(unittest.TestCase):
    def test_dev_blueprint_template_passes(self) -> None:
        report = validate_blueprint_file(DEFAULT_BLUEPRINT)
        self.assertTrue(report.passed, format_failed(report))

    def test_module2_dual_route_filters(self) -> None:
        blueprint = load_blueprint()
        tokens: set[str] = set()
        modules = (blueprint.get("c013") or {}).get("modules") or []
        router = next(m for m in modules if m.get("id") == 2)
        for filt in router.get("filters") or []:
            tokens.add(str(filt.get("name")))
            for cond in filt.get("conditions") or []:
                tokens.add(str(cond.get("value")))
        self.assertIn("homework_completion", tokens)
        self.assertIn("video_feedback", tokens)
        self.assertIn("070a", tokens)
        self.assertIn("070b", tokens)

    def test_sanitized_blueprint_rejects_operational_secret_marker(self) -> None:
        blueprint = load_blueprint()
        tampered = json.loads(json.dumps(blueprint))
        tampered["c013"]["notes"] = "https://hook.us2.make.com/secret-path"
        report = validate_blueprint_structure(tampered, path="tampered")
        self.assertFalse(report.passed)
        failed = [c.name for c in report.checks if not c.passed]
        self.assertIn("no_operational_secrets", failed)


class TestWebhookPayloadValidation(unittest.TestCase):
    def test_homework_sample_payload_passes(self) -> None:
        report = validate_payload_file(HOMEWORK_SAMPLE, expected_automation="070a")
        self.assertTrue(report.passed, format_failed(report))

    def test_video_sample_payload_passes(self) -> None:
        report = validate_payload_file(VIDEO_SAMPLE, expected_automation="070b")
        self.assertTrue(report.passed, format_failed(report))

    def test_missing_route_key_fails(self) -> None:
        payload = read_json(FIXTURES / "missing-route-key-payload.json")
        report = validate_webhook_payload(payload)
        self.assertFalse(report.passed)
        failed = [c.name for c in report.checks if not c.passed]
        self.assertIn("required_fields", failed)

    def test_wrong_route_pairing_fails(self) -> None:
        payload = read_json(FIXTURES / "wrong-route-pairing-payload.json")
        report = validate_webhook_payload(payload)
        self.assertFalse(report.passed)
        failed = [c.name for c in report.checks if not c.passed]
        self.assertIn("route_key_pairing", failed)
        self.assertIn("upload_destination", failed)
        self.assertIn("target_table", failed)


class TestResponseMatrix(unittest.TestCase):
    def test_lambda_json_success_homework(self) -> None:
        body = read_text(FIXTURES / "lambda-json-success-homework.json")
        result = evaluate_make_response_for_route(
            200,
            body,
            route_key="homework_completion",
            automation_number="070a",
        )
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "uploaded")

    def test_lambda_json_success_video(self) -> None:
        body = read_text(FIXTURES / "lambda-json-success-video.json")
        result = evaluate_make_response_for_route(
            200,
            body,
            route_key="video_feedback",
            automation_number="070b",
        )
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "uploaded")

    def test_plain_text_accepted_async_pass(self) -> None:
        body = read_text(FIXTURES / "plain-text-accepted.txt")
        result = evaluate_make_response_for_route(
            200,
            body,
            route_key="homework_completion",
            automation_number="070a",
        )
        self.assertTrue(result["pass"])
        self.assertTrue(result["acceptedAsync"])

    def test_malformed_json_fails_sync_pass(self) -> None:
        body = read_text(FIXTURES / "malformed-json-response.txt")
        result = evaluate_make_response_for_route(
            200,
            body,
            route_key="homework_completion",
            automation_number="070a",
        )
        self.assertFalse(result["pass"])

    def test_http_error_502_fails(self) -> None:
        body = read_text(FIXTURES / "http-error-502.json")
        result = evaluate_make_response_for_route(
            502,
            body,
            route_key="homework_completion",
            automation_number="070a",
        )
        self.assertFalse(result["pass"])

    def test_large_truncated_response_salvages_pass(self) -> None:
        body = read_text(FIXTURES / "large-truncated-response.txt")
        self.assertFalse(body.endswith("}"))
        result = evaluate_make_response_for_route(
            200,
            body,
            route_key="homework_completion",
            automation_number="070a",
        )
        self.assertTrue(result["pass"])
        self.assertEqual(result["actionOut"], "uploaded")


def format_failed(report) -> str:
    lines = []
    for check in report.checks:
        if not check.passed:
            lines.append(f"{check.name}: {check.message}")
    return "; ".join(lines)


if __name__ == "__main__":
    unittest.main()
