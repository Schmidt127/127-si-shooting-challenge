#!/usr/bin/env python3
"""Unit tests for C-013 PROD Make smoke runner probe parsing."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

from c013_prod_make_smoke_run import parse_probe_snapshot  # noqa: E402

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


if __name__ == "__main__":
    unittest.main()
