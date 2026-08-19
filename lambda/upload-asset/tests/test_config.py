#!/usr/bin/env python3
"""Production-only environment guard tests for UploadConfig."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.config import PROD_BASE, UploadConfig


class ConfigGuardTests(unittest.TestCase):
    def test_production_accepts_production_base(self):
        env = {
            "ENVIRONMENT": "PRODUCTION",
            "AIRTABLE_BASE_ID": PROD_BASE,
            "AIRTABLE_TOKEN": "pat-test",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            cfg = UploadConfig.from_env()
        self.assertEqual(cfg.airtable_base_id, PROD_BASE)
        self.assertEqual(cfg.environment, "PRODUCTION")

    def test_production_blocks_unknown_base(self):
        env = {
            "ENVIRONMENT": "PRODUCTION",
            "AIRTABLE_BASE_ID": "appUnknownBase000",
            "AIRTABLE_TOKEN": "pat-test",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            with self.assertRaises(ValueError) as raised:
                UploadConfig.from_env()
        self.assertIn("Production-only", str(raised.exception))

    def test_prod_accepts_prod_base(self):
        env = {
            "ENVIRONMENT": "PROD",
            "AIRTABLE_BASE_ID": PROD_BASE,
            "AIRTABLE_TOKEN": "pat-test",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            cfg = UploadConfig.from_env()
        self.assertEqual(cfg.airtable_base_id, PROD_BASE)
        self.assertEqual(cfg.environment, "PROD")

    def test_rejects_unknown_environment(self):
        env = {
            "ENVIRONMENT": "STAGING",
            "AIRTABLE_BASE_ID": PROD_BASE,
            "AIRTABLE_TOKEN": "pat-test",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            with self.assertRaises(ValueError) as raised:
                UploadConfig.from_env()
        self.assertIn("PROD", str(raised.exception))

    def test_prod_default_season_is_not_hardcoded_source(self):
        env = {
            "ENVIRONMENT": "PROD",
            "AIRTABLE_BASE_ID": PROD_BASE,
            "AIRTABLE_TOKEN": "pat-test",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            cfg = UploadConfig.from_env()
        self.assertEqual(cfg.season_slug, "")
        self.assertFalse(cfg.allow_season_slug_fallback)

    def test_season_fallback_flag_requires_explicit_enable(self):
        env = {
            "ENVIRONMENT": "PRODUCTION",
            "AIRTABLE_BASE_ID": PROD_BASE,
            "AIRTABLE_TOKEN": "pat-test",
            "SEASON_SLUG": "2026-2027",
            "ALLOW_SEASON_SLUG_FALLBACK": "true",
        }
        with mock.patch.dict(os.environ, env, clear=True):
            cfg = UploadConfig.from_env()
        self.assertEqual(cfg.season_slug, "2026-2027")
        self.assertTrue(cfg.allow_season_slug_fallback)


if __name__ == "__main__":
    unittest.main()
