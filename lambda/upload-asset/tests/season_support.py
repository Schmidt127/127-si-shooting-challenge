"""Shared season mock for existing processor tests."""

from __future__ import annotations

from upload_core.season import SeasonResolution

DEFAULT_SEASON = SeasonResolution(
    season_slug="2026-2027",
    enrollment_id="recEnroll1",
    program_instance_id="recPi202627",
    program_instance_name="Shooting Challenge | 2026-2027",
    source="program_instance",
    fallback_used=False,
    athlete_slug="test-athlete",
    athlete_last="Test",
    athlete_first="Athlete",
    athlete_folder="Test_Athlete",
    program_instance_folder="Shooting_Challenge_2026-2027",
)
