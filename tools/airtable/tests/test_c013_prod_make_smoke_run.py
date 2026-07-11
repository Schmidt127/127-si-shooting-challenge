#!/usr/bin/env python3
"""Unit tests for C-013 PROD Make smoke runner probe parsing."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from c013_prod_make_smoke_run import (  # noqa: E402
    ALLOWED_LIVE_ASSET,
    ENR,
    EXPECTED_VIDEO_FEEDBACK,
    FULL_UPLOAD_RESET_FIELDS,
    LIVE_TRIGGER_PREP_FIELDS,
    LIVE_TRIGGER_PRESERVED_FIELDS,
    RESET_LIVE_TRIGGER_CLEARED,
    RESET_LIVE_TRIGGER_FIELDS,
    RESET_LIVE_TRIGGER_PRESERVED,
    TRIGGER_RESET_FIELDS,
    check_live_trigger_prep,
    check_reset_live_trigger,
    evaluate_live_trigger_result,
    parse_probe_snapshot,
    validate_reset_live_trigger_fixture,
    validate_reset_live_trigger_target,
)

def successful_probe() -> dict:
    """Sanitized unit fixture; never depend on local operational _preview files."""
    return {
        "submissionAsset": {
            "recordId": "recTEST",
            "fields": {
                "Storage Key": "shooting-challenge/test/video-feedback-recTEST.png",
                "File Content Hash": "a" * 64,
                "Upload Status": "Uploaded",
            },
            "writebackVerification": {
                "allPass": True,
                "checks": {
                    "uploadStatusUploaded": True,
                    "storageKeyPopulated": True,
                    "fileContentHashPopulated": True,
                },
            },
        }
    }


class TestParseProbeSnapshot(unittest.TestCase):
    def test_submission_asset_shape(self) -> None:
        snap = parse_probe_snapshot(successful_probe())
        self.assertTrue(snap["allPass"])
        self.assertIn("shooting-challenge/test", snap["storageKey"])
        self.assertEqual(len(snap["fileContentHash"]), 64)
        self.assertEqual(snap["uploadStatus"], "Uploaded")
        self.assertIsNotNone(snap["summary"])
        self.assertIsNone(snap["error"])

    def test_legacy_record_probe_alias(self) -> None:
        raw = {
            "recordProbe": {
                "fields": {
                    "Storage Key": "key-a",
                    "File Content Hash": "abc",
                    "Upload Status": "Uploaded",
                },
                "writebackVerification": {"allPass": True, "checks": {}},
            }
        }
        snap = parse_probe_snapshot(raw)
        self.assertTrue(snap["allPass"])
        self.assertEqual(snap["storageKey"], "key-a")
        self.assertEqual(snap["fileContentHash"], "abc")

    def test_empty_probe(self) -> None:
        snap = parse_probe_snapshot({})
        self.assertIsNone(snap["allPass"])
        self.assertEqual(snap["error"], "empty_probe")

    def test_probe_error(self) -> None:
        snap = parse_probe_snapshot({"error": "probe_output_missing"})
        self.assertFalse(snap["allPass"])
        self.assertEqual(snap["error"], "probe_output_missing")

    def test_make_upload_pass_contract(self) -> None:
        probe = parse_probe_snapshot(successful_probe())
        webhook = {
            "pass": True,
            "makeResponse": {
                "lambdaValidation": {
                    "actionOut": "uploaded",
                    "allPass": True,
                    "completeLambdaJson": True,
                }
            },
        }
        phase_pass = (
            webhook["pass"] is True
            and probe["allPass"] is True
            and webhook["makeResponse"]["lambdaValidation"]["actionOut"] == "uploaded"
            and webhook["makeResponse"]["lambdaValidation"]["allPass"] is True
        )
        self.assertTrue(phase_pass)


class TestResetFieldSets(unittest.TestCase):
    def test_trigger_reset_preserves_canonical_fields(self) -> None:
        self.assertNotIn("Canonical File URL", TRIGGER_RESET_FIELDS)
        self.assertNotIn("Storage Key", TRIGGER_RESET_FIELDS)
        self.assertNotIn("File Content Hash", TRIGGER_RESET_FIELDS)
        self.assertNotIn("Uploaded At", TRIGGER_RESET_FIELDS)

    def test_full_reset_clears_canonical_fields(self) -> None:
        for key in (
            "Canonical File URL",
            "Storage Key",
            "File Content Hash",
            "File Hash Algorithm",
            "Uploaded At",
        ):
            self.assertIn(key, FULL_UPLOAD_RESET_FIELDS)


def live_fixture_fields(**overrides) -> dict:
    """Schmidt live-test record state after a successful 070b-triggered run."""
    fields = {
        "Upload Status": "Uploaded",
        "Send to Make Trigger": None,
        "Upload Error": None,
        "Upload Claim Run ID": None,
        "Processing Started At": None,
        "Google Drive File URL": None,
        "Google Drive File ID": None,
        "Canonical File URL": "https://example.com/canonical.png",
        "Storage Key": "shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/x.png",
        "File Content Hash": "a" * 64,
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": "2026-07-11T18:00:00.000Z",
        "Writeback Complete?": 1,
        "Upload Destination": "Video Feedback",
        "Video Feedback": [EXPECTED_VIDEO_FEEDBACK],
        "Enrollment - Linked": ["recgP9qZYjAhE7NXm"],
        "Submission - Linked": ["recM0GbWfptu06da1"],
        "Airtable Attachment": [{"id": "attTEST", "filename": "x.png"}],
    }
    fields.update(overrides)
    return fields


def passing_prep() -> dict:
    return {"assetId": ALLOWED_LIVE_ASSET, "preTestUploadedAt": "2026-07-11T15:41:46.145Z"}


class TestLiveTriggerPrepFields(unittest.TestCase):
    def test_prep_clears_drive_and_holds_error_state(self) -> None:
        self.assertEqual(LIVE_TRIGGER_PREP_FIELDS["Google Drive File URL"], "")
        self.assertEqual(LIVE_TRIGGER_PREP_FIELDS["Google Drive File ID"], "")
        self.assertEqual(LIVE_TRIGGER_PREP_FIELDS["Upload Status"], "Error")
        self.assertIs(LIVE_TRIGGER_PREP_FIELDS["Send to Make Trigger"], True)
        self.assertEqual(LIVE_TRIGGER_PREP_FIELDS["Upload Error"], "")
        self.assertEqual(LIVE_TRIGGER_PREP_FIELDS["Upload Claim Run ID"], "")
        self.assertIsNone(LIVE_TRIGGER_PREP_FIELDS["Processing Started At"])

    def test_prep_never_touches_preserved_fields(self) -> None:
        for key in LIVE_TRIGGER_PRESERVED_FIELDS:
            self.assertNotIn(key, LIVE_TRIGGER_PREP_FIELDS)

    def test_check_live_trigger_prep_pass(self) -> None:
        before = live_fixture_fields(
            **{"Upload Status": "Pending Link", "Google Drive File URL": "https://drive.google.com/x"}
        )
        after = live_fixture_fields(
            **{"Upload Status": "Error", "Send to Make Trigger": True}
        )
        checks = check_live_trigger_prep(before, after)
        self.assertTrue(checks["uploadStatusError"])
        self.assertTrue(checks["sendToMakeTriggerChecked"])
        self.assertTrue(checks["googleDriveUrlBlank"])
        self.assertTrue(checks["googleDriveIdBlank"])
        self.assertTrue(checks["allPreserved"])

    def test_check_live_trigger_prep_detects_lost_attachment(self) -> None:
        before = live_fixture_fields()
        after = live_fixture_fields(
            **{"Upload Status": "Error", "Send to Make Trigger": True, "Airtable Attachment": []}
        )
        checks = check_live_trigger_prep(before, after)
        self.assertFalse(checks["preserved"]["Airtable Attachment"])
        self.assertFalse(checks["allPreserved"])


class TestEvaluateLiveTriggerResult(unittest.TestCase):
    def passing_probe(self) -> dict:
        return {"allPass": True, "checks": {}}

    def test_genuine_pass(self) -> None:
        result = evaluate_live_trigger_result(passing_prep(), live_fixture_fields(), self.passing_probe())
        self.assertTrue(result["pass"], result["checks"])

    def test_stale_uploaded_at_fails(self) -> None:
        fields = live_fixture_fields(**{"Uploaded At": "2026-07-11T15:41:46.145Z"})
        result = evaluate_live_trigger_result(passing_prep(), fields, self.passing_probe())
        self.assertFalse(result["checks"]["uploadedAtAdvanced"])
        self.assertFalse(result["pass"])

    def test_trigger_still_checked_fails(self) -> None:
        fields = live_fixture_fields(**{"Send to Make Trigger": True})
        result = evaluate_live_trigger_result(passing_prep(), fields, self.passing_probe())
        self.assertFalse(result["checks"]["sendToMakeTriggerCleared"])
        self.assertFalse(result["pass"])

    def test_drive_skip_fails(self) -> None:
        fields = live_fixture_fields(**{"Google Drive File URL": "https://drive.google.com/x"})
        result = evaluate_live_trigger_result(passing_prep(), fields, self.passing_probe())
        self.assertFalse(result["checks"]["noDriveSkip"])
        self.assertFalse(result["pass"])

    def test_probe_failure_fails(self) -> None:
        result = evaluate_live_trigger_result(passing_prep(), live_fixture_fields(), {"allPass": False})
        self.assertFalse(result["pass"])

    def test_wrong_record_fails(self) -> None:
        prep = {"assetId": "recWRONG", "preTestUploadedAt": "2026-07-11T15:41:46.145Z"}
        result = evaluate_live_trigger_result(prep, live_fixture_fields(), self.passing_probe())
        self.assertFalse(result["checks"]["recordIdMatches"])
        self.assertFalse(result["pass"])

    def test_video_feedback_unlinked_fails(self) -> None:
        fields = live_fixture_fields(**{"Video Feedback": []})
        result = evaluate_live_trigger_result(passing_prep(), fields, self.passing_probe())
        self.assertFalse(result["checks"]["videoFeedbackLinked"])
        self.assertFalse(result["pass"])


class TestResetLiveTriggerFields(unittest.TestCase):
    def test_reset_live_sets_error_and_unchecked_trigger(self) -> None:
        self.assertEqual(RESET_LIVE_TRIGGER_FIELDS["Upload Status"], "Error")
        self.assertIs(RESET_LIVE_TRIGGER_FIELDS["Send to Make Trigger"], False)
        self.assertEqual(RESET_LIVE_TRIGGER_FIELDS["Upload Error"], "")
        self.assertEqual(RESET_LIVE_TRIGGER_FIELDS["Upload Claim Run ID"], "")
        self.assertIsNone(RESET_LIVE_TRIGGER_FIELDS["Processing Started At"])

    def test_reset_live_clears_writeback_and_drive(self) -> None:
        for key in RESET_LIVE_TRIGGER_CLEARED:
            self.assertIn(key, RESET_LIVE_TRIGGER_FIELDS)

    def test_reset_live_preserves_only_required_links(self) -> None:
        for key in RESET_LIVE_TRIGGER_PRESERVED:
            self.assertNotIn(key, RESET_LIVE_TRIGGER_FIELDS)

    def test_validate_target_rejects_wrong_asset(self) -> None:
        with self.assertRaises(SystemExit):
            validate_reset_live_trigger_target("recWRONG")

    def test_validate_fixture_rejects_missing_attachment(self) -> None:
        fields = live_fixture_fields(**{"Airtable Attachment": []})
        with self.assertRaises(SystemExit):
            validate_reset_live_trigger_fixture(fields)

    def test_validate_fixture_rejects_wrong_enrollment(self) -> None:
        fields = live_fixture_fields(**{"Enrollment - Linked": ["recOTHER"]})
        with self.assertRaises(SystemExit):
            validate_reset_live_trigger_fixture(fields)

    def test_check_reset_live_trigger_pass(self) -> None:
        before = live_fixture_fields()
        after = live_fixture_fields(
            **{
                "Upload Status": "Error",
                "Send to Make Trigger": None,
                "Canonical File URL": None,
                "Storage Key": None,
                "File Content Hash": None,
                "File Hash Algorithm": None,
                "File Size Bytes": None,
                "File MIME Type": None,
                "Uploaded At": None,
                "Google Drive File URL": None,
                "Google Drive File ID": None,
            }
        )
        checks = check_reset_live_trigger(before, after)
        self.assertTrue(checks["uploadStatusError"])
        self.assertTrue(checks["notPendingLink"])
        self.assertTrue(checks["sendToMakeTriggerUnchecked"])
        self.assertTrue(checks["allCleared"])
        self.assertTrue(checks["allPreserved"])

    def test_check_reset_live_trigger_detects_stale_canonical(self) -> None:
        before = live_fixture_fields()
        after = live_fixture_fields(**{"Upload Status": "Error", "Canonical File URL": "https://x"})
        checks = check_reset_live_trigger(before, after)
        self.assertFalse(checks["allCleared"])


if __name__ == "__main__":
    unittest.main()
