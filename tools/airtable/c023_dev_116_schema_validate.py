#!/usr/bin/env python3
"""Validate automation 116 references against live DEV schema."""
from __future__ import annotations

import json

import c023_dev_stage5_schema_setup as s


def main() -> None:
    s.load_env()
    tables = s.fetch_schema()
    table_names = {t["name"] for t in tables}

    def tf(tname: str) -> dict:
        return {f["name"]: f for f in s.table_fields(tables, tname)}

    def choice_names(tname: str, fname: str) -> list[str]:
        f = tf(tname).get(fname)
        if not f:
            return []
        return [c["name"] for c in (f.get("options") or {}).get("choices", [])]

    fail: list[str] = []
    checks = [
        ("Submission Assets", "Asset Reuse Decision", "singleSelect"),
        ("Submission Assets", "Duplicate Resolution Applied?", "checkbox"),
        ("Submission Assets", "Duplicate Resolution Applied At", "dateTime"),
        ("Submission Assets", "Duplicate Resolution Error", "multilineText"),
        ("Submission Assets", "Duplicate Resolution Last Applied Decision", "singleLineText"),
        ("Submission Assets", "Asset Reuse Review Notes", "multilineText"),
        ("Submission Assets", "Homework Completions", "multipleRecordLinks"),
        ("Submission Assets", "Video Feedback", "multipleRecordLinks"),
        ("Submission Assets", "Enrollment - Linked", "multipleRecordLinks"),
        ("Video Feedback", "Do Not Award XP?", "checkbox"),
        ("Video Feedback", "Award Status", "singleSelect"),
        ("Video Feedback", "Enrollment", "multipleRecordLinks"),
        ("Homework Completions", "Award Status", "singleSelect"),
        ("Homework Completions", "Enrollment", "multipleRecordLinks"),
        ("XP Events", "Source Key", "singleLineText"),
        ("XP Events", "Active?", "checkbox"),
        ("XP Events", "Duplicate Status", "singleSelect"),
        ("XP Events", "XP Reason Debug", "multilineText"),
        ("XP Events", "Enrollment", "multipleRecordLinks"),
        ("Enrollments", "Level Recalc Needed?", "checkbox"),
    ]

    for tname in {
        "Submission Assets",
        "Video Feedback",
        "Homework Completions",
        "XP Events",
        "Enrollments",
    }:
        if tname not in table_names:
            fail.append(f"missing table {tname}")

    for tname, fname, ftype in checks:
        f = tf(tname).get(fname)
        if not f:
            fail.append(f"missing {tname}.{fname}")
        elif f.get("type") != ftype:
            fail.append(f"type {tname}.{fname}: expected {ftype}, got {f.get('type')}")

    upload = tf("Submission Assets").get("Upload Destination")
    if not upload:
        fail.append("missing Submission Assets.Upload Destination")
    elif upload.get("type") not in ("singleSelect", "singleLineText", "formula"):
        fail.append(f"Upload Destination unexpected type: {upload.get('type')}")

    for opt in [
        "Not Reviewed",
        "Approved Reuse",
        "Allowed — Legitimate Reuse",
        "Allowed — Correction/Resubmission",
        "Confirmed Duplicate",
        "False Positive",
        "Unable to Determine",
        "Resolved — Duplicate Record Error",
    ]:
        if opt not in choice_names("Submission Assets", "Asset Reuse Decision"):
            fail.append(f"missing Asset Reuse Decision option: {opt}")

    for opt in ["Pending", "Awarded", "Do Not Award"]:
        for tname in ("Video Feedback", "Homework Completions"):
            if opt not in choice_names(tname, "Award Status"):
                fail.append(f"missing {tname}.Award Status option: {opt}")

    for opt in ["Unique", "Duplicate - Remove"]:
        if opt not in choice_names("XP Events", "Duplicate Status"):
            fail.append(f"missing XP Events.Duplicate Status option: {opt}")

    print(
        json.dumps(
            {
                "pass": len(fail) == 0,
                "failures": fail,
                "uploadDestinationType": upload.get("type") if upload else None,
                "assetReuseDecisionOptions": choice_names(
                    "Submission Assets", "Asset Reuse Decision"
                ),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
