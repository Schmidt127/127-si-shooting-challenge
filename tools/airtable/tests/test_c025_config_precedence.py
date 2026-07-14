#!/usr/bin/env python3
"""C-025 — offline contract for the 4-tier config precedence design.

Mirrors docs/deploy-checklists/C-025-config-linkage-design.md:
    meeting override -> Program Config -> Global Config -> safe fallback

This models the Zoom Meetings "Effective *" formulas as they will be written
(one Override field + a Program-scope rollup + a Global-scope rollup per
setting), including the Airtable rollup trick used to make checkbox settings
blank-detectable (COUNTA(values) == 0 means "no linked Config row", not
"Config value is false") -- see design doc SS4.2 for why plain Lookup fields
are not used for this.

No live Airtable calls. No network. Pure logic mirror for regression safety.
"""

from __future__ import annotations

import unittest


NOT_SET = object()  # sentinel: "no override configured" (distinct from 0 / False / "")


# --- rollup-style resolution helpers (mirrors the Airtable Rollup aggregation) ---


def rollup_number(linked_row: dict | None, key: str):
    """IF(COUNTA(values) = 0, BLANK(), SUM(values))"""
    if linked_row is None:
        return None
    return linked_row.get(key)


def rollup_checkbox(linked_row: dict | None, key: str):
    """IF(COUNTA(values) = 0, BLANK(), OR(values))

    Critically: if linked_row is not None, we ALWAYS return the checkbox
    value (True or False) -- COUNTA counts the linked record regardless of
    whether its checkbox is checked. Only a missing link returns None.
    """
    if linked_row is None:
        return None
    return bool(linked_row.get(key, False))


def rollup_select(linked_row: dict | None, key: str):
    """IF(COUNTA(values) = 0, BLANK(), ARRAYJOIN(values))"""
    if linked_row is None:
        return None
    value = linked_row.get(key)
    return value if value else None


# --- 4-tier resolvers matching the two formula templates in the design doc ---


def resolve_number(
    *,
    meeting_override,
    program_config: dict | None,
    global_config: dict | None,
    config_key: str,
    fallback,
):
    if meeting_override is not NOT_SET and meeting_override is not None:
        return meeting_override
    program_value = rollup_number(program_config, config_key)
    if program_value is not None:
        return program_value
    global_value = rollup_number(global_config, config_key)
    if global_value is not None:
        return global_value
    return fallback


def resolve_bool(
    *,
    meeting_override,  # "Yes" / "No" / NOT_SET  (Airtable single-select tri-state)
    program_config: dict | None,
    global_config: dict | None,
    config_key: str,
    fallback: bool,
) -> bool:
    if meeting_override == "Yes":
        return True
    if meeting_override == "No":
        return False
    program_value = rollup_checkbox(program_config, config_key)
    if program_value is not None:
        return program_value
    global_value = rollup_checkbox(global_config, config_key)
    if global_value is not None:
        return global_value
    return fallback


def resolve_select(
    *,
    meeting_override,
    program_config: dict | None,
    global_config: dict | None,
    config_key: str,
    fallback: str,
) -> str:
    if meeting_override is not NOT_SET and meeting_override:
        return meeting_override
    program_value = rollup_select(program_config, config_key)
    if program_value:
        return program_value
    global_value = rollup_select(global_config, config_key)
    if global_value:
        return global_value
    return fallback


# --- convenience wrappers matching the nine settings by name ---


def effective_recording_xp_percentage(**kwargs) -> int:
    return resolve_number(
        config_key="Zoom Recording XP Percent of Live", fallback=50, **kwargs
    )


def effective_recording_counts_for_level_gate(**kwargs) -> bool:
    return resolve_bool(
        config_key="Recording Gives Full Zoom Gate Credit?", fallback=True, **kwargs
    )


def effective_recording_counts_for_perfect_week(**kwargs) -> bool:
    return resolve_bool(
        config_key="Recording Makeup Counts for Perfect Week?", fallback=True, **kwargs
    )


