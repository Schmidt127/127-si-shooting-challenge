#!/usr/bin/env python3
"""Unit tests for 070a DEV smoke harness (Worker-C / T3)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from c070a_dev_smoke_run import (  # noqa: E402
    DEV_BASE,
    HOMEWORK_ROUTE,
    PROD_BASE,
    PROTECTED_PROD_EVIDENCE,
    build_070a_payload,
    evaluate_homework_prep,
    evaluate_lambda_handoff,
    evaluate_writeback_fields,
    fixture_ready_fields,
    mock_idempotent_response,
    mock_invalid_route_response,
    mock_uploaded_response,
    refuse_prod_targets,
    resolve_dev_webhook_url,
    resolve_lambda_function_url,
)


class Test070aPayloadContract(unittest.TestCase):
    def test_payload_shape(self) -> None:
        payload = build_070a_payload(
            "recHwSmokeAsset01",
            "recHcSmoke01",
            sent_at_iso="2026-07-11T22:00:00.000Z",
        )
        self.assertEqual(payload["automationNumber"], "070a")
        self.assertEqual(payload["routeKey"], "homework_completion")
        self.assertEqual(payload["uploadDestination"], "Homework Completions")
        self.assertEqual(payload["targetTable"], "Homework Completions")
        self.assertEqual(payload["sourceTable"], "Submission Assets")
        self.assertEqual(payload["submissionAssetRecordId"], "recHwSmokeAsset01")
        self.assertEqual(payload["targetRecordId"], "recHcSmoke01")

    def test_invalid_asset_id(self) -> None:
        with self.assertRaises(ValueError):
            build_070a_payload("not-a-rec", "recHcSmoke01")

    def test_route_constants(self) -> None:
        self.assertEqual(HOMEWORK_ROUTE["automationNumber"], "070a")
        self.assertEqual(HOMEWORK_ROUTE["routeKey"], "homework_completion")
        self.assertEqual(DEV_BASE, "appTetnuCZlCZdTCT")
        self.assertEqual(PROD_BASE, "appn84sqPw03zEbTT")


class Test070aPrepAndWriteback(unittest.TestCase):
    def test_prep_all_pass(self) -> None:
        prep = evaluate_homework_prep(fixture_ready_fields())
        self.assertTrue(prep["allPass"])
        self.assertTrue(prep["checks"]["homeworkCompletionLinked"])

    def test_prep_fails_without_attachment(self) -> None:
        fields = fixture_ready_fields()
        fields["Airtable Attachment"] = []
        prep = evaluate_homework_prep(fields)
        self.assertFalse(prep["allPass"])
        self.assertFalse(prep["checks"]["attachmentPresent"])

    def test_writeback_requires_sha256(self) -> None:
        fields = {
            "Upload Status": "Uploaded",
            "Canonical File URL": "https://example.com/hw.png",
            "Storage Key": "shooting-challenge/hw.png",
            "File Content Hash": "a" * 64,
            "File Hash Algorithm": "SHA-256",
            "Uploaded At": "2026-07-11T22:00:00.000Z",
            "Upload Error": "",
        }
        self.assertTrue(evaluate_writeback_fields(fields)["allPass"])
        fields["File Hash Algorithm"] = ""
        self.assertFalse(evaluate_writeback_fields(fields)["allPass"])


class Test070aHandoffMocks(unittest.TestCase):
    def test_uploaded_mock(self) -> None:
        body = mock_uploaded_response("recHwSmokeAsset01")
        handoff = evaluate_lambda_handoff(body)
        self.assertTrue(handoff["verified"])
        self.assertEqual(handoff["lambdaActionOut"], "uploaded")

    def test_idempotent_mock(self) -> None:
        body = mock_idempotent_response("recHwSmokeAsset01")
        handoff = evaluate_lambda_handoff(body)
        self.assertTrue(handoff["verified"])
        self.assertEqual(handoff["lambdaActionOut"], "skipped_already_uploaded")

    def test_invalid_route_mock(self) -> None:
        body = mock_invalid_route_response()
        handoff = evaluate_lambda_handoff(body)
        self.assertFalse(handoff["verified"])
        self.assertEqual(body["actionOut"], "error_invalid_route")

    def test_writeback_incomplete(self) -> None:
        handoff = evaluate_lambda_handoff(
            {
                "actionOut": "uploaded",
                "statusOut": "success",
                "writebackVerification": {"allPass": False},
            }
        )
        self.assertFalse(handoff["verified"])
        self.assertEqual(handoff["actionOut"], "error_lambda_writeback_incomplete")


class Test070aProdGuards(unittest.TestCase):
    def test_refuse_prod_base(self) -> None:
        with self.assertRaises(SystemExit):
            refuse_prod_targets("recAnything", PROD_BASE)

    def test_refuse_protected_evidence(self) -> None:
        with self.assertRaises(SystemExit):
            refuse_prod_targets(PROTECTED_PROD_EVIDENCE, DEV_BASE)

    def test_allow_dev_asset(self) -> None:
        refuse_prod_targets("recHwSmokeAsset01", DEV_BASE)


class Test070aWorkerBEnvAliases(unittest.TestCase):
    """Align with Worker B T2 published env contract (MAKE_DEV_UPLOAD_WEBHOOK_URL)."""

    def test_resolve_webhook_prefers_worker_b_name(self) -> None:
        import os
        from unittest.mock import patch

        with patch.dict(
            os.environ,
            {
                "MAKE_DEV_UPLOAD_WEBHOOK_URL": "https://hook.dev/worker-b",
                "MAKE_UPLOAD_WEBHOOK_URL_DEV": "https://hook.dev/legacy",
            },
            clear=False,
        ):
            self.assertEqual(resolve_dev_webhook_url(), "https://hook.dev/worker-b")

    def test_resolve_lambda_prefers_worker_b_name(self) -> None:
        import os
        from unittest.mock import patch

        with patch.dict(
            os.environ,
            {
                "LAMBDA_FUNCTION_URL": "https://lambda.dev/worker-b",
                "LAMBDA_FUNCTION_URL_DEV": "https://lambda.dev/legacy",
            },
            clear=False,
        ):
            self.assertEqual(resolve_lambda_function_url(), "https://lambda.dev/worker-b")

    def test_payload_matches_worker_b_sample_shape(self) -> None:
        # Mirrors make/test-payloads/homework-completion-070a-dev.sample.json on Worker B branch
        payload = build_070a_payload(
            "recREPLACE_WITH_PENDING_HOMEWORK_ASSET",
            "recREPLACE_WITH_HOMEWORK_COMPLETION",
            sent_at_iso="2026-07-12T04:00:00.000Z",
        )
        self.assertEqual(
            set(payload.keys()),
            {
                "sourceName",
                "automationNumber",
                "sentAtIso",
                "routeKey",
                "uploadDestination",
                "sourceTable",
                "submissionAssetRecordId",
                "targetTable",
                "targetRecordId",
            },
        )
        self.assertEqual(payload["automationNumber"], "070a")
        self.assertEqual(payload["routeKey"], "homework_completion")
        self.assertNotIn("submissionId", payload)


if __name__ == "__main__":
    unittest.main()
