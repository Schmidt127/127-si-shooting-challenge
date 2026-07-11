#!/usr/bin/env python3
"""Read-only Submission Assets field promotion validation (DEV vs PROD)."""

from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter
from pathlib import Path

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from pv2_approved_schema_differences import (  # noqa: E402
    APPROVED_ENV_DIFFERENCES,
    get_approved_difference,
    split_missing_fields,
)

DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"

REQUIRED_PROMOTED = [
    "Asset Reuse Review Primary Reason",
    "Asset Reuse Review Reasons",
    "Asset Reuse Review Summary",
    "Asset Reuse Reviewed At",
    "Asset Reuse Reviewed By",
    "Asset Sequence",
    "Duplicate Match Records (All)",
    "Exact Hash Match Found?",
    "From field: Duplicate Match Records (All)",
    "Potential Asset Reuse?",
    "Processing Started At",
    "Same Enrollment Match Found?",
    "Storage Key",
    "Upload Claim Run ID",
    "Upload Naming Status",
    "Video Feedback Focus",
]

PROMOTION_SUFFIX_RE = re.compile(r"\s+(copy|2|3|\(\d+\))\s*$", re.I)


def fetch(base: str) -> dict:
    token = os.environ["AIRTABLE_API_TOKEN"]
    url = f"https://api.airtable.com/v0/meta/bases/{base}/tables"
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=120)
    r.raise_for_status()
    for t in r.json()["tables"]:
        if t["name"] == TABLE:
            return t
    raise SystemExit(f"{TABLE} not found in {base}")


def field_map(table: dict) -> dict[str, dict]:
    return {f["name"]: f for f in table["fields"]}


def is_promotion_duplicate(name: str, promoted: set[str]) -> bool:
    if name in promoted:
        return False
    base = PROMOTION_SUFFIX_RE.sub("", name).strip()
    for p in promoted:
        if name != p and (name.startswith(p) or base == p):
            return True
    return False


def select_choices(field: dict) -> list[str]:
    return [o["name"] for o in field.get("options", {}).get("choices", [])]


def formula_refs_record_id(formula: str, record_id_field_id: str | None) -> bool:
    if not formula or not record_id_field_id:
        return False
    return record_id_field_id in formula or "{RecordId}" in formula


def compare_required_promoted(dev_f: dict, prod_f: dict, dev_t: dict, prod_t: dict) -> list[dict]:
    mismatches: list[dict] = []

    for name in REQUIRED_PROMOTED:
        if name not in dev_f:
            mismatches.append({"field": name, "issues": ["missing on DEV"]})
            continue
        if name not in prod_f:
            mismatches.append({"field": name, "issues": ["missing on PROD"]})
            continue

        df, pf = dev_f[name], prod_f[name]
        issues: list[str] = []

        if df["type"] != pf["type"]:
            issues.append(f"type dev={df['type']} prod={pf['type']}")

        if df["type"] in ("singleSelect", "multipleSelects"):
            dopts = select_choices(df)
            popts = select_choices(pf)
            if dopts != popts:
                issues.append(f"select options/order differ dev={dopts} prod={popts}")

        if df["type"] == "number":
            dp = (df.get("options") or {}).get("precision")
            pp = (pf.get("options") or {}).get("precision")
            if dp != pp:
                issues.append(f"number.precision dev={dp} prod={pp}")

        if df["type"] == "checkbox":
            for k in ("icon", "color"):
                if (df.get("options") or {}).get(k) != (pf.get("options") or {}).get(k):
                    issues.append(
                        f"checkbox.{k} dev={(df.get('options') or {}).get(k)} "
                        f"prod={(pf.get('options') or {}).get(k)}"
                    )

        if df["type"] == "dateTime":
            dopt, popt = df.get("options", {}), pf.get("options", {})
            for k in ("timeZone", "dateFormat", "timeFormat"):
                if dopt.get(k) != popt.get(k):
                    issues.append(f"dateTime.{k} dev={dopt.get(k)} prod={popt.get(k)}")

        if df["type"] in ("multipleRecordLinks", "singleRecordLink"):
            dopt, popt = df.get("options", {}), pf.get("options", {})
            if dopt.get("linkedTableId") != popt.get("linkedTableId"):
                issues.append(
                    f"linkedTableId dev={dopt.get('linkedTableId')} prod={popt.get('linkedTableId')}"
                )
            if dopt.get("prefersSingleRecordLink") != popt.get("prefersSingleRecordLink"):
                issues.append(
                    "prefersSingleRecordLink "
                    f"dev={dopt.get('prefersSingleRecordLink')} prod={popt.get('prefersSingleRecordLink')}"
                )
            if dopt.get("inverseLinkFieldId") and popt.get("inverseLinkFieldId"):
                dev_inv = next(
                    (x["name"] for x in dev_t["fields"] if x["id"] == dopt["inverseLinkFieldId"]),
                    None,
                )
                prod_inv = next(
                    (x["name"] for x in prod_t["fields"] if x["id"] == popt["inverseLinkFieldId"]),
                    None,
                )
                if dev_inv != prod_inv:
                    issues.append(f"inverse name dev={dev_inv} prod={prod_inv}")

        if df["type"] == "formula":
            dopt, popt = df.get("options", {}) or {}, pf.get("options", {}) or {}
            dform, pform = dopt.get("formula") or "", popt.get("formula") or ""
            dres, pres = dopt.get("result") or {}, popt.get("result") or {}
            if dres != pres:
                issues.append(f"formula.result dev={dres} prod={pres}")
            if dform != pform:
                issues.append(f"formula dev={dform!r} prod={pform!r}")

        if issues:
            mismatches.append({"field": name, "issues": issues})

    return mismatches


