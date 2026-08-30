"""Shared constants for Athlete 1 season simulation (SC-SEASON-SIM-002)."""

from __future__ import annotations

from datetime import date
from zoneinfo import ZoneInfo

DENVER = ZoneInfo("America/Denver")

# Canonical simulation window (inclusive).
SIM_START = date(2027, 5, 1)
SIM_END = date(2027, 6, 30)
SIMULATION_DAY_COUNT = 61  # (SIM_END - SIM_START).days + 1

# Explicit gate for execute / cleanup writes.
CONFIRM_TOKEN = "SEASON-SIMULATION-2027"

# Only allowed email recipient for authorized live-looking delivery.
SAFE_EMAIL_RECIPIENT = "schmidt@fairfieldbasketballclub.com"

# Athlete 1 identity (transactional; not configuration).
ATHLETE_FIRST_NAME = "Athlete"
ATHLETE_LAST_NAME = "1"
ATHLETE_DISPLAY_NAME = "Athlete 1"
ATHLETE_GRADE = "12"

# Marker embedded in writable Notes fields where schema permits.
RUN_MARKER_PREFIX = "SEASON-SIM"

# Default production base (system not live yet). Overridable via env.
DEFAULT_BASE_ID = "appn84sqPw03zEbTT"

# Tables — transactional (cleanup-eligible when tagged by run).
TRANSACTIONAL_TABLES = (
    "Athletes",
    "Enrollments",
    "Submissions",
    "Submission Assets",
    "Homework Completions",
    "XP Events",
    "Athlete Achievement Unlocks",
    "Streak Occurrences",
    "Video Feedback",
    "Weekly Athlete Summary",
    "Zoom Attendance",
    "Email Handoff Queue",
)

# Tables — reference / configuration (never delete via cleanup).
REFERENCE_TABLES = (
    "Grade Bands",
    "Target Goal Shots",
    "Program Homework Assignments",
    "Homework Library",
    "Zoom Meetings",
    "Weeks",
    "Levels",
    "Level Gate Rules",
    "Achievements",
    "Shot Milestones",
    "XP Reward Rules",
    "Config",
    "Program Instance - Sync",
    "School - Synced",
)

# Required tables for preflight connectivity / field presence checks.
PREFLIGHT_REQUIRED_TABLES = TRANSACTIONAL_TABLES + REFERENCE_TABLES

# Writable Notes-like fields used to stamp run IDs (best-effort; schema may evolve).
RUN_ID_FIELD_CANDIDATES: dict[str, tuple[str, ...]] = {
    "Submissions": ("Video Upload Note", "HW 1 - Parent Note", "HW 2 - Parent Note"),
    "Homework Completions": ("Notes",),
    "XP Events": ("XP Reason Debug",),
    "Streak Occurrences": ("Notes",),
    "Athlete Achievement Unlocks": ("Coach Note", "Internal Notes"),
    "Video Feedback": ("Coach Feedback",),
    "Weekly Athlete Summary": (),  # prefer registry + enrollment filter
    "Email Handoff Queue": ("Handoff Key", "Last Error"),
    "Enrollments": (),  # registry + name / parent email filter
    "Athletes": (),
    "Submission Assets": (),
    "Zoom Attendance": (),
}
