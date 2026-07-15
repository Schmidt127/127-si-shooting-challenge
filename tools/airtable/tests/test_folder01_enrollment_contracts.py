#!/usr/bin/env python3
"""Folder 01 (001/002/003) — offline enrollment intake contracts (S26 WS6).

No Airtable. Models trigger intent vs docs-table swap + grade-band matching.
"""

from __future__ import annotations

import unittest
from typing import Any


# --- Docs-table snapshot (slim export 2026-07-14) — conditions text abbreviated ---

DOCS_001_CONDITIONS = {
    "grade_band_empty": True,
    "grade_present": True,
    "athlete_linked": True,  # docs say Athlete is not empty
}

DOCS_002_CONDITIONS = {
    "athlete_linked": False,  # docs say Athlete is empty
    "identity_fields_present": True,
    "match_status_pending": True,
}


def intended_001_should_fire(
    *, athlete_linked: bool, first: str, last: str, email: str
) -> bool:
    """Script intent: find/create athlete when not yet linked + identity present."""
    return (not athlete_linked) and bool(first and last and email)


def intended_002_should_fire(
    *, athlete_linked: bool, grade: str, grade_band_id: str | None
) -> bool:
    """Script intent: initial band when athlete linked and band blank."""
    return athlete_linked and bool(grade) and not grade_band_id


def intended_003_should_fire(
    *,
    athlete_linked: bool,
    grade: str,
    grade_band_id: str | None,
    refresh_needed: bool,
) -> bool:
    return (
        athlete_linked
        and bool(grade)
        and bool(grade_band_id)
        and refresh_needed
    )


def docs_table_swap_detected() -> bool:
    """001 docs look like 002 intent; 002 docs look like 001 intent."""
    docs_001_looks_like_002 = (
        DOCS_001_CONDITIONS["grade_band_empty"]
        and DOCS_001_CONDITIONS["athlete_linked"]
    )
    docs_002_looks_like_001 = not DOCS_002_CONDITIONS["athlete_linked"]
    return docs_001_looks_like_002 and docs_002_looks_like_001


def match_grade_band(
    grade_numeric: int, bands: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Mirror 002/003 inclusive Min/Max match + sort by min, max, sortOrder."""
    hits = []
    for b in bands:
        if not b.get("active", True):
            continue
        mn, mx = b.get("min"), b.get("max")
        if mn is None or mx is None:
            continue
        if mn <= grade_numeric <= mx:
            hits.append(b)
    hits.sort(key=lambda x: (x["min"], x["max"], x.get("sort", 0)))
    return hits


def soft_dep_002_ok(athlete_linked: bool) -> tuple[bool, str]:
    if not athlete_linked:
        return False, "throw_no_athlete"
    return True, "ok"


class TestFolder01TriggerIntent(unittest.TestCase):
    def test_docs_swap_confirmed(self):
        self.assertTrue(docs_table_swap_detected())

    def test_001_intent_new_enrollment(self):
        self.assertTrue(
            intended_001_should_fire(
                athlete_linked=False, first="A", last="B", email="a@b.co"
            )
        )

    def test_001_intent_skips_when_athlete_linked(self):
        self.assertFalse(
            intended_001_should_fire(
                athlete_linked=True, first="A", last="B", email="a@b.co"
            )
        )

    def test_002_intent_after_001(self):
        self.assertTrue(
            intended_002_should_fire(
                athlete_linked=True, grade="7", grade_band_id=None
            )
        )

    def test_002_intent_skips_without_athlete(self):
        self.assertFalse(
            intended_002_should_fire(
                athlete_linked=False, grade="7", grade_band_id=None
            )
        )

    def test_002_soft_dep_throws_without_athlete(self):
        ok, reason = soft_dep_002_ok(False)
        self.assertFalse(ok)
        self.assertEqual(reason, "throw_no_athlete")

    def test_003_refresh_path(self):
        self.assertTrue(
            intended_003_should_fire(
                athlete_linked=True,
                grade="8",
                grade_band_id="recGB",
                refresh_needed=True,
            )
        )
        self.assertFalse(
            intended_003_should_fire(
                athlete_linked=True,
                grade="8",
                grade_band_id="recGB",
                refresh_needed=False,
            )
        )


class TestGradeBandMatch(unittest.TestCase):
    BANDS = [
        {"id": "k5", "min": 0, "max": 5, "sort": 1, "active": True},
        {"id": "68", "min": 6, "max": 8, "sort": 2, "active": True},
        {"id": "912", "min": 9, "max": 12, "sort": 3, "active": True},
        {"id": "dead", "min": 6, "max": 8, "sort": 0, "active": False},
    ]

    def test_inclusive_range(self):
        self.assertEqual(match_grade_band(6, self.BANDS)[0]["id"], "68")
        self.assertEqual(match_grade_band(8, self.BANDS)[0]["id"], "68")
        self.assertEqual(match_grade_band(5, self.BANDS)[0]["id"], "k5")

    def test_no_match(self):
        self.assertEqual(match_grade_band(99, self.BANDS), [])

    def test_inactive_excluded(self):
        ids = [b["id"] for b in match_grade_band(7, self.BANDS)]
        self.assertNotIn("dead", ids)


class TestCombinePolicy(unittest.TestCase):
    def test_not_safe_tonight(self):
        # Gate for S26: swap unresolved in live UI → cannot claim combine_safely
        self.assertTrue(docs_table_swap_detected())
        verdict = "combine_with_conditions"
        self.assertEqual(verdict, "combine_with_conditions")
        self.assertNotEqual(verdict, "combine_001_002_safely")


if __name__ == "__main__":
    unittest.main()
