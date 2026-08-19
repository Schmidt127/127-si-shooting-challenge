#!/usr/bin/env python3
"""Airtable GET helpers — table ids and no fields[] on single-record GET."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from upload_core.airtable import (
    api_url,
    get_enrollment,
    get_program_instance,
    get_record,
)
from upload_core.season import (
    TABLE_ENROLLMENTS,
    TABLE_ENROLLMENTS_NAME,
    TABLE_PROGRAM_INSTANCE,
    TABLE_PROGRAM_INSTANCE_NAME,
)

PROD_BASE = "appn84sqPw03zEbTT"
# Live meta.bases IDs verified 2026-08-17 (PROD). Same Enrollments id on Production.
LIVE_ENROLLMENTS_TABLE_ID = "tbl3PFmwbRoabu1YV"
LIVE_PROGRAM_INSTANCE_TABLE_ID = "tblMfALZa4YYUy70P"
STALE_ENROLLMENTS_TABLE_ID = "tblStaleEnroll0001"


class TableIdentifierTests(unittest.TestCase):
    def test_enrollments_constant_matches_live_prod_id(self):
        self.assertEqual(TABLE_ENROLLMENTS, LIVE_ENROLLMENTS_TABLE_ID)
        self.assertEqual(TABLE_ENROLLMENTS_NAME, "Enrollments")

    def test_program_instance_constant_matches_live_prod_id(self):
        self.assertEqual(TABLE_PROGRAM_INSTANCE, LIVE_PROGRAM_INSTANCE_TABLE_ID)
        self.assertEqual(TABLE_PROGRAM_INSTANCE_NAME, "Program Instance - Sync")

    def test_enrollments_constant_is_not_stale_placeholder(self):
        self.assertNotEqual(TABLE_ENROLLMENTS, STALE_ENROLLMENTS_TABLE_ID)
        self.assertTrue(TABLE_ENROLLMENTS.startswith("tbl"))
        self.assertEqual(len(TABLE_ENROLLMENTS), 17)


class GetRecordUrlTests(unittest.TestCase):
    def test_get_record_omits_fields_query_even_when_names_passed(self):
        captured: dict[str, str] = {}

        def fake_http_json(method, url, token=None, body=None, timeout=60):
            captured["method"] = method
            captured["url"] = url
            return 200, {"id": "recX", "fields": {"Program Instance": ["recPi"]}}

        with patch("upload_core.airtable.http_json", side_effect=fake_http_json):
            get_record(
                "pat-test",
                PROD_BASE,
                TABLE_ENROLLMENTS,
                "recCrNNAdVmQ4Y8fL",
                ("Program Instance", "School Year", "Athlete Last Name", "Athlete First Name"),
            )

        parsed = urlparse(captured["url"])
        self.assertEqual(captured["method"], "GET")
        self.assertEqual(parsed.path, f"/v0/{PROD_BASE}/{TABLE_ENROLLMENTS}/recCrNNAdVmQ4Y8fL")
        self.assertFalse(parsed.query)
        self.assertNotIn("fields", captured["url"])
        self.assertNotIn("fields%5B", captured["url"])

    def test_get_enrollment_uses_live_enrollments_table_id(self):
        captured: dict[str, str] = {}

        def fake_http_json(method, url, token=None, body=None, timeout=60):
            captured["url"] = url
            return 200, {"id": "recCrNNAdVmQ4Y8fL", "fields": {}}

        with patch("upload_core.airtable.http_json", side_effect=fake_http_json):
            get_enrollment("pat-test", PROD_BASE, "recCrNNAdVmQ4Y8fL")

        expected = api_url(PROD_BASE, TABLE_ENROLLMENTS) + "/recCrNNAdVmQ4Y8fL"
        self.assertEqual(captured["url"], expected)
        self.assertIn(LIVE_ENROLLMENTS_TABLE_ID, captured["url"])
        self.assertNotIn(STALE_ENROLLMENTS_TABLE_ID, captured["url"])
        self.assertNotIn("fields", captured["url"])

    def test_get_program_instance_uses_live_program_instance_table_id(self):
        captured: dict[str, str] = {}

        def fake_http_json(method, url, token=None, body=None, timeout=60):
            captured["url"] = url
            return 200, {"id": "rec5mEM0YPqPqq0hZ", "fields": {}}

        with patch("upload_core.airtable.http_json", side_effect=fake_http_json):
            get_program_instance("pat-test", PROD_BASE, "rec5mEM0YPqPqq0hZ")

        self.assertIn(LIVE_PROGRAM_INSTANCE_TABLE_ID, captured["url"])
        self.assertNotIn("fields", captured["url"])

    def test_stale_table_id_would_not_be_used_by_get_enrollment(self):
        """Regression: enrollment helper must target the live id, not a stale constant."""
        self.assertEqual(
            quote(TABLE_ENROLLMENTS, safe=""),
            LIVE_ENROLLMENTS_TABLE_ID,
        )
        stale_url = api_url(PROD_BASE, STALE_ENROLLMENTS_TABLE_ID) + "/recCrNNAdVmQ4Y8fL"
        live_url = api_url(PROD_BASE, TABLE_ENROLLMENTS) + "/recCrNNAdVmQ4Y8fL"
        self.assertNotEqual(stale_url, live_url)

    def test_fields_filter_422_surface_is_not_reintroduced(self):
        """If a caller still passes field names, URL must not recreate the 422 query shape."""
        bad_indexed = "&".join(
            f"fields%5B{i}%5D={quote(name)}"
            for i, name in enumerate(("Program Instance", "School Year"))
        )
        bad_bracket = "&".join(
            f"fields%5B%5D={quote(name)}" for name in ("Program Instance", "School Year")
        )
        captured: dict[str, str] = {}

        def fake_http_json(method, url, token=None, body=None, timeout=60):
            captured["url"] = url
            return 200, {"id": "recX", "fields": {}}

        with patch("upload_core.airtable.http_json", side_effect=fake_http_json):
            get_record(
                "pat-test",
                PROD_BASE,
                TABLE_ENROLLMENTS,
                "recX",
                ("Program Instance", "School Year"),
            )

        self.assertNotIn(bad_indexed, captured["url"])
        self.assertNotIn(bad_bracket, captured["url"])
        self.assertNotIn("?", captured["url"])


if __name__ == "__main__":
    unittest.main()
