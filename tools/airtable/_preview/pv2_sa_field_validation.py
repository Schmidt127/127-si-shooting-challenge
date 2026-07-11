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


def dup_check(names: list[str]) -> tuple[list[str], list[str], list[str]]:
    c = Counter(names)
    exact_dups = [n for n, k in c.items() if k > 1]
    suffixed = [
        n for n in names if re.search(r"\s+(copy|2|3|\(\d+\))\s*$", n, re.I)
    ]
    calc_like = [n for n in names if "calculation" in n.lower()]
    return exact_dups, suffixed, calc_like


def compare_promoted(dev_f: dict, prod_f: dict, dev_t: dict, prod_t: dict) -> list[dict]:
    mismatches: list[dict] = []
    for name in PROMOTED:
        if name not in dev_f or name not in prod_f:
            continue
        df, pf = dev_f[name], prod_f[name]
        issues: list[str] = []
        if df["type"] != pf["type"]:
            issues.append(f"type dev={df['type']} prod={pf['type']}")
        if df["type"] in ("singleSelect", "multipleSelects"):
            dopts = sorted(o["name"] for o in df.get("options", {}).get("choices", []))
            popts = sorted(o["name"] for o in pf.get("options", {}).get("choices", []))
            if dopts != popts:
                issues.append(f"options differ dev={len(dopts)} prod={len(popts)}")
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
            dform = (df.get("options", {}) or {}).get("formula") or ""
            pform = (pf.get("options", {}) or {}).get("formula") or ""
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

    prod_dups, prod_suf, prod_calc = dup_check(prod_names)
    missing = [n for n in PROMOTED if n not in prod_f]
    present = [n for n in PROMOTED if n in prod_f]
    mismatches = compare_promoted(dev_f, prod_f, dev_t, prod_t)

    dup_field = prod_f.get("Duplicate Match Records (All)")
    inv_field = prod_f.get("From field: Duplicate Match Records (All)")
    calc_field = prod_f.get("Calculation")
    special: dict = {}
    if dup_field:
        opt = dup_field.get("options", {})
        special["dup_link_type"] = dup_field["type"]
        special["dup_linked_table_id"] = opt.get("linkedTableId")
        special["dup_table_id"] = prod_t["id"]
        special["dup_self_link"] = opt.get("linkedTableId") == prod_t["id"]
        special["dup_allows_multiple"] = dup_field["type"] == "multipleRecordLinks" or not opt.get(
            "prefersSingleRecordLink", False
        )
        special["dup_inverse_field_id"] = opt.get("inverseLinkFieldId")
        special["dup_inverse_exists"] = bool(opt.get("inverseLinkFieldId"))
        special["dup_inverse_name"] = inv_field["name"] if inv_field else None
    if calc_field:
        special["calc_formula"] = (calc_field.get("options", {}) or {}).get("formula")
        special["calc_formula_match"] = special["calc_formula"] == "{RecordId}"

    out = {
        "dev_field_count": len(dev_names),
        "prod_field_count": len(prod_names),
        "missing_promoted_count": len(missing),
        "missing_promoted": missing,
        "present_promoted_count": len(present),
        "present_promoted": present,
        "prod_exact_duplicate_names": prod_dups,
        "prod_suffixed_names": prod_suf,
        "prod_calculation_like_names": prod_calc,
        "duplicate_field_count": len(prod_dups) + len(prod_suf),
        "config_mismatch_count": len(mismatches),
        "config_mismatches": mismatches,
        "missing_all_in_prod": sorted(set(dev_names) - set(prod_names)),
        "extra_all_in_prod": sorted(set(prod_names) - set(dev_names)),
        "special_checks": special,
        "submission_assets_missing_in_prod": len(set(dev_names) - set(prod_names)),
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
