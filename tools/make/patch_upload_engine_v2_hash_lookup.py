#!/usr/bin/env python3
"""
Patch Upload Engine Fresh Airtable v2 blueprint:
- Replace module 52 Airtable Search Records with HTTP Airtable API GET
- Fix module 51 mappings for HTTP response shape (records[1].id / fields)
- Set scenario name suffix: With File Hash Duplicate Check
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SCENARIO_NAME = (
    "Shooting Challenge - GAME - Upload Engine - "
    "Fresh Airtable Source - v2 - With File Hash Duplicate Check"
)

FILTER_FORMULA = (
    'AND("{{50.sha256}}" != "", {File Content Hash} = "{{50.sha256}}", '
    'RECORD_ID() != "{{1.submissionAssetRecordId}}")'
)

MODULE_52_HTTP: dict[str, Any] = {
    "id": 52,
    "module": "http:ActionSendData",
    "version": 3,
    "parameters": {
        "handleErrors": False,
        "useNewZLibDeCompress": True,
    },
    "mapper": {
        "url": "https://api.airtable.com/v0/appn84sqPw03zEbTT/tblhMLKxQK77agtME",
        "method": "get",
        "headers": [
            {
                "name": "Authorization",
                "value": "Bearer REPLACE_WITH_AIRTABLE_TOKEN",
            },
            {"name": "Content-Type", "value": "application/json"},
        ],
        "queryParameters": [
            {"name": "maxRecords", "value": "1"},
            {"name": "filterByFormula", "value": FILTER_FORMULA},
        ],
        "parseResponse": True,
        "shareCookies": False,
        "timeout": "",
        "bodyType": "",
    },
    "metadata": {
        "designer": {"x": 2035, "y": -1410},
        "notes": (
            "HTTP Airtable API duplicate hash lookup. "
            "Returns records:[] when no match — scenario continues to Drive upload."
        ),
    },
}

MODULE_51_RECORD: dict[str, str] = {
    "File Content Hash": "{{50.sha256}}",
    "File Hash Algorithm": "SHA-256",
    "File Size Bytes": "{{50.sizeBytes}}",
    "File MIME Type": "{{50.mimeType}}",
    "File is Duplicate?": (
        '{{if(empty(50.sha256); false; if(empty(52.records[1].id); false; true))}}'
    ),
    "Duplicate File Status": (
        '{{if(empty(50.sha256); "Error"; if(empty(52.records[1].id); "Unique"; "Exact Duplicate"))}}'
    ),
    "Duplicate Match Strength": (
        '{{if(empty(50.sha256); "Manual Review"; "Exact SHA-256 Hash")}}'
    ),
    "Duplicate Match Record": (
        "{{if(empty(52.records[1].id); null; 52.records[1].id)}}"
    ),
    "Duplicate Match Notes": (
        '{{if(empty(50.sha256); "Hash helper did not return sha256. Upload continued, but duplicate detection could not be completed."; '
        'if(empty(52.records[1].id); "No matching file hash found."; '
        'concat("Exact duplicate file content. Same SHA-256 hash already exists on Submission Asset "; '
        '52.records[1].id; " - "; 52.records[1].fields.`Submission Assets Full Name`; ". Review before correcting again.")))}}'
    ),
    "Duplicate Checked At": "{{now}}",
    "Duplicate Check Error": (
        '{{if(empty(50.sha256); "Hash helper did not return sha256. Check Module 50 response and hash helper endpoint."; "")}}'
    ),
}


def iter_flow_modules(flow: list[dict[str, Any]]):
    for module in flow:
        yield module
        if module.get("module") == "builtin:BasicRouter":
            for route in module.get("routes") or []:
                yield from iter_flow_modules(route.get("flow") or [])


def replace_module_in_flow(flow: list[dict[str, Any]], module_id: int, replacement: dict[str, Any]) -> bool:
    for index, module in enumerate(flow):
        if module.get("id") == module_id:
            merged = dict(replacement)
            designer = (module.get("metadata") or {}).get("designer")
            if designer:
                merged.setdefault("metadata", {})["designer"] = designer
            flow[index] = merged
            return True
        if module.get("module") == "builtin:BasicRouter":
            for route in module.get("routes") or []:
                if replace_module_in_flow(route.get("flow") or [], module_id, replacement):
                    return True
    return False


def patch_blueprint(blueprint: dict[str, Any]) -> dict[str, Any]:
    blueprint = json.loads(json.dumps(blueprint))
    blueprint["name"] = SCENARIO_NAME

    if not replace_module_in_flow(blueprint.get("flow") or [], 52, MODULE_52_HTTP):
        raise SystemExit("Module 52 not found in blueprint flow.")

    module_51 = None
    for module in iter_flow_modules(blueprint.get("flow") or []):
        if module.get("id") == 51:
            module_51 = module
            break

    if module_51 is None:
        raise SystemExit("Module 51 not found in blueprint flow.")

    mapper = module_51.setdefault("mapper", {})
    mapper["typecast"] = True
    mapper["useColumnId"] = False
    mapper["record"] = dict(MODULE_51_RECORD)

    # Remove empty filter on module 20 if present (duplicate check does not gate upload)
    for module in iter_flow_modules(blueprint.get("flow") or []):
        if module.get("id") == 20:
            module.pop("filter", None)
            break

    search_left = json.dumps(blueprint)
    if "airtable:ActionSearchRecords" in search_left and '"id": 52' in search_left:
        raise SystemExit("Module 52 still uses airtable:ActionSearchRecords after patch.")

    return blueprint


def main() -> None:
    if len(sys.argv) not in (2, 3):
        print(
            "Usage: python patch_upload_engine_v2_hash_lookup.py INPUT.json [OUTPUT.json]",
            file=sys.stderr,
        )
        raise SystemExit(2)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2]) if len(sys.argv) == 3 else None

    blueprint = json.loads(input_path.read_text(encoding="utf-8"))
    patched = patch_blueprint(blueprint)
    output = json.dumps(patched, indent=4, ensure_ascii=False) + "\n"

    if output_path:
        output_path.write_text(output, encoding="utf-8")
        print(f"Wrote {output_path}")
    else:
        sys.stdout.write(output)


if __name__ == "__main__":
    main()
