#!/usr/bin/env python3
"""
Overnight Agent 2 — READ-ONLY Athlete Achievement Unlock integrity audit.

Usage:
  python tools/airtable/overnight_achievement_unlock_audit.py \
      --json-out docs/overnight/config-xp/achievement-unlock-audit-live.json

Never writes to Airtable.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROD_BASE_ID = "appn84sqPw03zEbTT"


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    for p in (
        Path(__file__).with_name(".env"),
        Path(".env.local"),
        Path("web/.env.local"),
    ):
        if p.exists():
            load_dotenv(p, override=False)


def get_token() -> str:
    _load_dotenv()
    token = os.getenv("AIRTABLE_API_TOKEN") or os.getenv("AIRTABLE_TOKEN") or ""
    if not token or token.startswith("PASTE_"):
        # Prefer the real PAT when AIRTABLE_TOKEN is a placeholder.
        token = os.getenv("AIRTABLE_API_TOKEN") or token
    if not token or token.startswith("PASTE_"):
        raise SystemExit("Missing AIRTABLE_API_TOKEN")
    return token


def fetch_table(session, base_id: str, table: str) -> list[dict]:
    import requests

    url = f"https://api.airtable.com/v0/{base_id}/{requests.utils.quote(table)}"
    records: list[dict] = []
    offset = None
    while True:
        params: dict = {"pageSize": 100}
        if offset:
            params["offset"] = offset
        resp = session.get(url, params=params, timeout=120)
        if not resp.ok:
            raise SystemExit(f"Fetch failed: {resp.status_code} {resp.text[:300]}")
        payload = resp.json()
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            break
    return records


def audit(records: list[dict]) -> dict:
    findings = []
    by_key: dict[str, list[str]] = {}

    for rec in records:
        rid = rec.get("id", "")
        fields = rec.get("fields") or {}
        unlock_key = str(fields.get("Unlock Key") or "").strip()
        source_key = str(fields.get("Milestone Source Key") or fields.get("Streak Instance Key") or "").strip()
        enrollment = fields.get("Enrollment") or []
        xp_events = fields.get("XP Events") or []
        award_status = ""
        for k in ("XP Award Status", "Award Status", "Status"):
            if fields.get(k) is not None:
                award_status = str(fields.get(k))
                break

        if not unlock_key and not source_key:
            findings.append({"severity": "high", "code": "blank_unlock_key", "unlockId": rid})

        dedupe = unlock_key or source_key
        if dedupe:
            by_key.setdefault(dedupe, []).append(rid)

        if not enrollment:
            findings.append({"severity": "high", "code": "missing_enrollment", "unlockId": rid})

        if "awarded" in award_status.lower() and not xp_events:
            findings.append({"severity": "medium", "code": "unlock_without_xp", "unlockId": rid, "awardStatus": award_status})

    for key, ids in by_key.items():
        if len(ids) > 1:
            findings.append({
                "severity": "high",
                "code": "duplicate_unlock_key",
                "unlockId": ",".join(ids),
                "key": key,
            })

    return {
        "unlockCount": len(records),
        "findingCount": len(findings),
        "findings": findings,
        "uniqueKeys": len(by_key),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-id", default=PROD_BASE_ID)
    parser.add_argument("--json-out", type=Path, required=True)
    args = parser.parse_args(argv)

    import requests

    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {get_token()}"

    records = fetch_table(session, args.base_id, "Athlete Achievement Unlocks")
    report = {
        "mode": "read_only",
        "base_id": args.base_id,
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "audit": audit(records),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["audit"], indent=2))
    print(f"Wrote {args.json_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
