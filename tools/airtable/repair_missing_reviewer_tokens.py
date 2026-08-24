#!/usr/bin/env python3
"""
Repair missing Reviewer Access Tokens on Uploaded Submission Assets (dry-run default).

Uses the same token generation as lambda/upload-asset/upload_core/token.py.
Never prints raw tokens. Never modifies S3 or Canonical File URL.

Usage:
  python tools/airtable/repair_missing_reviewer_tokens.py --dry-run
  python tools/airtable/repair_missing_reviewer_tokens.py --confirm-write --limit 5
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

PROD_BASE = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"
FIELDS = [
    "Upload Status",
    "Reviewer Access Token",
    "Reviewer File URL",
    "Canonical File URL",
    "Storage Key",
    "Original File Name",
    "Upload Destination",
]


def token_from_env() -> str:
    token = (os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or "").strip()
    if not token:
        print("AIRTABLE_API_TOKEN missing", file=sys.stderr)
        sys.exit(1)
    return token


def api_get(url: str, token: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_patch(url: str, token: str, body: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def list_uploaded_missing_reviewer(base_id: str, token: str) -> list[dict[str, Any]]:
    formula = (
        'AND({Upload Status}="Uploaded", {Reviewer Access Token}="", '
        'OR({Storage Key}!="", {Canonical File URL}!=""))'
    )
    params = urllib.parse.urlencode(
        {
            "filterByFormula": formula,
            "pageSize": 100,
            **{f"fields[]": f for f in FIELDS},
        },
        doseq=True,
    )
    url = f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(TABLE)}?{params}"
    records: list[dict[str, Any]] = []
    offset = None
    while True:
        page_url = url if not offset else f"{url}&offset={urllib.parse.quote(offset)}"
        data = api_get(page_url, token)
        for row in data.get("records", []):
            fields = row.get("fields") or {}
            if fields.get("Reviewer File URL"):
                continue
            records.append(row)
        offset = data.get("offset")
        if not offset:
            break
    return records


def summarize(row: dict[str, Any], action: str) -> dict[str, Any]:
    fields = row.get("fields") or {}
    return {
        "recordId": row.get("id"),
        "action": action,
        "uploadDestination": fields.get("Upload Destination", ""),
        "originalFileName": fields.get("Original File Name", ""),
        "hasStorageKey": bool((fields.get("Storage Key") or "").strip()),
        "hasCanonicalUrl": bool((fields.get("Canonical File URL") or "").strip()),
        "hadReviewerToken": bool((fields.get("Reviewer Access Token") or "").strip()),
        "hadReviewerFileUrl": bool((fields.get("Reviewer File URL") or "").strip()),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair missing Reviewer Access Tokens")
    parser.add_argument("--base-id", default=os.getenv("AIRTABLE_BASE_ID", PROD_BASE))
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.add_argument("--confirm-write", action="store_true")
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()

    dry_run = not args.confirm_write
    token = token_from_env()
    candidates = list_uploaded_missing_reviewer(args.base_id, token)
    batch = candidates[: max(args.limit, 0)]
    report: dict[str, Any] = {
        "dryRun": dry_run,
        "candidateCount": len(candidates),
        "processingCount": len(batch),
        "remainingAfterBatch": max(0, len(candidates) - len(batch)),
        "rows": [],
    }

    for row in batch:
        before = summarize(row, "inspect")
        if dry_run:
            report["rows"].append({**before, "action": "would_write_token"})
            continue

        new_token = secrets.token_urlsafe(32)
        record_id = row["id"]
        patch_url = (
            f"https://api.airtable.com/v0/{args.base_id}/"
            f"{urllib.parse.quote(TABLE)}/{record_id}"
        )
        try:
            updated = api_patch(
                patch_url,
                token,
                {"fields": {"Reviewer Access Token": new_token}},
            )
        except urllib.error.HTTPError as exc:
            report["rows"].append({**before, "action": "error", "error": str(exc)[:200]})
            continue

        fields = updated.get("fields") or {}
        after = summarize(updated, "repaired")
        after["reviewerTokenPresent"] = bool((fields.get("Reviewer Access Token") or "").strip())
        after["reviewerFileUrlPresent"] = bool((fields.get("Reviewer File URL") or "").strip())
        report["rows"].append(after)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
