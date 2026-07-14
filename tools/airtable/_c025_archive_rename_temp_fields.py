#!/usr/bin/env python3
"""Rename C-025 temp fields to ZZZ archive prefix when Meta DELETE returns 404."""

from __future__ import annotations

import json
import time

import requests

from _c025_config_linkage_apply import H, META, ZM_ID, tables

PREFIX = "ZZZ C025 Archive — "
PATTERNS = (
    "(Config formula draft)",
    "C025 Select Probe",
    "C025 Checkbox Rollup Probe",
    " — legacy rollup",
    " — pre-YN",
)


def main():
    report = []
    ts = tables()
    for t in ts:
        if t["id"] != ZM_ID:
            continue
        for f in t["fields"]:
            n = f["name"]
            if n.startswith("ZZZ C025 Archive"):
                continue
            if not any(p in n for p in PATTERNS):
                continue
            new_name = PREFIX + n
            if len(new_name) > 255:
                new_name = new_name[:255]
            r = requests.patch(
                f"{META}/tables/{ZM_ID}/fields/{f['id']}",
                headers=H,
                json={"name": new_name},
                timeout=60,
            )
            report.append({"id": f["id"], "from": n, "to": new_name, "http": r.status_code, "body": r.text[:200]})
            time.sleep(0.35)
    path = __file__.replace("_c025_archive_rename_temp_fields.py", "_preview/c025_archive_rename_temp_fields.json")
    open(path, "w", encoding="utf-8").write(json.dumps(report, indent=2))
    print(json.dumps({"wrote": path, "count": len(report), "ok": sum(1 for x in report if x["http"] == 200)}, indent=2))


if __name__ == "__main__":
    main()
