#!/usr/bin/env python3
"""Environment guard tests for UploadConfig (DEV vs PROD)."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import DEV_BASE, PROD_BASE, UploadConfig


def test_dev_accepts_dev_base():
    env = {
        "ENVIRONMENT": "DEV",
        "AIRTABLE_BASE_ID": DEV_BASE,
        "AIRTABLE_TOKEN": "pat-test",
    }
    with mock.patch.dict(os.environ, env, clear=True):
        cfg = UploadConfig.from_env()
    assert cfg.airtable_base_id == DEV_BASE
    assert cfg.environment == "DEV"


def test_dev_blocks_prod_base():
    env = {
        "ENVIRONMENT": "DEV",
        "AIRTABLE_BASE_ID": PROD_BASE,
        "AIRTABLE_TOKEN": "pat-test",
    }
    with mock.patch.dict(os.environ, env, clear=True):
        try:
            UploadConfig.from_env()
            raise AssertionError("expected ValueError")
        except ValueError as exc:
            assert "blocked" in str(exc)


def test_prod_accepts_prod_base():
    env = {
        "ENVIRONMENT": "PROD",
        "AIRTABLE_BASE_ID": PROD_BASE,
        "AIRTABLE_TOKEN": "pat-test",
    }
    with mock.patch.dict(os.environ, env, clear=True):
        cfg = UploadConfig.from_env()
    assert cfg.airtable_base_id == PROD_BASE
    assert cfg.environment == "PROD"


def test_prod_blocks_dev_base():
    env = {
        "ENVIRONMENT": "PROD",
        "AIRTABLE_BASE_ID": DEV_BASE,
        "AIRTABLE_TOKEN": "pat-test",
    }
    with mock.patch.dict(os.environ, env, clear=True):
        try:
            UploadConfig.from_env()
            raise AssertionError("expected ValueError")
        except ValueError as exc:
            assert PROD_BASE in str(exc) or "PROD" in str(exc)


if __name__ == "__main__":
    test_dev_accepts_dev_base()
    test_dev_blocks_prod_base()
    test_prod_accepts_prod_base()
    test_prod_blocks_dev_base()
    print("OK — config tests passed")
