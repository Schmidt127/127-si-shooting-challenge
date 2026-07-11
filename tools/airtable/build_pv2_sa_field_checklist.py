#!/usr/bin/env python3
"""Build PROD Submission Assets field promotion checklist from live DEV metadata."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TMP = REPO / "docs" / "audits" / "_tmp_missing_sa_fields_dev.json"
OUT_JSON = REPO / "docs" / "audits" / "pv2-prod-submission-assets-field-promotion-checklist-2026-07-11.json"
OUT_MD = REPO / "docs" / "audits" / "pv2-prod-submission-assets-field-promotion-checklist-2026-07-11.md"

DEV_BASE = "appTetnuCZlCZdTCT"
PROD_BASE = "appn84sqPw03zEbTT"
AUDIT_COMMIT = "fdf7116420360c74462df4ce786d0dea13c45d50"
RECONCILED_AT = "2026-07-11T12:45:00Z"

# Live reconciliation (verified same session as artifact build)
DEV_COUNT = 97
PROD_COUNT = 80
MISSING_COUNT = 17
PRIOR_AUDIT_COUNT = 17
DISCREPANCY = None

RISK = {
    "Storage Key": "BLOCKER",
    "Upload Claim Run ID": "BLOCKER",
    "Potential Asset Reuse?": "REQUIRED BEFORE LAUNCH",
    "Processing Started At": "REQUIRED BEFORE LAUNCH",
    "Exact Hash Match Found?": "REQUIRED BEFORE LAUNCH",
    "Same Enrollment Match Found?": "REQUIRED BEFORE LAUNCH",
    "Duplicate Match Records (All)": "REQUIRED BEFORE LAUNCH",
    "From field: Duplicate Match Records (All)": "REQUIRED BEFORE LAUNCH",
    "Asset Reuse Review Primary Reason": "REQUIRED BEFORE LAUNCH",
    "Asset Reuse Review Reasons": "REQUIRED BEFORE LAUNCH",
    "Asset Reuse Review Summary": "REQUIRED BEFORE LAUNCH",
    "Asset Reuse Reviewed At": "REQUIRED BEFORE LAUNCH",
    "Asset Reuse Reviewed By": "REQUIRED BEFORE LAUNCH",
    "Upload Naming Status": "REQUIRED BEFORE LAUNCH",
    "Video Feedback Focus": "REQUIRED BEFORE LAUNCH",
    "Asset Sequence": "NOT REQUIRED",
    "Calculation": "NOT REQUIRED",
}

CREATE_ORDER = [
    "Storage Key",
    "Upload Claim Run ID",
    "Potential Asset Reuse?",
    "Exact Hash Match Found?",
    "Same Enrollment Match Found?",
    "Processing Started At",
    "Asset Reuse Review Summary",
    "Asset Reuse Reviewed By",
    "Asset Sequence",
    "Asset Reuse Reviewed At",
    "Upload Naming Status",
    "Video Feedback Focus",
    "Asset Reuse Review Primary Reason",
    "Asset Reuse Review Reasons",
    "Duplicate Match Records (All)",
    "Calculation",
]

PURPOSE = {
    "Storage Key": "S3 object path written by Lambda/Make; required for canonical storage and 070b route.",
    "Upload Claim Run ID": "Lambda single-worker upload claim token; prevents concurrent upload collisions.",
    "Potential Asset Reuse?": "Flags same-enrollment contextual duplicate for operator review queue (C-023).",
    "Processing Started At": "Timestamp when Lambda claims asset for upload (America/Denver).",
    "Exact Hash Match Found?": "Lambda flag: byte-identical hash match detected.",
    "Same Enrollment Match Found?": "Lambda flag: same-enrollment duplicate context detected.",
    "Duplicate Match Records (All)": "Self-link to all same-enrollment uploaded hash matches.",
    "From field: Duplicate Match Records (All)": "Inverse self-link — auto-created with Duplicate Match Records (All).",
    "Asset Reuse Review Primary Reason": "Primary contextual reuse classification for operator review.",
    "Asset Reuse Review Reasons": "All contextual reuse reason tags (multi-select).",
    "Asset Reuse Review Summary": "Human-readable reuse review summary from Lambda.",
    "Asset Reuse Reviewed At": "When operator finalized reuse decision (UTC).",
    "Asset Reuse Reviewed By": "Operator identifier for reuse review.",
    "Upload Naming Status": "File naming pipeline readiness for Make upload.",
    "Video Feedback Focus": "Video skill focus category on video submission assets.",
    "Asset Sequence": "Optional asset ordering integer within submission.",
    "Calculation": "Debug formula displaying RecordId — cosmetic on DEV.",
}

BLOCKS = {
    "Storage Key": {"c013": True, "c023": True, "116": False, "070b": True, "lambda": True, "duplicate_review": True, "launch": True},
    "Upload Claim Run ID": {"c013": True, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": False, "launch": True},
    "Potential Asset Reuse?": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": True},
    "Processing Started At": {"c013": True, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": False, "launch": True},
    "Exact Hash Match Found?": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": False},
    "Same Enrollment Match Found?": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": False},
    "Duplicate Match Records (All)": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": True},
    "From field: Duplicate Match Records (All)": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": True},
    "Asset Reuse Review Primary Reason": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": True},
    "Asset Reuse Review Reasons": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": True},
    "Asset Reuse Review Summary": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": True, "duplicate_review": True, "launch": False},
    "Asset Reuse Reviewed At": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": False, "duplicate_review": True, "launch": False},
    "Asset Reuse Reviewed By": {"c013": False, "c023": True, "116": False, "070b": False, "lambda": False, "duplicate_review": True, "launch": False},
    "Upload Naming Status": {"c013": True, "c023": False, "116": False, "070b": True, "lambda": False, "duplicate_review": False, "launch": True},
    "Video Feedback Focus": {"c013": False, "c023": False, "116": False, "070b": False, "lambda": False, "duplicate_review": False, "launch": False},
    "Asset Sequence": {"c013": False, "c023": False, "116": False, "070b": False, "lambda": False, "duplicate_review": False, "launch": False},
    "Calculation": {"c013": False, "c023": False, "116": False, "070b": False, "lambda": False, "duplicate_review": False, "launch": False},
}


def choice_names(field: dict) -> list[str]:
    opts = field.get("options") or {}
    return [c["name"] for c in opts.get("choices", [])]


def build_field_entry(f: dict) -> dict:
    name = f["name"]
    entry = {
        "name": name,
        "devFieldId": f["id"],
        "prodFieldId": None,
        "existsInProd": False,
        "type": f["type"],
        "description": f.get("description") or "",
        "classification": RISK.get(name, "REQUIRED BEFORE LAUNCH"),
        "operationalPurpose": PURPOSE.get(name, ""),
        "dependencyBlocks": BLOCKS.get(name, {}),
        "devOptions": f.get("options") or {},
        "prodOptions": None,
        "dependsOnMissingFields": [],
        "dependsOnProdFields": [],
        "createMethod": "omni" if name not in ("Duplicate Match Records (All)", "Calculation", "From field: Duplicate Match Records (All)") else "manual",
        "notes": [],
    }
    if name == "Calculation":
        entry["dependsOnProdFields"] = ["RecordId"]
        entry["manualFormula"] = "{RecordId}"
        entry["notes"].append("PROD already has RecordId (fldXz9TNOnGeRXEL8). Formula must reference {RecordId}, not a missing field.")
    if name == "Duplicate Match Records (All)":
        entry["linkedTable"] = "Submission Assets"
        entry["linkedTableId"] = "tblhMLKxQK77agtME"
        entry["prefersSingleRecordLink"] = False
        entry["notes"].append("Create as self-link to Submission Assets. Airtable auto-creates inverse 'From field: Duplicate Match Records (All)'.")
    if name == "From field: Duplicate Match Records (All)":
        entry["createMethod"] = "auto_inverse"
        entry["notes"].append("Do NOT create manually — verify after Duplicate Match Records (All) is created.")
    return entry


def build_omni_prompt(fields: list[dict]) -> str:
    lines = [
        "You are working in the PRODUCTION Airtable base only.",
        "",
        f"Base ID: {PROD_BASE}",
        f"Table: Submission Assets",
        "",
        "STRICT RULES:",
        "- Do NOT modify, rename, or delete any existing field.",
        "- Do NOT change any existing field type, formula, option, or link.",
        "- Do NOT enable, disable, or edit any automation.",
        "- Do NOT create, update, or delete any records.",
        "- Do NOT change views, interfaces, or permissions.",
        "- Create ONLY the missing fields listed below, in order.",
        "- Before creating each field, check whether a field with the EXACT same name already exists. If it exists, STOP that field and report it — do not create a duplicate or suffix variant (no '2', 'copy', or '(from DEV)').",
        "- After each creation, report: field name, field type, and confirmation it was newly created.",
        "",
        "Create these fields in order:",
        "",
    ]
    step = 1
    for name in CREATE_ORDER:
        f = next(x for x in fields if x["name"] == name)
        if f["createMethod"] in ("auto_inverse",):
            continue
        if f["createMethod"] == "manual":
            lines.append(f"{step}. SKIP IN OMNI — manual follow-up required: **{name}** ({f['type']})")
            step += 1
            continue
        lines.append(f"{step}. **{name}** — type: `{f['type']}`")
        if f["type"] == "singleLineText":
            lines.append("   - Single line text, no default.")
        elif f["type"] == "multilineText":
            lines.append("   - Long text, no default.")
        elif f["type"] == "number":
            prec = (f["devOptions"] or {}).get("precision", 0)
            lines.append(f"   - Number, precision {prec}, no default.")
        elif f["type"] == "checkbox":
            opts = f["devOptions"] or {}
            lines.append(f"   - Checkbox, icon: {opts.get('icon', 'check')}, color: {opts.get('color', 'greenBright')}.")
        elif f["type"] == "dateTime":
            opts = f["devOptions"] or {}
            tz = opts.get("timeZone", "utc")
            df = (opts.get("dateFormat") or {}).get("format", "M/D/YYYY")
            tf = (opts.get("timeFormat") or {}).get("format", "h:mma")
            lines.append(f"   - Date with time. Date format: {df}. Time format: {tf}. Time zone: {tz}.")
        elif f["type"] == "singleSelect":
            lines.append("   - Single select. Options in this exact order:")
            for c in choice_names({"options": f["devOptions"]}):
                lines.append(f"     - {c}")
        elif f["type"] == "multipleSelects":
            lines.append("   - Multiple select. Options in this exact order:")
            for c in choice_names({"options": f["devOptions"]}):
                lines.append(f"     - {c}")
        step += 1
    lines.extend([
        "",
        "When finished, report:",
        "- Total fields created",
        "- Any fields skipped because they already existed",
        "- Any fields you could not create",
        "- Confirmation that no existing fields were modified",
    ])
    return "\n".join(lines)


def build_md(data: dict) -> str:
    omni = data["omniPrompt"]
    lines = [
        "# PROD Submission Assets — Field Promotion Checklist",
        "",
        f"**Date:** 2026-07-11  ",
        f"**DEV base:** `{DEV_BASE}`  ",
        f"**PROD base:** `{PROD_BASE}`  ",
        f"**Table:** Submission Assets (`tblhMLKxQK77agtME`)  ",
        f"**Source audit:** `docs/audits/pv2-dev-prod-gap-inventory-2026-07-11.md` (commit `{AUDIT_COMMIT}`)  ",
        "",
        "## 1. Live reconciliation",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| DEV field count | **{data['reconciliation']['devFieldCount']}** |",
        f"| PROD field count | **{data['reconciliation']['prodFieldCount']}** |",
        f"| Missing in PROD | **{data['reconciliation']['missingFieldCount']}** |",
        f"| Prior audit count (2026-07-11) | **{PRIOR_AUDIT_COUNT}** |",
        f"| Discrepancy | **{DISCREPANCY or 'None — live matches audit'}** |",
        f"| Target PROD count after promotion | **{data['reconciliation']['targetProdFieldCount']}** |",
        f"| Reconciled at | {RECONCILED_AT} |",
        "",
        "### Missing field list (live verified)",
        "",
    ]
    for f in data["fields"]:
        lines.append(f"- `{f['name']}` — DEV `{f['devFieldId']}` · `{f['type']}` · {f['classification']}")
    lines.extend([
        "",
        "## 2. Risk summary",
        "",
        f"- **BLOCKER:** {data['summary']['blockerCount']}",
        f"- **REQUIRED BEFORE LAUNCH:** {data['summary']['requiredBeforeLaunchCount']}",
        f"- **NOT REQUIRED:** {data['summary']['notRequiredCount']}",
        "",
        "## 3. Dependency order",
        "",
        f"**First field to create:** `{CREATE_ORDER[0]}`  ",
        f"**Last field to create (manual):** `Calculation`  ",
        "",
        "| Step | Field | Method | Waits for |",
        "|------|-------|--------|-----------|",
    ])
    for i, name in enumerate(CREATE_ORDER, 1):
        f = next(x for x in data["fields"] if x["name"] == name)
        waits = ", ".join(f["dependsOnProdFields"] + f["dependsOnMissingFields"]) or "—"
        lines.append(f"| {i} | {name} | {f['createMethod']} | {waits} |")
    lines.extend([
        "",
        "**Independent batch (step 1–5):** Storage Key, Upload Claim Run ID, Potential Asset Reuse?, Exact Hash Match Found?, Same Enrollment Match Found?",
        "",
        "**Auto-created:** `From field: Duplicate Match Records (All)` when step 15 self-link is created.",
        "",
        "## 4. Field definitions (DEV source of truth)",
        "",
    ])
    for f in data["fields"]:
        lines.append(f"### {f['name']}")
        lines.append(f"- Type: `{f['type']}`")
        lines.append(f"- DEV ID: `{f['devFieldId']}`")
        lines.append(f"- Classification: **{f['classification']}**")
        lines.append(f"- Purpose: {f['operationalPurpose']}")
        if f["type"] in ("singleSelect", "multipleSelects"):
            lines.append(f"- Options: {', '.join(choice_names({'options': f['devOptions']}))}")
        if f.get("manualFormula"):
            lines.append(f"- Formula (PROD): `{f['manualFormula']}`")
        if f.get("linkedTable"):
            lines.append(f"- Link: `{f['linkedTable']}` (self-link, multiple records)")
        for n in f.get("notes", []):
            lines.append(f"- Note: {n}")
        lines.append("")
    lines.extend([
        "## 5. OMNI-ready prompt",
        "",
        "Copy everything below into Airtable OMNI in PROD base:",
        "",
        "```",
        omni,
        "```",
        "",
        "## 6. Manual follow-up checklist",
        "",
        "### 6.1 Duplicate Match Records (All) — self-link",
        "",
        "OMNI cannot reliably create self-referential link pairs. Mike must:",
        "",
        "1. Open PROD → Submission Assets → add field **Duplicate Match Records (All)**.",
        "2. Type: **Link to another record** → table **Submission Assets**.",
        "3. Allow linking to **multiple records**.",
        "4. Save. Verify Airtable auto-creates **From field: Duplicate Match Records (All)**.",
        "5. Do NOT create the inverse field manually.",
        "",
        "**Verify:** Both link fields exist; link targets Submission Assets only.",
        "",
        "### 6.2 Calculation — formula",
        "",
        "1. Add field **Calculation** → type **Formula**.",
        "2. Description: `Displays the record id for this record.`",
        "3. Formula (exact): `{RecordId}`",
        "4. Result type: Single line text.",
        "",
        "**Verify:** Formula references existing PROD field `RecordId` (not RECORD_ID() unless preferred).",
        "",
        "## 7. Post-creation validation",
        "",
        "```powershell",
        "cd tools/airtable",
        "python pv2_dev_prod_gap_audit.py",
        "```",
        "",
        "**PASS criteria:**",
        "",
        "1. `submission_assets_missing_in_prod` = **0** (or only NOT REQUIRED fields if intentionally deferred).",
        "2. PROD Submission Assets field count = **97**.",
        "3. Each missing field name exists **exactly once** on PROD.",
        "4. Field types match DEV for all 17 fields.",
        "5. Single/multiple select options match DEV lists above.",
        "6. Self-link pair exists: Duplicate Match Records (All) ↔ From field: Duplicate Match Records (All).",
        "7. Script 116 PROD dependency check = PASS (already PASS before this promotion).",
        "8. Script 070b PROD dependency check = PASS (requires Storage Key).",
        "9. No existing PROD field renamed or type-changed (spot-check RecordId, Canonical File URL, Asset Reuse Decision).",
        "",
        "## 8. Known limitations",
        "",
        "- Airtable field IDs will differ on PROD — scripts use field **names**, not IDs.",
        "- Select option internal IDs will differ; option **names** must match.",
        "- OMNI may not set checkbox icon/color — verify after creation.",
        "- `Video Feedback Focus` is also missing on PROD Submissions and Video Feedback tables — separate promotion if needed.",
        "",
        "## 9. Recommended next Cursor prompt",
        "",
        data["recommendedNextPrompt"],
        "",
        "---",
        f"*Generated {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}*",
    ])
    return "\n".join(lines)


def main() -> None:
    raw = json.loads(TMP.read_text(encoding="utf-8"))
    fields = [build_field_entry(f) for f in raw["fields"]]
    # sort fields list to match missing order from live reconcile
    name_order = {f["name"]: i for i, f in enumerate(raw["fields"])}
    fields.sort(key=lambda x: name_order[x["name"]])

    blocker = sum(1 for f in fields if f["classification"] == "BLOCKER")
    required = sum(1 for f in fields if f["classification"] == "REQUIRED BEFORE LAUNCH")
    not_req = sum(1 for f in fields if f["classification"] == "NOT REQUIRED")

    data = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "auditCommit": AUDIT_COMMIT,
        "devBaseId": DEV_BASE,
        "prodBaseId": PROD_BASE,
        "tableName": "Submission Assets",
        "tableId": raw["table_id"],
        "reconciliation": {
            "reconciledAt": RECONCILED_AT,
            "devFieldCount": DEV_COUNT,
            "prodFieldCount": PROD_COUNT,
            "missingFieldCount": MISSING_COUNT,
            "priorAuditMissingCount": PRIOR_AUDIT_COUNT,
            "discrepancy": DISCREPANCY,
            "targetProdFieldCount": DEV_COUNT,
            "extraInProd": [],
        },
        "summary": {
            "blockerCount": blocker,
            "requiredBeforeLaunchCount": required,
            "notRequiredCount": not_req,
        },
        "createOrder": CREATE_ORDER,
        "firstFiveFields": CREATE_ORDER[:5],
        "fields": fields,
        "omniPrompt": build_omni_prompt(fields),
        "manualFollowUpRequired": True,
        "manualItems": [
            {
                "field": "Duplicate Match Records (All)",
                "type": "multipleRecordLinks",
                "linkedTable": "Submission Assets",
                "prefersSingleRecordLink": False,
                "autoCreatesInverse": "From field: Duplicate Match Records (All)",
            },
            {
                "field": "Calculation",
                "type": "formula",
                "formula": "{RecordId}",
                "resultType": "singleLineText",
                "description": "Displays the record id for this record.",
            },
        ],
        "postCreationValidation": [
            "python tools/airtable/pv2_dev_prod_gap_audit.py",
            "PROD Submission Assets field count = 97",
            "All 17 field names present exactly once",
            "Types and select options match DEV",
            "070b script matrix PROD = PASS",
            "116 script matrix PROD = PASS",
        ],
        "recommendedNextPrompt": (
            "Mike completed PROD Submission Assets field promotion. Re-run pv2_dev_prod_gap_audit.py, "
            "confirm submission_assets_missing_in_prod=0 and 070b PROD PASS, then generate OMNI checklist "
            "for Homework Completions and Video Feedback missing fields (Linked Asset Reuse Decision, Video Feedback Focus)."
        ),
    }
    OUT_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")
    OUT_MD.write_text(build_md(data), encoding="utf-8")
    print(json.dumps({"json": str(OUT_JSON.relative_to(REPO)), "md": str(OUT_MD.relative_to(REPO)), "blocker": blocker, "required": required}, indent=2))


if __name__ == "__main__":
    main()
