#!/usr/bin/env python3
"""
Read-only XP Reward Rules verification utility.

Compares live/DEV XP Reward Rules against expected *families* of keys and reports
configured amounts. Does NOT modify records. Does NOT treat any historical streak
ladder as authoritative for writes.

Usage:
  python tools/airtable/verify_xp_reward_rules.py              # live read (requires PAT)
  python tools/airtable/verify_xp_reward_rules.py --dry-run    # same (default)
  python tools/airtable/verify_xp_reward_rules.py --fixture path/to/rules.json
  python tools/airtable/verify_xp_reward_rules.py --base-id appTetnuCZlCZdTCT

Exit codes:
  0 = report completed (findings may still list missing/duplicate keys)
  2 = unable to load rules / invalid input
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

# Informational reference only — NOT authoritative for changing production amounts.
# Captured from docs/xp-motivation-analysis-2025-26.md for Mike discrepancy review.
REFERENCE_STREAK_LADDER_DOCUMENTED = {
    "STREAK_3DAY": 10,
    "STREAK_5DAY": 15,
    "STREAK_7DAY": 20,
    "STREAK_10DAY": 30,
    "STREAK_20DAY": 50,
    "STREAK_30DAY": 60,
    "STREAK_40DAY": 75,
    "STREAK_50DAY": 90,
    "STREAK_60DAY": 105,
}

EXPECTED_FAMILIES = {
    "streak": ("STREAK_",),
    "perfect_week": ("PERFECT_WEEK",),
    "homework": ("HOMEWORK", "HW_"),
    "zoom": ("ZOOM_ATTEND_", "ZOOM_LIVE", "ZOOM_RECORDING"),
    "video": ("VIDEO",),
}


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)


def load_rules_from_fixture(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "records" in data:
        return data["records"]
    if isinstance(data, list):
        return data
    raise SystemExit(f"Unsupported fixture shape in {path}")


def load_rules_from_airtable(base_id: str) -> list[dict]:
    _load_dotenv()
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit(
            "Missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN. "
            "Use --fixture for offline verification."
        )
    import requests

    url = f"https://api.airtable.com/v0/{base_id}/{requests.utils.quote('XP Reward Rules')}"
    headers = {"Authorization": f"Bearer {token}"}
    records: list[dict] = []
    offset: str | None = None
    fields = ["Rule Key", "XP Amount", "Active?", "XP Source Label"]
    while True:
        params: dict = {"pageSize": 100}
        for i, name in enumerate(fields):
            params[f"fields[{i}]"] = name
        if offset:
            params["offset"] = offset
        resp = requests.get(url, headers=headers, params=params, timeout=120)
        if not resp.ok:
            raise SystemExit(f"Airtable GET failed: {resp.status_code} {resp.text[:400]}")
        payload = resp.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            break
    return records


def normalize_rule(rec: dict) -> dict:
    fields = rec.get("fields", rec)
    key = str(fields.get("Rule Key") or "").strip()
    amount_raw = fields.get("XP Amount")
    try:
        amount = float(amount_raw) if amount_raw is not None and amount_raw != "" else None
    except (TypeError, ValueError):
        amount = None
    active = fields.get("Active?")
    if active is None:
        active = True
    return {
        "id": rec.get("id", ""),
        "rule_key": key,
        "xp_amount": amount,
        "active": bool(active is True or active == 1 or str(active).lower() == "true"),
        "source_label": str(fields.get("XP Source Label") or "").strip(),
    }


def classify(rule_key: str) -> str:
    key = rule_key.upper()
    for family, prefixes in EXPECTED_FAMILIES.items():
        for prefix in prefixes:
            if key == prefix.upper() or key.startswith(prefix.upper()):
                return family
    return "other"


def analyze(rules: list[dict]) -> dict:
    normalized = [normalize_rule(r) for r in rules]
    by_key: dict[str, list[dict]] = defaultdict(list)
    for row in normalized:
        if row["rule_key"]:
            by_key[row["rule_key"]].append(row)

    duplicates = {k: v for k, v in by_key.items() if len(v) > 1}
    active_by_key = {
        k: [r for r in v if r["active"]]
        for k, v in by_key.items()
    }
    active_duplicates = {k: v for k, v in active_by_key.items() if len(v) > 1}

    families: dict[str, list[dict]] = defaultdict(list)
    for row in normalized:
        if not row["rule_key"]:
            continue
        families[classify(row["rule_key"])].append(row)

    streak_active = {
        r["rule_key"]: r["xp_amount"]
        for r in families["streak"]
        if r["active"] and r["xp_amount"] is not None
    }

    discrepancy: list[dict] = []
    for key, documented in REFERENCE_STREAK_LADDER_DOCUMENTED.items():
        live = streak_active.get(key)
        if live is None:
            discrepancy.append(
                {
                    "rule_key": key,
                    "documented_amount": documented,
                    "configured_amount": None,
                    "status": "missing_in_live_or_inactive",
                }
            )
        elif float(live) != float(documented):
            discrepancy.append(
                {
                    "rule_key": key,
                    "documented_amount": documented,
                    "configured_amount": live,
                    "status": "amount_mismatch",
                }
            )

    for key, amount in streak_active.items():
        if key not in REFERENCE_STREAK_LADDER_DOCUMENTED:
            discrepancy.append(
                {
                    "rule_key": key,
                    "documented_amount": None,
                    "configured_amount": amount,
                    "status": "present_in_live_not_in_documented_ladder",
                }
            )

    def family_report(name: str) -> list[dict]:
        rows = sorted(families.get(name, []), key=lambda r: r["rule_key"])
        return [
            {
                "rule_key": r["rule_key"],
                "xp_amount": r["xp_amount"],
                "active": r["active"],
                "source_label": r["source_label"],
                "id": r["id"],
            }
            for r in rows
        ]

    perfect = family_report("perfect_week")
    perfect_amount = next(
        (r["xp_amount"] for r in perfect if r["active"] and r["rule_key"] == "PERFECT_WEEK"),
        None,
    )

    return {
        "mode": "read_only",
        "rule_count": len(normalized),
        "blank_rule_keys": sum(1 for r in normalized if not r["rule_key"]),
        "duplicate_rule_keys": sorted(duplicates.keys()),
        "active_duplicate_rule_keys": sorted(active_duplicates.keys()),
        "streak_rules": family_report("streak"),
        "perfect_week_rules": perfect,
        "perfect_week_amount": perfect_amount,
        "homework_rules": family_report("homework"),
        "zoom_rules": family_report("zoom"),
        "video_rules": family_report("video"),
        "other_rules": family_report("other"),
        "streak_ladder_discrepancy_vs_documented": discrepancy,
        "authority_note": (
            "Configured XP Reward Rules are authoritative for runtime awards. "
            "Documented streak ladder is informational only — do not change "
            "script amounts without Mike decision."
        ),
    }


def print_report(report: dict) -> None:
    print("=== XP Reward Rules verification (READ ONLY) ===")
    print(f"Rules scanned: {report['rule_count']}")
    print(f"Blank Rule Key rows: {report['blank_rule_keys']}")
    print(f"Duplicate Rule Keys: {report['duplicate_rule_keys'] or '(none)'}")
    print(f"Active duplicate Rule Keys: {report['active_duplicate_rule_keys'] or '(none)'}")
    print()
    print("--- Streak ---")
    for row in report["streak_rules"]:
        flag = "ACTIVE" if row["active"] else "inactive"
        print(f"  {row['rule_key']}: {row['xp_amount']} ({flag})")
    print()
    print(f"--- PERFECT_WEEK amount: {report['perfect_week_amount']} ---")
    for row in report["perfect_week_rules"]:
        print(f"  {row['rule_key']}: {row['xp_amount']} ({'ACTIVE' if row['active'] else 'inactive'})")
    print()
    print("--- Homework ---")
    for row in report["homework_rules"]:
        print(f"  {row['rule_key']}: {row['xp_amount']} ({'ACTIVE' if row['active'] else 'inactive'})")
    print()
    print("--- Zoom ---")
    for row in report["zoom_rules"]:
        print(f"  {row['rule_key']}: {row['xp_amount']} ({'ACTIVE' if row['active'] else 'inactive'})")
    print()
    print("--- Video ---")
    for row in report["video_rules"]:
        print(f"  {row['rule_key']}: {row['xp_amount']} ({'ACTIVE' if row['active'] else 'inactive'})")
    print()
    print("--- Streak ladder discrepancy vs documented analysis (INFO ONLY) ---")
    if not report["streak_ladder_discrepancy_vs_documented"]:
        print("  (no differences vs docs/xp-motivation-analysis-2025-26.md reference)")
    else:
        for d in report["streak_ladder_discrepancy_vs_documented"]:
            print(
                f"  {d['rule_key']}: documented={d['documented_amount']} "
                f"configured={d['configured_amount']} [{d['status']}]"
            )
    print()
    print(report["authority_note"])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Read-only (default). No writes are ever performed.",
    )
    parser.add_argument(
        "--fixture",
        type=Path,
        help="Offline JSON fixture of XP Reward Rules records",
    )
    parser.add_argument(
        "--base-id",
        default=os.getenv("AIRTABLE_BASE_ID") or "appTetnuCZlCZdTCT",
        help="Airtable base id (default DEV)",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        help="Optional path to write full JSON report",
    )
    args = parser.parse_args(argv)

    try:
        if args.fixture:
            rules = load_rules_from_fixture(args.fixture)
        else:
            rules = load_rules_from_airtable(args.base_id)
    except SystemExit as exc:
        print(str(exc), file=sys.stderr)
        return 2

    report = analyze(rules)
    report["base_id"] = None if args.fixture else args.base_id
    report["source"] = str(args.fixture) if args.fixture else f"airtable:{args.base_id}"
    print_report(report)

    if args.json_out:
        args.json_out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nWrote {args.json_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