def effective_coach_approval_required(**kwargs) -> bool:
    return resolve_bool(
        config_key="Recording Quiz Requires Coach Approval?", fallback=True, **kwargs
    )


def effective_recording_makeup_enabled(**kwargs) -> bool:
    return resolve_bool(
        config_key="Recording Makeup Enabled?", fallback=True, **kwargs
    )


def effective_makeup_window_days(**kwargs) -> int:
    return resolve_number(
        config_key="Zoom Recording Makeup Window Days", fallback=7, **kwargs
    )


def effective_deadline_mode(**kwargs) -> str:
    return resolve_select(
        config_key="Zoom Recording Deadline Mode", fallback="Later of Both", **kwargs
    )


def effective_approval_email_enabled(**kwargs) -> bool:
    # Note: distinct fallback from the other checkboxes -- missing config
    # must default to "do not send", per the approved fallback list.
    return resolve_bool(
        config_key="Recording Approval Email Enabled?", fallback=False, **kwargs
    )


class TestNumberPrecedence(unittest.TestCase):
    def test_all_tiers_blank_uses_fallback(self):
        pct = effective_recording_xp_percentage(
            meeting_override=NOT_SET, program_config=None, global_config=None
        )
        self.assertEqual(pct, 50)

    def test_global_only_wins_over_fallback(self):
        pct = effective_recording_xp_percentage(
            meeting_override=NOT_SET,
            program_config=None,
            global_config={"Zoom Recording XP Percent of Live": 40},
        )
        self.assertEqual(pct, 40)

    def test_program_wins_over_global(self):
        pct = effective_recording_xp_percentage(
            meeting_override=NOT_SET,
            program_config={"Zoom Recording XP Percent of Live": 25},
            global_config={"Zoom Recording XP Percent of Live": 40},
        )
        self.assertEqual(pct, 25)

    def test_meeting_override_wins_over_everything(self):
        pct = effective_recording_xp_percentage(
            meeting_override=10,
            program_config={"Zoom Recording XP Percent of Live": 25},
            global_config={"Zoom Recording XP Percent of Live": 40},
        )
        self.assertEqual(pct, 10)

    def test_zero_override_is_a_real_value_not_unset(self):
        # 0 is a legitimate override value (e.g. "no recording credit at all
        # for this one meeting") and must not be treated as NOT_SET.
        pct = effective_recording_xp_percentage(
            meeting_override=0,
            program_config={"Zoom Recording XP Percent of Live": 25},
            global_config=None,
        )
        self.assertEqual(pct, 0)

    def test_makeup_days_same_precedence(self):
        days = effective_makeup_window_days(
            meeting_override=NOT_SET,
            program_config=None,
            global_config=None,
        )
        self.assertEqual(days, 7)
        days2 = effective_makeup_window_days(
            meeting_override=3,
            program_config={"Zoom Recording Makeup Window Days": 10},
            global_config={"Zoom Recording Makeup Window Days": 20},
        )
        self.assertEqual(days2, 3)


