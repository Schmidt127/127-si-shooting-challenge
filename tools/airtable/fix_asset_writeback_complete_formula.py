#!/usr/bin/env python3
"""Patch Submission Assets Writeback Complete? to gate on Canonical/S3 fields (not Drive)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
TABLE_ID = "tblhMLKxQK77agtME"
FIELD_ID = "fldtl04LTU3FoMmLL"

# Upload Status=Uploaded + Canonical File URL + Storage Key + SHA-256 + Uploaded At
# Canonical File URL was recreated 2026-08-17 as fldlVW1gGgnBI697v (prior fld9NZBwDc01gxTY9 deleted).
CANONICAL_FILE_URL_FIELD_ID = "fldlVW1gGgnBI697v"
WRITEBACK_COMPLETE_FORMULA_IDS = f"""AND(
  {{fldPybPEvRcEVuNWl}} = "Uploaded",
  {{{CANONICAL_FILE_URL_FIELD_ID}}} != BLANK(),
  {{fldJWFKe8ZT3TrSKQ}} != BLANK(),
  {{fldMtYyiPhVWbQk6M}} != BLANK(),
  {{fldvXvURsGG611cSK}} != BLANK()
)"""


def load_token() -> str:
    tools_env = Path(__file__).with_name(".env")
    web_env = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)
    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    if not token:
        raise SystemExit("Missing PAT in tools/airtable/.env")
    return token


def main() -> None:
    token = load_token()
    url = f"https://api.airtable.com/v0/meta/bases/{BASE_ID}/tables/{TABLE_ID}/fields/{FIELD_ID}"
    resp = requests.patch(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"options": {"formula": WRITEBACK_COMPLETE_FORMULA_IDS}},
        timeout=60,
    )
    if not resp.ok:
        raise SystemExit(f"PATCH failed {resp.status_code}: {resp.text[:500]}")
    formula = resp.json().get("options", {}).get("formula", "")
    if CANONICAL_FILE_URL_FIELD_ID in formula and "fldITNuxNt9xphk7j" not in formula:
        print("Writeback Complete? updated: Canonical/S3 fields (Drive gate removed).")
    else:
        raise SystemExit("Formula patch may have failed — Canonical ref missing or Drive still present.")


if __name__ == "__main__":
    main()
