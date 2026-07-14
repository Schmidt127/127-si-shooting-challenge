#!/usr/bin/env python3
"""C-024 Stage 2 070a double-send mock tests (Worker C).

Verifies Make/Lambda handoff evaluation is idempotent when the same success or
skipped_already_uploaded response is processed twice — no live webhooks.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from c070a_dev_smoke_run import (  # noqa: E402
    evaluate_lambda_handoff,
    evaluate_writeback_fields,
    mock_idempotent_response,
    mock_uploaded_response,
)


class C024070aDoubleSendMockTests(unittest.TestCase):
    def test_double_evaluate_uploaded_response_stays_verified(self):
        body = mock_uploaded_response("recHwDoubleSend01")
        first = evaluate_lambda_handoff(body)
        second = evaluate_lambda_handoff(body)
        self.assertTrue(first["verified"])
        self.assertTrue(second["verified"])
        self.assertEqual(first["lambdaActionOut"], "uploaded")
        self.assertEqual(second["lambdaActionOut"], "uploaded")

    def test_double_evaluate_idempotent_skip_stays_verified(self):
        body = mock_idempotent_response("recHwDoubleSend02")
        first = evaluate_lambda_handoff(body)
        second = evaluate_lambda_handoff(body)
        self.assertTrue(first["verified"])
        self.assertTrue(second["verified"])
        self.assertEqual(first["lambdaActionOut"], "skipped_already_uploaded")
        self.assertEqual(second["lambdaActionOut"], "skipped_already_uploaded")

    def test_idempotent_skip_verifies_without_writeback_block(self):
        body = mock_idempotent_response("recHwDoubleSend03")
        self.assertEqual(body["actionOut"], "skipped_already_uploaded")
        handoff = evaluate_lambda_handoff(body)
        self.assertTrue(handoff["verified"])
        self.assertNotIn("writebackVerification", body)

    def test_writeback_eval_unchanged_on_repeat_after_upload(self):
        fields = {
            "Upload Status": "Uploaded",
            "Canonical File URL": "https://example.com/hw.png",
            "Storage Key": "shooting-challenge/hw.png",
            "File Content Hash": "a" * 64,
            "File Hash Algorithm": "SHA-256",
            "Uploaded At": "2026-07-12T04:00:00.000Z",
            "Upload Error": "",
            "Writeback Complete?": 1,
        }
        first = evaluate_writeback_fields(fields)
        second = evaluate_writeback_fields(dict(fields))
        self.assertTrue(first["allPass"])
        self.assertTrue(second["allPass"])
        self.assertEqual(first["checks"], second["checks"])

    def test_simulated_double_make_delivery_same_json_body(self):
        response_text = (
            '{"ok":true,"statusOut":"skipped","actionOut":"skipped_already_uploaded",'
            '"writebackVerification":{"allPass":true}}'
        )
        parsed_once = evaluate_lambda_handoff(
            {
                "actionOut": "skipped_already_uploaded",
                "statusOut": "skipped",
                "writebackVerification": {"allPass": True},
            }
        )
        parsed_twice = evaluate_lambda_handoff(
            {
                "actionOut": "skipped_already_uploaded",
                "statusOut": "skipped",
                "writebackVerification": {"allPass": True},
            }
        )
        self.assertTrue(parsed_once["verified"])
        self.assertTrue(parsed_twice["verified"])
        self.assertIn("skipped_already_uploaded", response_text)


if __name__ == "__main__":
    unittest.main()