class TestCheckboxPrecedence(unittest.TestCase):
    def test_link_missing_vs_link_present_but_false(self):
        """The core rollup trick: distinguishing 'no Config row linked' from
        'Config row linked but its checkbox is unchecked'. Both must NOT
        collapse to the same fallback-driven outcome."""
        # No link at all -> fallback (True)
        no_link = effective_recording_counts_for_level_gate(
            meeting_override=NOT_SET, program_config=None, global_config=None
        )
        self.assertTrue(no_link)

        # Program linked, but the Config row's checkbox is explicitly False
        linked_but_false = effective_recording_counts_for_level_gate(
            meeting_override=NOT_SET,
            program_config={"Recording Gives Full Zoom Gate Credit?": False},
            global_config=None,
        )
        self.assertFalse(linked_but_false)

    def test_override_yes_no_tri_state(self):
        self.assertTrue(
            effective_coach_approval_required(
                meeting_override="Yes",
                program_config={"Recording Quiz Requires Coach Approval?": False},
                global_config=None,
            )
        )
        self.assertFalse(
            effective_coach_approval_required(
                meeting_override="No",
                program_config={"Recording Quiz Requires Coach Approval?": True},
                global_config=None,
            )
        )
        # Override NOT_SET (blank) falls through to Program/Global/fallback
        self.assertTrue(
            effective_coach_approval_required(
                meeting_override=NOT_SET,
                program_config=None,
                global_config=None,
            )
        )

    def test_perfect_week_and_makeup_enabled_default_true(self):
        self.assertTrue(
            effective_recording_counts_for_perfect_week(
                meeting_override=NOT_SET, program_config=None, global_config=None
            )
        )
        self.assertTrue(
            effective_recording_makeup_enabled(
                meeting_override=NOT_SET, program_config=None, global_config=None
            )
        )

    def test_approval_email_enabled_defaults_false_not_true(self):
        # This is the one checkbox setting whose safe fallback is False,
        # not True -- distinct from every other boolean in this catalog.
        self.assertFalse(
            effective_approval_email_enabled(
                meeting_override=NOT_SET, program_config=None, global_config=None
            )
        )

    def test_program_beats_global_for_checkbox(self):
        result = effective_recording_counts_for_level_gate(
            meeting_override=NOT_SET,
            program_config={"Recording Gives Full Zoom Gate Credit?": False},
            global_config={"Recording Gives Full Zoom Gate Credit?": True},
        )
        self.assertFalse(result)


class TestSelectPrecedence(unittest.TestCase):
    def test_deadline_mode_fallback(self):
        mode = effective_deadline_mode(
            meeting_override=NOT_SET, program_config=None, global_config=None
        )
        self.assertEqual(mode, "Later of Both")

    def test_deadline_mode_program_over_global(self):
        mode = effective_deadline_mode(
            meeting_override=NOT_SET,
            program_config={"Zoom Recording Deadline Mode": "Earlier of Both"},
            global_config={"Zoom Recording Deadline Mode": "End of Program Week"},
        )
        self.assertEqual(mode, "Earlier of Both")

    def test_deadline_mode_override_wins(self):
        mode = effective_deadline_mode(
            meeting_override="Days After Recording Available",
            program_config={"Zoom Recording Deadline Mode": "Earlier of Both"},
            global_config=None,
        )
        self.assertEqual(mode, "Days After Recording Available")

    def test_blank_string_override_is_treated_as_unset(self):
        # Airtable single-select renders "no selection" as an empty string
        # in some export paths -- must fall through, not be treated as a
        # real (invalid) mode value.
        mode = effective_deadline_mode(
            meeting_override="",
            program_config={"Zoom Recording Deadline Mode": "End of Program Week"},
            global_config=None,
        )
        self.assertEqual(mode, "End of Program Week")


class TestScopeModelDocumentedReality(unittest.TestCase):
    """Regression guard for the documented current-state fact: Config has
    zero C-025 fields live today, so every setting must currently resolve
    to its fallback with no Program/Global config present at all."""

    def test_all_nine_settings_resolve_to_documented_fallback_when_config_empty(self):
        common = dict(meeting_override=NOT_SET, program_config=None, global_config=None)
        self.assertEqual(effective_recording_xp_percentage(**common), 50)
        self.assertTrue(effective_recording_counts_for_level_gate(**common))
        self.assertTrue(effective_recording_counts_for_perfect_week(**common))
        self.assertTrue(effective_coach_approval_required(**common))
        self.assertTrue(effective_recording_makeup_enabled(**common))
        self.assertEqual(effective_makeup_window_days(**common), 7)
        self.assertEqual(effective_deadline_mode(**common), "Later of Both")
        self.assertFalse(effective_approval_email_enabled(**common))


if __name__ == "__main__":
    unittest.main()
