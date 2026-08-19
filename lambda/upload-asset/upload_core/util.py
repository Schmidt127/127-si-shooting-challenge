from __future__ import annotations

import hashlib
import json
import mimetypes
import re
import urllib.error
import urllib.request
from urllib.parse import quote
from zoneinfo import ZoneInfo

DENVER = ZoneInfo("America/Denver")


def field_text(value: object) -> str:
    if isinstance(value, list) and value:
        return str(value[0]).strip()
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return str(value or "").strip()


def slug_token(value: object) -> str:
    text = field_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def select_name(value: object) -> str:
    if isinstance(value, dict) and value.get("name"):
        return str(value["name"]).strip()
    return str(value or "").strip()


def record_link_ids(value: object) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    ids: list[str] = []
    for item in value:
        if isinstance(item, str) and item.startswith("rec"):
            ids.append(item)
        elif isinstance(item, dict):
            record_id = str(item.get("id") or "").strip()
            if record_id.startswith("rec"):
                ids.append(record_id)
    return tuple(ids)


def first_link(fields: dict, key: str) -> str:
    ids = record_link_ids(fields.get(key))
    return ids[0] if ids else ""


def first_attachment(fields: dict) -> dict | None:
    val = fields.get("Airtable Attachment")
    if not isinstance(val, list) or not val:
        return None
    att = val[0]
    return att if isinstance(att, dict) and att.get("url") else None


def canonical_url(bucket: str, region: str, storage_key: str) -> str:
    encoded = "/".join(quote(part, safe="") for part in storage_key.split("/"))
    return f"https://{bucket}.s3.{region}.amazonaws.com/{encoded}"


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_hash_hex(value: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{64}", value or ""))


def guess_mime(filename: str, header_mime: str) -> str:
    if header_mime and header_mime != "application/octet-stream":
        return header_mime
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def athlete_slug_from_asset(fields: dict) -> str:
    for last_key, first_key in (
        ("Last Name", "First Name"),
        ("Athlete Last Name", "Athlete First Name"),
    ):
        last = slug_token(field_text(fields.get(last_key)))
        first = slug_token(field_text(fields.get(first_key)))
        if last and first:
            return f"{last}-{first}"
        if last:
            return last
    return ""


def http_get_bytes(url: str, *, timeout: int = 180) -> tuple[bytes, str]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        content_type = resp.headers.get("Content-Type") or "application/octet-stream"
        return resp.read(), content_type.split(";")[0].strip()


def http_json(
    method: str,
    url: str,
    *,
    token: str,
    body: dict | None = None,
    timeout: int = 120,
) -> tuple[int, dict | list]:
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {"error": raw}
        except json.JSONDecodeError:
            parsed = {"error": raw}
        return exc.code, parsed
