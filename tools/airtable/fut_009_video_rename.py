#!/usr/bin/env python3
"""FUT-009 — safe post-feedback S3 video rename (dry-run default).

Copy-on-write rename for video-route Submission Assets after coach sets
Custom Video File Name and confirms rename. Never deletes source S3 objects.

Usage:
  python fut_009_video_rename.py preflight
  python fut_009_video_rename.py dry-run --record-id recXXXXXXXXXXXXXX
  python fut_009_video_rename.py apply --confirm-rename --record-id recXXXXXXXXXXXXXX

Safety:
  - Default mode is dry-run (no S3 writes, no Airtable patches)
  - apply requires --confirm-rename
  - DEV base for development; Production requires Mike approval
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
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
LAMBDA_ROOT = REPO / "lambda" / "upload-asset"
sys.path.insert(0, str(LAMBDA_ROOT))

from upload_core.fut009_rename import (  # noqa: E402
    FIELD_CONFIRM_S3_RENAME,
    FIELD_CUSTOM_VIDEO_FILE_NAME,
    RenameContext,
    process_video_rename,
)
from upload_core.util import field_text, select_name

DEFAULT_BASE = "appn84sqPw03zEbTT"
TABLE_ASSETS = "Submission Assets"
TABLE_VF = "Video Feedback"
TABLE_ENROLLMENTS = "Enrollments"
TABLE_PI = "Program Instance - Sync"

S3_BUCKET = os.getenv("FUT009_S3_BUCKET", "shooting-challenge-assets")
S3_REGION = os.getenv("FUT009_S3_REGION", "us-east-2")

READ_ASSET_FIELDS = [
    "Storage Key",
    "Canonical File URL",
    "Original File Name",
    "Upload Status",
    "Upload Destination",
    "Upload Error",
    "Send to Make Trigger",
    "Video Feedback",
    "Enrollment",
    "Submission - Linked",
    "Activity Date",
    "Activity Date (from Submissions)",
    "Activity Date (from Submission)",
    "Formatted Upload Name",
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


def api_get(token: str, url: str) -> dict[str, Any]:
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, dict):
        raise RuntimeError(f"Unexpected GET payload: {data}")
    return data


def api_patch(token: str, url: str, fields: dict[str, Any]) -> dict[str, Any]:
    resp = requests.patch(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"fields": fields, "typecast": True},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def table_url(base_id: str, table: str) -> str:
    return f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(table)}"


def first_link_id(value: Any) -> str:
    if isinstance(value, list) and value:
        item = value[0]
        if isinstance(item, str) and item.startswith("rec"):
            return item
    return ""


def activity_date_from_fields(fields: dict[str, Any]) -> str:
    for key in (
        "Activity Date",
        "Activity Date (from Submissions)",
        "Activity Date (from Submission)",
    ):
        text = field_text(fields.get(key))
        if text:
            return text
    return ""


def load_asset_context(token: str, base_id: str, record_id: str) -> RenameContext:
    asset = api_get(token, f"{table_url(base_id, TABLE_ASSETS)}/{record_id}")
    fields = asset.get("fields", {})

    vf_id = first_link_id(fields.get("Video Feedback"))
    custom_name = ""
    coach_confirmed = False
    if vf_id:
        vf = api_get(token, f"{table_url(base_id, TABLE_VF)}/{vf_id}")
        vf_fields = vf.get("fields", {})
        custom_name = field_text(vf_fields.get(FIELD_CUSTOM_VIDEO_FILE_NAME))
        coach_confirmed = vf_fields.get(FIELD_CONFIRM_S3_RENAME) is True

    enrollment_id = first_link_id(fields.get("Enrollment - Linked")) or first_link_id(fields.get("Enrollment"))
    last_name = ""
    first_name = ""
    if enrollment_id:
        enrollment = api_get(token, f"{table_url(base_id, TABLE_ENROLLMENTS)}/{enrollment_id}")
        e_fields = enrollment.get("fields", {})
        last_name = field_text(e_fields.get("Athlete Last Name"))
        first_name = field_text(e_fields.get("Athlete First Name"))
        pi_id = first_link_id(e_fields.get("Program Instance"))
    else:
        pi_id = ""

    program_instance_name = ""
    if pi_id:
        pi = api_get(token, f"{table_url(base_id, TABLE_PI)}/{pi_id}")
        pi_fields = pi.get("fields", {})
        program_instance_name = field_text(pi_fields.get("Name - Program Instance"))

    return RenameContext(
        record_id=record_id,
        asset_fields=fields,
        custom_video_file_name=custom_name,
        last_name=last_name,
        first_name=first_name,
        program_instance_name=program_instance_name,
        activity_date=activity_date_from_fields(fields),
        coach_confirmed=coach_confirmed,
    )


def head_object_exists(s3_client: Any, key: str) -> bool:
    try:
        s3_client.head_object(Bucket=S3_BUCKET, Key=key)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


@dataclass
class RenameRow:
    record_id: str
    action: str
    source_key: str
    destination_key: str
    custom_video_file_name: str
    reason: str
    log_line: str


def process_cli_record(
    *,
    token: str,
    base_id: str,
    record_id: str,
    s3_client: Any,
    dry_run: bool,
    confirm_rename: bool,
    include_audit_fields: bool,
) -> RenameRow:
    ctx = load_asset_context(token, base_id, record_id)

    def patch_airtable(fields: dict[str, Any]) -> None:
        api_patch(token, f"{table_url(base_id, TABLE_ASSETS)}/{record_id}", fields)

    def head_source(key: str) -> dict[str, Any] | None:
        try:
            return s3_client.head_object(Bucket=S3_BUCKET, Key=key)
        except ClientError:
            return None

    decision = process_video_rename(
        ctx,
        bucket=S3_BUCKET,
        region=S3_REGION,
        dry_run=dry_run,
        confirm_flag=confirm_rename,
        include_audit_fields=include_audit_fields,
        s3_client=s3_client,
        head_source=head_source,
        head_destination=lambda key: head_object_exists(s3_client, key),
        patch_airtable=None if dry_run or not confirm_rename else patch_airtable,
    )

    return RenameRow(
        record_id=record_id,
        action=decision.action,
        source_key=decision.source_key,
        destination_key=decision.destination_key,
        custom_video_file_name=decision.custom_video_file_name,
        reason=decision.reason,
        log_line=decision.log_line,
    )


def run_command(
    *,
    mode: str,
    base_id: str,
    record_id: str | None,
    limit: int,
    confirm_rename: bool,
    include_audit_fields: bool,
) -> dict[str, Any]:
    dry_run = not confirm_rename or mode != "apply"
    token = load_token()
    s3_client = boto3.client("s3", region_name=S3_REGION)

    if mode == "preflight":
        return {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "mode": mode,
            "baseId": base_id,
            "bucket": S3_BUCKET,
            "region": S3_REGION,
            "confirmRenameRequired": True,
            "coachConfirmationField": FIELD_CONFIRM_S3_RENAME,
            "notes": "Dry-run default. apply requires --confirm-rename.",
        }

    if not record_id:
        raise SystemExit("--record-id is required for dry-run and apply")

    row = process_cli_record(
        token=token,
        base_id=base_id,
        record_id=record_id,
        s3_client=s3_client,
        dry_run=dry_run,
        confirm_rename=confirm_rename,
        include_audit_fields=include_audit_fields,
    )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "baseId": base_id,
        "dryRun": dry_run,
        "confirmRename": confirm_rename,
        "row": asdict(row),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="FUT-009 video rename worker (dry-run default)")
    parser.add_argument("mode", choices=["preflight", "dry-run", "apply"])
    parser.add_argument("--base-id", default=os.getenv("FUT009_BASE_ID", DEFAULT_BASE))
    parser.add_argument("--record-id", default=None)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument(
        "--confirm-rename",
        action="store_true",
        help="Required for apply — performs S3 CopyObject + Airtable patch",
    )
    parser.add_argument(
        "--include-audit-fields",
        action="store_true",
        help="Write Previous Storage Key + Renamed At when PKG-004 fields exist",
    )
    return parser


def validate_apply(args: argparse.Namespace) -> None:
    if args.mode == "apply" and not args.confirm_rename:
        raise SystemExit("apply requires --confirm-rename")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    validate_apply(args)
    summary = run_command(
        mode=args.mode,
        base_id=args.base_id,
        record_id=args.record_id,
        limit=args.limit,
        confirm_rename=args.confirm_rename,
        include_audit_fields=args.include_audit_fields,
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
