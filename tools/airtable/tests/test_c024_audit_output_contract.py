#!/usr/bin/env python3
"""C-024 Stage 3 — audit-dedupe-key-coverage JSON output contract tests."""

from __future__ import annotations

import json
import unittest

REQUIRED_CHECK_IDS = frozenset(
    {"DK-01", "DK-02", "DK-03", "DK-04", "DK-05", "DK-06", "DK-07", "DK-08"}
)
VALID_SEVERITIES = frozenset({"error", "warn", "info"})


def validate_report(payload: dict) -> list[str]:
    errors: list[str] = []
    if payload.get("audit") != "audit-dedupe-key-coverage":
        errors.append("audit name mismatch")
    if not str(payload.get("version", "")).startswith("0."):
        errors.append("version missing")
    if payload.get("mode") != "dry-run":
        errors.append("mode must be dry-run")
    summary = payload.get("summary")
    if not isinstance(summary, dict):
        errors.append("summary missing")
    else:
        for key in ("error", "warn", "info"):
            if key not in summary:
                errors.append(f"summary.{key} missing")
    samples = payload.get("samples")
    if not isinstance(samples, list):
        errors.append("samples must be list")
    else:
        for sample in samples:
            check_id = sample.get("checkId")
            if check_id not in REQUIRED_CHECK_IDS:
                errors.append(f"unknown checkId {check_id}")
            if sample.get("severity") not in VALID_SEVERITIES:
                errors.append(f"invalid severity for {check_id}")
            if not sample.get("recordId", "").startswith("rec"):
                errors.append(f"recordId missing for {check_id}")
    return errors


class TestC024AuditOutputContract(unittest.TestCase):
    def test_valid_minimal_report_passes(self):
        report = {
            "audit": "audit-dedupe-key-coverage",
            "version": "0.1.0",
            "mode": "dry-run",
            "summary": {"error": 0, "warn": 1, "info": 2},
            "samples": [
                {
                    "checkId": "DK-01",
                    "severity": "error",
                    "recordId": "recXPTEST01",
                    "sourceKey": "HOMEWORK_XP|recHC1",
                },
                {
                    "checkId": "DK-04",
                    "severity": "warn",
                    "recordId": "recSUBTEST01",
                    "duplicateKey": "dup-key",
                },
            ],
        }
        self.assertEqual(validate_report(report), [])

    def test_invalid_audit_name_fails(self):
        report = {
            "audit": "wrong-name",
            "version": "0.1.0",
            "mode": "dry-run",
            "summary": {"error": 0, "warn": 0, "info": 0},
            "samples": [],
        }
        self.assertIn("audit name mismatch", validate_report(report))

    def test_all_check_ids_are_cataloged(self):
        self.assertEqual(len(REQUIRED_CHECK_IDS), 8)


if __name__ == "__main__":
    unittest.main()
