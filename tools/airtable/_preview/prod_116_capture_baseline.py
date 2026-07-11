#!/usr/bin/env python3
"""Capture PROD automation 116 fixture baseline evidence."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

HERE = Path(__file__).parent
load_dotenv(HERE.parent / ".env")

PROD = "appn84sqPw03zEbTT"
H = {"Authorization": f"Bearer {os.environ['AIRTABLE_API_TOKEN']}"}


def get(table: str, rid: str) -> dict:
    url = f"https://api.airtable.com/v0/{PROD}/{requests.utils.quote(table)}/{rid}"
    return requests.get(url, headers=H, timeout=120).json()["fields"]


def xp_count(source_key: str) -> int:
    params = [("pageSize", "100"), ("filterByFormula", f'{{Source Key}}="{source_key}"')]
    url = f"https://api.airtable.com/v0/{PROD}/XP%20Events"
    r = requests.get(url, headers=H, params=params, timeout=120)
    r.raise_for_status()
    return len(r.json().get("records") or [])


def main() -> None:
    ids = json.loads((HERE / "prod-116-fixture-audit.json").read_text(encoding="utf-8"))
    asset = get("Submission Assets", ids["assetId"])
    vf = get("Video Feedback", ids["videoFeedbackId"])
    xp = get("XP Events", ids["xpEventId"])
    sub = get("Submissions", ids["submissionId"])
    evidence = {
        "submissionId": ids["submissionId"],
        "assetId": ids["assetId"],
        "videoFeedbackId": ids["videoFeedbackId"],
        "xpEventId": ids["xpEventId"],
        "sourceKey": ids["sourceKey"],
        "assetReuseDecision": asset.get("Asset Reuse Decision"),
        "duplicateResolutionApplied": asset.get("Duplicate Resolution Applied?"),
        "duplicateResolutionLastAppliedDecision": asset.get("Duplicate Resolution Last Applied Decision"),
        "duplicateResolutionError": asset.get("Duplicate Resolution Error"),
        "duplicateResolutionAppliedAt": asset.get("Duplicate Resolution Applied At"),
        "vfDoNotAwardXP": vf.get("Do Not Award XP?"),
        "xpActive": xp.get("Active?"),
        "xpDuplicateStatus": xp.get("Duplicate Status"),
        "xpReasonDebug": xp.get("XP Reason Debug"),
        "xpCountForSourceKey": xp_count(ids["sourceKey"]),
        "submissionLabel": sub.get("Submission Full Name") or sub.get("Name"),
        "assetLabel": asset.get("Asset Label"),
        "vfKey": vf.get("Video Feedback Key"),
    }
    phase = sys.argv[1] if len(sys.argv) > 1 else "baseline"
    out = HERE / f"prod-116-{phase}-2026-07-11.json"
    out.write_text(json.dumps(evidence, indent=2, default=str), encoding="utf-8")
    print(json.dumps(evidence, indent=2, default=str))


if __name__ == "__main__":
    main()
