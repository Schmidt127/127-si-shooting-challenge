"""Storage Key format validation — dual-prefix grandfathering (FUT-009 / FUT-010).

Authority: docs/next-wave/aws-media/FUT-007-S3-NAMING-CONTRACT-BRIEF.md
Mirror: lib/s3-storage/storage-key-format.js
"""

from __future__ import annotations

import re

FUT009_LAYOUT_PREFIX = "shooting-challenge"

FUT007_BASENAME_RE = re.compile(
    r"^\d{8}_(HW|VIDEO|HEADSHOT)_[A-Za-z0-9]+_[A-Za-z0-9]+_[A-Za-z0-9]+(_\d+)?\.[a-z0-9]+$"
)

GEN_B_FILENAME_RE = re.compile(
    r"^\d{8}T\d{6}Z_[A-Za-z0-9]+_rec[a-zA-Z0-9]{14}_[\w.\-]+$"
)


def is_path_safe_storage_key(key: str) -> bool:
    text = str(key or "").strip()
    if not text or text.startswith(("/", "\\")) or "\\" in text:
        return False
    if ".." in text or "\x00" in text:
        return False
    parts = text.split("/")
    if len(parts) < 4:
        return False
    return all(part and part not in {".", ".."} for part in parts)


def storage_key_parts(key: str) -> list[str] | None:
    if not is_path_safe_storage_key(key):
        return None
    return str(key).strip().split("/")


def has_fut009_layout_prefix(key: str) -> bool:
    return str(key or "").strip().startswith(f"{FUT009_LAYOUT_PREFIX}/")


def extract_basename_from_key(key: str) -> str:
    parts = storage_key_parts(key)
    if not parts:
        return ""
    return parts[-1]


def classify_storage_key_generation(key: str) -> str:
    parts = storage_key_parts(key)
    if not parts:
        return "invalid"
    basename = parts[-1]
    if FUT007_BASENAME_RE.match(basename):
        return "fut007"
    if GEN_B_FILENAME_RE.match(basename):
        return "gen_b"
    if has_fut009_layout_prefix(key):
        return "gen_a"
    return "invalid"


def is_valid_storage_key_format(key: str) -> bool:
    parts = storage_key_parts(key)
    if not parts:
        return False

    if has_fut009_layout_prefix(key):
        return len(parts) >= 3

    date_folder = parts[-2]
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_folder):
        return False
    basename = parts[-1]
    return bool(FUT007_BASENAME_RE.match(basename) or GEN_B_FILENAME_RE.match(basename))


def strip_layout_prefix(key: str) -> str:
    text = str(key or "").strip()
    prefix = f"{FUT009_LAYOUT_PREFIX}/"
    if text.startswith(prefix):
        return text[len(prefix) :]
    return text


def prepend_layout_prefix(relative_key: str) -> str:
    trimmed = str(relative_key or "").strip().lstrip("/")
    if not trimmed:
        return f"{FUT009_LAYOUT_PREFIX}/upload.bin"
    prefix = f"{FUT009_LAYOUT_PREFIX}/"
    if trimmed.startswith(prefix):
        return trimmed
    return f"{prefix}{trimmed}"
