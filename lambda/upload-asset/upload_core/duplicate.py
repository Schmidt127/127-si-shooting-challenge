from __future__ import annotations

from datetime import datetime, timezone

from upload_core.airtable import api_url
from upload_core.config import TABLE
from upload_core.util import http_json, verify_hash_hex

DUPLICATE_MATCH_READ_FIELDS = [
    "Canonical File URL",
    "Storage Key",
    "File Content Hash",
    "Uploaded At",
]
DUPLICATE_WRITEBACK_FIELDS = [
    "File is Duplicate?",
    "Duplicate File Status",
    "Duplicate Match Strength",
    "Duplicate Match Record",
    "Duplicate Match Notes",
    "Duplicate Checked At",
    "Duplicate Check Error",
]


def duplicate_checked_at_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def format_duplicate_match(record: dict) -> dict:
    fields = record.get("fields", {})
    return {
        "recordId": record.get("id"),
        "Canonical File URL": fields.get("Canonical File URL"),
        "Storage Key": fields.get("Storage Key"),
        "File Content Hash": fields.get("File Content Hash"),
        "Uploaded At": fields.get("Uploaded At"),
    }


def lookup_duplicate_matches(
    token: str,
    base_id: str,
    file_hash: str,
    exclude_record_id: str,
    *,
    max_records: int = 5,
) -> list[dict]:
    if not file_hash or not verify_hash_hex(file_hash):
        return []
    formula = (
        f'AND({{File Content Hash}} = "{file_hash}", RECORD_ID() != "{exclude_record_id}")'
    )
    base = api_url(base_id, TABLE)
    params = "&".join(
        [
            f"filterByFormula={quote_formula(formula)}",
            f"maxRecords={max_records}",
        ]
        + [f"fields%5B{i}%5D={f.replace(' ', '%20')}" for i, f in enumerate(DUPLICATE_MATCH_READ_FIELDS)]
    )
    url = f"{base}?{params}"
    status, data = http_json("GET", url, token=token)
    if status != 200 or not isinstance(data, dict):
        raise RuntimeError(f"duplicate lookup GET -> HTTP {status}: {data}")
    return data.get("records", [])


def quote_formula(formula: str) -> str:
    from urllib.parse import quote

    return quote(formula, safe="")


def build_duplicate_writeback(
    matches: list[dict],
    *,
    file_hash: str,
    write_to_airtable: bool,
) -> tuple[dict, str]:
    checked_at = duplicate_checked_at_iso()
    if not file_hash:
        fields = {
            "Duplicate File Status": "Error",
            "Duplicate Match Strength": "Manual Review",
            "Duplicate Match Notes": "Hash missing — duplicate check skipped.",
            "Duplicate Checked At": checked_at,
            "Duplicate Check Error": "SHA-256 hash not computed.",
        }
        return fields, "match_found_report_only"

    if not matches:
        fields = {
            "File is Duplicate?": False,
            "Duplicate File Status": "Unique",
            "Duplicate Match Strength": "Exact SHA-256 Hash",
            "Duplicate Match Record": [],
            "Duplicate Match Notes": "No matching file hash found.",
            "Duplicate Checked At": checked_at,
            "Duplicate Check Error": "",
        }
        return fields, "no_match"

    first = matches[0]
    first_id = first.get("id", "")
    note = (
        f"Exact duplicate file content. Same SHA-256 hash already exists on "
        f"Submission Asset {first_id}."
    )
    fields = {
        "File is Duplicate?": True,
        "Duplicate File Status": "Exact Duplicate",
        "Duplicate Match Strength": "Exact SHA-256 Hash",
        "Duplicate Match Record": [first_id] if first_id else [],
        "Duplicate Match Notes": note,
        "Duplicate Checked At": checked_at,
        "Duplicate Check Error": "",
    }
    decision = (
        "match_found_written_to_existing_field"
        if write_to_airtable
        else "match_found_report_only"
    )
    return fields, decision


def build_c023_duplicate_report(
    *,
    record_id: str,
    file_hash: str,
    matches: list[dict],
    decision: str,
    lookup_performed: bool,
) -> dict:
    formatted = [format_duplicate_match(rec) for rec in matches]
    return {
        "currentAssetId": record_id,
        "computedSha256": file_hash,
        "duplicateLookupPerformed": lookup_performed,
        "duplicateMatchCount": len(formatted),
        "duplicateMatches": formatted,
        "duplicateBehaviorDecision": decision,
        "duplicateFieldsAvailable": DUPLICATE_WRITEBACK_FIELDS,
        "uploadBlocked": False,
        "notes": (
            "C-023 flag-only — upload continues regardless of duplicate match."
        ),
    }
