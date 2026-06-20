#!/usr/bin/env python3
# export_airtable_schema.py
#
# Airtable schema exporter (best-effort enhanced)
#
# Improvements over v2.2:
# - Keeps the safer BASE_ID / AIRTABLE_BASE_ID workflow
# - Does not call list-bases unless --base-name is explicitly used
# - Exports:
#     * raw schema
#     * enhanced schema
#     * readable dependencies
#     * base summary
#     * health report
#     * field index
#     * invalid fields report
#     * complex formulas report
#     * views_basic / views_detailed / views markdown
#     * schema markdown
#     * mermaid ERD
#     * workflow companion template
#     * manifest
# - Resolves dependency IDs to readable field names
# - Adds better field metadata extraction
# - Adds reverse indexes for faster troubleshooting
# - Adds best-effort base name resolution from:
#     1) BASE_NAME env
#     2) list-bases endpoint if --base-name used or list access is available
# - Gracefully skips optional endpoints on 403 / 404
#
# Improvements over v2.3:
# - Adds proactive Airtable request throttling and Retry-After handling
# - Softens token-shape validation to a warning instead of a hard failure
# - Warns when --only references missing tables
# - Marks formula dependency source as metadata vs formula-text fallback
# - Resolves detailed view visible/ordered field IDs to readable names
# - Improves Mermaid ERD cardinality for single-record links
# - Adds optional record audits: record counts, select usage, blanks, duplicates, XP, dates, homework, level gates
#
# Requirements:
#   pip install requests python-dotenv
#
# Typical usage:
#   python export_airtable_schema.py -v
#   python export_airtable_schema.py --skip-views -v
#   python export_airtable_schema.py --only "Enrollments,Submissions,Weeks"

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set

import requests
from urllib.parse import quote
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT_DIR = REPO_ROOT / "airtable" / "schema" / "snapshots"

API_ROOT = "https://api.airtable.com/v0"
SCRIPT_VERSION = "2.4.0"

FIELD_REF_RE = re.compile(r"\{([^}]+)\}")
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")

# Airtable documents a 5 requests/second/base limit. A small proactive throttle
# keeps large view/detail exports and record audits from repeatedly hitting 429.
MIN_SECONDS_BETWEEN_REQUESTS = 0.22
_LAST_REQUEST_AT = 0.0
_HEADERS_CACHE: Optional[Dict[str, str]] = None

# -----------------------------
# Environment / auth
# -----------------------------
def init_env() -> None:
    """
    Load .env from the same folder as this script.
    """
    env_path = Path(__file__).with_name(".env")
    if env_path.exists():
        load_dotenv(env_path, override=True)

def get_token() -> str:
    token = os.getenv("AIRTABLE_TOKEN")
    if not token:
        raise SystemExit(
            "ERROR: Missing AIRTABLE_TOKEN.\n"
            "Create a .env file next to this script with:\n"
            "  AIRTABLE_TOKEN=pat...<dot>...\n"
        )

    if len(token) < 50 or "." not in token or not token.startswith("pat"):
        print(
            "WARNING: AIRTABLE_TOKEN does not look like the current standard Airtable PAT shape. "
            "Continuing and letting Airtable validate it.",
            file=sys.stderr,
        )

    return token

def build_headers() -> Dict[str, str]:
    global _HEADERS_CACHE
    if _HEADERS_CACHE is None:
        _HEADERS_CACHE = {
            "Authorization": f"Bearer {get_token()}",
            "Accept": "application/json",
            "User-Agent": f"airtable-schema-exporter/{SCRIPT_VERSION}",
        }
    return _HEADERS_CACHE

def throttle() -> None:
    global _LAST_REQUEST_AT
    elapsed = time.time() - _LAST_REQUEST_AT
    if elapsed < MIN_SECONDS_BETWEEN_REQUESTS:
        time.sleep(MIN_SECONDS_BETWEEN_REQUESTS - elapsed)
    _LAST_REQUEST_AT = time.time()

def safe_json(response: requests.Response) -> Dict[str, Any]:
    try:
        return response.json()
    except Exception:
        return {"raw_text": response.text}

def api_get(
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 30,
    soft_fail_statuses: Optional[set[int]] = None,
) -> Dict[str, Any]:
    """
    GET with retry on 429 / transient errors.

    Raises RuntimeError for caller-managed soft failures.
    Raises SystemExit for hard failures.
    """
    soft_fail_statuses = soft_fail_statuses or set()
    backoff = 1.0

    for attempt in range(6):
        try:
            throttle()
            response = requests.get(
                url,
                headers=build_headers(),
                params=params,
                timeout=timeout,
            )
        except requests.RequestException as exc:
            if attempt == 5:
                raise SystemExit(f"Network error calling {url}: {exc}") from exc
            time.sleep(min(30.0, backoff))
            backoff *= 2.0
            continue

        if response.status_code == 429:
            if attempt == 5:
                raise SystemExit(f"429 Too Many Requests from {url}")
            retry_after = response.headers.get("Retry-After")
            try:
                sleep_for = float(retry_after) if retry_after else min(30.0, backoff)
            except ValueError:
                sleep_for = min(30.0, backoff)
            time.sleep(min(60.0, max(1.0, sleep_for)))
            backoff *= 2.0
            continue

        if 500 <= response.status_code < 600:
            if attempt == 5:
                raise SystemExit(
                    f"{response.status_code} {response.reason} from {url}: {response.text[:500]}"
                )
            time.sleep(min(30.0, backoff))
            backoff *= 2.0
            continue

        if response.ok:
            return safe_json(response)

        if response.status_code in soft_fail_statuses:
            raise RuntimeError(
                f"{response.status_code} {response.reason} from {url}: {response.text[:300]}"
            )

        if response.status_code == 401:
            raise SystemExit(
                "401 Unauthorized from Airtable.\n"
                "Check that:\n"
                "  • AIRTABLE_TOKEN is a Personal Access Token\n"
                "  • it has the needed Airtable scopes\n"
                "  • it has access to the target base/workspace\n"
            )

        if response.status_code == 403:
            raise SystemExit(
                "403 Forbidden from Airtable.\n"
                "Your token is valid but does not have permission for this base or endpoint."
            )

        if response.status_code == 404:
            raise SystemExit(
                f"404 Not Found from Airtable for {url}.\n"
                "Check the base ID and endpoint availability."
            )

        raise SystemExit(
            f"{response.status_code} {response.reason} from {url}: {response.text[:500]}"
        )

    raise SystemExit("Request failed after multiple retries.")

