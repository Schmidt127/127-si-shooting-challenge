"""S3 object-key builder for Submission Asset uploads.

Canonical key:

{LastName}_{FirstName}/{ProgramInstance}/{YYYY-MM-DD}/{UTC}_{SlotOrType}_{RecordId}_{OriginalFileName}

Example:

Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg
"""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from upload_core.fields import FIELD_ORIGINAL_FILE_NAME, FIELD_STORAGE_KEY
from upload_core.util import field_text, select_name

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


def is_reusable_storage_key(key: object, record_id: str) -> bool:
    text = str(key or "").strip()
    record_id = str(record_id or "").strip()
    if not text or not record_id:
        return False
    if text.startswith("/") or text.startswith("\\") or "\\" in text or ".." in text or "\x00" in text:
        return False
    if record_id not in text:
        return False
    parts = text.split("/")
    if len(parts) < 2 or any(part in {"", ".", ".."} for part in parts):
        return False
    return True


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
) -> tuple[str, bool]:
    existing = str(fields.get(FIELD_STORAGE_KEY) or "").strip()
    if is_reusable_storage_key(existing, record_id):
        return existing, True

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
