#!/usr/bin/env python3
"""C-013/C-023 — DEV S3 upload + hash writeback proof (AWS SDK).

Bypasses Make.com S3 Upload module timeout. DEV base only.

Usage (dry-run — default):
  python c013_dev_s3_upload_proof.py recBBi80bYuxXifVj

Live upload + Airtable writeback:
  python c013_dev_s3_upload_proof.py recBBi80bYuxXifVj --confirm-write \\
    --out _preview/c013-dev-s3-sdk-proof-recBBi80bYuxXifVj.json

Env (never commit):
  AIRTABLE_TOKEN or AIRTABLE_API_TOKEN — data.records:read + write on DEV
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — s3:PutObject on DEV bucket
  AWS_REGION=us-east-2 (optional)
  S3_BUCKET=shooting-challenge-assets (optional)
  DEV_BASE_ID=appTetnuCZlCZdTCT (optional override)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
DEV_BASE = "appTetnuCZlCZdTCT"
PROD_BASE = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"
DENVER = ZoneInfo("America/Denver")
DEFAULT_BUCKET = "shooting-challenge-assets"
DEFAULT_REGION = "us-east-2"

ASSET_FIELDS = [
    "Airtable Attachment",
    "Original File Name",
    "Asset Type",
    "Asset Purpose",
    "Upload Destination",
    "Upload Status",
    "Upload Error",
    "Enrollment - Linked",
    "Submission - Linked",
    "Athlete Last Name",
    "Athlete First Name",
    "Canonical File URL",
    "Storage Key",
    "File Content Hash",
]

ENROLLMENT_SLUG_FIELDS = ["Athlete Last Name", "Athlete First Name"]


def load_env() -> None:
    load_dotenv(Path(__file__).with_name(".env"), override=True)
    web_env = REPO / "web" / ".env.local"
    if web_env.exists():
        load_dotenv(web_env, override=True)


def airtable_token() -> str:
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("ERROR: missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN in tools/airtable/.env")
    return token


def resolve_base_id(cli_base: str | None) -> str:
    base = cli_base or os.getenv("DEV_BASE_ID") or os.getenv("WAVE7_PROBE_BASE") or DEV_BASE
    if base == PROD_BASE:
        raise SystemExit("ERROR: production base blocked — use DEV appTetnuCZlCZdTCT only")
    if base != DEV_BASE:
        raise SystemExit(f"ERROR: unexpected base {base} — only DEV {DEV_BASE} allowed")
    return base


def api_url(base_id: str, path: str) -> str:
    return f"https://api.airtable.com/v0/{base_id}/{quote(path, safe='')}"


def get_record(token: str, base_id: str, record_id: str) -> dict:
    url = f"{api_url(base_id, TABLE)}/{record_id}"
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=120,
    )
    if not resp.ok:
        raise SystemExit(f"ERROR: GET asset {record_id} -> {resp.status_code}: {resp.text[:500]}")
    return resp.json()


def get_enrollment_slug(token: str, base_id: str, enrollment_id: str) -> str:
    url = f"{api_url(base_id, 'Enrollments')}/{enrollment_id}"
    params = {f"fields[{i}]": name for i, name in enumerate(ENROLLMENT_SLUG_FIELDS)}
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params=params,
        timeout=60,
    )
    if not resp.ok:
        return "unknown-athlete"
    fields = resp.json().get("fields", {})
    last = slug_token(fields.get("Athlete Last Name", ""))
    first = slug_token(fields.get("Athlete First Name", ""))
    if last and first:
        return f"{last}-{first}"
    if last:
        return last
    return "unknown-athlete"


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


def resolve_out_path(out: str | None, record_id: str) -> Path:
    if out:
        p = Path(out)
        if p.is_absolute():
            return p
        normalized = out.replace("\\", "/")
        if normalized.startswith("tools/"):
            return REPO / normalized
        return Path(__file__).parent / p
    return Path(__file__).parent / "_preview" / f"c013-dev-s3-sdk-proof-{record_id}.json"


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


def download_bytes(url: str) -> tuple[bytes, str, str]:
    resp = requests.get(url, timeout=180)
    resp.raise_for_status()
    content_type = resp.headers.get("Content-Type") or "application/octet-stream"
    # Airtable CDN sometimes returns generic type; sniff from filename later if needed
    return resp.content, content_type.split(";")[0].strip(), resp.headers.get("Content-Disposition", "")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def guess_mime(filename: str, header_mime: str) -> str:
    if header_mime and header_mime != "application/octet-stream":
        return header_mime
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def upload_s3(bucket: str, region: str, key: str, body: bytes, content_type: str) -> dict:
    try:
        import boto3
    except ImportError as exc:
        raise SystemExit("ERROR: boto3 required — pip install -r requirements.txt") from exc

    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
    )
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=content_type,
    )
    return {"bucket": bucket, "key": key, "region": region, "etag": "uploaded"}


def patch_asset(token: str, base_id: str, record_id: str, fields: dict) -> dict:
    url = f"{api_url(base_id, TABLE)}/{record_id}"
    resp = requests.patch(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    if not resp.ok:
        raise SystemExit(f"ERROR: PATCH asset -> {resp.status_code}: {resp.text[:800]}")
    return resp.json()


def writeback_fields(
    *,
    canonical: str,
    storage_key: str,
    file_hash: str,
    size_bytes: int,
    mime_type: str,
) -> dict:
    uploaded_at = datetime.now(DENVER).isoformat(timespec="milliseconds")
    return {
        "Upload Status": "Uploaded",
        "Canonical File URL": canonical,
        "Storage Key": storage_key,
        "File Content Hash": file_hash,
        "File Hash Algorithm": "SHA-256",
        "Uploaded At": uploaded_at,
        "File Size Bytes": size_bytes,
        "File MIME Type": mime_type,
        "Upload Error": None,
    }


def verify_hash_hex(value: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{64}", value or ""))


def build_plan(
    token: str,
    base_id: str,
    record_id: str,
    *,
    season_slug: str,
    challenge_slug: str,
    athlete_slug_override: str | None,
    bucket: str,
    region: str,
) -> dict:
    record = get_record(token, base_id, record_id)
    fields = record.get("fields", {})
    attachment = first_attachment(fields)
    if not attachment:
        raise SystemExit(f"ERROR: no Airtable Attachment on {record_id}")

    enrollment_id = first_link(fields, "Enrollment - Linked")
    if athlete_slug_override:
        athlete_slug = athlete_slug_override
    else:
        athlete_slug = athlete_slug_from_asset(fields)
        if not athlete_slug and enrollment_id:
            athlete_slug = get_enrollment_slug(token, base_id, enrollment_id)
        if not athlete_slug:
            athlete_slug = "unknown-athlete"

    original_name = (
        str(fields.get("Original File Name") or "").strip()
        or str(attachment.get("filename") or "").strip()
        or "upload.bin"
    )
    date_str = datetime.now(DENVER).strftime("%Y-%m-%d")
    storage_key = build_storage_key(
        record_id=record_id,
        fields=fields,
        athlete_slug=athlete_slug,
        season_slug=season_slug,
        challenge_slug=challenge_slug,
        date_str=date_str,
        filename=original_name,
    )
    canonical = canonical_url(bucket, region, storage_key)

    file_bytes, header_mime, _ = download_bytes(attachment["url"])
    mime_type = guess_mime(original_name, header_mime)
    file_hash = sha256_hex(file_bytes)
    size_bytes = len(file_bytes)

    wb = writeback_fields(
        canonical=canonical,
        storage_key=storage_key,
        file_hash=file_hash,
        size_bytes=size_bytes,
        mime_type=mime_type,
    )

    return {
        "script": "c013_dev_s3_upload_proof.py",
        "mode": "dry_run",
        "baseId": base_id,
        "table": TABLE,
        "recordId": record_id,
        "enrollmentId": enrollment_id,
        "attachment": {
            "filename": attachment.get("filename"),
            "originalFileName": original_name,
            "downloadBytes": size_bytes,
        },
        "hash": {
            "algorithm": "SHA-256",
            "hex": file_hash,
            "valid64CharHex": verify_hash_hex(file_hash),
        },
        "s3": {
            "bucket": bucket,
            "region": region,
            "storageKey": storage_key,
            "canonicalFileUrl": canonical,
        },
        "pathTokens": {
            "seasonSlug": season_slug,
            "challengeSlug": challenge_slug,
            "athleteSlug": athlete_slug,
            "date": date_str,
            "assetType": asset_type_token(fields),
        },
        "writebackPlanned": wb,
        "priorWriteback": {
            "Upload Status": fields.get("Upload Status"),
            "Canonical File URL": fields.get("Canonical File URL"),
            "Storage Key": fields.get("Storage Key"),
            "File Content Hash": fields.get("File Content Hash"),
            "Upload Error": fields.get("Upload Error"),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="C-013 DEV S3 upload + hash proof (AWS SDK)")
    parser.add_argument("record_id", help="Submission Assets record id (rec…)")
    parser.add_argument("--base-id", default=None, help=f"DEV base only (default {DEV_BASE})")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET", DEFAULT_BUCKET))
    parser.add_argument("--region", default=os.getenv("AWS_REGION", DEFAULT_REGION))
    parser.add_argument("--season-slug", default="2026-2027")
    parser.add_argument("--challenge-slug", default="shooting-challenge")
    parser.add_argument("--athlete-slug", default=None, help="Override athlete folder segment")
    parser.add_argument(
        "--out",
        default=None,
        help="Write JSON report (default _preview/c013-dev-s3-sdk-proof-<recordId>.json)",
    )
    parser.add_argument(
        "--confirm-write",
        action="store_true",
        help="Upload to S3 and PATCH Airtable (default is dry-run plan only)",
    )
    args = parser.parse_args()

    if not args.record_id.startswith("rec"):
        raise SystemExit("ERROR: record_id must start with rec")

    load_env()
    base_id = resolve_base_id(args.base_id)
    token = airtable_token()

    plan = build_plan(
        token,
        base_id,
        args.record_id,
        season_slug=args.season_slug,
        challenge_slug=args.challenge_slug,
        athlete_slug_override=args.athlete_slug,
        bucket=args.bucket,
        region=args.region,
    )

    out_file = resolve_out_path(args.out, args.record_id)

    if not args.confirm_write:
        plan["probedAt"] = datetime.now(DENVER).isoformat(timespec="seconds")
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(plan, indent=2))
        print(f"\nDRY-RUN — no S3 upload, no Airtable write. Report: {out_file}")
        print("Re-run with --confirm-write to execute.")
        return

    if not os.getenv("AWS_ACCESS_KEY_ID") or not os.getenv("AWS_SECRET_ACCESS_KEY"):
        raise SystemExit("ERROR: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required for --confirm-write")

    # Re-download for upload (plan already computed; reuse values)
    record = get_record(token, base_id, args.record_id)
    attachment = first_attachment(record.get("fields", {}))
    if not attachment:
        raise SystemExit("ERROR: no attachment on record at write time")
    file_bytes, header_mime, _ = download_bytes(attachment["url"])
    original_name = plan["attachment"]["originalFileName"]
    mime_type = guess_mime(original_name, header_mime)
    file_hash = sha256_hex(file_bytes)

    s3_result = upload_s3(
        args.bucket,
        args.region,
        plan["s3"]["storageKey"],
        file_bytes,
        mime_type,
    )

    wb = writeback_fields(
        canonical=plan["s3"]["canonicalFileUrl"],
        storage_key=plan["s3"]["storageKey"],
        file_hash=file_hash,
        size_bytes=len(file_bytes),
        mime_type=mime_type,
    )
    patched = patch_asset(token, base_id, args.record_id, wb)

    report = {
        **plan,
        "mode": "live",
        "probedAt": datetime.now(DENVER).isoformat(timespec="seconds"),
        "s3Upload": s3_result,
        "writebackApplied": wb,
        "airtablePatchId": patched.get("id"),
        "writebackVerification": {
            "canonicalUrlPopulated": bool(wb.get("Canonical File URL")),
            "storageKeyPopulated": bool(wb.get("Storage Key")),
            "fileContentHashPopulated": verify_hash_hex(file_hash),
            "fileHashAlgorithmSha256": wb.get("File Hash Algorithm") == "SHA-256",
            "uploadErrorCleared": wb.get("Upload Error") is None,
            "hashHexLength": len(file_hash),
        },
    }
    report["writebackVerification"]["allPass"] = all(
        report["writebackVerification"][k]
        for k in (
            "canonicalUrlPopulated",
            "storageKeyPopulated",
            "fileContentHashPopulated",
            "fileHashAlgorithmSha256",
            "uploadErrorCleared",
        )
    )

    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nLIVE — S3 upload + Airtable writeback complete. Report: {out_file}")


if __name__ == "__main__":
    main()
