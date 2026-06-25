#!/usr/bin/env python3
"""Verify Airtable PAT can list bases (no secrets printed)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]


def load_credentials() -> tuple[str, str]:
    tools_env = Path(__file__).with_name(".env")
    web_env = REPO_ROOT / "web" / ".env.local"

    if tools_env.exists():
        load_dotenv(tools_env, override=True)
    if web_env.exists():
        load_dotenv(web_env, override=True)

    if not tools_env.exists() and not web_env.exists():
        raise SystemExit("No .env found in tools/airtable or web/.env.local")

    token = os.getenv("AIRTABLE_TOKEN") or os.getenv("AIRTABLE_API_TOKEN") or ""
    base_id = os.getenv("BASE_ID") or os.getenv("AIRTABLE_BASE_ID") or ""

    if not token:
        raise SystemExit("Missing AIRTABLE_TOKEN / AIRTABLE_API_TOKEN in env file.")

    return token, base_id


def main() -> None:
    token, configured_base_id = load_credentials()
    headers = {"Authorization": f"Bearer {token}"}

    print(f"Token loaded: length={len(token)}, starts_with_pat={token.startswith('pat')}")

    bases_resp = requests.get("https://api.airtable.com/v0/meta/bases", headers=headers, timeout=60)
    print(f"GET /meta/bases -> {bases_resp.status_code}")

    if not bases_resp.ok:
        print(bases_resp.text[:500])
        records_probe = requests.get(
            f"https://api.airtable.com/v0/{configured_base_id or 'appn84sqPw03zEbTT'}/Enrollments?maxRecords=1",
            headers=headers,
            timeout=60,
        )
        if records_probe.status_code == 200:
            raise SystemExit(
                "\nToken works for data.records:read but NOT schema.bases:read.\n"
                "Create a NEW token with schema.bases:read checked, OR run\n"
                "airtable/extension-scripts/schema/export-base-schema-snapshot.js inside Airtable."
            )
        raise SystemExit(
            "\nCannot list bases. Copy the FULL token string from the token you just saved "
            "in Airtable into tools/airtable/.env or web/.env.local."
        )

    bases = bases_resp.json().get("bases", [])
    print(f"Bases visible to this token: {len(bases)}")
    for base in bases:
        marker = " <-- configured" if base.get("id") == configured_base_id else ""
        print(f"  - {base.get('name')} ({base.get('id')}){marker}")

    if configured_base_id:
        tables_resp = requests.get(
            f"https://api.airtable.com/v0/meta/bases/{configured_base_id}/tables",
            headers=headers,
            timeout=60,
        )
        print(f"\nGET /meta/bases/{configured_base_id}/tables -> {tables_resp.status_code}")
        if tables_resp.ok:
            table_count = len(tables_resp.json().get("tables", []))
            print(f"Schema read OK. Table count: {table_count}")
        else:
            print(tables_resp.text[:500])
            raise SystemExit(
                "\nConfigured BASE_ID is not accessible with this token. "
                "Update AIRTABLE_BASE_ID to match a base id listed above."
            )


if __name__ == "__main__":
    main()