def api_get_soft(
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 30,
    verbose: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Soft-fail wrapper for optional endpoints.
    """
    try:
        return api_get(url, params=params, timeout=timeout, soft_fail_statuses={403, 404})
    except RuntimeError as exc:
        if verbose:
            print(f"Optional endpoint skipped: {exc}", file=sys.stderr)
        return None

# -----------------------------
# Base resolution
# -----------------------------
def list_bases_soft(verbose: bool = False) -> Optional[List[Dict[str, Any]]]:
    url = f"{API_ROOT}/meta/bases"
    data = api_get_soft(url, verbose=verbose)
    if not data:
        return None
    return data.get("bases", [])

def list_bases_hard() -> List[Dict[str, Any]]:
    data = api_get(f"{API_ROOT}/meta/bases")
    return data.get("bases", [])

def resolve_base_id_by_name(name: str) -> str:
    for base in list_bases_hard():
        if base.get("name") == name:
            return base["id"]
    raise SystemExit(
        f"Could not find a base named '{name}'. "
        "Check the exact spelling and confirm the token can see that base."
    )

def resolve_base_id(args_base_id: Optional[str], args_base_name: Optional[str]) -> str:
    """
    Resolution order:
      1) --base-id
      2) BASE_ID env
      3) AIRTABLE_BASE_ID env
      4) --base-name
    """
    if args_base_id:
        return args_base_id

    env_base = os.getenv("BASE_ID") or os.getenv("AIRTABLE_BASE_ID")
    if env_base:
        return env_base

    if args_base_name:
        return resolve_base_id_by_name(args_base_name)

    raise SystemExit(
        "No base specified.\n"
        "Use one of:\n"
        "  --base-id appXXXXXXXXXXXX\n"
        "or set BASE_ID / AIRTABLE_BASE_ID in .env\n"
    )

def resolve_base_name(base_id: str, args_base_name: Optional[str], verbose: bool = False) -> Optional[str]:
    """
    Best-effort base name resolution without making the script fragile.
    """
    env_name = os.getenv("BASE_NAME")
    if env_name:
        return env_name

    if args_base_name:
        return args_base_name

    bases = list_bases_soft(verbose=verbose)
    if bases:
        for base in bases:
            if base.get("id") == base_id:
                return base.get("name")

    return None

# -----------------------------
# Airtable metadata fetchers
# -----------------------------
def get_base_schema_raw(base_id: str) -> Dict[str, Any]:
    url = f"{API_ROOT}/meta/bases/{base_id}/tables"
    return api_get(url)

def try_get_views_list(base_id: str, verbose: bool = False) -> Optional[Dict[str, Any]]:
    url = f"{API_ROOT}/meta/bases/{base_id}/views"
    return api_get_soft(url, verbose=verbose)

def try_get_view_metadata(base_id: str, view_id: str, verbose: bool = False) -> Optional[Dict[str, Any]]:
    url = f"{API_ROOT}/meta/bases/{base_id}/views/{view_id}"
    return api_get_soft(url, verbose=verbose)

# -----------------------------
# Helpers
# -----------------------------
def now_iso() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")

def slugify(value: str) -> str:
    value = value.strip().replace(" ", "_")
    value = SAFE_FILENAME_RE.sub("_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "unnamed"

def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

def write_json(data: Any, path: Path) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def write_text(text: str, path: Path) -> None:
    path.write_text(text, encoding="utf-8")

def parse_only_tables(raw: Optional[str]) -> Optional[List[str]]:
    if not raw:
        return None
    names = [part.strip() for part in raw.split(",") if part.strip()]
    return names or None

def warn_missing_selected_tables(raw_tables: List[Dict[str, Any]], selected_tables: Optional[List[str]]) -> None:
    if not selected_tables:
        return
    existing = {table.get("name") for table in raw_tables}
    missing = [name for name in selected_tables if name not in existing]
    if missing:
        print(
            "WARNING: These --only tables were not found: " + ", ".join(missing),
            file=sys.stderr,
        )

def build_schema_field_maps(schema: Dict[str, Any]) -> Tuple[Dict[str, str], Dict[str, Dict[str, str]]]:
    field_id_to_name: Dict[str, str] = {}
    fields_by_table_id: Dict[str, Dict[str, str]] = {}
    for table in schema.get("tables", []):
        table_fields: Dict[str, str] = {}
        for field in table.get("fields", []):
            if field.get("id") and field.get("name"):
                field_id_to_name[field["id"]] = field["name"]
                table_fields[field["id"]] = field["name"]
        fields_by_table_id[table["id"]] = table_fields
    return field_id_to_name, fields_by_table_id

def resolve_field_id_list(field_ids: Any, field_id_to_name: Dict[str, str]) -> List[str]:
    if not isinstance(field_ids, list):
        return []
    return [field_id_to_name.get(fid, fid) for fid in field_ids]

def extract_field_refs_from_formula_text(formula: str) -> List[str]:
    if not formula:
        return []
    seen: List[str] = []
    for match in FIELD_REF_RE.findall(formula):
        if match not in seen:
            seen.append(match)
    return seen

def classify_field_role(field: Dict[str, Any]) -> str:
    ftype = field.get("type")
    name = (field.get("name") or "").lower()

    if ftype == "multipleRecordLinks":
        return "link"
    if ftype == "formula":
        return "formula"
    if ftype == "rollup":
        return "rollup"
    if ftype == "multipleLookupValues":
        return "lookup"
    if ftype == "count":
        return "count"
    if ftype in {"createdTime", "createdBy", "lastModifiedTime", "lastModifiedBy"}:
        return "audit"
    if "id" in name and ftype in {"singleLineText", "multilineText"}:
        return "identifier"
    if any(word in name for word in ["status", "state", "phase"]):
        return "status"
    if any(word in name for word in ["notes", "description", "bio", "comment"]):
        return "narrative"
    if "email" in name:
        return "contact"
    if "phone" in name or "cell" in name:
        return "contact"
    return "standard"

def classify_table_role(table_name: str, fields: List[Dict[str, Any]]) -> str:
    lname = (table_name or "").lower()
    field_types = {f.get("type") for f in fields}
    link_count = sum(1 for f in fields if f.get("type") == "multipleRecordLinks")

    if any(word in lname for word in ["log", "archive", "history", "audit"]):
        return "log/archive"
    if any(word in lname for word in ["config", "settings", "setup", "lookup", "reference"]):
        return "config/reference"
    if any(word in lname for word in ["join", "bridge", "xref", "mapping", "enrollment"]):
        return "join/bridge"
    if any(word in lname for word in ["summary", "rollup", "leaderboard"]):
        return "summary"
    if "formula" in field_types or "rollup" in field_types or "multipleLookupValues" in field_types:
        if link_count >= 2:
            return "operational summary"
    if link_count >= 3:
        return "hub/operational"
    return "standard"

def build_table_lookup(raw_tables: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    lookup: Dict[str, Dict[str, Any]] = {}
    for table in raw_tables:
        field_names = {
            field["id"]: field.get("name")
            for field in table.get("fields", [])
        }
        lookup[table["id"]] = {
            "id": table["id"],
            "name": table.get("name"),
            "field_names": field_names,
            "primaryFieldId": table.get("primaryFieldId") or table.get("primary_field_id"),
        }
    return lookup

def build_field_catalog(raw_tables: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    catalog: Dict[str, Dict[str, Any]] = {}
    for table in raw_tables:
        for field in table.get("fields", []):
            catalog[field["id"]] = {
                "fieldId": field["id"],
                "fieldName": field.get("name"),
                "fieldType": field.get("type"),
                "tableId": table["id"],
                "tableName": table.get("name"),
            }
    return catalog

def resolve_field_name(field_id: Optional[str], field_catalog: Dict[str, Dict[str, Any]]) -> Optional[str]:
    if not field_id:
        return None
    return field_catalog.get(field_id, {}).get("fieldName")

def resolve_field_table_name(field_id: Optional[str], field_catalog: Dict[str, Dict[str, Any]]) -> Optional[str]:
    if not field_id:
        return None
    return field_catalog.get(field_id, {}).get("tableName")

def result_info_from_options(options: Dict[str, Any]) -> Dict[str, Any]:
    result = options.get("result") or {}
    out: Dict[str, Any] = {}
    if result:
        out["resultType"] = result.get("type")
        if "options" in result:
            out["resultOptions"] = result.get("options")
    return {k: v for k, v in out.items() if v not in (None, [], {}, "")}

def summarize_choice_list_detailed(options: Dict[str, Any]) -> List[Dict[str, Any]]:
    choices = []
    for choice in options.get("choices", []):
        choices.append(
            {
                "id": choice.get("id"),
                "name": choice.get("name"),
                "color": choice.get("color"),
            }
        )
    return choices

def normalize_formula_references(
    options: Dict[str, Any],
    field_catalog: Dict[str, Dict[str, Any]],
) -> Tuple[List[str], List[str], str]:
    referenced_ids = options.get("referencedFieldIds") or []
    referenced_names = [resolve_field_name(fid, field_catalog) or fid for fid in referenced_ids]
    dependency_source = "metadata" if referenced_ids else "none"

    if not referenced_ids and options.get("formula"):
        referenced_names = extract_field_refs_from_formula_text(options["formula"])
        dependency_source = "formula_text_fallback" if referenced_names else "none"

    return referenced_ids, referenced_names, dependency_source

def field_options_summary(
    field: Dict[str, Any],
    table_lookup: Dict[str, Dict[str, Any]],
    field_catalog: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    ftype = field.get("type")
    options = field.get("options") or {}
    summary: Dict[str, Any] = {}

    if "isValid" in options:
        summary["isValid"] = options.get("isValid")

    summary.update(result_info_from_options(options))

    referenced_field_ids = options.get("referencedFieldIds")
    if referenced_field_ids:
        summary["referencedFieldIds"] = referenced_field_ids
        summary["referencedFieldNames"] = [
            resolve_field_name(fid, field_catalog) or fid
            for fid in referenced_field_ids
        ]

    if ftype in {"singleSelect", "multipleSelects"}:
        summary["choices"] = [c.get("name") for c in options.get("choices", []) if c.get("name")]
        summary["choicesDetailed"] = summarize_choice_list_detailed(options)

    elif ftype == "multipleRecordLinks":
        linked_table_id = options.get("linkedTableId")
        inverse_field_id = options.get("inverseLinkFieldId")
        linked_table = table_lookup.get(linked_table_id, {})

        summary.update(
            {
                "linkedTableId": linked_table_id,
                "linkedTableName": linked_table.get("name"),
                "inverseLinkFieldId": inverse_field_id,
                "inverseLinkFieldName": resolve_field_name(inverse_field_id, field_catalog),
                "prefersSingleRecordLink": options.get("prefersSingleRecordLink"),
                "isReversed": options.get("isReversed"),
                "viewIdForRecordSelection": options.get("viewIdForRecordSelection"),
            }
        )

    elif ftype == "formula":
        formula = options.get("formula")
        ref_ids, ref_names, dependency_source = normalize_formula_references(options, field_catalog)

        summary["formula"] = formula
        if ref_ids:
            summary["fieldReferencesById"] = ref_ids
        if ref_names:
            summary["fieldReferencesByName"] = ref_names
        summary["dependencySource"] = dependency_source

    elif ftype == "rollup":
        formula = options.get("formula")
        record_link_field_id = options.get("recordLinkFieldId")
        field_id_in_linked_table = options.get("fieldIdInLinkedTable")
        ref_ids = options.get("referencedFieldIds") or []

        summary.update(
            {
                "formula": formula,
                "recordLinkFieldId": record_link_field_id,
                "recordLinkFieldName": resolve_field_name(record_link_field_id, field_catalog),
                "fieldIdInLinkedTable": field_id_in_linked_table,
                "fieldNameInLinkedTable": resolve_field_name(field_id_in_linked_table, field_catalog),
                "fieldTableInLinkedTable": resolve_field_table_name(field_id_in_linked_table, field_catalog),
            }
        )
        if ref_ids:
            summary["referencedFieldIds"] = ref_ids
            summary["referencedFieldNames"] = [
                resolve_field_name(fid, field_catalog) or fid for fid in ref_ids
            ]

    elif ftype == "multipleLookupValues":
        record_link_field_id = options.get("recordLinkFieldId")
        field_id_in_linked_table = options.get("fieldIdInLinkedTable")
        summary.update(
            {
                "recordLinkFieldId": record_link_field_id,
                "recordLinkFieldName": resolve_field_name(record_link_field_id, field_catalog),
                "fieldIdInLinkedTable": field_id_in_linked_table,
                "fieldNameInLinkedTable": resolve_field_name(field_id_in_linked_table, field_catalog),
                "fieldTableInLinkedTable": resolve_field_table_name(field_id_in_linked_table, field_catalog),
                "isValid": options.get("isValid"),
            }
        )

    elif ftype == "count":
        record_link_field_id = options.get("recordLinkFieldId")
        summary.update(
            {
                "recordLinkFieldId": record_link_field_id,
                "recordLinkFieldName": resolve_field_name(record_link_field_id, field_catalog),
            }
        )

    elif ftype in {"date", "dateTime"}:
        summary["dateFormat"] = options.get("dateFormat")
        summary["timeFormat"] = options.get("timeFormat")
        summary["timeZone"] = options.get("timeZone")

    elif ftype in {"createdTime", "lastModifiedTime"}:
        ropts = (options.get("result") or {}).get("options") or {}
        summary["dateFormat"] = ropts.get("dateFormat")
        summary["timeFormat"] = ropts.get("timeFormat")
        summary["timeZone"] = ropts.get("timeZone")
        if options.get("fieldIds"):
            summary["fieldIds"] = options.get("fieldIds")
            summary["fieldNames"] = [
                resolve_field_name(fid, field_catalog) or fid
                for fid in options.get("fieldIds", [])
            ]

    elif ftype in {"createdBy", "lastModifiedBy"}:
        if options.get("fieldIds"):
            summary["fieldIds"] = options.get("fieldIds")
            summary["fieldNames"] = [
                resolve_field_name(fid, field_catalog) or fid
                for fid in options.get("fieldIds", [])
            ]

    elif ftype in {"number", "currency", "percent"}:
        summary["precision"] = options.get("precision")
        if ftype == "currency":
            summary["symbol"] = options.get("symbol")

    elif ftype == "rating":
        summary["icon"] = options.get("icon")
        summary["max"] = options.get("max")

    elif ftype == "checkbox":
        summary["icon"] = options.get("icon")
        summary["color"] = options.get("color")

    elif ftype == "duration":
        summary["durationFormat"] = options.get("durationFormat")

    elif ftype == "button":
        summary["label"] = options.get("label")
        summary["action"] = options.get("action")

    return {k: v for k, v in summary.items() if v not in (None, [], {}, "")}

def build_formula_dependency(
    table: Dict[str, Any],
    field: Dict[str, Any],
    field_catalog: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    options = field.get("options") or {}
    ref_ids, ref_names, dependency_source = normalize_formula_references(options, field_catalog)

    return {
        "tableId": table["id"],
        "table": table.get("name"),
        "fieldId": field["id"],
        "field": field.get("name"),
        "type": field.get("type"),
        "dependsOnFieldIds": ref_ids,
        "dependsOnFieldNames": ref_names,
        "dependencySource": dependency_source,
        "formula": options.get("formula"),
        "resultType": ((options.get("result") or {}).get("type")),
        "isValid": options.get("isValid"),
    }

def build_rollup_dependency(
    table: Dict[str, Any],
    field: Dict[str, Any],
    field_catalog: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    options = field.get("options") or {}
    record_link_field_id = options.get("recordLinkFieldId")
    field_id_in_linked_table = options.get("fieldIdInLinkedTable")
    referenced_ids = options.get("referencedFieldIds") or []

    return {
        "tableId": table["id"],
        "table": table.get("name"),
        "fieldId": field["id"],
        "field": field.get("name"),
        "type": field.get("type"),
        "recordLinkFieldId": record_link_field_id,
        "recordLinkFieldName": resolve_field_name(record_link_field_id, field_catalog),
        "fieldIdInLinkedTable": field_id_in_linked_table,
        "fieldNameInLinkedTable": resolve_field_name(field_id_in_linked_table, field_catalog),
        "fieldTableInLinkedTable": resolve_field_table_name(field_id_in_linked_table, field_catalog),
        "referencedFieldIds": referenced_ids,
        "referencedFieldNames": [resolve_field_name(fid, field_catalog) or fid for fid in referenced_ids],
        "formula": options.get("formula"),
        "resultType": ((options.get("result") or {}).get("type")),
        "isValid": options.get("isValid"),
    }

def build_lookup_dependency(
    table: Dict[str, Any],
    field: Dict[str, Any],
    field_catalog: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    options = field.get("options") or {}
    record_link_field_id = options.get("recordLinkFieldId")
    field_id_in_linked_table = options.get("fieldIdInLinkedTable")

    return {
        "tableId": table["id"],
        "table": table.get("name"),
        "fieldId": field["id"],
        "field": field.get("name"),
        "type": field.get("type"),
        "recordLinkFieldId": record_link_field_id,
        "recordLinkFieldName": resolve_field_name(record_link_field_id, field_catalog),
        "fieldIdInLinkedTable": field_id_in_linked_table,
        "fieldNameInLinkedTable": resolve_field_name(field_id_in_linked_table, field_catalog),
        "fieldTableInLinkedTable": resolve_field_table_name(field_id_in_linked_table, field_catalog),
        "resultType": ((options.get("result") or {}).get("type")),
        "isValid": options.get("isValid"),
    }

def build_count_dependency(
    table: Dict[str, Any],
    field: Dict[str, Any],
    field_catalog: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    options = field.get("options") or {}
    record_link_field_id = options.get("recordLinkFieldId")

    return {
        "tableId": table["id"],
        "table": table.get("name"),
        "fieldId": field["id"],
        "field": field.get("name"),
        "type": field.get("type"),
        "recordLinkFieldId": record_link_field_id,
        "recordLinkFieldName": resolve_field_name(record_link_field_id, field_catalog),
        "resultType": ((options.get("result") or {}).get("type")),
        "isValid": options.get("isValid"),
    }

# -----------------------------
# Simplification / enrichment
# -----------------------------
def simplify_schema(
    raw: Dict[str, Any],
    base_id: str,
    base_name: Optional[str],
    selected_tables: Optional[List[str]],
) -> Dict[str, Any]:
    raw_tables: List[Dict[str, Any]] = raw.get("tables", [])
    table_lookup = build_table_lookup(raw_tables)
    field_catalog = build_field_catalog(raw_tables)

    tables_out: List[Dict[str, Any]] = []
    links_out: List[Dict[str, Any]] = []
    dependencies_out: List[Dict[str, Any]] = []

    for table in raw_tables:
        table_name = table.get("name")
        if selected_tables and table_name not in selected_tables:
            continue

        primary_field_id = table.get("primaryFieldId") or table.get("primary_field_id")
        fields_out: List[Dict[str, Any]] = []

        for field in table.get("fields", []):
            options_summary = field_options_summary(field, table_lookup, field_catalog)
            entry: Dict[str, Any] = {
                "id": field["id"],
                "name": field.get("name"),
                "type": field.get("type"),
                "description": field.get("description"),
                "roleGuess": classify_field_role(field),
                "isPrimaryField": field["id"] == primary_field_id,
                "optionsSummary": options_summary,
                "optionsRaw": field.get("options"),
            }

            if field.get("type") == "multipleRecordLinks":
                links_out.append(
                    {
                        "fromTableId": table["id"],
                        "fromTable": table_name,
                        "fromFieldId": field["id"],
                        "fromField": field.get("name"),
                        "toTableId": options_summary.get("linkedTableId"),
                        "toTable": options_summary.get("linkedTableName"),
                        "inverseFieldId": options_summary.get("inverseLinkFieldId"),
                        "inverseField": options_summary.get("inverseLinkFieldName"),
                        "prefersSingleRecordLink": options_summary.get("prefersSingleRecordLink"),
                        "isReversed": options_summary.get("isReversed"),
                        "viewIdForRecordSelection": options_summary.get("viewIdForRecordSelection"),
                    }
                )

            if field.get("type") == "formula":
                dependencies_out.append(build_formula_dependency(table, field, field_catalog))
            elif field.get("type") == "rollup":
                dependencies_out.append(build_rollup_dependency(table, field, field_catalog))
            elif field.get("type") == "multipleLookupValues":
                dependencies_out.append(build_lookup_dependency(table, field, field_catalog))
            elif field.get("type") == "count":
                dependencies_out.append(build_count_dependency(table, field, field_catalog))

            fields_out.append(entry)

        tables_out.append(
            {
                "id": table["id"],
                "name": table_name,
                "description": table.get("description"),
                "primaryFieldId": primary_field_id,
                "primaryFieldName": table_lookup.get(table["id"], {}).get("field_names", {}).get(primary_field_id),
                "fieldCount": len(fields_out),
                "linkFieldCount": sum(1 for f in fields_out if f.get("type") == "multipleRecordLinks"),
                "computedFieldCount": sum(
                    1
                    for f in fields_out
                    if f.get("type") in {"formula", "rollup", "multipleLookupValues", "count"}
                ),
                "tableRoleGuess": classify_table_role(table_name or "", fields_out),
                "fields": fields_out,
            }
        )

    selected_names = {table["name"] for table in tables_out}

    links_out = [
        link
        for link in links_out
        if link.get("fromTable") in selected_names and link.get("toTable") in selected_names
    ]
    dependencies_out = [
        dep
        for dep in dependencies_out
        if dep.get("table") in selected_names
    ]

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": base_id,
            "baseName": base_name,
            "selectedTables": selected_tables or [],
            "tableCount": len(tables_out),
            "linkCount": len(links_out),
            "dependencyCount": len(dependencies_out),
        },
        "tables": tables_out,
        "links": links_out,
        "dependencies": dependencies_out,
    }

# -----------------------------
# Views enrichment
# -----------------------------
def simplify_views_basic(
    base_id: str,
    views_list_raw: Optional[Dict[str, Any]],
    simplified_schema: Dict[str, Any],
) -> Dict[str, Any]:
    if not views_list_raw:
        return {
            "exportMeta": {
                "scriptVersion": SCRIPT_VERSION,
                "generatedAt": now_iso(),
                "baseId": base_id,
                "available": False,
                "reason": "Views endpoint unavailable or not permitted for this token/base.",
                "viewCount": 0,
            },
            "views": [],
        }

    tables_by_id = {table["id"]: table for table in simplified_schema.get("tables", [])}
    field_id_to_name, _fields_by_table_id = build_schema_field_maps(simplified_schema)
    raw_views = views_list_raw.get("views", [])
    views_out: List[Dict[str, Any]] = []

    for view in raw_views:
        table_id = view.get("tableId")
        table_name = tables_by_id.get(table_id, {}).get("name")
        visible_field_ids = view.get("visibleFieldIds") or view.get("fieldOrder") or []
        views_out.append(
            {
                "id": view.get("id"),
                "name": view.get("name"),
                "type": view.get("type"),
                "tableId": table_id,
                "tableName": table_name,
                "personalForUserId": view.get("personalForUserId"),
                "visibleFieldIds": visible_field_ids,
                "visibleFieldNames": resolve_field_id_list(visible_field_ids, field_id_to_name),
            }
        )

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": base_id,
            "available": True,
            "viewCount": len(views_out),
        },
        "views": sorted(
            views_out,
            key=lambda item: ((item.get("tableName") or ""), (item.get("name") or "")),
        ),
    }

def simplify_views_detailed(
    base_id: str,
    basic_views_doc: Dict[str, Any],
    simplified_schema: Dict[str, Any],
    *,
    skip_view_details: bool,
    verbose: bool,
) -> Dict[str, Any]:
    if not basic_views_doc.get("exportMeta", {}).get("available"):
        return {
            "exportMeta": {
                "scriptVersion": SCRIPT_VERSION,
                "generatedAt": now_iso(),
                "baseId": base_id,
                "available": False,
                "reason": basic_views_doc.get("exportMeta", {}).get("reason", "Views unavailable."),
                "viewCount": 0,
                "detailedMetadataCount": 0,
            },
            "views": [],
        }

    if skip_view_details:
        return {
            "exportMeta": {
                "scriptVersion": SCRIPT_VERSION,
                "generatedAt": now_iso(),
                "baseId": base_id,
                "available": False,
                "reason": "Skipped by --skip-view-details",
                "viewCount": 0,
                "detailedMetadataCount": 0,
            },
            "views": [],
        }

    detailed_views: List[Dict[str, Any]] = []
    available_count = 0
    # Use the schema field map first, then enrich from the basic view list if present.
    field_id_to_name, _fields_by_table_id = build_schema_field_maps(simplified_schema)
    for view in basic_views_doc.get("views", []):
        for fid, fname in zip(view.get("visibleFieldIds", []), view.get("visibleFieldNames", [])):
            if fid and fname:
                field_id_to_name[fid] = fname

    for view in basic_views_doc.get("views", []):
        view_id = view.get("id")
        if not view_id:
            continue

        meta = try_get_view_metadata(base_id, view_id, verbose=verbose)
        entry = dict(view)

        if meta:
            available_count += 1
            entry["metadataRaw"] = meta
            for key in (
                "visibleFieldIds",
                "fieldOrder",
                "sorts",
                "filters",
                "groupLevels",
                "color",
                "description",
            ):
                if key in meta:
                    entry[key] = meta.get(key)
                    if key in {"visibleFieldIds", "fieldOrder"}:
                        entry[f"{key}Resolved"] = resolve_field_id_list(meta.get(key), field_id_to_name)

        detailed_views.append(entry)

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": base_id,
            "available": available_count > 0,
            "viewCount": len(detailed_views),
            "detailedMetadataCount": available_count,
        },
        "views": detailed_views,
    }

# -----------------------------
# Secondary exports
# -----------------------------
def build_base_summary(schema: Dict[str, Any], views_basic: Dict[str, Any], views_detailed: Dict[str, Any]) -> Dict[str, Any]:
    tables = schema.get("tables", [])
    links = schema.get("links", [])
    dependencies = schema.get("dependencies", [])

    link_degree: Dict[str, int] = defaultdict(int)
    for link in links:
        if link.get("fromTable"):
            link_degree[link["fromTable"]] += 1
        if link.get("toTable"):
            link_degree[link["toTable"]] += 1

    view_counts: Dict[str, int] = defaultdict(int)
    for view in views_basic.get("views", []):
        if view.get("tableName"):
            view_counts[view["tableName"]] += 1

    hubs = sorted(
        [{"table": name, "degree": degree} for name, degree in link_degree.items()],
        key=lambda item: (-item["degree"], item["table"]),
    )

    most_computed = sorted(
        [
            {
                "table": table["name"],
                "computedFieldCount": table.get("computedFieldCount", 0),
            }
            for table in tables
        ],
        key=lambda item: (-item["computedFieldCount"], item["table"]),
    )

    return {
        "baseId": schema.get("exportMeta", {}).get("baseId"),
        "baseName": schema.get("exportMeta", {}).get("baseName"),
        "generatedAt": now_iso(),
        "tableCount": len(tables),
        "viewCountBasic": len(views_basic.get("views", [])),
        "viewCountDetailed": len(views_detailed.get("views", [])),
        "linkCount": len(links),
        "dependencyCount": len(dependencies),
        "tables": [table["name"] for table in tables],
        "topHubTables": hubs[:10],
        "mostComputedTables": most_computed[:10],
        "viewsPerTable": dict(sorted(view_counts.items())),
    }

def build_health_report(schema: Dict[str, Any]) -> Dict[str, Any]:
    warnings: List[Dict[str, Any]] = []
    tables = schema.get("tables", [])
    links = schema.get("links", [])
    dependencies = schema.get("dependencies", [])

    for table in tables:
        name = table["name"]
        if not table.get("description"):
            warnings.append(
                {
                    "severity": "info",
                    "category": "missing_description",
                    "table": name,
                    "message": f"Table '{name}' has no description.",
                }
            )

        if table.get("computedFieldCount", 0) >= 20:
            warnings.append(
                {
                    "severity": "warning",
                    "category": "high_computed_field_count",
                    "table": name,
                    "message": f"Table '{name}' has {table.get('computedFieldCount')} computed fields.",
                }
            )

        if "legacy" in name.lower() or name.startswith("ZZZ"):
            warnings.append(
                {
                    "severity": "info",
                    "category": "legacy_table",
                    "table": name,
                    "message": f"Table '{name}' appears to be legacy or deprecated.",
                }
            )

    for link in links:
        if link.get("fromTable") == link.get("toTable"):
            warnings.append(
                {
                    "severity": "warning",
                    "category": "self_link",
                    "table": link.get("fromTable"),
                    "field": link.get("fromField"),
                    "message": f"Self-link detected on '{link.get('fromTable')}' via field '{link.get('fromField')}'.",
                }
            )

        if not link.get("inverseField"):
            warnings.append(
                {
                    "severity": "info",
                    "category": "missing_inverse_field_name",
                    "table": link.get("fromTable"),
                    "field": link.get("fromField"),
                    "message": f"Inverse link field name could not be resolved for '{link.get('fromField')}'.",
                }
            )

    for dep in dependencies:
        dep_names = dep.get("dependsOnFieldNames") or dep.get("referencedFieldNames") or []
        if len(dep_names) >= 6:
            warnings.append(
                {
                    "severity": "info",
                    "category": "complex_dependency",
                    "table": dep.get("table"),
                    "field": dep.get("field"),
                    "message": f"Field '{dep.get('field')}' depends on many fields ({len(dep_names)}).",
                }
            )

        if dep.get("type") == "formula" and dep.get("isValid") is False:
            warnings.append(
                {
                    "severity": "warning",
                    "category": "invalid_formula",
                    "table": dep.get("table"),
                    "field": dep.get("field"),
                    "message": f"Formula field '{dep.get('field')}' is marked invalid.",
                }
            )

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": schema.get("exportMeta", {}).get("baseId"),
            "baseName": schema.get("exportMeta", {}).get("baseName"),
            "warningCount": len(warnings),
        },
        "warnings": warnings,
    }

def build_field_index(schema: Dict[str, Any]) -> Dict[str, Any]:
    by_field_id: Dict[str, Dict[str, Any]] = {}
    by_table: Dict[str, List[Dict[str, Any]]] = {}
    by_field_name: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    formulas_by_result_type: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    links: List[Dict[str, Any]] = []

    for table in schema.get("tables", []):
        table_name = table["name"]
        by_table[table_name] = []

        for field in table.get("fields", []):
            record = {
                "tableId": table["id"],
                "tableName": table_name,
                "fieldId": field["id"],
                "fieldName": field["name"],
                "fieldType": field.get("type"),
                "roleGuess": field.get("roleGuess"),
                "isPrimaryField": field.get("isPrimaryField"),
                "resultType": (field.get("optionsSummary") or {}).get("resultType"),
            }

            by_field_id[field["id"]] = record
            by_table[table_name].append(record)
            by_field_name[field["name"]].append(record)

            if field.get("type") == "formula":
                formulas_by_result_type[record.get("resultType") or "unknown"].append(record)

    for link in schema.get("links", []):
        links.append(
            {
                "fromTable": link.get("fromTable"),
                "fromField": link.get("fromField"),
                "toTable": link.get("toTable"),
                "inverseField": link.get("inverseField"),
                "prefersSingleRecordLink": link.get("prefersSingleRecordLink"),
            }
        )

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": schema.get("exportMeta", {}).get("baseId"),
            "baseName": schema.get("exportMeta", {}).get("baseName"),
            "tableCount": len(schema.get("tables", [])),
            "fieldCount": len(by_field_id),
        },
        "byFieldId": by_field_id,
        "byFieldName": dict(sorted(by_field_name.items())),
        "byTable": by_table,
        "formulasByResultType": dict(sorted(formulas_by_result_type.items())),
        "links": links,
    }

def build_invalid_fields_report(schema: Dict[str, Any]) -> Dict[str, Any]:
    invalid_fields: List[Dict[str, Any]] = []

    for table in schema.get("tables", []):
        for field in table.get("fields", []):
            options_summary = field.get("optionsSummary") or {}
            if options_summary.get("isValid") is False:
                invalid_fields.append(
                    {
                        "tableId": table["id"],
                        "tableName": table["name"],
                        "fieldId": field["id"],
                        "fieldName": field["name"],
                        "fieldType": field.get("type"),
                        "optionsSummary": options_summary,
                    }
                )

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": schema.get("exportMeta", {}).get("baseId"),
            "baseName": schema.get("exportMeta", {}).get("baseName"),
            "invalidFieldCount": len(invalid_fields),
        },
        "invalidFields": invalid_fields,
    }

def build_complex_formulas_report(schema: Dict[str, Any], min_dependencies: int = 6) -> Dict[str, Any]:
    complex_formulas: List[Dict[str, Any]] = []

    dep_lookup: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for dep in schema.get("dependencies", []):
        dep_lookup[(dep.get("tableId"), dep.get("fieldId"))] = dep

    for table in schema.get("tables", []):
        for field in table.get("fields", []):
            if field.get("type") != "formula":
                continue

            dep = dep_lookup.get((table["id"], field["id"]), {})
            dep_names = dep.get("dependsOnFieldNames") or []
            formula = (field.get("optionsSummary") or {}).get("formula")

            if len(dep_names) >= min_dependencies:
                complex_formulas.append(
                    {
                        "tableId": table["id"],
                        "tableName": table["name"],
                        "fieldId": field["id"],
                        "fieldName": field["name"],
                        "dependencyCount": len(dep_names),
                        "dependsOnFieldNames": dep_names,
                        "formula": formula,
                        "resultType": (field.get("optionsSummary") or {}).get("resultType"),
                        "isValid": (field.get("optionsSummary") or {}).get("isValid"),
                    }
                )

    complex_formulas.sort(key=lambda x: (-x["dependencyCount"], x["tableName"], x["fieldName"]))

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "baseId": schema.get("exportMeta", {}).get("baseId"),
            "baseName": schema.get("exportMeta", {}).get("baseName"),
            "threshold": min_dependencies,
            "complexFormulaCount": len(complex_formulas),
        },
        "complexFormulas": complex_formulas,
    }

# -----------------------------
# Optional record audits
# -----------------------------
def airtable_record_url(base_id: str, table_name: str) -> str:
    return f"{API_ROOT}/{base_id}/{quote(table_name, safe='')}"

def list_records(
    base_id: str,
    table_name: str,
    *,
    max_records: int,
    page_size: int = 100,
    verbose: bool = False,
) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    offset: Optional[str] = None
    url = airtable_record_url(base_id, table_name)

    while True:
        params: Dict[str, Any] = {"pageSize": min(100, max(1, page_size))}
        if offset:
            params["offset"] = offset
        remaining = max_records - len(records)
        if remaining <= 0:
            break
        params["pageSize"] = min(params["pageSize"], remaining)

        data = api_get_soft(url, params=params, verbose=verbose)
        if not data:
            break

        batch = data.get("records", [])
        records.extend(batch)
        offset = data.get("offset")
        if not offset or not batch:
            break

    return records

def load_records_for_audits(
    base_id: str,
    schema: Dict[str, Any],
    *,
    max_records_per_table: int,
    audit_tables: Optional[List[str]],
    verbose: bool,
) -> Dict[str, List[Dict[str, Any]]]:
    selected = set(audit_tables or [])
    records_by_table: Dict[str, List[Dict[str, Any]]] = {}

    for table in schema.get("tables", []):
        table_name = table.get("name")
        if not table_name:
            continue
        if selected and table_name not in selected:
            continue
        if verbose:
            print(f"Fetching records for audit: {table_name}")
        records_by_table[table_name] = list_records(
            base_id,
            table_name,
            max_records=max_records_per_table,
            verbose=verbose,
        )

    return records_by_table

def get_record_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    return record.get("fields") or {}

def is_blank(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}

def parse_airtable_date(value: Any) -> Optional[dt.date]:
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    try:
        return dt.date.fromisoformat(text[:10])
    except ValueError:
        return None

def build_record_counts_report(records_by_table: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    return {
        "exportMeta": {"scriptVersion": SCRIPT_VERSION, "generatedAt": now_iso()},
        "tables": [
            {"tableName": table_name, "recordsFetched": len(records)}
            for table_name, records in sorted(records_by_table.items())
        ],
    }

def build_single_select_usage_report(
    schema: Dict[str, Any],
    records_by_table: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    reports: List[Dict[str, Any]] = []

    for table in schema.get("tables", []):
        table_name = table.get("name")
        records = records_by_table.get(table_name or "", [])
        if not records:
            continue
        for field in table.get("fields", []):
            if field.get("type") not in {"singleSelect", "multipleSelects"}:
                continue
            field_name = field.get("name")
            options = field.get("optionsSummary") or {}
            defined = set(options.get("choices") or [])
            used: Set[str] = set()
            blank_count = 0
            for record in records:
                value = get_record_fields(record).get(field_name)
                if is_blank(value):
                    blank_count += 1
                    continue
                if isinstance(value, list):
                    used.update(str(v) for v in value)
                else:
                    used.add(str(value))
            reports.append(
                {
                    "tableName": table_name,
                    "fieldName": field_name,
                    "fieldType": field.get("type"),
                    "definedOptions": sorted(defined),
                    "usedOptions": sorted(used),
                    "definedButUnused": sorted(defined - used),
                    "usedButNotDefined": sorted(used - defined),
                    "blankCount": blank_count,
                    "recordsChecked": len(records),
                }
            )

    return {
        "exportMeta": {"scriptVersion": SCRIPT_VERSION, "generatedAt": now_iso(), "reportCount": len(reports)},
        "selectFields": reports,
    }

def build_blank_fields_report(
    records_by_table: Dict[str, List[Dict[str, Any]]],
    key_field_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    key_field_names = key_field_names or [
        "Enrollment", "Week", "Activity Date", "Submitted At", "XP Bucket", "XP Source",
        "XP Source Date", "XP Dedupe Key", "XP Dedupe Key Normalized", "Source Key",
        "Award Status", "Upload Status", "Completion Status", "Send Status",
    ]
    reports: List[Dict[str, Any]] = []

    for table_name, records in sorted(records_by_table.items()):
        available_fields: Set[str] = set()
        for record in records:
            available_fields.update(get_record_fields(record).keys())
        fields_to_check = [field for field in key_field_names if field in available_fields]
        if not fields_to_check:
            continue
        table_report = {"tableName": table_name, "recordsChecked": len(records), "fields": []}
        for field in fields_to_check:
            blank_ids = [record.get("id") for record in records if is_blank(get_record_fields(record).get(field))]
            if blank_ids:
                table_report["fields"].append(
                    {"fieldName": field, "blankCount": len(blank_ids), "sampleRecordIds": blank_ids[:25]}
                )
        if table_report["fields"]:
            reports.append(table_report)

    return {
        "exportMeta": {"scriptVersion": SCRIPT_VERSION, "generatedAt": now_iso(), "tableIssueCount": len(reports)},
        "tables": reports,
    }

def build_duplicate_key_report(
    records_by_table: Dict[str, List[Dict[str, Any]]],
    key_field_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    key_field_names = key_field_names or [
        "XP Dedupe Key Normalized", "XP Dedupe Key", "Source Key", "Weekly Summary Key",
        "Streak Occurrence Key", "Unlock Key", "Milestone Source Key", "Streak Instance Key",
    ]
    reports: List[Dict[str, Any]] = []

    for table_name, records in sorted(records_by_table.items()):
        available_fields: Set[str] = set()
        for record in records:
            available_fields.update(get_record_fields(record).keys())
        fields_to_check = [field for field in key_field_names if field in available_fields]
        for field in fields_to_check:
            buckets: Dict[str, List[str]] = defaultdict(list)
            for record in records:
                value = get_record_fields(record).get(field)
                if not is_blank(value):
                    buckets[str(value)].append(record.get("id"))
            duplicates = [
                {"value": value, "count": len(ids), "recordIds": ids[:25]}
                for value, ids in buckets.items()
                if len(ids) > 1
            ]
            if duplicates:
                reports.append(
                    {
                        "tableName": table_name,
                        "fieldName": field,
                        "duplicateGroupCount": len(duplicates),
                        "duplicates": sorted(duplicates, key=lambda item: -item["count"]),
                    }
                )

    return {
        "exportMeta": {"scriptVersion": SCRIPT_VERSION, "generatedAt": now_iso(), "duplicateFieldCount": len(reports)},
        "duplicateFields": reports,
    }

def build_xp_events_health_report(records_by_table: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    records = records_by_table.get("XP Events", [])
    required = ["Enrollment", "XP Bucket", "XP Source", "XP Amount", "XP Source Date", "XP Dedupe Key"]
    issue_counts: Dict[str, int] = defaultdict(int)
    samples: Dict[str, List[str]] = defaultdict(list)
    bucket_counts: Dict[str, int] = defaultdict(int)

    for record in records:
        fields = get_record_fields(record)
        bucket = fields.get("XP Bucket") or fields.get("XP Source") or "Unknown"
        bucket_counts[str(bucket)] += 1
        for field in required:
            if field in fields or any(field in get_record_fields(r) for r in records[:10]):
                if is_blank(fields.get(field)):
                    key = f"blank_{field}"
                    issue_counts[key] += 1
                    if len(samples[key]) < 25:
                        samples[key].append(record.get("id"))
        amount = fields.get("XP Amount")
        if amount in (0, "0", None, ""):
            issue_counts["zero_or_blank_xp_amount"] += 1
            if len(samples["zero_or_blank_xp_amount"]) < 25:
                samples["zero_or_blank_xp_amount"].append(record.get("id"))

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "recordsChecked": len(records),
            "available": bool(records),
        },
        "bucketCounts": dict(sorted(bucket_counts.items())),
        "issueCounts": dict(sorted(issue_counts.items())),
        "sampleRecordIds": dict(samples),
    }

def build_date_mismatch_report(records_by_table: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    today = dt.date.today()
    reports: List[Dict[str, Any]] = []
    for table_name, records in sorted(records_by_table.items()):
        future_activity: List[str] = []
        missing_activity_with_submitted: List[str] = []
        for record in records:
            fields = get_record_fields(record)
            activity = parse_airtable_date(fields.get("Activity Date"))
            submitted = fields.get("Submitted At")
            if activity and activity > today:
                future_activity.append(record.get("id"))
            if "Activity Date" in fields and "Submitted At" in fields and is_blank(fields.get("Activity Date")) and not is_blank(submitted):
                missing_activity_with_submitted.append(record.get("id"))
        if future_activity or missing_activity_with_submitted:
            reports.append(
                {
                    "tableName": table_name,
                    "futureActivityDateCount": len(future_activity),
                    "futureActivityDateSampleRecordIds": future_activity[:25],
                    "missingActivityDateWithSubmittedAtCount": len(missing_activity_with_submitted),
                    "missingActivityDateWithSubmittedAtSampleRecordIds": missing_activity_with_submitted[:25],
                }
            )
    return {
        "exportMeta": {"scriptVersion": SCRIPT_VERSION, "generatedAt": now_iso(), "tableIssueCount": len(reports)},
        "tables": reports,
    }

def build_level_gate_blockers_report(records_by_table: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    records = records_by_table.get("Enrollments", [])
    blockers: List[Dict[str, Any]] = []
    for record in records:
        fields = get_record_fields(record)
        status = str(fields.get("Level Status") or "")
        failure = fields.get("Gate Failure Summary") or fields.get("Gate Debug Summary") or fields.get("Gate Summary")
        if "block" in status.lower() or failure:
            blockers.append(
                {
                    "recordId": record.get("id"),
                    "name": fields.get("Name") or fields.get("Enrollment") or fields.get("Athlete") or record.get("id"),
                    "currentLevel": fields.get("Current Level"),
                    "nextLevel": fields.get("Next Level"),
                    "levelStatus": fields.get("Level Status"),
                    "gateFailureSummary": failure,
                }
            )
    return {
        "exportMeta": {"scriptVersion": SCRIPT_VERSION, "generatedAt": now_iso(), "blockerCount": len(blockers)},
        "blockers": blockers,
    }

def build_homework_pipeline_report(records_by_table: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    assets = records_by_table.get("Submission Assets", [])
    completions = records_by_table.get("Homework Completions", [])
    asset_counts: Dict[str, int] = defaultdict(int)
    completion_counts: Dict[str, int] = defaultdict(int)

    for record in assets:
        fields = get_record_fields(record)
        if is_blank(fields.get("Homework Completions")) and is_blank(fields.get("Homework Completion")):
            asset_counts["assets_missing_homework_completion_link"] += 1
        if str(fields.get("Upload Status") or "").lower() in {"processing", "error", "failed"}:
            asset_counts[f"asset_upload_status_{fields.get('Upload Status')}"] += 1
        if fields.get("Send to Make Trigger") in (False, 0, None, ""):
            asset_counts["send_to_make_trigger_not_checked_or_blank"] += 1

    for record in completions:
        fields = get_record_fields(record)
        if is_blank(fields.get("Submission Assets")) and is_blank(fields.get("Assets")):
            completion_counts["completion_missing_assets_link"] += 1
        if fields.get("Satisfactory?") and is_blank(fields.get("Base XP Awarded")):
            completion_counts["satisfactory_missing_base_xp_awarded"] += 1
        if fields.get("Coach Feedback") and fields.get("Satisfactory?") and not fields.get("Parent Feedback Ready?"):
            completion_counts["feedback_satisfactory_not_parent_ready"] += 1

    return {
        "exportMeta": {
            "scriptVersion": SCRIPT_VERSION,
            "generatedAt": now_iso(),
            "submissionAssetsChecked": len(assets),
            "homeworkCompletionsChecked": len(completions),
        },
        "submissionAssetIssueCounts": dict(sorted(asset_counts.items())),
        "homeworkCompletionIssueCounts": dict(sorted(completion_counts.items())),
    }

def build_record_audit_package(schema: Dict[str, Any], records_by_table: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    return {
        "recordCounts": build_record_counts_report(records_by_table),
        "singleSelectUsage": build_single_select_usage_report(schema, records_by_table),
        "blankFields": build_blank_fields_report(records_by_table),
        "duplicateKeys": build_duplicate_key_report(records_by_table),
        "xpEventsHealth": build_xp_events_health_report(records_by_table),
        "dateMismatches": build_date_mismatch_report(records_by_table),
        "levelGateBlockers": build_level_gate_blockers_report(records_by_table),
        "homeworkPipeline": build_homework_pipeline_report(records_by_table),
    }

# -----------------------------
# Renderers
# -----------------------------
def render_markdown(
    schema: Dict[str, Any],
    views_basic: Dict[str, Any],
    views_detailed: Dict[str, Any],
    summary: Dict[str, Any],
    health: Dict[str, Any],
) -> str:
    lines: List[str] = []
    meta = schema.get("exportMeta", {})

    lines.append("# Airtable Schema Snapshot")
    lines.append("")
    lines.append(f"- Generated: `{meta.get('generatedAt')}`")
    lines.append(f"- Script version: `{meta.get('scriptVersion')}`")
    lines.append(f"- Base ID: `{meta.get('baseId')}`")
    if meta.get("baseName"):
        lines.append(f"- Base Name: **{meta.get('baseName')}**")
    lines.append(f"- Tables exported: **{meta.get('tableCount')}**")
    lines.append(f"- Links found: **{meta.get('linkCount')}**")
    lines.append(f"- Dependencies found: **{meta.get('dependencyCount')}**")
    lines.append(f"- Basic views exported: **{views_basic.get('exportMeta', {}).get('viewCount', 0)}**")
    lines.append(
        f"- Detailed view metadata exported: **{views_detailed.get('exportMeta', {}).get('detailedMetadataCount', 0)}**"
    )
    lines.append(f"- Health warnings: **{health.get('exportMeta', {}).get('warningCount', 0)}**")
    lines.append("")

    if summary.get("topHubTables"):
        lines.append("## Base Summary")
        lines.append("")
        lines.append("### Hub Tables")
        for item in summary["topHubTables"]:
            lines.append(f"- **{item['table']}** — link degree `{item['degree']}`")
        lines.append("")

    if health.get("warnings"):
        lines.append("## Health Report")
        lines.append("")
        for warning in health["warnings"]:
            parts = [f"[{warning.get('severity','info').upper()}] {warning.get('message','')}"]
            if warning.get("table"):
                parts.append(f"table=`{warning['table']}`")
            if warning.get("field"):
                parts.append(f"field=`{warning['field']}`")
            lines.append(f"- {' | '.join(parts)}")
        lines.append("")

    if schema.get("links"):
        lines.append("## Linked-record Relationships")
        lines.append("")
        for link in sorted(
            schema["links"],
            key=lambda item: (item.get("fromTable") or "", item.get("fromField") or ""),
        ):
            from_table = link.get("fromTable") or "?"
            from_field = link.get("fromField") or "?"
            to_table = link.get("toTable") or "?"
            inverse = link.get("inverseField") or "—"
            single = link.get("prefersSingleRecordLink")
            lines.append(
                f"- **{from_table}** → **{to_table}** via **{from_field}** "
                f"(inverse: _{inverse}_; single?: `{single}`)"
            )
        lines.append("")

    if views_basic.get("views"):
        lines.append("## Views (Basic)")
        lines.append("")
        grouped_views: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for view in views_basic["views"]:
            grouped_views[view.get("tableName") or "Unknown Table"].append(view)

        for table_name in sorted(grouped_views):
            lines.append(f"### {table_name}")
            for view in grouped_views[table_name]:
                row = f"- **{view.get('name', '?')}**  \n  - id: `{view.get('id', '')}`"
                if view.get("type"):
                    row += f"  \n  - type: `{view.get('type')}`"
                lines.append(row)
            lines.append("")

    for table in schema.get("tables", []):
        lines.append(f"## Table: **{table['name']}**")
        lines.append("")
        lines.append(f"- id: `{table['id']}`")
        lines.append(
            f"- primary field: **{table.get('primaryFieldName') or 'Unknown'}** "
            f"(`{table.get('primaryFieldId')}`)"
        )
        lines.append(f"- role guess: `{table.get('tableRoleGuess')}`")
        lines.append(f"- fields: `{table.get('fieldCount', 0)}`")
        lines.append(f"- link fields: `{table.get('linkFieldCount', 0)}`")
        lines.append(f"- computed fields: `{table.get('computedFieldCount', 0)}`")
        if table.get("description"):
            lines.append(f"- description: {table['description']}")
        lines.append("")
        lines.append("### Fields")
        lines.append("")

        for field in table.get("fields", []):
            lines.append(f"- **{field['name']}**")
            lines.append(f"  - id: `{field['id']}`")
            lines.append(f"  - type: `{field.get('type')}`")
            lines.append(f"  - role: `{field.get('roleGuess')}`")
            lines.append(f"  - primary: `{field.get('isPrimaryField')}`")
            if field.get("description"):
                lines.append(f"  - desc: {field['description']}")

            options_summary = field.get("optionsSummary") or {}
            if options_summary:
                lines.append(f"  - options summary: `{compact_json(options_summary)}`")
        lines.append("")

    if schema.get("dependencies"):
        lines.append("## Dependencies")
        lines.append("")
        for dep in schema["dependencies"]:
            row = f"- **{dep.get('table')}** → **{dep.get('field')}** (`{dep.get('type')}`)"
            refs = dep.get("dependsOnFieldNames") or dep.get("referencedFieldNames") or []
            if refs:
                row += " depends on: " + ", ".join(f"`{ref}`" for ref in refs)
            elif dep.get("recordLinkFieldName") or dep.get("fieldNameInLinkedTable"):
                row += (
                    f" uses recordLinkField=`{dep.get('recordLinkFieldName')}`"
                    f", linkedField=`{dep.get('fieldNameInLinkedTable')}`"
                )
            lines.append(row)
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"

def render_views_markdown(views_basic: Dict[str, Any], views_detailed: Dict[str, Any]) -> str:
    lines: List[str] = []

    basic_meta = views_basic.get("exportMeta", {})
    detailed_meta = views_detailed.get("exportMeta", {})

    lines.append("# Airtable Views Snapshot")
    lines.append("")
    lines.append(f"- Generated: `{basic_meta.get('generatedAt') or detailed_meta.get('generatedAt')}`")
    lines.append(f"- Basic views available: `{basic_meta.get('available')}`")
    if basic_meta.get("reason"):
        lines.append(f"- Basic views note: {basic_meta['reason']}")
    lines.append(f"- Basic view count: `{basic_meta.get('viewCount', 0)}`")
    lines.append(f"- Detailed views available: `{detailed_meta.get('available')}`")
    if detailed_meta.get("reason"):
        lines.append(f"- Detailed views note: {detailed_meta['reason']}")
    lines.append(f"- Detailed metadata count: `{detailed_meta.get('detailedMetadataCount', 0)}`")
    lines.append("")

    detailed_by_id = {v.get("id"): v for v in views_detailed.get("views", [])}

    for view in views_basic.get("views", []):
        detailed = detailed_by_id.get(view.get("id"), {})
        lines.append(f"## View: **{view.get('name', '?')}**")
        lines.append("")
        lines.append(f"- id: `{view.get('id', '')}`")
        lines.append(
            f"- table: **{view.get('tableName') or 'Unknown'}** "
            f"(`{view.get('tableId') or ''}`)"
        )
        if view.get("type"):
            lines.append(f"- type: `{view.get('type')}`")
        if view.get("personalForUserId"):
            lines.append(f"- personalForUserId: `{view.get('personalForUserId')}`")

        for key in (
            "visibleFieldIds",
            "fieldOrder",
            "sorts",
            "filters",
            "groupLevels",
            "color",
            "description",
        ):
            if key in detailed:
                lines.append(f"- {key}: `{compact_json(detailed.get(key))}`")

        lines.append("")

    return "\n".join(lines).rstrip() + "\n"

def render_mermaid(schema: Dict[str, Any]) -> str:
    lines = ["erDiagram"]

    for link in sorted(
        schema.get("links", []),
        key=lambda item: (item.get("fromTable") or "", item.get("toTable") or ""),
    ):
        left = slugify(link.get("fromTable") or "UNKNOWN")
        right = slugify(link.get("toTable") or "UNKNOWN")
        label = (link.get("fromField") or "links_to").replace('"', "'")
        relationship = "||--o|" if link.get("prefersSingleRecordLink") else "||--o{"
        lines.append(f'  {left} {relationship} {right} : "{label}"')

    if len(lines) == 1:
        lines.append('  EMPTY_BASE ||--o{ EMPTY_BASE : "no_links_found"')

    return "\n".join(lines) + "\n"

def render_workflow_companion_template(schema: Dict[str, Any]) -> str:
    base_name = schema.get("exportMeta", {}).get("baseName") or ""
    base_id = schema.get("exportMeta", {}).get("baseId") or ""

    text = f"""# Workflow Companion Template

