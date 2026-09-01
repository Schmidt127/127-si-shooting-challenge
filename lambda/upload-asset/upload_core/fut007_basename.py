"""FUT-007 AWS media basename helpers (pure functions).

Authority: docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md
Mirror: lib/aws-media-naming/index.ts
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

MediaCategory = Literal["HW", "VIDEO", "HEADSHOT"]

NAME_PART_MAX = 40
BASENAME_MAX = 180
DENVER = ZoneInfo("America/Denver")

# Default off until Mike enables via USE_FUT007_BASENAME=1 (see storage_key.py).
FUT007_BASENAME_ENABLED = False


def fut007_basename_enabled() -> bool:
    """Return True when FUT-007 basename builder is active (spec §8)."""
    import os

    env = (os.getenv("USE_FUT007_BASENAME") or "").strip().lower()
    if env in {"0", "false", "no", "off"}:
        return False
    if env in {"1", "true", "yes", "on"}:
        return True
    return FUT007_BASENAME_ENABLED


def truncate_part(value: str) -> str:
    """Spec §4.4 — max 40 runes per name part."""
    return value if len(value) <= NAME_PART_MAX else value[:NAME_PART_MAX]


def sanitize_name_part(value: object, fallback: str) -> str:
    """Spec §4.1–§4.2 — NFKD → ASCII, alphanumerics only."""
    raw = str(value or "").strip()
    if not raw:
        return truncate_part(fallback)

    normalized = unicodedata.normalize("NFKD", raw)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    collapsed = re.sub(r"[^A-Za-z0-9]+", "", ascii_text)
    cleaned = collapsed.replace("..", "")
    if not cleaned:
        return truncate_part(fallback)
    return truncate_part(cleaned)


def sanitize_extension(ext: object) -> str:
    """Spec §4.3 — lowercase extension; default `.bin`; max 12 chars."""
    raw = str(ext or "").strip().lower()
    match = re.search(r"(\.[a-z0-9]{1,11})$", raw)
    if match:
        return match.group(1)
    if raw and not raw.startswith("."):
        bare = re.sub(r"[^a-z0-9]", "", raw)[:11]
        if bare:
            return f".{bare}"
    return ".bin"


def extension_from_filename(filename: object) -> str:
    """Extract extension from a filename string."""
    raw = str(filename or "").replace("\\", "/")
    base = raw.split("/")[-1] if raw else ""
    dot = base.rfind(".")
    if dot <= 0:
        return sanitize_extension("")
    return sanitize_extension(base[dot:])


def format_denver_date(value: date | datetime) -> str:
    """Format calendar date as YYYYMMDD in America/Denver (spec §3.3)."""
    if isinstance(value, datetime):
        local = value.astimezone(DENVER)
        return local.strftime("%Y%m%d")
    return value.strftime("%Y%m%d")


def format_activity_date_stamp(activity_date: str | date | datetime) -> str:
    """Spec §2.2 segment 1 — YYYYMMDD from Activity Date."""
    if isinstance(activity_date, datetime):
        return format_denver_date(activity_date)
    if isinstance(activity_date, date):
        return activity_date.strftime("%Y%m%d")

    text = str(activity_date).strip()
    if re.fullmatch(r"\d{8}", text):
        return text
    iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})", text)
    if iso_match:
        return f"{iso_match.group(1)}{iso_match.group(2)}{iso_match.group(3)}"

    parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    return format_denver_date(parsed)


def format_activity_date_folder(activity_date: str | date | datetime) -> str:
    """Spec §3.1 — YYYY-MM-DD folder from Activity Date (America/Denver)."""
    stamp = format_activity_date_stamp(activity_date)
    return f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"


def resolve_media_category(
    *,
    upload_destination: object = None,
    asset_purpose: object = None,
) -> MediaCategory | None:
    """Spec §6 — map upload signals to category token."""
    dest = str(upload_destination or "").strip()
    if dest == "Homework Completions":
        return "HW"
    if dest == "Video Feedback":
        return "VIDEO"

    purpose = str(asset_purpose or "").strip()
    if purpose == "Registration Headshot":
        return "HEADSHOT"

    return None


def _strip_trailing_extension(value: str) -> str:
    dot = value.rfind(".")
    if dot <= 0:
        return value
    ext = value[dot:]
    if re.fullmatch(r"\.[A-Za-z0-9]{1,11}", ext):
        return value[:dot]
    return value


def resolve_custom_name_segment(
    *,
    category: MediaCategory,
    custom_video_file_name: object = None,
    video_feedback_focus: object = None,
    homework_assignment_name: object = None,
    asset_sequence: object = None,
    headshot_label: object = None,
) -> str:
    """Spec §7 — category-specific custom name segment."""

    def _sequence() -> int | None:
        if asset_sequence is None:
            return None
        try:
            seq = int(asset_sequence)
        except (TypeError, ValueError):
            return None
        return seq if seq > 0 else None

    if category == "VIDEO":
        custom = _strip_trailing_extension(str(custom_video_file_name or "").strip())
        if custom:
            return sanitize_name_part(custom, "VideoUpload")
        focus = str(video_feedback_focus or "").strip()
        if focus:
            focus_part = sanitize_name_part(focus, "Video")
            seq = _sequence()
            if seq is not None:
                return f"{focus_part}{seq}"
            return focus_part
        seq = _sequence()
        if seq is not None:
            return sanitize_name_part(f"Video{seq}", "VideoUpload")
        return "VideoUpload"

    if category == "HW":
        assignment = str(homework_assignment_name or "").strip()
        if assignment:
            return sanitize_name_part(assignment, "HomeworkUpload")
        seq = _sequence()
        if seq is not None:
            return sanitize_name_part(f"Hw{seq}", "HomeworkUpload")
        return "HomeworkUpload"

    if category == "HEADSHOT":
        label = str(headshot_label or "").strip()
        if label:
            return sanitize_name_part(label, "Profile")
        return "Profile"

    return "Upload"


def enforce_basename_max(stem: str) -> str:
    """Spec §4.4 — truncate full stem to 180 chars."""
    return stem if len(stem) <= BASENAME_MAX else stem[:BASENAME_MAX]


@dataclass(frozen=True)
class BuildBasenameInput:
    activity_date: str | date | datetime
    category: MediaCategory
    last_name: object = None
    first_name: object = None
    custom_name: object = None
    extension: object = None
    collision_index: int | None = None


def build_media_basename(input_data: BuildBasenameInput) -> str:
    """Spec §2 — build FUT-007 basename including extension."""
    date_stamp = format_activity_date_stamp(input_data.activity_date)
    category = input_data.category
    last = sanitize_name_part(input_data.last_name, "UnknownAthlete")
    first = sanitize_name_part(input_data.first_name, "UnknownAthlete")
    custom_fallback = resolve_custom_name_segment(category=category)
    custom = sanitize_name_part(input_data.custom_name, custom_fallback)
    ext = sanitize_extension(input_data.extension)

    stem = f"{date_stamp}_{category}_{last}_{first}_{custom}"
    if input_data.collision_index is not None and input_data.collision_index > 1:
        stem = f"{stem}_{input_data.collision_index}"

    stem = enforce_basename_max(stem)
    return f"{stem}{ext}"


def next_collision_index(candidate_basename: str, existing_basenames: list[str]) -> int:
    """Spec §5 — return next free collision index (1 = no suffix)."""
    normalized = {name.lower() for name in existing_basenames}
    if candidate_basename.lower() not in normalized:
        return 1

    ext_match = re.search(r"(\.[a-z0-9]+)$", candidate_basename, flags=re.IGNORECASE)
    ext = ext_match.group(1) if ext_match else ""
    stem = candidate_basename[: -len(ext)] if ext else candidate_basename

    for index in range(2, 1000):
        alt = f"{stem}_{index}{ext}"
        if alt.lower() not in normalized:
            return index
    return 1000


def apply_collision_suffix(basename: str, collision_index: int) -> str:
    """Spec §5 — append `_2`, `_3`, … before extension when index > 1."""
    if collision_index <= 1:
        return basename
    ext_match = re.search(r"(\.[a-z0-9]+)$", basename, flags=re.IGNORECASE)
    ext = ext_match.group(1) if ext_match else ""
    stem = basename[: -len(ext)] if ext else basename
    return f"{stem}_{collision_index}{ext}"


def build_storage_key_with_fut007_basename(
    *,
    athlete_folder: str,
    program_instance_folder: str,
    activity_date_folder: str,
    basename: str,
) -> str:
    """Spec §3.1 — folder prefix + FUT-007 basename (path-safe)."""
    from upload_core.storage_key import path_token

    person = path_token(athlete_folder, fallback="Unknown_Athlete")
    program = path_token(program_instance_folder, fallback="Unknown_Program_Instance")
    date_folder = str(activity_date_folder).strip()
    base = str(basename).replace("\\", "/").split("/")[-1] or "upload.bin"
    return f"{person}/{program}/{date_folder}/{base}"


@dataclass(frozen=True)
class Fut007NamingInput:
    """Inputs for FUT-007 storage key build (Phase 3)."""

    activity_date: str | date | datetime
    category: MediaCategory
    last_name: object = None
    first_name: object = None
    custom_name: object = None
    extension: object = None
    existing_basenames: tuple[str, ...] = ()


def build_fut007_basename(input_data: Fut007NamingInput) -> str:
    """Build basename with optional collision suffix."""
    candidate = build_media_basename(
        BuildBasenameInput(
            activity_date=input_data.activity_date,
            category=input_data.category,
            last_name=input_data.last_name,
            first_name=input_data.first_name,
            custom_name=input_data.custom_name,
            extension=input_data.extension,
        )
    )
    collision_index = next_collision_index(candidate, list(input_data.existing_basenames))
    return apply_collision_suffix(candidate, collision_index)


def build_fut007_storage_key(
    *,
    athlete_folder: str,
    program_instance_folder: str,
    naming: Fut007NamingInput,
) -> str:
    """Compose full Storage Key with FUT-007 basename segment."""
    basename = build_fut007_basename(naming)
    activity_date_folder = format_activity_date_folder(naming.activity_date)
    return build_storage_key_with_fut007_basename(
        athlete_folder=athlete_folder,
        program_instance_folder=program_instance_folder,
        activity_date_folder=activity_date_folder,
        basename=basename,
    )


# FUT-009 Option D layout prefix (Mike decision 2026-09-01).
FUT009_LAYOUT_PREFIX = "shooting-challenge"


def prepend_fut009_layout_prefix(relative_key: str) -> str:
    """Prepend Option D layout prefix when absent."""
    trimmed = str(relative_key or "").strip().lstrip("/")
    if not trimmed:
        return f"{FUT009_LAYOUT_PREFIX}/upload.bin"
    prefix = f"{FUT009_LAYOUT_PREFIX}/"
    if trimmed.startswith(prefix):
        return trimmed
    return f"{prefix}{trimmed}"


@dataclass(frozen=True)
class Fut009DestinationInput:
    """Inputs for FUT-009 post-feedback rename destination key."""

    athlete_folder: str
    program_instance_folder: str
    activity_date: str | date | datetime
    last_name: object = None
    first_name: object = None
    custom_video_file_name: str = ""
    extension: str = ".bin"
    existing_basenames: tuple[str, ...] = ()


def build_fut009_destination_key(input_data: Fut009DestinationInput) -> str:
    """Build full Option D + FUT-007 destination Storage Key for FUT-009 rename."""
    custom_segment = resolve_custom_name_segment(
        category="VIDEO",
        custom_video_file_name=input_data.custom_video_file_name,
    )
    naming = Fut007NamingInput(
        activity_date=input_data.activity_date,
        category="VIDEO",
        last_name=input_data.last_name,
        first_name=input_data.first_name,
        custom_name=custom_segment,
        extension=input_data.extension,
        existing_basenames=input_data.existing_basenames,
    )
    relative = build_fut007_storage_key(
        athlete_folder=input_data.athlete_folder,
        program_instance_folder=input_data.program_instance_folder,
        naming=naming,
    )
    return prepend_fut009_layout_prefix(relative)
