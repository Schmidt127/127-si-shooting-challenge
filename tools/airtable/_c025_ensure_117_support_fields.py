#!/usr/bin/env python3
"""C-025 DEV: ensure apply-flag + email send fields for 117d/e/f."""

from __future__ import annotations

import json
import time

from _c025_config_linkage_apply import ZA_ID, create_field, field_by_name, tables

FIELDS = [
    {
        "name": "Gate Credit Applied?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "description": "C-025 117d — Enrollment added to Zoom Meeting Attendees for gate",
    },
    {
        "name": "Perfect Week Credit Applied?",
        "type": "checkbox",
        "options": {"color": "greenBright", "icon": "check"},
        "description": "C-025 117e — Enrollment counted for Perfect Week via Attendees",
    },
    {
        "name": "Recording Approval Email Send Key",
        "type": "singleLineText",
        "description": "C-025 117f — ZOOM_REC_EMAIL|{Enrollment RID}|{Zoom Meeting RID}",
    },
    {
        "name": "Recording Approval Email Sent At",
        "type": "dateTime",
        "options": {"dateFormat": {"name": "local"}, "timeFormat": {"name": "24hour"}, "timeZone": "America/Denver"},
        "description": "C-025 117f — stamped only after successful webhook",
    },
    {
        "name": "Recording Quiz Correction Count",
        "type": "number",
        "options": {"precision": 0},
        "description": "C-025 117b — Needs Correction cycles",
    },
    {
        "name": "Recording Quiz Submitted At",
        "type": "dateTime",
        "options": {"dateFormat": {"name": "local"}, "timeFormat": {"name": "24hour"}, "timeZone": "America/Denver"},
        "description": "C-025 117a — first normalize stamp",
    },
    {
        "name": "Recording Quiz Reviewed At",
        "type": "dateTime",
        "options": {"dateFormat": {"name": "local"}, "timeFormat": {"name": "24hour"}, "timeZone": "America/Denver"},
        "description": "C-025 117b — Satisfactory stamp",
    },
    {
        "name": "Recording Quiz Needs Correction At",
        "type": "dateTime",
        "options": {"dateFormat": {"name": "local"}, "timeFormat": {"name": "24hour"}, "timeZone": "America/Denver"},
        "description": "C-025 117b — Needs Correction stamp",
    },
]


def main():
    ts = tables()
    report = []
    for body in FIELDS:
        existing = field_by_name(ZA_ID, body["name"], ts)
        if existing:
            report.append({"name": body["name"], "status": "exists", "id": existing["id"]})
            continue
        res = create_field(ZA_ID, body)
        report.append({"name": body["name"], **res})
        time.sleep(0.4)
        ts = tables()
    path = __file__.replace("_c025_ensure_117_support_fields.py", "_preview/c025_ensure_117_support_fields.json")
    open(path, "w", encoding="utf-8").write(json.dumps(report, indent=2))
    print(json.dumps({"wrote": path, "report": report}, indent=2))


if __name__ == "__main__":
    main()
