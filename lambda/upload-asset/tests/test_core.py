#!/usr/bin/env python3
"""Unit tests for upload_core path helpers (no AWS/Airtable)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.util import build_storage_key, canonical_url, sha256_hex, verify_hash_hex


def test_storage_key_shape():
    fields = {"Upload Destination": "Video Feedback"}
    key = build_storage_key(
        record_id="recTest123456789",
        fields=fields,
        athlete_slug="schmidt-mike",
        season_slug="2026-2027",
        challenge_slug="shooting-challenge",
        date_str="2026-07-08",
        filename="BlueOrangeCircleLogo.png",
    )
    assert key.startswith("shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/")
    assert "video-feedback" in key
    assert key.endswith("BlueOrangeCircleLogo.png")


def test_canonical_url():
    url = canonical_url(
        "shooting-challenge-assets",
        "us-east-2",
        "shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/a.png",
    )
    assert url.startswith("https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/")


def test_sha256_known_empty():
    assert sha256_hex(b"") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert verify_hash_hex(sha256_hex(b"test"))


if __name__ == "__main__":
    test_storage_key_shape()
    test_canonical_url()
    test_sha256_known_empty()
    print("OK — upload_core unit tests passed")
