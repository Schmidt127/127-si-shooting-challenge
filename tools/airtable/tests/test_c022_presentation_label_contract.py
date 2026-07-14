#!/usr/bin/env python3
"""C-022 Stage 14 — offline contract for public Presentation labels."""

from __future__ import annotations

import unittest


def public_homework_title(
    *,
    assignment_title: str | None,
    assignment_full_name: str | None = None,
    record_name: str | None = None,
    mode: str = "public",
) -> str:
    """
    public: Presentation title only (Assignment Title). No formula/primary fallback.
    ops: may fall back for diagnostics.
    """
    title = (assignment_title or "").strip()
    if title:
        return title
    if mode == "ops":
        for candidate in (assignment_full_name, record_name):
            text = (candidate or "").strip()
            if text:
                return text
        return "(untitled)"
    # Strict public mode — never use Full Name or primary
    return "(Untitled)"


def uses_forbidden_public_fallback(
    *,
    assignment_title: str | None,
    chosen: str,
    assignment_full_name: str | None = None,
    record_name: str | None = None,
) -> bool:
    """True when public output silently used Full Name or primary while Title empty."""
    if (assignment_title or "").strip():
        return False
    chosen_norm = (chosen or "").strip()
    forbidden = {
        (assignment_full_name or "").strip(),
        (record_name or "").strip(),
    }
    forbidden.discard("")
    return chosen_norm in forbidden


class TestC022PresentationLabelContract(unittest.TestCase):
    def test_prefers_assignment_title(self):
        self.assertEqual(
            public_homework_title(
                assignment_title="Film Study",
                assignment_full_name="W03 · Film Study · Long Formula",
                record_name="recPrimary",
            ),
            "Film Study",
        )

    def test_public_mode_no_full_name_fallback(self):
        self.assertEqual(
            public_homework_title(
                assignment_title="",
                assignment_full_name="W03 · Film Study · Long Formula",
                record_name="Homework 3",
                mode="public",
            ),
            "(Untitled)",
        )

    def test_detects_071_style_name_fallback(self):
        # Mirrors current 071 firstNonBlank(title, record.name) risk
        title = ""
        record_name = "Homework 3"
        chosen = title or record_name
        self.assertTrue(
            uses_forbidden_public_fallback(
                assignment_title=title,
                chosen=chosen,
                record_name=record_name,
            )
        )

    def test_detects_072_style_full_name_fallback(self):
        title = ""
        full = "W03 · Film Study · Long Formula"
        chosen = title or full
        self.assertTrue(
            uses_forbidden_public_fallback(
                assignment_title=title,
                chosen=chosen,
                assignment_full_name=full,
            )
        )

    def test_ops_mode_may_fall_back(self):
        self.assertEqual(
            public_homework_title(
                assignment_title="",
                assignment_full_name="W03 · Long",
                mode="ops",
            ),
            "W03 · Long",
        )

    def test_valid_public_choice_not_flagged(self):
        self.assertFalse(
            uses_forbidden_public_fallback(
                assignment_title="Film Study",
                chosen="Film Study",
                assignment_full_name="W03 · Film Study · Long Formula",
                record_name="Homework 3",
            )
        )


if __name__ == "__main__":
    unittest.main()
