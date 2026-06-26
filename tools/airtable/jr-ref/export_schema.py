#!/usr/bin/env python3
"""
Export schema for 127SI - JR REF into airtable/schema/jr-ref/snapshots/YYYY-MM-DD/

Usage:
  cd tools/airtable/jr-ref
  copy .env.example .env   # fill in JR_REF_AIRTABLE_BASE_ID + token
  pip install -r ../requirements.txt
  python export_schema.py -v
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
PARENT_EXPORT = SCRIPT_DIR.parent / "export_airtable_schema.py"
DEFAULT_SNAPSHOT_ROOT = REPO_ROOT / "airtable" / "schema" / "jr-ref" / "snapshots"


def load_jr_ref_env() -> None:
    load_dotenv(SCRIPT_DIR / ".env", override=True)


def require_config() -> tuple[str, str]:
    token = (
        os.getenv("AIRTABLE_TOKEN")
        or os.getenv("AIRTABLE_API_TOKEN")
        or ""
    ).strip()
    base_id = (
        os.getenv("JR_REF_AIRTABLE_BASE_ID")
        or os.getenv("BASE_ID")
        or os.getenv("AIRTABLE_BASE_ID")
        or ""
    ).strip()
    if not token:
        sys.exit(
            "Missing token. Set AIRTABLE_TOKEN in tools/airtable/jr-ref/.env"
        )
    if not base_id:
        sys.exit(
            "Missing base ID. Set JR_REF_AIRTABLE_BASE_ID in tools/airtable/jr-ref/.env"
        )
    return token, base_id


def main() -> None:
    parser = argparse.ArgumentParser(description="Export 127SI - JR REF schema")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument("--skip-views", action="store_true")
    parser.add_argument("--only", help="Comma-separated table names")
    parser.add_argument("--out-dir", help="Override output directory")
    args = parser.parse_args()

    load_jr_ref_env()
    token, base_id = require_config()

    os.environ["AIRTABLE_TOKEN"] = token
    os.environ["AIRTABLE_API_TOKEN"] = token
    os.environ["BASE_ID"] = base_id
    os.environ["AIRTABLE_BASE_ID"] = base_id
    os.environ.setdefault("BASE_NAME", "127SI - JR REF")

    out_dir = Path(args.out_dir) if args.out_dir else DEFAULT_SNAPSHOT_ROOT / datetime.now().strftime("%Y-%m-%d")
    out_dir.mkdir(parents=True, exist_ok=True)

    cmd = [sys.executable, str(PARENT_EXPORT), "--out-dir", str(out_dir)]
    if args.verbose:
        cmd.append("-v")
    if args.skip_views:
        cmd.append("--skip-views")
    if args.only:
        cmd.extend(["--only", args.only])

    if args.verbose:
        print(f"Exporting {os.environ['BASE_NAME']} ({base_id[:8]}…) → {out_dir}")

    subprocess.run(cmd, cwd=SCRIPT_DIR.parent, check=True)


if __name__ == "__main__":
    main()
