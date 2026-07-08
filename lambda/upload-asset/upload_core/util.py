from __future__ import annotations

import hashlib
import json
import mimetypes
import re
import urllib.error
import urllib.request
from pathlib import Path
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


def first_link(fields: dict, key: str) -> str:
    val = fields.get(key)
    if isinstance(val, list) and val and isinstance(val[0], str):
        return val[0]
    return ""


def first_attachment(fields: dict) -> dict | None:
    val = fields.get("Airtable Attachment")
    if not isinstance(val, list) or not val:
        return None
    att = val[0]
    return att if isinstance(att, dict) and att.get("url") else None


def asset_type_token(fields: dict) -> str:
    for key in ("Upload Destination", "Asset Type", "Asset Purpose"):
        raw = select_name(fields.get(key))
        if not raw:
            continue
        low = raw.lower()
        if "video" in low:
            return "video-feedback"
        if "homework" in low:
            return "homework"
    return "asset"


def safe_filename(name: str) -> str:
    base = Path(name).name or "upload.bin"
    base = re.sub(r"[^\w.\-]+", "-", base)
    base = re.sub(r"-+", "-", base).strip("-")
    return base or "upload.bin"


def build_storage_key(
    *,
    record_id: str,
    fields: dict,
    athlete_slug: str,
    season_slug: str,
    challenge_slug: str,
    date_str: str,
    filename: str,
) -> str:
    asset_type = asset_type_token(fields)
    safe_name = safe_filename(filename)
    file_segment = f"{date_str}-{asset_type}-{record_id}-{safe_name}"
    return f"shooting-challenge/{season_slug}/{challenge_slug}/{athlete_slug}/{file_segment}"


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
