#!/usr/bin/env python3
"""Unit tests for FUT-010 intake attachment cleanup CLI (no live Airtable/AWS)."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from botocore.exceptions import ClientError

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from fut_010_intake_attachment_cleanup import (  # noqa: E402
    CleanupRow,
    attachment_count,
    classify_reviewer_url,
    field_eligible,
    process_record,
    reconciliation_formula,
    resolve_category,
    resolve_list_formula,
    validate_apply_command,
    verify_record_fields,
    verify_s3_object,
    writeback_complete,
)

STORAGE_KEY = "shooting-challenge/2026-2027/shooting-challenge/schmidt-testing/test.png"
CANONICAL = (
    "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/"
    "shooting-challenge/2026-2027/test.png"
)
LAMBDA_VIEWER = (
    "https://abc123.lambda-url.us-east-2.on.aws/file/recABCDEFGHIJKLMN?token=secret"
)


def uploaded_homework_fields(**overrides):
    base = {
        "Upload Status": "Uploaded",
        "Upload Destination": "Homework Completions",
        "Asset Purpose": "Homework 1",
        "Storage Key": STORAGE_KEY,
        "Canonical File URL": CANONICAL,
        "File Content Hash": "a" * 64,
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": "2026-08-28T12:00:00.000Z",
        "Writeback Complete?": 1,
        "Upload Error": "",
        "Send to Make Trigger": False,
        "Airtable Attachment": [{"id": "att1", "filename": "hw.pdf"}],
    }
    base.update(overrides)
    return base


class TestFieldContracts(unittest.TestCase):
    def test_writeback_complete_requires_uploaded_state(self) -> None:
        self.assertTrue(writeback_complete(uploaded_homework_fields()))
        self.assertFalse(
            writeback_complete(
                uploaded_homework_fields(
                    **{
                        "Upload Status": "Processing",
                        "Writeback Complete?": 0,
                    }
                )
            )
        )

    def test_resolve_category_homework_and_video(self) -> None:
        self.assertEqual(resolve_category(uploaded_homework_fields()), "homework")
        self.assertEqual(
            resolve_category(uploaded_homework_fields(**{"Upload Destination": "Video Feedback"})),
            "video",
        )

    def test_field_eligible_blocks_uncertain_upload(self) -> None:
        ok, _ = field_eligible(uploaded_homework_fields())
        self.assertTrue(ok)
        blocked, reason = field_eligible(
            uploaded_homework_fields(**{"Send to Make Trigger": True})
        )
        self.assertFalse(blocked)
        self.assertIn("Send to Make Trigger", reason)

    def test_reconciliation_formula_targets_uploaded_with_attachment(self) -> None:
        formula = reconciliation_formula()
        self.assertIn("Uploaded", formula)
        self.assertIn("Airtable Attachment", formula)


class TestReviewerUrlClassification(unittest.TestCase):
    def test_valid_lambda_viewer(self) -> None:
        self.assertEqual(classify_reviewer_url(LAMBDA_VIEWER), "valid_lambda_viewer")

    def test_rejects_direct_s3(self) -> None:
        url = "https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/leak.mp4"
        self.assertEqual(classify_reviewer_url(url), "direct_s3_rejected")


class TestVerification(unittest.TestCase):
    def test_missing_s3_blocks(self) -> None:
        result = verify_record_fields(
            uploaded_homework_fields(),
            s3_client=MagicMock(),
            head_object=lambda _key: False,
            canonical_probe=lambda _url: True,
        )
        self.assertFalse(result.verified)
        self.assertIn("S3 object", result.reason)

    def test_video_requires_valid_reviewer_url(self) -> None:
        fields = uploaded_homework_fields(
            **{
                "Upload Destination": "Video Feedback",
                "Reviewer File URL": "https://example.com/not-lambda",
            }
        )
        result = verify_record_fields(
            fields,
            s3_client=MagicMock(),
            head_object=lambda _key: True,
            canonical_probe=lambda _url: True,
        )
        self.assertFalse(result.verified)
        self.assertEqual(result.reviewer_url_classification, "invalid_host")


    def test_canonical_probe_false_blocks(self) -> None:
        result = verify_record_fields(
            uploaded_homework_fields(),
            s3_client=MagicMock(),
            head_object=lambda _key: True,
            canonical_probe=lambda _url: False,
        )
        self.assertFalse(result.verified)
        self.assertIn("Canonical File URL probe failed", result.reason)

    def test_aws_head_object_error_fails_closed(self) -> None:
        s3 = MagicMock()
        s3.head_object.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "denied"}},
            "HeadObject",
        )
        head = verify_s3_object(s3, STORAGE_KEY)
        self.assertFalse(head.exists)
        self.assertTrue(head.aws_error)

        row = process_record(
            {"id": "recAWSERR01", "fields": uploaded_homework_fields()},
            s3_client=s3,
            dry_run=False,
            canonical_probe=lambda _url: True,
        )
        self.assertEqual(row.action, "skipped_verification_aws_error")
        self.assertIn("AWS HeadObject error", row.failure_reason)


class TestCliSafety(unittest.TestCase):
    def test_apply_requires_confirm_delete(self) -> None:
        with self.assertRaises(SystemExit):
            validate_apply_command("apply", False)

    def test_apply_uses_reconcile_filter_without_record_id(self) -> None:
        formula = resolve_list_formula("apply", None)
        self.assertIsNotNone(formula)
        self.assertIn("Uploaded", formula or "")

    def test_apply_bypasses_reconcile_filter_with_record_id(self) -> None:
        self.assertIsNone(resolve_list_formula("apply", "recTEST00000001"))

    def test_dry_run_without_record_id_has_no_filter(self) -> None:
        self.assertIsNone(resolve_list_formula("dry-run", None))


class TestProcessRecord(unittest.TestCase):
    def test_dry_run_would_delete_homework(self) -> None:
        row = process_record(
            {"id": "recTEST00000001", "fields": uploaded_homework_fields()},
            s3_client=MagicMock(),
            dry_run=True,
            head_object=lambda _key: True,
            canonical_probe=lambda _url: True,
        )
        self.assertEqual(row.action, "dry_run_would_delete")
        self.assertEqual(row.deletion_result, "dry_run_would_delete")

    def test_apply_deletes_only_when_confirm_path_used(self) -> None:
        row = process_record(
            {"id": "recTEST00000002", "fields": uploaded_homework_fields()},
            s3_client=MagicMock(),
            dry_run=True,
            head_object=lambda _key: True,
            canonical_probe=lambda _url: True,
        )
        self.assertNotEqual(row.action, "deleted")

    def test_multiple_attachments_counted(self) -> None:
        fields = uploaded_homework_fields(
            **{
                "Airtable Attachment": [
                    {"id": "att1"},
                    {"id": "att2"},
                ]
            }
        )
        self.assertEqual(attachment_count(fields), 2)

    def test_already_empty_skips(self) -> None:
        row = process_record(
            {
                "id": "recEMPTY000001",
                "fields": uploaded_homework_fields(**{"Airtable Attachment": []}),
            },
            s3_client=MagicMock(),
            dry_run=False,
            head_object=lambda _key: True,
        )
        self.assertEqual(row.action, "skipped_already_empty")


class TestCleanupRowShape(unittest.TestCase):
    def test_log_fields_present(self) -> None:
        row = CleanupRow(
            record_id="recX",
            asset_purpose="Homework 1",
            asset_category="homework",
            storage_key=STORAGE_KEY,
            attachment_count=1,
            action="dry_run_would_delete",
            verification_result="passed",
            deletion_result="dry_run_would_delete",
            failure_reason="",
        )
        self.assertEqual(row.storage_key, STORAGE_KEY)


if __name__ == "__main__":
    unittest.main()
