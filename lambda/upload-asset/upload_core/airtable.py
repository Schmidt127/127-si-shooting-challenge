from __future__ import annotations

from urllib.parse import quote

from upload_core.config import TABLE
from upload_core.util import http_json


def api_url(base_id: str, path: str) -> str:
    return f"https://api.airtable.com/v0/{base_id}/{quote(path, safe='')}"


def get_record(
    token: str,
    base_id: str,
    table: str,
    record_id: str,
    field_names: tuple[str, ...] | list[str] | None = None,
) -> dict:
    """GET one Airtable record by table id/name + record id.

    Do not append ``fields[]`` / ``fields[i]`` query params. On this Airtable API
    surface, single-record GET with a fields filter returns HTTP 422
    ``INVALID_REQUEST_UNKNOWN`` even when the table id and field names are valid.
    Callers that only need a subset should read from the full ``fields`` object.

    ``field_names`` is accepted for backward compatibility and ignored.
    """
    del field_names  # intentionally unused — see docstring
    url = f"{api_url(base_id, table)}/{record_id}"
    status, data = http_json("GET", url, token=token, timeout=60)
    if status != 200 or not isinstance(data, dict):
        raise RuntimeError(f"GET {table} {record_id} -> HTTP {status}: {data}")
    return data


def get_asset(token: str, base_id: str, record_id: str) -> dict:
    url = f"{api_url(base_id, TABLE)}/{record_id}"
    status, data = http_json("GET", url, token=token)
    if status != 200 or not isinstance(data, dict):
        raise RuntimeError(f"GET asset {record_id} -> HTTP {status}: {data}")
    return data


def get_enrollment(token: str, base_id: str, enrollment_id: str) -> dict:
    from upload_core.season import TABLE_ENROLLMENTS

    # Live Production Enrollments table id (verified 2026-08-17). Name also works;
    # id is preferred so Production stay aligned when display names drift.
    return get_record(token, base_id, TABLE_ENROLLMENTS, enrollment_id)


def get_program_instance(token: str, base_id: str, program_instance_id: str) -> dict:
    from upload_core.season import TABLE_PROGRAM_INSTANCE

    # Live PROD table name is "Program Instance - Sync"; Production uses
    # "Program Instance - Synced". Shared table id is the stable identifier.
    return get_record(token, base_id, TABLE_PROGRAM_INSTANCE, program_instance_id)


def get_enrollment_slug(token: str, base_id: str, enrollment_id: str) -> str:
    from upload_core.util import field_text, slug_token

    try:
        data = get_enrollment(token, base_id, enrollment_id)
    except Exception:
        return "unknown-athlete"
    fields = data.get("fields", {})
    last = slug_token(field_text(fields.get("Athlete Last Name", "")))
    first = slug_token(field_text(fields.get("Athlete First Name", "")))
    if last and first:
        return f"{last}-{first}"
    if last:
        return last
    return "unknown-athlete"


def patch_asset(token: str, base_id: str, record_id: str, fields: dict) -> dict:
    url = f"{api_url(base_id, TABLE)}/{record_id}"
    status, data = http_json(
        "PATCH",
        url,
        token=token,
        body={"fields": fields, "typecast": True},
    )
    if status != 200 or not isinstance(data, dict):
        raise RuntimeError(f"PATCH asset -> HTTP {status}: {data}")
    return data
