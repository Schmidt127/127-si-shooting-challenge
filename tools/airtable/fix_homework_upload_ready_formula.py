#!/usr/bin/env python3
"""Patch Homework Completions Upload Ready? for Fillout quiz rows (no attachment)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_ID = "appn84sqPw03zEbTT"
TABLE_ID = "tblv58ppTFDBXb3nv"
FIELD_ID = "fldv93VB39LdydxD9"

UPLOAD_READY_FORMULA_IDS = """IF(
  AND(
    {fldFTRL2bgrlhxSoD},
    {fldfK3h5ucx3WdFNS},
    {fldASKykpfYEbf3t7}
  ),
  1,
  IF(
    AND(
      {fldwupjoZ8fbSEMM9} = "Fillout",
      {fldfK3h5ucx3WdFNS},
      {fldxn4crSQHzGhK3t}
    ),
    1,
    0
  )
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
        json={"options": {"formula": UPLOAD_READY_FORMULA_IDS}},
        timeout=60,
    )
    if not resp.ok:
        raise SystemExit(f"PATCH failed {resp.status_code}: {resp.text[:500]}")
    formula = resp.json().get("options", {}).get("formula", "")
    if "fldxn4crSQHzGhK3t" in formula:
        print("Upload Ready? updated: file path OR Fillout quiz path (no attachment required).")
    else:
        raise SystemExit("Formula patch may have failed — quiz field ref missing.")


if __name__ == "__main__":
    main()
