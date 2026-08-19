#!/usr/bin/env python3
"""Unit tests for upload_core path helpers (no AWS/Airtable)."""

from __future__ import annotations

import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.storage_key import build_storage_key
from upload_core.util import canonical_url, sha256_hex, verify_hash_hex


class StorageKeyCoreTests(unittest.TestCase):
    def test_storage_key_shape(self):
        key = build_storage_key(
            record_id="recAqoUbBKfDNtTLt",
            athlete_folder="Schmidt_Xavier",
            program_instance_folder="Shooting_Challenge_2026-2027",
            created_at=datetime(2026, 8, 17, 17, 27, 32, tzinfo=timezone.utc),
            slot_token="HW1",
            filename="Straughn_Stetson_316.jpg",
        )
        self.assertEqual(
            key,
            "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/"
            "20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg",
        )

    def test_canonical_url(self):
        url = canonical_url(
            "shooting-challenge-assets",
            "us-east-2",
            "Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/file.jpg",
        )
        self.assertTrue(
            url.startswith("https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/")
        )

    def test_sha256_known_empty(self):
        self.assertEqual(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        )
        self.assertTrue(verify_hash_hex(sha256_hex(b"test")))


if __name__ == "__main__":
    unittest.main()
