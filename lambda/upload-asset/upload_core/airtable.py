from __future__ import annotations

from urllib.parse import quote

from upload_core.config import TABLE
from upload_core.util import http_json


def api_url(base_id: str, path: str) -> str:
    return f"https://api.airtable.com/v0/{base_id}/{quote(path, safe='')}"


def get_asset(token: str, base_id: str, record_id: str) -> dict:
    url = f"{api_url(base_id, TABLE)}/{record_id}"
    status, data = http_json("GET", url, token=token)
    if status != 200 or not isinstance(data, dict):
        raise RuntimeError(f"GET asset {record_id} -> HTTP {status}: {data}")
    return data


def get_enrollment_slug(token: str, base_id: str, enrollment_id: str) -> str:
    from upload_core.util import field_text, slug_token

    url = f"{api_url(base_id, 'Enrollments')}/{enrollment_id}"
    params_url = url + "?" + "&".join(
        f"fields%5B{i}%5D={name.replace(' ', '%20')}"
        for i, name in enumerate(["Athlete Last Name", "Athlete First Name"])
    )
    status, data = http_json("GET", params_url, token=token, timeout=60)
    if status != 200 or not isinstance(data, dict):
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
