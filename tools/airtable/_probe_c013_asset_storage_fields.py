#!/usr/bin/env python3
"""Read-only probe: C-013/C-023 asset storage field inventory + record stats.

Uses tools/airtable/.env (never print token).
Default base: DEV appTetnuCZlCZdTCT

Outputs JSON summary: schema field presence, upload-status breakdown, URL/hash coverage.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
load_dotenv(Path(__file__).with_name(".env"), override=True)
web_env = REPO / "web" / ".env.local"
if web_env.exists():
    load_dotenv(web_env, override=True)

API = "https://api.airtable.com/v0"
META = "https://api.airtable.com/v0/meta"
DEV_BASE = "appTetnuCZlCZdTCT"
SCHMIDT_ENROLLMENT = "recgP9qZYjAhE7NXm"

TABLES = [
    "Submissions",
    "Submission Assets",
    "Homework Completions",
    "Video Feedback",
    "Enrollments",
]

# Wave 7 tracked fields (presence + sample stats where applicable)
FIELD_GROUPS: dict[str, list[str]] = {
    "attachments": [
        "Airtable Attachment",
        "HW Sub 1",
        "HW Sub 2",
        "Video Upload",
        "Athlete Headshot",
    ],
    "driveUrls": [
        "Google Drive File URL",
        "Google Drive File ID",
        "Google Drive Folder ID",
        "Google Drive Folder URL",
        "Google Drive View URL",
        "Google Drive Download URL",
        "Video URL or Drive Link",
    ],
    "canonicalPlanned": [
        "Canonical File URL",
        "Storage Key",
        "Storage Bucket",
        "Athlete Headshot URL",
        "Formatted Upload Name",
    ],
    "uploadStatus": [
        "Upload Status",
        "Attachment Upload Status",
        "Upload Error",
        "Uploaded At",
        "Send to Make Trigger",
        "Writeback Complete?",
        "Upload Ready?",
        "Ready to Send to Make?",
        "Upload Naming Status",
    ],
    "hashDedup": [
        "File Content Hash",
        "File Hash Algorithm",
        "File Size Bytes",
        "File MIME Type",
        "File is Duplicate?",
        "Duplicate File Status",
        "Duplicate Match Strength",
        "Duplicate Match Record",
        "Duplicate Match Notes",
        "Duplicate Checked At",
        "Duplicate Check Error",
        "Duplicate Review Status",
        "Source Attachment ID",
    ],
}

STAT_FIELDS = {
    "Submission Assets": {
        "enrollmentField": "Enrollment - Linked",
        "attachment": "Airtable Attachment",
        "uploadStatus": "Upload Status",
        "driveUrl": "Google Drive File URL",
        "canonicalUrl": "Canonical File URL",
        "hash": "File Content Hash",
    },
}


def token() -> str:
    t = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not t:
        print("ERROR: missing AIRTABLE_TOKEN in tools/airtable/.env")
        sys.exit(2)
    return t


def get(url: str) -> tuple[int, dict | list | str]:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token()}"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode()
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = body[:800]
        return e.code, parsed


def fetch_schema(base_id: str) -> dict[str, dict]:
    status, data = get(f"{META}/bases/{base_id}/tables")
    if status != 200:
        print(f"schema_error HTTP {status}: {data}")
        sys.exit(1)
    out: dict[str, dict] = {}
    for table in data.get("tables", []):
        fields = {f["name"]: {"id": f["id"], "type": f["type"]} for f in table.get("fields", [])}
        out[table["name"]] = {"id": table["id"], "fields": fields}
    return out


def field_inventory(schema: dict[str, dict]) -> dict:
    inv: dict = {}
    all_tracked = {n for names in FIELD_GROUPS.values() for n in names}
    for table in TABLES:
        t = schema.get(table, {})
        present = t.get("fields", {})
        inv[table] = {
            "tableId": t.get("id"),
            "fieldCount": len(present),
            "groups": {},
            "otherTrackedPresent": [],
        }
        for group, names in FIELD_GROUPS.items():
            inv[table]["groups"][group] = {
                name: name in present for name in names if name in all_tracked
            }
        for name in sorted(all_tracked):
            if name in present and not any(
                name in FIELD_GROUPS[g] for g in FIELD_GROUPS
            ):
                inv[table]["otherTrackedPresent"].append(name)
        # flatten group to present/missing lists
        for group, flags in inv[table]["groups"].items():
            inv[table]["groups"][group] = {
                "present": [n for n, ok in flags.items() if ok],
                "missing": [n for n, ok in flags.items() if not ok],
            }
    return inv


def list_records(base_id: str, table: str, formula: str | None = None, max_pages: int = 20) -> list[dict]:
    url = f"{API}/{base_id}/{urllib.parse.quote(table)}?pageSize=100"
    if formula:
        url += f"&filterByFormula={urllib.parse.quote(formula)}"
    records: list[dict] = []
    offset = None
    pages = 0
    while pages < max_pages:
        page_url = url if not offset else f"{url}&offset={offset}"
        status, data = get(page_url)
        if status != 200:
            return records  # caller handles partial
        batch = data.get("records", []) if isinstance(data, dict) else []
        records.extend(batch)
        offset = data.get("offset") if isinstance(data, dict) else None
        pages += 1
        if not offset:
            break
    return records


def has_attachment(value: object) -> bool:
    return isinstance(value, list) and len(value) > 0


def nonempty_text(value: object) -> bool:
    return isinstance(value, str) and value.strip() != ""


def asset_stats(base_id: str, cfg: dict) -> dict:
    formula = f"{{{cfg['enrollmentField']}}} = '{SCHMIDT_ENROLLMENT}'"
    records = list_records(base_id, "Submission Assets", formula=formula)
    upload_counter: Counter = Counter()
    stats = {
        "scope": "Schmidt enrollment Submission Assets",
        "recordCount": len(records),
        "truncated": len(records) >= 2000,
        "withAttachment": 0,
        "withDriveUrl": 0,
        "withCanonicalUrl": 0,
        "withHash": 0,
        "uploadStatusBreakdown": {},
        "duplicateStatusBreakdown": {},
        "sampleRecordIds": [],
    }
    dup_counter: Counter = Counter()
    for rec in records:
        f = rec.get("fields", {})
        if has_attachment(f.get(cfg["attachment"])):
            stats["withAttachment"] += 1
        if nonempty_text(f.get(cfg["driveUrl"])):
            stats["withDriveUrl"] += 1
        if nonempty_text(f.get(cfg.get("canonicalUrl", "Canonical File URL"))):
            stats["withCanonicalUrl"] += 1
        if nonempty_text(f.get(cfg["hash"])):
            stats["withHash"] += 1
        us = f.get(cfg["uploadStatus"]) or "(blank)"
        upload_counter[str(us)] += 1
        dup = f.get("Duplicate File Status") or "(blank)"
        dup_counter[str(dup)] += 1
        if len(stats["sampleRecordIds"]) < 5:
            stats["sampleRecordIds"].append(rec["id"])
    stats["uploadStatusBreakdown"] = dict(upload_counter)
    stats["duplicateStatusBreakdown"] = dict(dup_counter)
    return stats


def schmidt_submission_intake_stats(base_id: str) -> dict:
    formula = f"{{Enrollment}} = '{SCHMIDT_ENROLLMENT}'"
    records = list_records(base_id, "Submissions", formula=formula, max_pages=10)
    stats = {
        "scope": "Schmidt Submissions",
        "recordCount": len(records),
        "withHwSub1": 0,
        "withVideoUpload": 0,
        "attachmentUploadStatus": {},
    }
    status_counter: Counter = Counter()
    for rec in records:
        f = rec.get("fields", {})
        if has_attachment(f.get("HW Sub 1")):
            stats["withHwSub1"] += 1
        if has_attachment(f.get("Video Upload")):
            stats["withVideoUpload"] += 1
        status_counter[str(f.get("Attachment Upload Status") or "(blank)")] += 1
    stats["attachmentUploadStatus"] = dict(status_counter)
    return stats


def fetch_record_writeback_check(base_id: str, record_id: str) -> dict:
    """Read-only single-record C-013/C-023 writeback verification."""
    url = f"{API}/{base_id}/Submission%20Assets/{record_id}"
    status, data = get(url)
    if status != 200 or not isinstance(data, dict):
        return {
            "recordId": record_id,
            "error": f"HTTP {status}",
            "detail": data,
        }
    f = data.get("fields", {})
    checks = {
        "uploadStatusUploaded": f.get("Upload Status") == "Uploaded",
        "canonicalUrlPopulated": nonempty_text(f.get("Canonical File URL")),
        "storageKeyPopulated": nonempty_text(f.get("Storage Key")),
        "fileContentHashPopulated": nonempty_text(f.get("File Content Hash")),
        "fileHashAlgorithmSha256": f.get("File Hash Algorithm") == "SHA-256",
        "uploadedAtPopulated": f.get("Uploaded At") is not None and f.get("Uploaded At") != "",
        "uploadErrorBlank": not nonempty_text(f.get("Upload Error")),
        "attachmentRetained": has_attachment(f.get("Airtable Attachment")),
        "writebackCompleteFormula": f.get("Writeback Complete?") in (1, True, "1"),
    }
    return {
        "recordId": record_id,
        "fields": {
            "Upload Status": f.get("Upload Status"),
            "Canonical File URL": f.get("Canonical File URL"),
            "Storage Key": f.get("Storage Key"),
            "File Content Hash": f.get("File Content Hash"),
            "File Hash Algorithm": f.get("File Hash Algorithm"),
            "Uploaded At": f.get("Uploaded At"),
            "Upload Error": f.get("Upload Error"),
            "Airtable Attachment": "present" if has_attachment(f.get("Airtable Attachment")) else "missing",
            "Writeback Complete?": f.get("Writeback Complete?"),
        },
        "writebackVerification": {
            "allPass": all(checks.values()),
            "checks": checks,
        },
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="C-013/C-023 read-only asset storage probe")
    parser.add_argument(
        "--out",
        default=os.getenv("C013_PROBE_OUT"),
        help="Write JSON summary to this path (e.g. tools/airtable/_preview/c013-dev-baseline.json)",
    )
    parser.add_argument(
        "--record-id",
        default=None,
        help="Optional Submission Assets record id — adds writeback verification block (e.g. recBBi80bYuxXifVj)",
    )
    args = parser.parse_args()

    base_id = os.getenv("WAVE7_PROBE_BASE") or os.getenv("DEV_BASE_ID") or DEV_BASE
    print(f"probe=C-013/C-023 asset storage")
    print(f"base_id={base_id}")
    print(f"schmidt_enrollment={SCHMIDT_ENROLLMENT}")

    if args.record_id:
        check = fetch_record_writeback_check(base_id, args.record_id)
        result = {
            "probeScript": "_probe_c013_asset_storage_fields.py",
            "probedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "baseId": base_id,
            "mode": "single_record_writeback_check",
            "submissionAsset": check,
        }
        print("\n=== WRITEBACK CHECK ===")
        v = check.get("writebackVerification", {})
        print(f"recordId={args.record_id}")
        print(f"allPass={v.get('allPass')}")
        if v.get("checks"):
            for k, ok in v["checks"].items():
                print(f"  {k}: {'PASS' if ok else 'FAIL'}")
        print("\n=== SUMMARY JSON ===")
        payload = json.dumps(result, indent=2)
        print(payload)
        if args.out:
            out_path = Path(args.out)
            if not out_path.is_absolute():
                out_path = REPO / out_path
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(payload + "\n", encoding="utf-8")
            print(f"\nwritten={out_path.as_posix()}")
        print("\n=== READ-ONLY — no writes performed ===")
        return

    schema = fetch_schema(base_id)
    inventory = field_inventory(schema)

    result = {
        "probeScript": "_probe_c013_asset_storage_fields.py",
        "probedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "baseId": base_id,
        "schmidtEnrollment": SCHMIDT_ENROLLMENT,
        "schemaInventory": inventory,
        "recordStats": {},
    }

    if "Submission Assets" in schema:
        result["recordStats"]["submissionAssetsSchmidt"] = asset_stats(
            base_id, STAT_FIELDS["Submission Assets"]
        )
    result["recordStats"]["submissionsSchmidt"] = schmidt_submission_intake_stats(base_id)

    # Global asset upload status sample (first 500 assets — lightweight)
    all_assets = list_records(base_id, "Submission Assets", max_pages=5)
    global_upload: Counter = Counter()
    global_hash = 0
    for rec in all_assets:
        f = rec.get("fields", {})
        global_upload[str(f.get("Upload Status") or "(blank)")] += 1
        if nonempty_text(f.get("File Content Hash")):
            global_hash += 1
    result["recordStats"]["allAssetsSample"] = {
        "sampleSize": len(all_assets),
        "uploadStatusBreakdown": dict(global_upload),
        "withHash": global_hash,
    }

    print("\n=== SUMMARY JSON ===")
    payload = json.dumps(result, indent=2)
    print(payload)

    if args.out:
        out_path = Path(args.out)
        if not out_path.is_absolute():
            out_path = REPO / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(payload + "\n", encoding="utf-8")
        print(f"\nwritten={out_path.as_posix()}")

    # Human-readable gaps
    print("\n=== WAVE 7 GAPS (canonical fields) ===")
    sa = inventory.get("Submission Assets", {}).get("groups", {}).get("canonicalPlanned", {})
    missing = sa.get("missing", [])
    if missing:
        print(f"Submission Assets missing planned fields: {', '.join(missing)}")
    else:
        print("All planned canonical fields present on Submission Assets.")

    print("\n=== READ-ONLY — no writes performed ===")


if __name__ == "__main__":
    main()
