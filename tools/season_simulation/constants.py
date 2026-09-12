"""Shared constants for season simulation (SC-SEASON-SIM-001 / SC-SEASON-SIM-002)."""

from __future__ import annotations

from datetime import date
from zoneinfo import ZoneInfo

DENVER = ZoneInfo("America/Denver")

# Canonical simulation window (inclusive) — full challenge calendar.
# April 25, 2027 through June 30, 2027 11:59 PM America/Denver = 67 days.
SIM_START = date(2027, 4, 25)
SIM_END = date(2027, 6, 30)
SIMULATION_DAY_COUNT = 67  # (SIM_END - SIM_START).days + 1

# Explicit gates for execute / cleanup writes (all required for live writes).
CONFIRM_TOKEN = "SEASON-SIMULATION-2027"
CONFIRM_DISPOSABLE_TOKEN = "CONFIRM-DISPOSABLE-SEASON-SIM"
CONFIRM_CLEANUP_TOKEN = "CONFIRM-CLEANUP-SEASON-SIM"

# SC-SEASON-SIM-001 three-athlete authorization (Mike must say exactly this phrase).
THREE_ATHLETE_AUTHORIZATION_PHRASE = "RUN 3-ATHLETE SEASON SIMULATION"
THREE_ATHLETE_RUN_SUFFIX = "threeathlete"
CONFIRM_THREE_ATHLETE_TOKEN = "THREE-ATHLETE-SEASON-SIM-2027"

# Only allowed email recipient for authorized live-looking delivery.
SAFE_EMAIL_RECIPIENT = "schmidt@fairfieldbasketballclub.com"

# Athlete 1 identity — SC-SEASON-SIM-002 historical (mixed path; do not reuse for SC-001).
ATHLETE_FIRST_NAME = "Athlete"
ATHLETE_LAST_NAME = "1"
ATHLETE_DISPLAY_NAME = "Athlete 1"
ATHLETE_GRADE = "12"

# SC-SEASON-SIM-001 three disposable athletes (Production VERIFY only).
SC001_ATHLETES = (
    {
        "profile": "athlete1_perfect",
        "first_name": "Sim",
        "last_name": "Perfect",
        "display_suffix": "Athlete 1 Perfect",
        "grade": "12",
    },
    {
        "profile": "athlete2_recovery",
        "first_name": "Sim",
        "last_name": "Recovery",
        "display_suffix": "Athlete 2 Recovery",
        "grade": "10",
    },
    {
        "profile": "athlete3_edge",
        "first_name": "Sim",
        "last_name": "Edge",
        "display_suffix": "Athlete 3 Edge",
        "grade": "8",
    },
)

# Offline Grade 12 shot milestones (9–12 band) — verify live at preflight.
DEFAULT_SHOT_MILESTONES_912 = (
    (3000, 10, "25%"),
    (6000, 15, "50%"),
    (9000, 20, "75%"),
    (12000, 30, "100%"),
    (14400, 40, "120%"),
)

# Gate-eligible streak day thresholds (Achievements table; offline planning).
DEFAULT_STREAK_GATE_THRESHOLDS = (3, 7, 10, 14, 21, 30, 45, 60)

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
    "Zoom Meetings",  # only sim-created meetings registered under the run
    "Email Handoff Queue",
)

# Tables — reference / configuration (never scan-delete wholesale).
# Zoom Meetings stays here so cleanup never deletes *non-registry* meetings;
# registry-scoped sim-created Zoom Meetings are still deleted (see cleanup.py).
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

# Reference tables whose *registry-listed* record IDs may be deleted by cleanup.
# Non-registry rows on these tables are never deleted.
REGISTRY_DELETABLE_REFERENCE_TABLES = frozenset({"Zoom Meetings"})

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
