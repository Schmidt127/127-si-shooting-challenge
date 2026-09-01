"""S3 object-key builder for Submission Asset uploads.

Legacy canonical key (default):

{LastName}_{FirstName}/{ProgramInstance}/{YYYY-MM-DD}/{UTC}_{SlotOrType}_{RecordId}_{OriginalFileName}

FUT-007 basename (opt-in via USE_FUT007_BASENAME=1 / FUT007_BASENAME_ENABLED):

{LastName}_{FirstName}/{ProgramInstance}/{ActivityDateFolder}/{YYYYMMDD}_{HW|VIDEO|HEADSHOT}_{Last}_{First}_{Custom}.{ext}

Authority: docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from upload_core.fields import FIELD_ORIGINAL_FILE_NAME, FIELD_STORAGE_KEY
from upload_core.fut007_basename import (
    Fut007NamingInput,
    build_fut007_storage_key,
    extension_from_filename,
    fut007_basename_enabled,
    resolve_custom_name_segment,
    resolve_media_category,
)
from upload_core.util import field_text, select_name

# Phase 3 prep — default off; Production unchanged until Mike enables (spec §8).
FUT007_BASENAME_ENABLED = False

ACTIVITY_DATE_FIELDS = (
    "Activity Date",
    "Activity Date (from Submissions)",
    "Activity Date (from Submission)",
)
CUSTOM_VIDEO_FILE_NAME_FIELDS = (
    "Custom Video File Name",
    "Custom Video File Name (from Video Feedback)",
)
VIDEO_FEEDBACK_FOCUS_FIELDS = (
    "Video Feedback Focus",
    "Video Feedback Focus (from Submissions)",
    "Video Feedback Focus (from Submission)",
)
HOMEWORK_ASSIGNMENT_NAME_FIELDS = (
    "Assignment Name",
    "Public Assignment Name",
    "Assignment Name (from Homework Completions)",
    "Program Homework Assignment Name",
)
ASSET_SEQUENCE_FIELD = "Asset Sequence"

CREATED_FIELD_CANDIDATES = ("Created Time", "Created")
SLOT_FIELD = "Asset Slot"
TYPE_FIELDS = ("Asset Type", "Upload Destination", "Asset Purpose")


def ascii_safe(value: object) -> str:
    text = field_text(value)
    normalized = unicodedata.normalize("NFKD", text)
    return normalized.encode("ascii", "ignore").decode("ascii")


def path_token(value: object, *, fallback: str = "Unknown") -> str:
    """S3-safe single path segment. No slashes, no traversal, no empty segment."""
    text = ascii_safe(value)
    text = text.replace("\\", " ").replace("/", " ").replace("|", " ")
    text = re.sub(r"[^\w.\-]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("._")
    if not text or text in {".", ".."}:
        return fallback
    return text


def folder_person_name(last: object, first: object) -> str:
    last_token = path_token(last, fallback="")
    first_token = path_token(first, fallback="")
    if last_token and first_token:
        return f"{last_token}_{first_token}"
    return last_token or first_token or "Unknown_Athlete"


def folder_program_instance(name: object, season_slug: str = "") -> str:
    token = path_token(name, fallback="")
    if token:
        return token
    if season_slug:
        return path_token(f"Shooting Challenge {season_slug}", fallback="Shooting_Challenge")
    return "Unknown_Program_Instance"


def safe_filename(name: object) -> str:
    raw = str(name or "").replace("\\", "/")
    base = Path(raw).name
    if base in {"", ".", ".."}:
        return "upload.bin"
    suffix = Path(base).suffix
    stem = Path(base).stem
    stem_token = path_token(stem, fallback="upload")
    ext = re.sub(r"[^A-Za-z0-9.]", "", suffix)[:12]
    if ext and not ext.startswith("."):
        ext = f".{ext}"
    if ext.count(".") > 1:
        ext = "." + ext.rsplit(".", 1)[-1]
    return f"{stem_token}{ext}" or "upload.bin"


def parse_airtable_datetime(value: object) -> datetime | None:
    text = field_text(value)
    if not text:
        return None
    text = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def asset_created_utc(fields: dict, *, now: datetime | None = None) -> datetime:
    for key in CREATED_FIELD_CANDIDATES:
        parsed = parse_airtable_datetime(fields.get(key))
        if parsed is not None:
            return parsed
    stamp = now or datetime.now(timezone.utc)
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(timezone.utc)


def asset_slot_or_type(fields: dict) -> str:
    slot = select_name(fields.get(SLOT_FIELD)) or field_text(fields.get(SLOT_FIELD))
    if slot:
        return path_token(slot, fallback="Asset")
    for key in TYPE_FIELDS:
        raw = select_name(fields.get(key)) or field_text(fields.get(key))
        if raw:
            return path_token(raw, fallback="Asset")
    return "Asset"


def format_utc_stamp(created_at: datetime) -> tuple[str, str]:
    utc = created_at.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%d"), utc.strftime("%Y%m%dT%H%M%SZ")


FUT007_BASENAME_FILENAME_RE = re.compile(
    r"^\d{8}_(HW|VIDEO|HEADSHOT)_[A-Za-z0-9]+_[A-Za-z0-9]+_[A-Za-z0-9]+(_\d+)?\.[a-z0-9]+$"
)


def _path_safe_storage_key_parts(key: str) -> list[str] | None:
    if key.startswith("/") or key.startswith("\\") or "\\" in key or ".." in key or "\x00" in key:
        return None
    parts = key.split("/")
    if len(parts) < 2 or any(part in {"", ".", ".."} for part in parts):
        return None
    return parts


def is_reusable_storage_key(key: object, record_id: str) -> bool:
    text = str(key or "").strip()
    record_id = str(record_id or "").strip()
    if not text or not record_id:
        return False
    parts = _path_safe_storage_key_parts(text)
    if parts is None:
        return False
    if record_id in text:
        return True
    # FUT-007 basenames omit record id; reuse persisted key on retry (spec §5).
    return bool(FUT007_BASENAME_FILENAME_RE.match(parts[-1]))


def _first_field_text(fields: dict, keys: tuple[str, ...]) -> str:
    for key in keys:
        text = field_text(fields.get(key))
        if text:
            return text
    return ""


def _field_number(fields: dict, key: str) -> int | None:
    raw = fields.get(key)
    if raw is None or raw == "":
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def extract_fut007_naming_input(
    fields: dict,
    *,
    last_name: object = None,
    first_name: object = None,
    activity_date: object = None,
    existing_basenames: list[str] | None = None,
) -> Fut007NamingInput:
    """Build FUT-007 naming input from Submission Asset fields (spec §6–§7)."""
    category = resolve_media_category(
        upload_destination=select_name(fields.get("Upload Destination"))
        or field_text(fields.get("Upload Destination")),
        asset_purpose=select_name(fields.get("Asset Purpose"))
        or field_text(fields.get("Asset Purpose")),
    )
    if category is None:
        raise ValueError("FUT-007 category could not be resolved from upload signals.")

    activity = activity_date or _first_field_text(fields, ACTIVITY_DATE_FIELDS)
    if not activity:
        raise ValueError("FUT-007 requires Activity Date on linked Submission.")

    custom = resolve_custom_name_segment(
        category=category,
        custom_video_file_name=_first_field_text(fields, CUSTOM_VIDEO_FILE_NAME_FIELDS),
        video_feedback_focus=_first_field_text(fields, VIDEO_FEEDBACK_FOCUS_FIELDS),
        homework_assignment_name=_first_field_text(fields, HOMEWORK_ASSIGNMENT_NAME_FIELDS),
        asset_sequence=_field_number(fields, ASSET_SEQUENCE_FIELD),
    )

    original_name = str(fields.get(FIELD_ORIGINAL_FILE_NAME) or "").strip()
    attachment = fields.get("Airtable Attachment")
    if not original_name and isinstance(attachment, list) and attachment and isinstance(attachment[0], dict):
        original_name = str(attachment[0].get("filename") or "").strip()
    original_name = original_name or "upload.bin"

    return Fut007NamingInput(
        activity_date=activity,
        category=category,
        last_name=last_name,
        first_name=first_name,
        custom_name=custom,
        extension=extension_from_filename(original_name),
        existing_basenames=tuple(existing_basenames or ()),
    )


def build_storage_key_fut007(
    *,
    athlete_folder: str,
    program_instance_folder: str,
    naming: Fut007NamingInput,
) -> str:
    """Build Storage Key using FUT-007 basename grammar."""
    return build_fut007_storage_key(
        athlete_folder=athlete_folder,
        program_instance_folder=program_instance_folder,
        naming=naming,
    )


def build_storage_key(
    *,
    record_id: str,
    athlete_folder: str,
    program_instance_folder: str,
    created_at: datetime,
    slot_token: str,
    filename: str,
) -> str:
    date_folder, utc_stamp = format_utc_stamp(created_at)
    person = path_token(athlete_folder, fallback="Unknown_Athlete")
    program = path_token(program_instance_folder, fallback="Unknown_Program_Instance")
    slot = path_token(slot_token, fallback="Asset")
    safe_name = safe_filename(filename)
    record_id = str(record_id or "").strip() or "recUnknown"
    file_segment = f"{utc_stamp}_{slot}_{record_id}_{safe_name}"
    return f"{person}/{program}/{date_folder}/{file_segment}"


def resolve_storage_key(
    *,
    record_id: str,
    fields: dict,
    athlete_folder: str,
    program_instance_folder: str,
    now: datetime | None = None,
    last_name: object = None,
    first_name: object = None,
    activity_date: object = None,
    existing_basenames: list[str] | None = None,
    fut007_enabled: bool | None = None,
) -> tuple[str, bool]:
    existing = str(fields.get(FIELD_STORAGE_KEY) or "").strip()
    if is_reusable_storage_key(existing, record_id):
        return existing, True

    use_fut007 = fut007_basename_enabled() if fut007_enabled is None else fut007_enabled
    if use_fut007:
        naming = extract_fut007_naming_input(
            fields,
            last_name=last_name,
            first_name=first_name,
            activity_date=activity_date,
            existing_basenames=existing_basenames,
        )
        key = build_storage_key_fut007(
            athlete_folder=athlete_folder,
            program_instance_folder=program_instance_folder,
            naming=naming,
        )
        return key, False

    original_name = str(fields.get(FIELD_ORIGINAL_FILE_NAME) or "").strip()
    attachment = fields.get("Airtable Attachment")
    if not original_name and isinstance(attachment, list) and attachment and isinstance(attachment[0], dict):
        original_name = str(attachment[0].get("filename") or "").strip()
    original_name = original_name or "upload.bin"

    key = build_storage_key(
        record_id=record_id,
        athlete_folder=athlete_folder,
        program_instance_folder=program_instance_folder,
        created_at=asset_created_utc(fields, now=now),
        slot_token=asset_slot_or_type(fields),
        filename=original_name,
    )
    return key, False
