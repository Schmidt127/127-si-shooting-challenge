#!/usr/bin/env python3
"""C-025: build Effective→Formula preconversion manifest from live DEV (read-only)."""

from __future__ import annotations

import json
from pathlib import Path

from _c025_checkbox_yn_repair import YN_PAIRS, checkbox_draft_formula
from _c025_config_linkage_apply import (
    SETTINGS,
    ZM_ID,
    build_effective_formula,
    field_by_name,
    get_record,
    tables,
)

HERE = Path(__file__).resolve().parent
PREVIEW = HERE / "_preview"
PREVIEW.mkdir(exist_ok=True)

MID = "rech5YbJNUzBRY6LQ"
ORDER = [
    "xp_pct",
    "makeup_days",
    "deadline_mode",
    "email_timing",
    "email_template",
    "gate",
    "perfect_week",
    "coach",
    "makeup_enabled",
    "email_enabled",
]


def main():
    ts = tables()
    zm_f = get_record(ZM_ID, MID).get("fields") or {}
    yn_by_label = {p["rollup_label"]: checkbox_draft_formula(p) for p in YN_PAIRS}
    by_key = {s["key"]: s for s in SETTINGS}

    rows = []
    for key in ORDER:
        s = by_key[key]
        eff = field_by_name(ZM_ID, s["effective"], ts)
        draft_name = f"{s['effective']} (Config formula draft)"
        draft = field_by_name(ZM_ID, draft_name, ts)
        formula = yn_by_label[s["rollup_label"]] if s["kind"] == "checkbox" else build_effective_formula(s)
        live_opts = (draft or {}).get("options") or {}
        sample_draft = zm_f.get(draft_name)
        if isinstance(sample_draft, list) and len(sample_draft) == 1:
            sample_draft = sample_draft[0]
        rows.append(
            {
                "order": len(rows) + 1,
                "key": key,
                "effective_name": s["effective"],
                "effective_id": (eff or {}).get("id"),
                "current_type": (eff or {}).get("type"),
                "draft_helper": draft_name,
                "draft_id": (draft or {}).get("id"),
                "draft_live_result_type": ((live_opts.get("result") or {}).get("type")),
                "formula_to_paste": formula,
                "expected_output_type": {
                    "number": "Number (integer)",
                    "checkbox": "Checkbox (or Number 1/0 — accept either if Airtable offers only number)",
                    "select": "Single line text (or Single select if offered with same choices)",
                    "text": "Single line text",
                }[s["kind"]],
                "fallback": s["fallback"],
                "kind": s["kind"],
                "depends_on": [
                    s["override"],
                    f"Program Config: {s['rollup_label']}",
                    f"Global Config: {s['rollup_label']}",
                ],
                "sample_meeting": MID,
                "sample_effective_now": zm_f.get(s["effective"]),
                "sample_draft_now": sample_draft,
                "ids_present": bool(eff and draft),
                "still_editable": (eff or {}).get("type") != "formula",
            }
        )

    out = {
        "base": "appTetnuCZlCZdTCT",
        "table": "Zoom Meetings",
        "table_id": ZM_ID,
        "sample_meeting": MID,
        "precedence": ["Meeting Override", "Program Config", "Global Config", "Safe fallback"],
        "rows": rows,
        "checks": {
            "count": len(rows),
            "all_ids_present": all(r["ids_present"] for r in rows),
            "all_still_editable": all(r["still_editable"] for r in rows),
            "ready_for_mike_ui": all(r["ids_present"] and r["still_editable"] and r["formula_to_paste"] for r in rows),
        },
    }
    path = PREVIEW / "c025_effective_conversion_manifest.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(path), **out["checks"]}, indent=2))


if __name__ == "__main__":
    main()
