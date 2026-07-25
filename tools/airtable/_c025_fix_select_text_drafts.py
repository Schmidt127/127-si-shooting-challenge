#!/usr/bin/env python3
"""C-025 DEV: repair select/text Config formula drafts with ARRAYJOIN on rollups.

Read-only safe for Effective fields. Patches only `* (Config formula draft)` helpers
for Deadline Mode, Approval Email Timing, Approval Email Template Key.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests

from _c025_config_linkage_apply import (
    DATA,
    H,
    PREVIEW,
    SETTINGS,
    ZM_ID,
    field_by_name,
    patch_field,
    tables,
)

HERE = Path(__file__).resolve().parent


def text_formula_arrayjoin(override: str, prog: str, glob: str, fallback) -> str:
    if fallback == "":
        fb = "BLANK()"
    else:
        fb = json.dumps(fallback)
    # Meeting Override is scalar singleSelect/text; Program/Global are rollups (arrays).
    # Without ARRAYJOIN, formula result type singleLineText renders blank in the API/UI.
    return f"""IF(
  {{{override}}} != BLANK(),
  {{{override}}},
  IF(
    ARRAYJOIN({{{prog}}}) != BLANK(),
    ARRAYJOIN({{{prog}}}),
    IF(
      ARRAYJOIN({{{glob}}}) != BLANK(),
      ARRAYJOIN({{{glob}}}),
      {fb}
    )
  )
)"""


def main():
    ts = tables()
    targets = [s for s in SETTINGS if s["kind"] in ("select", "text")]
    report = []
    for s in targets:
        o = s["override"]
        p = f"Program Config: {s['rollup_label']}"
        g = f"Global Config: {s['rollup_label']}"
        draft_name = f"{s['effective']} (Config formula draft)"
        draft = field_by_name(ZM_ID, draft_name, ts)
        if not draft:
            report.append({"key": s["key"], "status": "missing_draft"})
            continue
        formula = text_formula_arrayjoin(o, p, g, s["fallback"])
        res = patch_field(
            ZM_ID,
            draft["id"],
            {
                "description": "C-025 — ARRAYJOIN on Program/Global rollups for select/text draft",
                "options": {"formula": formula},
            },
        )
        report.append(
            {
                "key": s["key"],
                "draft_id": draft["id"],
                "draft_name": draft_name,
                "patch": res.get("status"),
                "formula": formula,
                "error": res.get("body") if res.get("status") == "error" else None,
            }
        )
        time.sleep(0.4)

    time.sleep(2)
    mid = "rech5YbJNUzBRY6LQ"
    r = requests.get(
        f"{DATA}/{ZM_ID}/{mid}",
        headers=H,
        params={"returnFieldsByFieldId": "true"},
        timeout=60,
    )
    r.raise_for_status()
    by_id = r.json().get("fields") or {}
    for row in report:
        if row.get("draft_id"):
            row["sample_after"] = by_id.get(row["draft_id"])

    out = PREVIEW / "c025_select_text_draft_arrayjoin_fix.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(out), "rows": report}, indent=2))


if __name__ == "__main__":
    main()
