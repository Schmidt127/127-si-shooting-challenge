#!/usr/bin/env python3
"""Read-only Shooting Challenge close-out snapshot (stdout only, no writes)."""

from __future__ import annotations

import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
TOLERANCE = 0


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing PAT in tools/airtable/.env or web/.env.local")
    return token


def list_records(session: requests.Session, table: str, fields: list[str] | None = None) -> list[dict]:
    url = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table)}"
    params: dict = {"pageSize": 100}
    if fields:
        params["fields[]"] = fields
    records: list[dict] = []
    offset: str | None = None
    while True:
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=60)
        if not resp.ok:
            raise RuntimeError(f"GET {table} -> {resp.status_code}: {resp.text[:400]}")
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records


def is_active(value) -> bool:
    return value is True or value == 1 or str(value).lower() == "true"


def main() -> None:
    token = load_token()
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"

    print("=" * 60)
    print("SHOOTING CHALLENGE — close-out status (read-only)")
    print(f"Base: {BASE_ID}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} local")
    print("=" * 60)

    enrollments = list_records(
        session,
        "Enrollments",
        ["Active?", "Lifetime XP Earned", "XP Events", "Athlete"],
    )
    xp_events = list_records(
        session,
        "XP Events",
        ["XP Points", "Active?", "Duplicate Status", "Enrollment", "Source Key"],
    )

    active = [r for r in enrollments if is_active(r.get("fields", {}).get("Active?"))]
    inactive = len(enrollments) - len(active)
    print(f"\nEnrollments: {len(enrollments)} total | {len(active)} active | {inactive} inactive")

    xp_by_id = {r["id"]: r for r in xp_events}
    mismatch = []
    false_dup_active = []
    dup_keys: Counter[str] = Counter()

    for rec in active:
        fields = rec.get("fields", {})
        rollup = fields.get("Lifetime XP Earned") or 0
        linked_ids = fields.get("XP Events") or []
        computed = 0.0
        for xid in linked_ids:
            xp = xp_by_id.get(xid)
            if not xp:
                continue
            xf = xp.get("fields", {})
            if not is_active(xf.get("Active?")):
                continue
            if xf.get("Duplicate Status") == "Duplicate - Remove":
                false_dup_active.append(xid)
                continue
            computed += float(xf.get("XP Points") or 0)
        if abs(computed - float(rollup)) > TOLERANCE:
            athlete = fields.get("Athlete")
            name = athlete[0] if isinstance(athlete, list) and athlete else rec["id"]
            mismatch.append((name, rollup, computed, rec["id"]))

    for rec in xp_events:
        fields = rec.get("fields", {})
        if not is_active(fields.get("Active?")):
            continue
        key = (fields.get("Source Key") or "").strip()
        if key:
            dup_keys[key] += 1

    dup_source_keys = sum(1 for k, c in dup_keys.items() if c > 1)

    print("\n-- 090E-style checks (active enrollments) --")
    print(f"Lifetime XP mismatches: {len(mismatch)}")
    print(f"XP Events Duplicate-Remove but Active?: {len(set(false_dup_active))}")
    print(f"Duplicate Source Keys (active XP): {dup_source_keys}")

    if mismatch:
        print("\n  Sample XP mismatches (rollup vs computed):")
        for name, rollup, computed, rid in mismatch[:8]:
            print(f"    {name} | rollup={rollup} computed={computed} | {rid}")
        if len(mismatch) > 8:
            print(f"    ... +{len(mismatch) - 8} more")

    # Submissions today-ish
    try:
        subs = list_records(session, "Submissions", ["Submission Date", "Count This Submission?"])
        counted = [s for s in subs if is_active(s.get("fields", {}).get("Count This Submission?"))]
        print(f"\nSubmissions: {len(subs)} total | {len(counted)} counted")
    except RuntimeError as exc:
        print(f"\nSubmissions: skipped ({exc})")

    print("\n-- Interpretation --")
    if len(mismatch) == 0 and len(set(false_dup_active)) == 0:
        print("  OK: XP rollup looks clean for active enrollments (like 090E pass).")
    else:
        print("  ACTION: After close, run audit-final-090e in Airtable; may need repair-final-090e.")

    print("\n  Full close-out audits (Airtable Scripting, read-only):")
    print("    090A -> 090D -> 090F -> 090G -> 090E last")
    print("  See: airtable/extension-scripts/audits/README.md")
    print("\n  Do NOT run final audits until Fillout is OFF and automations drain.")
    print("=" * 60)


if __name__ == "__main__":
    main()