Base Name: {base_name}
Base ID: {base_id}
Generated: {now_iso()}

Use this file to document the parts Airtable's metadata API does not export well.

## 1. Automations
For each automation, record:
- Name:
- Trigger type:
- Trigger table:
- Trigger view:
- Trigger field(s):
- Conditions:
- Action summary:
- Script step present? (Yes/No)
- Script location / notes:
- Outputs written back to Airtable:
- Related external systems:

## 2. Interfaces
For each interface, record:
- Interface name:
- Audience:
- Main pages:
- Key buttons/actions:
- Any record filters:
- Dependencies on views or permissions:

## 3. External Integrations
Record anything connected to this base:
- Fillout forms
- Make scenarios
- Google Apps Script web apps
- Python runners
- Softr apps
- Webhooks
- Email tools
- Google Drive folder dependencies

Suggested fields:
- Integration name:
- Purpose:
- Trigger source:
- Airtable tables touched:
- Airtable fields touched:
- External URL / script path:
- Owner:
- Notes / failure points:

## 4. Operational Notes
Document anything important that schema alone does not show:
- Naming conventions
- Manual processes
- Legacy tables/fields to avoid
- Safe fields to edit
- High-risk fields to avoid changing
- Known troubleshooting notes

## 5. Recommended High-Risk Areas
Based on current export:
"""
    sorted_tables = sorted(
        schema.get("tables", []),
        key=lambda t: (-t.get("computedFieldCount", 0), -t.get("linkFieldCount", 0), t.get("name", "")),
    )
    for table in sorted_tables[:10]:
        text += (
            f"- {table.get('name')}: "
            f"{table.get('computedFieldCount', 0)} computed fields, "
            f"{table.get('linkFieldCount', 0)} link fields\n"
        )

    return text

# -----------------------------
# Main
# -----------------------------
def main() -> None:
    init_env()

    parser = argparse.ArgumentParser(
        description=(
            "Export Airtable base schema with richer detail. "
            "Uses BASE_ID / AIRTABLE_BASE_ID in .env by default."
        )
    )
    parser.add_argument("--base-id", help="Base ID, e.g. appXXXXXXXXXXXX")
    parser.add_argument(
        "--base-name",
        help="Exact Airtable base name. Only use this if you want to resolve by name.",
    )
    parser.add_argument(
        "--out-dir",
        default=str(DEFAULT_OUT_DIR),
        help="Directory to write output files (default: repo airtable/schema/snapshots)",
    )
    parser.add_argument(
        "--only",
        help="Comma-separated table names to include",
    )
    parser.add_argument(
        "--skip-views",
        action="store_true",
        help="Skip all views endpoints",
    )
    parser.add_argument(
        "--skip-view-details",
        action="store_true",
        help="Get the view list only, not per-view metadata",
    )
    parser.add_argument(
        "--complex-formula-threshold",
        type=int,
        default=6,
        help="Minimum number of dependencies for a formula to be included in complex_formulas report",
    )
    parser.add_argument(
        "--include-record-audits",
        action="store_true",
        help="Fetch records and write operational audit reports. Requires data-record read access.",
    )
    parser.add_argument(
        "--audit-limit",
        type=int,
        default=5000,
        help="Maximum records to fetch per audited table when --include-record-audits is used.",
    )
    parser.add_argument(
        "--audit-tables",
        help="Comma-separated table names to audit. Defaults to all exported tables.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Print diagnostics",
    )
    args = parser.parse_args()

    if args.verbose:
        token = os.getenv("AIRTABLE_TOKEN") or ""
        env_base = os.getenv("BASE_ID") or os.getenv("AIRTABLE_BASE_ID") or ""
        env_name = os.getenv("BASE_NAME") or ""
        print(
            f"AIRTABLE_TOKEN length: {len(token)} | hasDot: {'.' in token} | startsPat: {token.startswith('pat')}"
        )
        print(f"Env base id present: {bool(env_base)}")
        print(f"Env base name present: {bool(env_name)}")

    base_id = resolve_base_id(args.base_id, args.base_name)
    base_name = resolve_base_name(base_id, args.base_name, verbose=args.verbose)

    if args.verbose:
        print(f"Using base id: {base_id}")
        print(f"Resolved base name: {base_name}")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    timestamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    selected_tables = parse_only_tables(args.only)

    raw_schema = get_base_schema_raw(base_id)
    warn_missing_selected_tables(raw_schema.get("tables", []), selected_tables)
    raw_schema_file = out_dir / f"schema_raw_{base_id}_{timestamp}.json"
    write_json(raw_schema, raw_schema_file)

    enhanced_schema = simplify_schema(raw_schema, base_id, base_name, selected_tables)
    enhanced_schema_file = out_dir / f"schema_enhanced_{base_id}_{timestamp}.json"
    write_json(enhanced_schema, enhanced_schema_file)

    dependencies_file = out_dir / f"dependencies_{base_id}_{timestamp}.json"
    write_json(
        {
            "exportMeta": enhanced_schema.get("exportMeta", {}),
            "dependencies": enhanced_schema.get("dependencies", []),
        },
        dependencies_file,
    )

    if args.skip_views:
        views_basic_doc = {
            "exportMeta": {
                "scriptVersion": SCRIPT_VERSION,
                "generatedAt": now_iso(),
                "baseId": base_id,
                "available": False,
                "reason": "Skipped by --skip-views",
                "viewCount": 0,
            },
            "views": [],
        }
        views_detailed_doc = {
            "exportMeta": {
                "scriptVersion": SCRIPT_VERSION,
                "generatedAt": now_iso(),
                "baseId": base_id,
                "available": False,
                "reason": "Skipped by --skip-views",
                "viewCount": 0,
                "detailedMetadataCount": 0,
            },
            "views": [],
        }
    else:
        views_list_raw = try_get_views_list(base_id, verbose=args.verbose)
        views_basic_doc = simplify_views_basic(base_id, views_list_raw, enhanced_schema)
        views_detailed_doc = simplify_views_detailed(
            base_id,
            views_basic_doc,
            enhanced_schema,
            skip_view_details=args.skip_view_details,
            verbose=args.verbose,
        )

    views_basic_json_file = out_dir / f"views_basic_{base_id}_{timestamp}.json"
    write_json(views_basic_doc, views_basic_json_file)

    views_detailed_json_file = out_dir / f"views_detailed_{base_id}_{timestamp}.json"
    write_json(views_detailed_doc, views_detailed_json_file)

    views_md_file = out_dir / f"views_{base_id}_{timestamp}.md"
    write_text(render_views_markdown(views_basic_doc, views_detailed_doc), views_md_file)

    summary = build_base_summary(enhanced_schema, views_basic_doc, views_detailed_doc)
    summary_file = out_dir / f"base_summary_{base_id}_{timestamp}.json"
    write_json(summary, summary_file)

    health = build_health_report(enhanced_schema)
    health_file = out_dir / f"export_health_report_{base_id}_{timestamp}.json"
    write_json(health, health_file)

    field_index = build_field_index(enhanced_schema)
    field_index_file = out_dir / f"field_index_{base_id}_{timestamp}.json"
    write_json(field_index, field_index_file)

    invalid_fields = build_invalid_fields_report(enhanced_schema)
    invalid_fields_file = out_dir / f"invalid_fields_{base_id}_{timestamp}.json"
    write_json(invalid_fields, invalid_fields_file)

    complex_formulas = build_complex_formulas_report(
        enhanced_schema,
        min_dependencies=args.complex_formula_threshold,
    )
    complex_formulas_file = out_dir / f"complex_formulas_{base_id}_{timestamp}.json"
    write_json(complex_formulas, complex_formulas_file)

    schema_md_file = out_dir / f"schema_doc_{base_id}_{timestamp}.md"
    write_text(
        render_markdown(enhanced_schema, views_basic_doc, views_detailed_doc, summary, health),
        schema_md_file,
    )

    mermaid_file = out_dir / f"schema_erd_{base_id}_{timestamp}.mmd"
    write_text(render_mermaid(enhanced_schema), mermaid_file)

    workflow_companion_file = out_dir / f"workflow_companion_{base_id}_{timestamp}.md"
    write_text(render_workflow_companion_template(enhanced_schema), workflow_companion_file)

    record_audit_files: Dict[str, str] = {}
    if args.include_record_audits:
        audit_tables = parse_only_tables(args.audit_tables)
        warn_missing_selected_tables(raw_schema.get("tables", []), audit_tables)
        records_by_table = load_records_for_audits(
            base_id,
            enhanced_schema,
            max_records_per_table=max(1, args.audit_limit),
            audit_tables=audit_tables,
            verbose=args.verbose,
        )
        record_audits = build_record_audit_package(enhanced_schema, records_by_table)
        for report_name, report_data in record_audits.items():
            report_file = out_dir / f"{report_name}_{base_id}_{timestamp}.json"
            write_json(report_data, report_file)
            record_audit_files[report_name] = str(report_file)

    manifest = {
        "generatedAt": now_iso(),
        "scriptVersion": SCRIPT_VERSION,
        "baseId": base_id,
        "baseName": base_name,
        "selectedTables": selected_tables or [],
        "files": {
            "rawSchema": str(raw_schema_file),
            "enhancedSchema": str(enhanced_schema_file),
            "dependencies": str(dependencies_file),
            "viewsBasicJson": str(views_basic_json_file),
            "viewsDetailedJson": str(views_detailed_json_file),
            "viewsMarkdown": str(views_md_file),
            "baseSummary": str(summary_file),
            "healthReport": str(health_file),
            "fieldIndex": str(field_index_file),
            "invalidFields": str(invalid_fields_file),
            "complexFormulas": str(complex_formulas_file),
            "schemaMarkdown": str(schema_md_file),
            "mermaidERD": str(mermaid_file),
            "workflowCompanion": str(workflow_companion_file),
            **record_audit_files,
        },
    }
    manifest_file = out_dir / f"manifest_{base_id}_latest.json"
    write_json(manifest, manifest_file)

    print("Wrote:")
    print(f"  {raw_schema_file}")
    print(f"  {enhanced_schema_file}")
    print(f"  {dependencies_file}")
    print(f"  {views_basic_json_file}")
    print(f"  {views_detailed_json_file}")
    print(f"  {views_md_file}")
    print(f"  {summary_file}")
    print(f"  {health_file}")
    print(f"  {field_index_file}")
    print(f"  {invalid_fields_file}")
    print(f"  {complex_formulas_file}")
    print(f"  {schema_md_file}")
    print(f"  {mermaid_file}")
    print(f"  {workflow_companion_file}")
    for report_file in record_audit_files.values():
        print(f"  {report_file}")
    print(f"  {manifest_file}")

if __name__ == "__main__":
    main()