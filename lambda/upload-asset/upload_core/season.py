"""Resolve upload season from Enrollment → Program Instance → School Year - Linked.

Authoritative production schema (base appn84sqPw03zEbTT, verified 2026-08-17):

- Submission Assets.`Enrollment - Linked` → Enrollments (`tbl3PFmwbRoabu1YV`, name Enrollments)
- Enrollments.`Program Instance` → Program Instance - Sync (`tblMfALZa4YYUy70P`)
- Program Instance - Sync.`School Year - Linked` (singleLineText) is the school-year slug
- Enrollments.`School Year` (singleSelect) is a consistency check only
- Program Instance - Sync.`Season` is Fall/Spring/etc — never used as the S3 season slug

Table ids (not display names) are used for Enrollments / Program Instance GETs so
DEV/PROD stay aligned when names differ (DEV PI table is \"Program Instance - Synced\").
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Callable

from upload_core.config import UploadConfig
from upload_core.storage_key import folder_person_name, folder_program_instance
from upload_core.util import field_text, record_link_ids, select_name, slug_token

logger = logging.getLogger(__name__)

TABLE_ENROLLMENTS = "tbl3PFmwbRoabu1YV"
TABLE_ENROLLMENTS_NAME = "Enrollments"
TABLE_PROGRAM_INSTANCE = "tblMfALZa4YYUy70P"
TABLE_PROGRAM_INSTANCE_NAME = "Program Instance - Sync"

FIELD_ASSET_ENROLLMENT = "Enrollment - Linked"
FIELD_ENROLLMENT_PROGRAM_INSTANCE = "Program Instance"
FIELD_ENROLLMENT_SCHOOL_YEAR = "School Year"
FIELD_ENROLLMENT_LAST_NAME = "Athlete Last Name"
FIELD_ENROLLMENT_FIRST_NAME = "Athlete First Name"
FIELD_PI_SCHOOL_YEAR = "School Year - Linked"
FIELD_PI_NAME = "Name - Program Instance"

SEASON_SLUG_RE = re.compile(r"^(20\d{2})-(20\d{2})$")

ENROLLMENT_READ_FIELDS = (
    FIELD_ENROLLMENT_PROGRAM_INSTANCE,
    FIELD_ENROLLMENT_SCHOOL_YEAR,
    FIELD_ENROLLMENT_LAST_NAME,
    FIELD_ENROLLMENT_FIRST_NAME,
)
PROGRAM_INSTANCE_READ_FIELDS = (
    FIELD_PI_SCHOOL_YEAR,
    FIELD_PI_NAME,
)


class SeasonResolutionError(Exception):
    def __init__(self, message: str, *, action_out: str):
        super().__init__(message)
        self.message = message
        self.action_out = action_out


@dataclass(frozen=True)
class SeasonResolution:
    season_slug: str
    enrollment_id: str
    program_instance_id: str
    program_instance_name: str
    source: str
    fallback_used: bool
    athlete_slug: str = ""
    athlete_last: str = ""
    athlete_first: str = ""
    athlete_folder: str = ""
    program_instance_folder: str = ""


def normalize_season_slug(raw: object) -> str:
    text = select_name(raw) or field_text(raw)
    text = (
        text.replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
        .replace("/", "-")
    )
    text = re.sub(r"\s+", "", text)
    match = SEASON_SLUG_RE.fullmatch(text)
    if not match:
        return ""
    start = int(match.group(1))
    end = int(match.group(2))
    if end != start + 1:
        return ""
    return f"{start}-{end}"


def _require_exactly_one_id(ids: tuple[str, ...], *, missing: str, ambiguous: str, label: str) -> str:
    unique = tuple(dict.fromkeys(ids))
    if not unique:
        raise SeasonResolutionError(
            f"{label} is missing.",
            action_out=missing,
        )
    if len(unique) != 1:
        raise SeasonResolutionError(
            f"{label} is ambiguous; expected exactly one record, found {len(unique)}.",
            action_out=ambiguous,
        )
    return unique[0]


def _payload_id(payload: dict, *keys: str) -> str:
    for key in keys:
        value = str(payload.get(key) or "").strip()
        if value:
            return value
    return ""


def _payload_season(payload: dict) -> str:
    raw = payload.get("seasonSlug") or payload.get("schoolYear") or ""
    return normalize_season_slug(raw)


def _athlete_identity(fields: dict) -> tuple[str, str, str, str]:
    last = field_text(fields.get(FIELD_ENROLLMENT_LAST_NAME))
    first = field_text(fields.get(FIELD_ENROLLMENT_FIRST_NAME))
    folder = folder_person_name(last, first)
    last_slug = slug_token(last)
    first_slug = slug_token(first)
    athlete_slug = f"{last_slug}-{first_slug}" if last_slug and first_slug else last_slug
    return last, first, folder, athlete_slug


def _record_fields(record: dict | None) -> dict:
    if not isinstance(record, dict):
        return {}
    fields = record.get("fields")
    return fields if isinstance(fields, dict) else {}


def resolve_upload_season(
    *,
    asset_fields: dict,
    payload: dict,
    config: UploadConfig,
    get_enrollment: Callable[[str], dict],
    get_program_instance: Callable[[str], dict],
) -> SeasonResolution:
    """Resolve S3 season from Airtable. Never infers from filename or current date."""
    enrollment_ids = record_link_ids(asset_fields.get(FIELD_ASSET_ENROLLMENT))
    enrollment_id = _require_exactly_one_id(
        enrollment_ids,
        missing="error_missing_enrollment",
        ambiguous="error_ambiguous_enrollment",
        label="Enrollment - Linked",
    )

    payload_enrollment_id = _payload_id(payload, "enrollmentId", "enrollmentRecordId")
    if payload_enrollment_id and payload_enrollment_id != enrollment_id:
        raise SeasonResolutionError(
            "Payload enrollmentId does not match Submission Asset Enrollment - Linked.",
            action_out="error_enrollment_mismatch",
        )

    enrollment = get_enrollment(enrollment_id)
    enrollment_fields = _record_fields(enrollment)
    program_instance_ids = record_link_ids(
        enrollment_fields.get(FIELD_ENROLLMENT_PROGRAM_INSTANCE)
    )
    program_instance_id = _require_exactly_one_id(
        program_instance_ids,
        missing="error_missing_program_instance",
        ambiguous="error_ambiguous_program_instance",
        label="Enrollment Program Instance",
    )

    payload_program_instance_id = _payload_id(
        payload, "programInstanceId", "programInstanceRecordId"
    )
    if payload_program_instance_id and payload_program_instance_id != program_instance_id:
        raise SeasonResolutionError(
            "Payload programInstanceId does not match Enrollment Program Instance.",
            action_out="error_program_instance_mismatch",
        )

    program_instance = get_program_instance(program_instance_id)
    pi_fields = _record_fields(program_instance)
    pi_year = normalize_season_slug(pi_fields.get(FIELD_PI_SCHOOL_YEAR))
    enrollment_year = normalize_season_slug(enrollment_fields.get(FIELD_ENROLLMENT_SCHOOL_YEAR))
    payload_year = _payload_season(payload)
    pi_name = field_text(pi_fields.get(FIELD_PI_NAME))
    athlete_last, athlete_first, athlete_folder, athlete_slug = _athlete_identity(
        enrollment_fields
    )
    if athlete_folder == "Unknown_Athlete":
        raise SeasonResolutionError(
            "Enrollment Athlete Last Name and Athlete First Name are missing.",
            action_out="error_missing_athlete_name",
        )
    program_instance_folder = folder_program_instance(pi_name, pi_year)

    if pi_year and enrollment_year and pi_year != enrollment_year:
        raise SeasonResolutionError(
            "Enrollment School Year does not match Program Instance School Year - Linked "
            f"({enrollment_year} vs {pi_year}).",
            action_out="error_cross_season_mismatch",
        )
    if payload_year and pi_year and payload_year != pi_year:
        raise SeasonResolutionError(
            "Payload seasonSlug does not match Program Instance School Year - Linked "
            f"({payload_year} vs {pi_year}).",
            action_out="error_cross_season_mismatch",
        )
    if payload_year and not pi_year and enrollment_year and payload_year != enrollment_year:
        raise SeasonResolutionError(
            "Payload seasonSlug does not match Enrollment School Year "
            f"({payload_year} vs {enrollment_year}).",
            action_out="error_cross_season_mismatch",
        )

    if pi_year:
        if payload_year and payload_year != pi_year:
            raise SeasonResolutionError(
                "Payload seasonSlug does not match Program Instance School Year - Linked.",
                action_out="error_cross_season_mismatch",
            )
        return SeasonResolution(
            season_slug=pi_year,
            enrollment_id=enrollment_id,
            program_instance_id=program_instance_id,
            program_instance_name=pi_name,
            source="program_instance",
            fallback_used=False,
            athlete_slug=athlete_slug,
            athlete_last=athlete_last,
            athlete_first=athlete_first,
            athlete_folder=athlete_folder,
            program_instance_folder=program_instance_folder
            or folder_program_instance(pi_name, pi_year),
        )

    return _maybe_fallback(
        config=config,
        enrollment_id=enrollment_id,
        program_instance_id=program_instance_id,
        program_instance_name=pi_name,
        athlete_slug=athlete_slug,
        athlete_last=athlete_last,
        athlete_first=athlete_first,
        athlete_folder=athlete_folder,
        program_instance_folder=program_instance_folder,
        reason="Program Instance School Year - Linked is missing or invalid.",
    )


def _maybe_fallback(
    *,
    config: UploadConfig,
    enrollment_id: str,
    program_instance_id: str,
    program_instance_name: str,
    athlete_slug: str,
    athlete_last: str,
    athlete_first: str,
    athlete_folder: str,
    program_instance_folder: str,
    reason: str,
) -> SeasonResolution:
    fallback = normalize_season_slug(config.season_slug)
    prod = (config.environment or "").strip().upper() == "PROD"
    if prod or not config.allow_season_slug_fallback or not fallback:
        raise SeasonResolutionError(
            reason + " Fail closed: uploads require Program Instance School Year - Linked.",
            action_out="error_missing_season",
        )

    logger.warning(
        json.dumps(
            {
                "event": "season_fallback_used",
                "environment": config.environment,
                "seasonSlug": fallback,
                "enrollmentId": enrollment_id,
                "programInstanceId": program_instance_id,
            }
        )
    )
    return SeasonResolution(
        season_slug=fallback,
        enrollment_id=enrollment_id,
        program_instance_id=program_instance_id,
        program_instance_name=program_instance_name,
        source="env_fallback",
        fallback_used=True,
        athlete_slug=athlete_slug,
        athlete_last=athlete_last,
        athlete_first=athlete_first,
        athlete_folder=athlete_folder,
        program_instance_folder=program_instance_folder
        or folder_program_instance(program_instance_name, fallback),
    )
