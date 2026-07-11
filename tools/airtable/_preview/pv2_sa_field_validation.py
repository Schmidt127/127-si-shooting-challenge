#!/usr/bin/env python3
"""Read-only Submission Assets field promotion validation (DEV vs PROD)."""

from __future__ import annotations

import json
import os
import re
from collections import Counter
from pathlib import Path

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
load_dotenv(HERE.parent / ".env")

DEV = "appTetnuCZlCZdTCT"
PROD = "appn84sqPw03zEbTT"
TABLE = "Submission Assets"

PROMOTED = [
    "Asset Reuse Review Primary Reason",
    "Asset Reuse Review Reasons",
    "Asset Reuse Review Summary",
    "Asset Reuse Reviewed At",
    "Asset Reuse Reviewed By",
    "Asset Sequence",
    "Calculation",
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


def promoted_name_set() -> set[str]:
    return set(PROMOTED)


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


def compare_promoted(dev_f: dict, prod_f: dict, dev_t: dict, prod_t: dict) -> list[dict]:
    mismatches: list[dict] = []
    prod_record_id = prod_f.get("RecordId", {}).get("id")
    dev_record_id = dev_f.get("RecordId", {}).get("id")

    for name in PROMOTED:
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
            if name == "Calculation":
                if not formula_refs_record_id(pform, prod_record_id):
                    issues.append(
                        f"calculation formula must reference RecordId; prod={pform!r} "
                        f"recordIdField={prod_record_id}"
                    )
                if not formula_refs_record_id(dform, dev_record_id):
                    issues.append(f"unexpected DEV calculation formula={dform!r}")
            elif dform != pform:
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
    promoted = promoted_name_set()

    exact_dups = [n for n, k in Counter(prod_names).items() if k > 1]
    promotion_dupes = [
        n for n in prod_names if n not in promoted and is_promotion_duplicate(n, promoted)
    ]

    missing = [n for n in PROMOTED if n not in prod_f]
    present = [n for n in PROMOTED if n in prod_f]
    mismatches = compare_promoted(dev_f, prod_f, dev_t, prod_t)

    dup_field = prod_f.get("Duplicate Match Records (All)")
    inv_field = prod_f.get("From field: Duplicate Match Records (All)")
    calc_field = prod_f.get("Calculation")
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
    if calc_field:
        copt = calc_field.get("options", {}) or {}
        special["calculation"] = {
            "present": True,
            "type": calc_field["type"],
            "formula": copt.get("formula"),
            "result": copt.get("result"),
            "references_record_id": formula_refs_record_id(
                copt.get("formula") or "", prod_f.get("RecordId", {}).get("id")
            ),
            "status": "PASS"
            if formula_refs_record_id(
                copt.get("formula") or "", prod_f.get("RecordId", {}).get("id")
            )
            and (copt.get("result") or {}) == ((dev_f.get("Calculation", {}).get("options") or {}).get("result") or {})
            else "FAIL",
        }
    else:
        special["calculation"] = {"present": False, "status": "FAIL"}

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

    missing_all = sorted(set(dev_names) - set(prod_names))
    config_mismatch_count = len(mismatches)
    promotion_duplicate_count = len(exact_dups) + len(promotion_dupes)
    overall = (
        len(dev_names) == 97
        and len(prod_names) == 97
        and len(missing) == 0
        and config_mismatch_count == 0
        and promotion_duplicate_count == 0
    )

    out = {
        "overall": "PASS" if overall else "FAIL",
        "dev_field_count": len(dev_names),
        "prod_field_count": len(prod_names),
        "missing_field_count": len(missing_all),
        "missing_promoted_count": len(missing),
        "missing_promoted": missing,
        "missing_all_in_prod": missing_all,
        "present_promoted_count": len(present),
        "promotion_duplicate_count": promotion_duplicate_count,
        "promotion_duplicates": promotion_dupes,
        "prod_exact_duplicate_names": exact_dups,
        "config_mismatch_count": config_mismatch_count,
        "config_mismatches": mismatches,
        "extra_all_in_prod": sorted(set(prod_names) - set(dev_names)),
        "special_checks": special,
        "submission_assets_missing_in_prod": len(missing_all),
        "submission_assets_promotion_status": "PASS" if overall else "FAIL",
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