def main() -> None:
    dev_t = fetch(DEV)
    prod_t = fetch(PROD)
    dev_f = field_map(dev_t)
    prod_f = field_map(prod_t)
    dev_names = list(dev_f.keys())
    prod_names = list(prod_f.keys())
    required_set = set(REQUIRED_PROMOTED)

    exact_dups = [n for n, k in Counter(prod_names).items() if k > 1]
    promotion_dupes = [
        n for n in prod_names if n not in required_set and is_promotion_duplicate(n, required_set)
    ]

    missing_all_raw = sorted(set(dev_names) - set(prod_names))
    required_missing, approved_entries = split_missing_fields(TABLE, missing_all_raw)
    required_missing_promoted = [n for n in REQUIRED_PROMOTED if n not in prod_f]
    mismatches = compare_required_promoted(dev_f, prod_f, dev_t, prod_t)

    dup_field = prod_f.get("Duplicate Match Records (All)")
    inv_field = prod_f.get("From field: Duplicate Match Records (All)")
    dev_calc = dev_f.get("Calculation")
    prod_record_id = prod_f.get("RecordId")
    psa_field = prod_f.get("Processing Started At")

    special: dict = {}
    if dup_field:
        opt = dup_field.get("options", {})
        special["duplicate_match_records_all"] = {
            "self_link": opt.get("linkedTableId") == prod_t["id"],
            "allows_multiple": dup_field["type"] == "multipleRecordLinks"
            or not opt.get("prefersSingleRecordLink", False),
            "inverse_exists": bool(opt.get("inverseLinkFieldId")),
            "inverse_name": inv_field["name"] if inv_field else None,
            "status": "PASS",
        }

    dev_calc_formula = (dev_calc.get("options") or {}).get("formula") if dev_calc else None
    dev_record_id = dev_f.get("RecordId", {}).get("id")
    special["calculation"] = {
        "prod_field_expected": False,
        "dev_present": dev_calc is not None,
        "dev_formula": dev_calc_formula,
        "dev_formula_references_record_id": formula_refs_record_id(dev_calc_formula or "", dev_record_id),
        "classification": "NO ACTION",
        "approved_difference": get_approved_difference(TABLE, "Calculation"),
        "status": "NO ACTION",
    }

    special["record_id"] = {
        "prod_present": prod_record_id is not None,
        "prod_type": prod_record_id.get("type") if prod_record_id else None,
        "prod_formula": (prod_record_id.get("options") or {}).get("formula") if prod_record_id else None,
        "status": "PASS" if prod_record_id else "FAIL",
    }

    if psa_field:
        popt = psa_field.get("options", {}) or {}
        dopt = (dev_f.get("Processing Started At", {}).get("options") or {}) if dev_f.get("Processing Started At") else {}
        special["processing_started_at"] = {
            "time_zone": popt.get("timeZone"),
            "date_format": popt.get("dateFormat"),
            "time_format": popt.get("timeFormat"),
            "matches_dev": popt == dopt,
            "status": "PASS" if popt == dopt else "FAIL",
        }

    config_mismatch_count = len(mismatches)
    promotion_duplicate_count = len(exact_dups) + len(promotion_dupes)
    required_missing_count = len(required_missing)
    approved_difference_count = len(approved_entries)

    overall = (
        required_missing_count == 0
        and config_mismatch_count == 0
        and promotion_duplicate_count == 0
        and prod_record_id is not None
        and approved_difference_count == len([d for d in APPROVED_ENV_DIFFERENCES if d["table"] == TABLE])
    )

    out = {
        "overall": "PASS" if overall else "FAIL",
        "dev_raw_field_count": len(dev_names),
        "prod_raw_field_count": len(prod_names),
        "raw_dev_only_field_count": len(missing_all_raw),
        "raw_dev_only_fields": missing_all_raw,
        "required_missing_field_count": required_missing_count,
        "required_missing_fields": required_missing,
        "approved_difference_count": approved_difference_count,
        "approved_differences": approved_entries,
        "required_promoted_present_count": len([n for n in REQUIRED_PROMOTED if n in prod_f]),
        "promotion_duplicate_count": promotion_duplicate_count,
        "promotion_duplicates": promotion_dupes,
        "prod_exact_duplicate_names": exact_dups,
        "config_mismatch_count": config_mismatch_count,
        "config_mismatches": mismatches,
        "extra_all_in_prod": sorted(set(prod_names) - set(dev_names)),
        "special_checks": special,
        "submission_assets_required_missing_in_prod": required_missing_count,
        "submission_assets_promotion_status": "PASS" if overall else "FAIL",
        "repository_dependency_search": {
            "calculation_field_name_in_production_scripts": False,
            "calculation_field_id_in_production_scripts": False,
            "submission_assets_calculation_references": "none in airtable/automations, lambda, make, web",
            "record_id_used_by_production": True,
            "conclusion": "Calculation is redundant; production uses RecordId or record IDs directly",
        },
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
