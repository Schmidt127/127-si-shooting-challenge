"""SC-SEASON-SIM-002 — dual-gated Season Sim date gate for Production automations.

Airtable automation scripts **cannot** import this module. Helpers are inlined in:
  - 010-submission-intake-create-xp-event.js (effectiveTodayKey)
  - 114-video-review-and-xp-create-or-update-video-xp-event.js (effectiveTodayDenverKey)
  - 073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js

This module is the offline contract + unit-test source of truth for that gate.

Gate (BOTH required for sim clock path):
  1. Submissions.`Season Sim Test Record?` = true
  2. Submissions.`Video Upload Note` contains ``SEASON-SIM|``

When gated and `Season Sim Clock Now` is present → that date is "today".
When gated and clock is blank → fall back to wall-clock today (fail closed).
When gate fails → exact Production wall-clock behavior (no weakening).

Paste / deploy: docs/deploy-checklists/SC-SEASON-SIM-002-automation-paste-010-114.md
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from .constants import RUN_MARKER_PREFIX

SEASON_SIM_MARKER = f"{RUN_MARKER_PREFIX}|"
SEASON_SIM_TEST_RECORD_FIELD = "Season Sim Test Record?"
SEASON_SIM_CLOCK_NOW_FIELD = "Season Sim Clock Now"
VIDEO_UPLOAD_NOTE_FIELD = "Video Upload Note"


def is_season_sim_record(
    *,
    season_sim_test_record: bool,
    video_upload_note: str | None,
) -> bool:
    """Return True only when both gate conditions are satisfied."""
    if not season_sim_test_record:
        return False
    return SEASON_SIM_MARKER in str(video_upload_note or "")


def _as_date(value: date | datetime | str | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    # Accept YYYY-MM-DD or ISO datetime prefix.
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def effective_today(
    *,
    wall_today: date,
    season_sim_test_record: bool,
    video_upload_note: str | None,
    season_sim_clock_now: date | datetime | str | None,
) -> date:
    """Resolve the date key used as "today" for Activity Date future checks.

    Mirrors automation helpers ``effectiveTodayKey`` / ``effectiveTodayDenverKey``.
    """
    if not is_season_sim_record(
        season_sim_test_record=season_sim_test_record,
        video_upload_note=video_upload_note,
    ):
        return wall_today

    clock = _as_date(season_sim_clock_now)
    return clock if clock is not None else wall_today


def activity_date_is_future(
    activity_date: date | datetime | str | None,
    *,
    wall_today: date,
    season_sim_test_record: bool = False,
    video_upload_note: str | None = None,
    season_sim_clock_now: date | datetime | str | None = None,
) -> bool:
    """True when Activity Date is after effective today (ineligible / blocked)."""
    activity = _as_date(activity_date)
    if activity is None:
        return False  # missing date is a separate failure mode in automations
    today = effective_today(
        wall_today=wall_today,
        season_sim_test_record=season_sim_test_record,
        video_upload_note=video_upload_note,
        season_sim_clock_now=season_sim_clock_now,
    )
    return activity > today


def gate_contract_summary() -> dict[str, Any]:
    """Operator-facing summary for checklists / paste docs."""
    return {
        "backlog": "SC-SEASON-SIM-002",
        "marker": SEASON_SIM_MARKER,
        "fields": {
            "test_record": SEASON_SIM_TEST_RECORD_FIELD,
            "clock_now": SEASON_SIM_CLOCK_NOW_FIELD,
            "video_upload_note": VIDEO_UPLOAD_NOTE_FIELD,
        },
        "scripts": ("010", "114", "073"),
        "rule": (
            "Both Season Sim Test Record? and SEASON-SIM| in Video Upload Note "
            "required; then Season Sim Clock Now is today; else wall-clock today."
        ),
        "empty_clock": "fall back to wall-clock today (fail closed)",
        "non_sim": "unchanged Production wall-clock future-date protection",
    }
