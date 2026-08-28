#!/usr/bin/env python3
"""FUT-010 — verify S3 upload and clear Airtable intake attachments (dry-run default).

Deletes ONLY Submission Assets.Airtable Attachment contents after:
  - Upload Status = Uploaded
  - Writeback Complete? + hash fields verified
  - Storage Key present
  - S3 HeadObject succeeds
  - Canonical URL probe passes (private bucket expected)
  - Video assets: valid Lambda viewer URL classification

Never deletes Airtable records or S3 objects.

Usage:
  python fut_010_intake_attachment_cleanup.py preflight
  python fut_010_intake_attachment_cleanup.py dry-run --limit 25
  python fut_010_intake_attachment_cleanup.py reconcile --limit 50
  python fut_010_intake_attachment_cleanup.py apply --confirm-delete --record-id recXXXXXXXXXXXXXX

Safety:
  - Default mode is dry-run (no writes)
  - apply requires --confirm-delete
  - Never runs destructive cleanup without explicit --confirm-delete
  - Use DEV base for development; Production requires Mike approval (see deploy checklist)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import boto3
import requests
from botocore.exceptions import ClientError
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
DEFAULT_BASE = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"
S3_BUCKET = os.getenv("FUT010_S3_BUCKET", "shooting-challenge-assets")
S3_REGION = os.getenv("FUT010_S3_REGION", "us-east-2")

LAMBDA_VIEWER_HOST_RE = re.compile(r"\.lambda-url\.us-east-2\.on\.aws$", re.I)
RECORD_ID_RE = re.compile(r"^rec[a-zA-Z0-9]{14}$")
FILE_PATH_RE = re.compile(r"^/file/(rec[a-zA-Z0-9]{14})/?$")
S3_HOST_RE = re.compile(
    r"(?:^|\.)s3[.-][a-z0-9-]+\.amazonaws\.com$|\.s3\.amazonaws\.com$|shooting-challenge-assets",
    re.I,
)

FIELD_ATTACHMENT = "Airtable Attachment"
FIELD_UPLOAD_STATUS = "Upload Status"
FIELD_UPLOAD_DEST = "Upload Destination"
FIELD_ASSET_PURPOSE = "Asset Purpose"
FIELD_STORAGE_KEY = "Storage Key"
FIELD_CANONICAL = "Canonical File URL"
FIELD_REVIEWER_URL = "Reviewer File URL"
FIELD_UPLOAD_ERROR = "Upload Error"
FIELD_WRITEBACK = "Writeback Complete?"
FIELD_SEND_TRIGGER = "Send to Make Trigger"
FIELD_HASH = "File Content Hash"
FIELD_HASH_ALG = "File Hash Algorithm"
FIELD_UPLOADED_AT = "Uploaded At"

READ_FIELDS = [
    FIELD_ATTACHMENT,
    FIELD_UPLOAD_STATUS,
    FIELD_UPLOAD_DEST,
    FIELD_ASSET_PURPOSE,
    FIELD_STORAGE_KEY,
    FIELD_CANONICAL,
    FIELD_REVIEWER_URL,
    FIELD_UPLOAD_ERROR,
    FIELD_WRITEBACK,
    FIELD_SEND_TRIGGER,
    FIELD_HASH,
    FIELD_HASH_ALG,
    FIELD_UPLOADED_AT,
]


def load_token() -> str:
    load_dotenv(HERE / ".env", override=False)
    load_dotenv(REPO / "web" / ".env.local", override=True)
    token = (
        os.getenv("AIRTABLE_API_TOKEN")
        or os.getenv("AIRTABLE_TOKEN")
        or os.getenv("AIRTABLE_PROD_TOKEN")
        or ""
    )
    if not token:
        raise SystemExit("Missing AIRTABLE_API_TOKEN in tools/airtable/.env or web/.env.local")
    return token


def select_name(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict) and "name" in value:
        return str(value["name"]).strip()
    return str(value).strip()


def attachment_count(fields: dict[str, Any]) -> int:
    att = fields.get(FIELD_ATTACHMENT)
    if not isinstance(att, list):
        return 0
    return sum(1 for item in att if item)


def writeback_complete(fields: dict[str, Any]) -> bool:
    flag = fields.get(FIELD_WRITEBACK)
    if flag in (1, True, "1"):
        return True
    upload_status = select_name(fields.get(FIELD_UPLOAD_STATUS))
    if upload_status != "Uploaded":
        return False
    required = [
        FIELD_CANONICAL,
        FIELD_STORAGE_KEY,
        FIELD_HASH,
        FIELD_UPLOADED_AT,
    ]
    if not all(select_name(fields.get(k)) for k in required):
        return False
    if select_name(fields.get(FIELD_HASH_ALG)) != "SHA-256":
        return False
    if select_name(fields.get(FIELD_UPLOAD_ERROR)):
        return False
    return True


def resolve_category(fields: dict[str, Any]) -> str:
    dest = select_name(fields.get(FIELD_UPLOAD_DEST))
    if dest == "Homework Completions":
        return "homework"
    if dest == "Video Feedback":
        return "video"
    purpose = select_name(fields.get(FIELD_ASSET_PURPOSE))
    if re.search(r"homework", purpose, re.I):
        return "homework"
    if re.search(r"video", purpose, re.I):
        return "video"
    return "unknown"


def classify_reviewer_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return "missing_reviewer_url"
    try:
        parsed = urllib.parse.urlparse(raw)
    except ValueError:
        return "malformed_url"
    if parsed.scheme != "https":
        return "malformed_url"
    if S3_HOST_RE.search(parsed.hostname or "") or S3_HOST_RE.search(raw):
        return "direct_s3_rejected"
    if LAMBDA_VIEWER_HOST_RE.search(parsed.hostname or ""):
        path_match = FILE_PATH_RE.match(parsed.path or "")
        if not path_match or not RECORD_ID_RE.match(path_match.group(1)):
            return "malformed_url"
        if not (parsed.query or "").strip() or "token=" not in parsed.query:
            return "missing_token"
        return "valid_lambda_viewer"
    return "invalid_host"


@dataclass
class VerificationResult:
    s3_object_exists: bool
    canonical_url_reachable: bool
    reviewer_url_classification: str | None
    verified: bool
    reason: str


def verify_s3_object(s3_client: Any, storage_key: str) -> bool:
    if not storage_key:
        return False
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=storage_key)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


def probe_canonical_url(url: str, timeout: int = 15) -> bool:
    """Private bucket: anonymous GET should fail closed (403/401), proving URL resolves."""
    if not url.startswith("https://"):
        return False
    try:
        resp = requests.get(url, timeout=timeout, allow_redirects=False)
        return resp.status_code in (403, 401, 400)
    except requests.RequestException:
        return False


def verify_record_fields(
    fields: dict[str, Any],
    *,
    s3_client: Any | None = None,
    head_object: Callable[[str], bool] | None = None,
    canonical_probe: Callable[[str], bool] | None = None,
) -> VerificationResult:
    category = resolve_category(fields)
    storage_key = select_name(fields.get(FIELD_STORAGE_KEY))
    canonical = select_name(fields.get(FIELD_CANONICAL))
    reviewer = select_name(fields.get(FIELD_REVIEWER_URL))

    if not storage_key.startswith("shooting-challenge/"):
        return VerificationResult(False, False, None, False, "Storage Key format invalid")
    if not canonical.startswith("https://"):
        return VerificationResult(False, False, None, False, "Canonical File URL missing or not HTTPS")

    head = head_object or (lambda key: verify_s3_object(s3_client, key))
    probe = canonical_probe or probe_canonical_url
    s3_ok = head(storage_key)
    canonical_ok = probe(canonical) if s3_ok else False

    reviewer_class: str | None = None
    if category == "video":
        reviewer_class = classify_reviewer_url(reviewer)
        if reviewer_class != "valid_lambda_viewer":
            return VerificationResult(
                s3_ok,
                canonical_ok,
                reviewer_class,
                False,
                "Reviewer/Lambda viewer URL is missing or invalid",
            )

    verified = s3_ok and canonical_ok
    reason = "AWS verification passed" if verified else (
        "S3 object not found at Storage Key" if not s3_ok else "Canonical File URL probe failed"
    )
    return VerificationResult(s3_ok, canonical_ok, reviewer_class, verified, reason)


def field_eligible(fields: dict[str, Any]) -> tuple[bool, str]:
    if attachment_count(fields) == 0:
        return False, "Attachment already empty"
    category = resolve_category(fields)
    if category not in ("homework", "video"):
        return False, "Unsupported upload destination"
    if select_name(fields.get(FIELD_UPLOAD_STATUS)) != "Uploaded":
        return False, "Upload Status is not Uploaded"
    if not select_name(fields.get(FIELD_STORAGE_KEY)):
        return False, "Storage Key missing"
    if not writeback_complete(fields):
        return False, "Writeback incomplete"
    if fields.get(FIELD_SEND_TRIGGER) is True:
        return False, "Send to Make Trigger still checked"
    return True, "Field eligibility passed"


def list_records(
    token: str,
    base_id: str,
    *,
    record_id: str | None = None,
    formula: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    if record_id:
        url = f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(TABLE)}/{record_id}"
        resp = requests.get(url, headers=headers, timeout=120)
        resp.raise_for_status()
        return [resp.json()]

    params: dict[str, str] = {
        "pageSize": str(min(limit, 100)),
        "fields[]": READ_FIELDS,
    }
    if formula:
        params["filterByFormula"] = formula

    url = f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(TABLE)}"
    records: list[dict[str, Any]] = []
    offset: str | None = None
    while len(records) < limit:
        page_params = dict(params)
        if offset:
            page_params["offset"] = offset
        resp = requests.get(url, headers=headers, params=page_params, timeout=120)
        resp.raise_for_status()
        payload = resp.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset or len(records) >= limit:
            break
    return records[:limit]


def clear_attachment(token: str, base_id: str, record_id: str) -> None:
    url = f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(TABLE)}/{record_id}"
    resp = requests.patch(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"fields": {FIELD_ATTACHMENT: []}},
        timeout=120,
    )
    resp.raise_for_status()


@dataclass
class CleanupRow:
    record_id: str
    asset_purpose: str
    asset_category: str
    storage_key: str
    attachment_count: int
    action: str
    verification_result: str
    deletion_result: str
    failure_reason: str


def process_record(
    record: dict[str, Any],
    *,
    s3_client: Any,
    dry_run: bool,
    head_object: Callable[[str], bool] | None = None,
    canonical_probe: Callable[[str], bool] | None = None,
) -> CleanupRow:
    record_id = record["id"]
    fields = record.get("fields", {})
    asset_purpose = select_name(fields.get(FIELD_ASSET_PURPOSE)) or select_name(
        fields.get(FIELD_UPLOAD_DEST)
    )
    storage_key = select_name(fields.get(FIELD_STORAGE_KEY))
    count = attachment_count(fields)
    category = resolve_category(fields)

    eligible, elig_reason = field_eligible(fields)
    if count == 0:
        return CleanupRow(
            record_id,
            asset_purpose,
            category,
            storage_key,
            0,
            "skipped_already_empty",
            "skipped_already_empty",
            "not_attempted",
            elig_reason,
        )
    if not eligible:
        action = (
            "skipped_uncertain_upload"
            if fields.get(FIELD_SEND_TRIGGER) is True
            else "skipped_ineligible"
        )
        return CleanupRow(
            record_id,
            asset_purpose,
            category,
            storage_key,
            count,
            action,
            action,
            "not_attempted",
            elig_reason,
        )

    verification = verify_record_fields(
        fields,
        s3_client=s3_client,
        head_object=head_object,
        canonical_probe=canonical_probe,
    )
    if not verification.verified:
        return CleanupRow(
            record_id,
            asset_purpose,
            category,
            storage_key,
            count,
            "skipped_verification_failed",
            "failed",
            "not_attempted",
            verification.reason,
        )

    if dry_run:
        return CleanupRow(
            record_id,
            asset_purpose,
            category,
            storage_key,
            count,
            "dry_run_would_delete",
            "passed",
            "dry_run_would_delete",
            "",
        )

    try:
        clear_attachment(load_token(), os.getenv("FUT010_BASE_ID", DEFAULT_BASE), record_id)
    except requests.RequestException as exc:
        return CleanupRow(
            record_id,
            asset_purpose,
            category,
            storage_key,
            count,
            "delete_failed",
            "passed",
            "delete_failed",
            str(exc),
        )

    return CleanupRow(
        record_id,
        asset_purpose,
        category,
        storage_key,
        count,
        "deleted",
        "passed",
        "deleted",
        "",
    )


def reconciliation_formula() -> str:
    return (
        "AND("
        '{Upload Status}="Uploaded",'
        "LEN({Storage Key})>0,"
        "LEN({Canonical File URL})>0,"
        "{Writeback Complete?}=1,"
        "COUNTA({Airtable Attachment})>0"
        ")"
    )


def run_batch(
    *,
    mode: str,
    base_id: str,
    limit: int,
    record_id: str | None,
    confirm_delete: bool,
    head_object: Callable[[str], bool] | None = None,
) -> dict[str, Any]:
    dry_run = not confirm_delete
    token = load_token()
    formula = reconciliation_formula() if mode == "reconcile" else None
    records = list_records(token, base_id, record_id=record_id, formula=formula, limit=limit)

    s3_client = boto3.client("s3", region_name=S3_REGION)
    rows = [
        process_record(
            rec,
            s3_client=s3_client,
            dry_run=dry_run,
            head_object=head_object,
            canonical_probe=None,
        )
        for rec in records
    ]

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "baseId": base_id,
        "dryRun": dry_run,
        "confirmDelete": confirm_delete,
        "recordCount": len(rows),
        "counts": {},
        "rows": [asdict(r) for r in rows],
    }
    for row in rows:
        summary["counts"][row.action] = summary["counts"].get(row.action, 0) + 1
    return summary


def cmd_preflight(base_id: str) -> None:
    token = load_token()
    meta_url = f"https://api.airtable.com/v0/meta/bases/{base_id}/tables"
    resp = requests.get(meta_url, headers={"Authorization": f"Bearer {token}"}, timeout=60)
    resp.raise_for_status()
    tables = {t["name"]: t for t in resp.json().get("tables", [])}
    assets = tables.get(TABLE)
    if not assets:
        raise SystemExit(f"Table {TABLE!r} not found in base {base_id}")
    field_names = {f["name"] for f in assets.get("fields", [])}
    missing = [f for f in READ_FIELDS if f not in field_names]
    print(
        json.dumps(
            {
                "baseId": base_id,
                "table": TABLE,
                "s3Bucket": S3_BUCKET,
                "s3Region": S3_REGION,
                "fieldsPresent": len(READ_FIELDS) - len(missing),
                "fieldsMissing": missing,
                "ready": len(missing) == 0,
            },
            indent=2,
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="FUT-010 intake attachment cleanup")
    parser.add_argument(
        "command",
        choices=["preflight", "dry-run", "reconcile", "apply"],
        help="preflight=schema check; dry-run/reconcile=report only; apply=delete with --confirm-delete",
    )
    parser.add_argument("--base-id", default=os.getenv("FUT010_BASE_ID", DEFAULT_BASE))
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--record-id", default=None)
    parser.add_argument(
        "--confirm-delete",
        action="store_true",
        help="Required for apply — performs Airtable attachment clear writes",
    )
    parser.add_argument("--output", default=None, help="Write JSON report to path")
    args = parser.parse_args()

    if args.command == "apply" and not args.confirm_delete:
        raise SystemExit("Refusing apply without --confirm-delete")

    if args.command == "preflight":
        cmd_preflight(args.base_id)
        return

    mode = "reconcile" if args.command == "reconcile" else args.command
    summary = run_batch(
        mode=mode,
        base_id=args.base_id,
        limit=args.limit,
        record_id=args.record_id,
        confirm_delete=args.command == "apply" and args.confirm_delete,
    )
    text = json.dumps(summary, indent=2)
    print(text)
    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
