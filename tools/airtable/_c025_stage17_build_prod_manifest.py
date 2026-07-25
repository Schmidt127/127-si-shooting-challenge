#!/usr/bin/env python3
"""Build C-025 Stage 17 PROD schema manifest JSON from read-only schema dump."""

from __future__ import annotations

import json
from pathlib import Path

SRC = Path("tools/airtable/_preview/c025_stage17_prod_schema_manifest_source.json")
OUT = Path("docs/deploy-checklists/C-025-stage17-prod-schema-manifest.json")

# Implementation dependency order groups
ORDER = {
    "Config.fields": 10,
    "XP Events.select_options": 20,
    "XP Reward Rules.verify": 25,
    "Zoom Meetings.fields_nonformula": 30,
    "Zoom Attendance.table": 40,
    "Zoom Attendance.fields_base": 50,
    "Zoom Attendance.fields_links": 60,
    "Zoom Meetings.fields_za_link": 70,
    "Enrollments.fields_za_link": 80,
    "Zoom Attendance.fields_lookups": 90,
    "Zoom Attendance.fields_formulas": 100,
    "Zoom Meetings.fields_effective": 110,
    "Zoom Attendance.views": 120,
    "Weekly Athlete Summary.verify": 130,
    "Enrollments.verify_gate": 140,
    "Weeks.verify": 150,
    "Homework Completions.verify": 160,
}

STAGE17_CONFIG_NEEDLES = (
    "Recording",
    "Zoom Recording",
    "Makeup",
    "Gate Credit",
    "Perfect Week",
    "Recording Path",
    "Recording XP",
    "Recording Attendance",
    "Approval Email",
    "Deadline",
)

ZM_STAGE17_NEEDLES = (
    "Recording",
    "Effective",
    "Override",
    "Global Config",
    "Program Config",
    "Zoom Attendance",
    "Recording Available",
    "Recording Quiz",
    "Makeup",
)

# Known 117 / 057 / 042 critical ZA fields (automation runtime)
ZA_CRITICAL = {
    "Attendance Method",
    "Enrollment",
    "Zoom Meeting",
    "Enrollment RID",
    "Zoom Meeting RID",
    "Recording Quiz Review Status",
    "Recording Quiz Satisfactory?",
    "Recording Quiz Submitted At",
    "Recording Quiz Correction Count",
    "Recording Quiz Reviewed At",
    "Recording Quiz Needs Correction At",
    "Zoom Credit Key",
    "Zoom Credit Approved?",
    "Zoom Credit Conflict?",
    "Zoom XP Amount",
    "Zoom Credit Debug",
    "Zoom Gate Credit Earned?",
    "Gate Credit Applied?",
    "Perfect Week Credit Applied?",
    "Effective Recording Counts for Perfect Week?",
    "Recording Approval Email Send Key",
    "Recording Approval Email Sent At",
}


def field_action(dev_f, prod_f):
    if prod_f is None:
        return "create"
    if (dev_f or {}).get("type") != (prod_f or {}).get("type"):
        return "update"
    if (dev_f or {}).get("type") == "singleSelect":
        dc = set(dev_f.get("choices") or [])
        pc = set(prod_f.get("choices") or [])
        if not dc.issubset(pc):
            return "update"
    if (dev_f or {}).get("type") == "formula":
        # Formulas rebuilt after create — always verify
        return "verify"
    return "leave unchanged" if prod_f else "create"


def classify_za_field(fname: str, f: dict) -> str:
    t = f.get("type")
    if t == "multipleRecordLinks":
        return "Zoom Attendance.fields_links"
    if t in ("multipleLookupValues", "count", "rollup"):
        return "Zoom Attendance.fields_lookups"
    if t == "formula":
        return "Zoom Attendance.fields_formulas"
    return "Zoom Attendance.fields_base"


def item(
    *,
    dep_order: int,
    group: str,
    table: str,
    field: str | None,
    action: str,
    item_type: str,
    dev_table_id,
    prod_table_id,
    dev_field,
    prod_field,
    notes: str,
    required_before_paste: bool,
    required_before_enable: bool,
    validation: str,
    extra: dict | None = None,
):
    row = {
        "dependencyOrder": dep_order,
        "group": group,
        "tableName": table,
        "devTableId": dev_table_id,
        "prodTableId": prod_table_id,
        "fieldName": field,
        "devFieldId": (dev_field or {}).get("id"),
        "prodFieldId": (prod_field or {}).get("id"),
        "fieldType": (dev_field or {}).get("type") or item_type,
        "exactOptions": {
            "choices": (dev_field or {}).get("choices"),
            "choicesDetailed": (dev_field or {}).get("choicesDetailed"),
            "precision": (dev_field or {}).get("precision"),
            "dateFormat": (dev_field or {}).get("dateFormat"),
            "timeFormat": (dev_field or {}).get("timeFormat"),
            "timeZone": (dev_field or {}).get("timeZone"),
            "color": (dev_field or {}).get("color"),
            "icon": (dev_field or {}).get("icon"),
            "prefersSingleRecordLink": (dev_field or {}).get("prefersSingleRecordLink"),
        },
        "exactSelectChoices": (dev_field or {}).get("choices"),
        "exactFormula": (dev_field or {}).get("formula"),
        "formulaIsValid": (dev_field or {}).get("isValid"),
        "formulaResultType": (dev_field or {}).get("resultType"),
        "referencedFieldIds": (dev_field or {}).get("referencedFieldIds"),
        "exactLinkedTableTarget": {
            "linkedTableId": (dev_field or {}).get("linkedTableId"),
            "linkedTableName": (dev_field or {}).get("linkedTableName"),
            "inverseLinkFieldId": (dev_field or {}).get("inverseLinkFieldId"),
            "recordLinkFieldId": (dev_field or {}).get("recordLinkFieldId"),
            "fieldIdInLinkedTable": (dev_field or {}).get("fieldIdInLinkedTable"),
        },
        "description": (dev_field or {}).get("description") or notes,
        "action": action,
        "requiredBeforeAutomationPaste": required_before_paste,
        "requiredBeforeAutomationEnablement": required_before_enable,
        "validationRuleAfterCreation": validation,
        "classification": (
            "missing"
            if action == "create"
            else ("present and compatible" if action == "leave unchanged" else "present but incompatible")
        ),
        "automationCritical": bool(field and field in ZA_CRITICAL),
    }
    if extra:
        row.update(extra)
    # Drop null-heavy option noise for readability
    row["exactOptions"] = {k: v for k, v in row["exactOptions"].items() if v is not None}
    row["exactLinkedTableTarget"] = {
        k: v for k, v in row["exactLinkedTableTarget"].items() if v is not None
    }
    return row


def main():
    src = json.loads(SRC.read_text(encoding="utf-8"))
    dev = src["dev"]
    prod = src["prod"]
    dt = dev["tables"]
    pt = prod["tables"]
    dti = dev.get("tableIds") or {}
    pti = prod.get("tableIds") or {}

    items = []
    unknowns = []

    # --- Config Stage 17 fields ---
    dcfg = (dt.get("Config") or {}).get("fields") or {}
    pcfg = (pt.get("Config") or {}).get("fields") or {}
    cfg_fields = []
    for name, f in sorted(dcfg.items()):
        if any(n.lower() in name.lower() for n in STAGE17_CONFIG_NEEDLES) or name.startswith(
            "Zoom Recording"
        ):
            cfg_fields.append(name)
    # Also include Y/N companion patterns already present among filtered
    for i, name in enumerate(cfg_fields):
        df = dcfg[name]
        pf = pcfg.get(name)
        action = "create" if pf is None else field_action(df, pf)
        items.append(
            item(
                dep_order=ORDER["Config.fields"] * 100 + i,
                group="Config.fields",
                table="Config",
                field=name,
                action=action,
                item_type=df["type"],
                dev_table_id=dti.get("Config"),
                prod_table_id=pti.get("Config"),
                dev_field=df,
                prod_field=pf,
                notes="Stage 17 Config control used by recording Effective* / XP amount",
                required_before_paste=True,
                required_before_enable=True,
                validation=f"Config field `{name}` exists with type {df['type']}",
            )
        )

    # Config values from sample
    cfg_values = []
    for rec in src.get("configSample", {}).get("dev") or []:
        fields = rec.get("fields") or {}
        interesting = {
            k: v
            for k, v in fields.items()
            if any(n.lower() in k.lower() for n in STAGE17_CONFIG_NEEDLES)
            or k in ("Name", "Config Key", "Program Instance", "Active?", "Scope")
        }
        if interesting:
            cfg_values.append({"recordId": rec["id"], "fields": interesting})

    # --- XP Source option ---
    dxp = (dt.get("XP Events") or {}).get("fields") or {}
    pxp = (pt.get("XP Events") or {}).get("fields") or {}
    dxps = dxp.get("XP Source")
    pxps = pxp.get("XP Source")
    missing_opt = "Zoom Meeting Recording Quiz"
    prod_choices = set((pxps or {}).get("choices") or [])
    items.append(
        item(
            dep_order=ORDER["XP Events.select_options"] * 100,
            group="XP Events.select_options",
            table="XP Events",
            field="XP Source",
            action="update" if pxps and missing_opt not in prod_choices else ("leave unchanged" if missing_opt in prod_choices else "update"),
            item_type="singleSelect",
            dev_table_id=dti.get("XP Events"),
            prod_table_id=pti.get("XP Events"),
            dev_field=dxps,
            prod_field=pxps,
            notes="Add select option exactly: Zoom Meeting Recording Quiz",
            required_before_paste=True,
            required_before_enable=True,
            validation="XP Source choices include exact string Zoom Meeting Recording Quiz",
            extra={
                "exactSelectChoicesToAdd": [missing_opt] if missing_opt not in prod_choices else [],
                "classification": "missing"
                if missing_opt not in prod_choices
                else "present and compatible",
            },
        )
    )
    # XP Bucket verify
    items.append(
        item(
            dep_order=ORDER["XP Events.select_options"] * 100 + 1,
            group="XP Events.select_options",
            table="XP Events",
            field="XP Bucket",
            action="verify",
            item_type="singleSelect",
            dev_table_id=dti.get("XP Events"),
            prod_table_id=pti.get("XP Events"),
            dev_field=dxp.get("XP Bucket"),
            prod_field=pxp.get("XP Bucket"),
            notes="Verify Zoom Attendance bucket exists (do not rename)",
            required_before_paste=True,
            required_before_enable=True,
            validation="XP Bucket choices include Zoom Attendance",
        )
    )

    # XP Reward Rules
    reward_dev = src.get("rewardRulesSample", {}).get("dev") or []
    reward_prod = src.get("rewardRulesSample", {}).get("prod") or []

    def find_rule(rows, key="ZOOM_ATTEND_BASE"):
        for r in rows:
            f = r.get("fields") or {}
            blob = " ".join(str(v) for v in f.values())
            if key in blob or f.get("Rule Key") == key or f.get("Key") == key:
                return r
        return None

    rd = find_rule(reward_dev)
    rp = find_rule(reward_prod)
    items.append(
        {
            "dependencyOrder": ORDER["XP Reward Rules.verify"] * 100,
            "group": "XP Reward Rules.verify",
            "tableName": "XP Reward Rules",
            "devTableId": dti.get("XP Reward Rules"),
            "prodTableId": pti.get("XP Reward Rules"),
            "fieldName": None,
            "recordKey": "ZOOM_ATTEND_BASE",
            "devRecordId": (rd or {}).get("id"),
            "prodRecordId": (rp or {}).get("id"),
            "devFieldsSample": (rd or {}).get("fields"),
            "prodFieldsSample": (rp or {}).get("fields"),
            "action": "verify" if rp else "create",
            "description": "Live Zoom base rule must remain active at 60 XP; recording amount is formula from Config %",
            "requiredBeforeAutomationPaste": True,
            "requiredBeforeAutomationEnablement": True,
            "validationRuleAfterCreation": "Active ZOOM_ATTEND_BASE exists once with base XP 60; do not rewrite historical XP",
            "classification": "present and compatible" if rp else "missing",
            "noHistoricalXpRewrite": True,
        }
    )

    # Zoom Meetings Stage 17 support fields
    dzm = (dt.get("Zoom Meetings") or {}).get("fields") or {}
    pzm = (pt.get("Zoom Meetings") or {}).get("fields") or {}
    zm_stage = []
    for name, f in dzm.items():
        if name.startswith("ZZZ"):
            continue
        if name == "Attendees":
            items.append(
                item(
                    dep_order=ORDER["Zoom Meetings.fields_nonformula"] * 100,
                    group="Zoom Meetings.verify_live",
                    table="Zoom Meetings",
                    field="Attendees",
                    action="leave unchanged",
                    item_type=f["type"],
                    dev_table_id=dti.get("Zoom Meetings"),
                    prod_table_id=pti.get("Zoom Meetings"),
                    dev_field=f,
                    prod_field=pzm.get(name),
                    notes="LIVE ONLY — Automation 101 path. Recording must NEVER write this field.",
                    required_before_paste=True,
                    required_before_enable=True,
                    validation="Attendees remains Enrollment link; recording scripts never write it",
                    extra={"doubleCreditGate": True, "automation101Protection": "leave unchanged / never write from 117"},
                )
            )
            continue
        if any(n.lower() in name.lower() for n in ZM_STAGE17_NEEDLES):
            zm_stage.append((name, f))
    for i, (name, f) in enumerate(sorted(zm_stage, key=lambda x: x[0])):
        pf = pzm.get(name)
        group = (
            "Zoom Meetings.fields_za_link"
            if name == "Zoom Attendance" or f.get("type") == "multipleRecordLinks" and (f.get("linkedTableName") == "Zoom Attendance")
            else (
                "Zoom Meetings.fields_effective"
                if f.get("type") == "formula" or name.startswith("Effective")
                else "Zoom Meetings.fields_nonformula"
            )
        )
        items.append(
            item(
                dep_order=ORDER[group] * 100 + i,
                group=group,
                table="Zoom Meetings",
                field=name,
                action=field_action(f, pf) if pf else "create",
                item_type=f["type"],
                dev_table_id=dti.get("Zoom Meetings"),
                prod_table_id=pti.get("Zoom Meetings"),
                dev_field=f,
                prod_field=pf,
                notes="Stage 17 Zoom Meetings support (exclude ZZZ archives)",
                required_before_paste=group != "Zoom Meetings.fields_effective" or name.startswith("Effective"),
                required_before_enable=True,
                validation=f"Zoom Meetings.`{name}` type={f['type']} present",
            )
        )

    # Zoom Attendance table
    has_za_prod = "Zoom Attendance" in pti
    items.append(
        {
            "dependencyOrder": ORDER["Zoom Attendance.table"] * 100,
            "group": "Zoom Attendance.table",
            "tableName": "Zoom Attendance",
            "devTableId": dti.get("Zoom Attendance"),
            "prodTableId": pti.get("Zoom Attendance"),
            "fieldName": None,
            "fieldType": "table",
            "action": "leave unchanged" if has_za_prod else "create",
            "description": "Create table Zoom Attendance matching DEV; primary field = Name (or DEV primary)",
            "requiredBeforeAutomationPaste": True,
            "requiredBeforeAutomationEnablement": True,
            "validationRuleAfterCreation": "Table Zoom Attendance exists in PROD meta",
            "classification": "present and compatible" if has_za_prod else "missing",
            "devPrimaryFieldId": (dt.get("Zoom Attendance") or {}).get("primaryFieldId"),
            "devViews": (dt.get("Zoom Attendance") or {}).get("views"),
        }
    )

    dza = (dt.get("Zoom Attendance") or {}).get("fields") or {}
    pza = (pt.get("Zoom Attendance") or {}).get("fields") or {}
    for i, (name, f) in enumerate(sorted(dza.items(), key=lambda x: x[0])):
        group = classify_za_field(name, f)
        pf = pza.get(name)
        crit = name in ZA_CRITICAL
        items.append(
            item(
                dep_order=ORDER[group] * 100 + i,
                group=group,
                table="Zoom Attendance",
                field=name,
                action="create" if not has_za_prod else field_action(f, pf),
                item_type=f["type"],
                dev_table_id=dti.get("Zoom Attendance"),
                prod_table_id=pti.get("Zoom Attendance"),
                dev_field=f,
                prod_field=pf,
                notes="Stage 17 Zoom Attendance field",
                required_before_paste=crit or f["type"] != "formula",
                required_before_enable=True,
                validation=(
                    f"Field `{name}` exists type={f['type']}"
                    + (f"; formula valid and amount resolves for recording" if f["type"] == "formula" else "")
                ),
            )
        )

    # Views
    for i, v in enumerate((dt.get("Zoom Attendance") or {}).get("views") or []):
        items.append(
            {
                "dependencyOrder": ORDER["Zoom Attendance.views"] * 100 + i,
                "group": "Zoom Attendance.views",
                "tableName": "Zoom Attendance",
                "devTableId": dti.get("Zoom Attendance"),
                "prodTableId": None,
                "fieldName": None,
                "viewName": v.get("name"),
                "devViewId": v.get("id"),
                "viewType": v.get("type"),
                "action": "create",
                "description": f"Recreate view `{v.get('name')}` after fields exist",
                "requiredBeforeAutomationPaste": v.get("name") in ("Zoom Recording Quiz - Past Deadline",),
                "requiredBeforeAutomationEnablement": False,
                "validationRuleAfterCreation": f"View `{v.get('name')}` visible on Zoom Attendance",
                "classification": "missing",
            }
        )

    # Enrollments ZA link + gate fields verify
    den = (dt.get("Enrollments") or {}).get("fields") or {}
    pen = (pt.get("Enrollments") or {}).get("fields") or {}
    for name in ("Zoom Attendance", "Level Recalc Needed?", "Current Level", "Next Level", "Level Status", "Level Gate Rule", "Total Zoom Attendances"):
        if name not in den:
            unknowns.append({"table": "Enrollments", "field": name, "issue": "DEV field not found"})
            continue
        f = den[name]
        pf = pen.get(name)
        group = "Enrollments.fields_za_link" if name == "Zoom Attendance" else "Enrollments.verify_gate"
        items.append(
            item(
                dep_order=ORDER[group] * 100,
                group=group,
                table="Enrollments",
                field=name,
                action=("create" if pf is None else "leave unchanged" if name != "Zoom Attendance" or pf else "create")
                if name == "Zoom Attendance"
                else ("create" if pf is None else "verify"),
                item_type=f["type"],
                dev_table_id=dti.get("Enrollments"),
                prod_table_id=pti.get("Enrollments"),
                dev_field=f,
                prod_field=pf,
                notes="Enrollment field for 042 / Stage 17",
                required_before_paste=name in ("Level Recalc Needed?", "Zoom Attendance", "Current Level", "Next Level"),
                required_before_enable=True,
                validation=f"Enrollments.`{name}` present type={f['type']}",
            )
        )

    # WAS verify
    dwas = (dt.get("Weekly Athlete Summary") or {}).get("fields") or {}
    pwas = (pt.get("Weekly Athlete Summary") or {}).get("fields") or {}
    for i, name in enumerate(
        (
            "Enrollment",
            "Week",
            "Perfect Week Calculation Queue?",
            "Perfect Week Automation Status",
            "Perfect Week Zoom Meeting Count",
            "Perfect Week Zoom Attendance Count",
            "Goal Record",
        )
    ):
        if name not in dwas:
            unknowns.append({"table": "Weekly Athlete Summary", "field": name, "issue": "DEV missing"})
            continue
        f = dwas[name]
        pf = pwas.get(name)
        items.append(
            item(
                dep_order=ORDER["Weekly Athlete Summary.verify"] * 100 + i,
                group="Weekly Athlete Summary.verify",
                table="Weekly Athlete Summary",
                field=name,
                action="create" if pf is None else "verify",
                item_type=f["type"],
                dev_table_id=dti.get("Weekly Athlete Summary"),
                prod_table_id=pti.get("Weekly Athlete Summary"),
                dev_field=f,
                prod_field=pf,
                notes="057 v1.3 dependency",
                required_before_paste=True,
                required_before_enable=True,
                validation=f"WAS.`{name}` present",
            )
        )

    # Weeks / Homework Completions verify presence
    for table, fields, group in (
        ("Weeks", ["Start Date", "End Date", "Name"], "Weeks.verify"),
        (
            "Homework Completions",
            ["Enrollment", "Homework", "Satisfactory?", "Completion Status"],
            "Homework Completions.verify",
        ),
    ):
        dfields = (dt.get(table) or {}).get("fields") or {}
        pfields = (pt.get(table) or {}).get("fields") or {}
        for i, name in enumerate(fields):
            # soft match
            match = None
            for dn in dfields:
                if dn == name or name.lower() in dn.lower():
                    match = dn
                    break
            if not match:
                unknowns.append({"table": table, "field": name, "issue": "soft-match miss — verify manually"})
                continue
            f = dfields[match]
            pf = pfields.get(match)
            items.append(
                item(
                    dep_order=ORDER[group] * 100 + i,
                    group=group,
                    table=table,
                    field=match,
                    action="verify" if pf else "create",
                    item_type=f["type"],
                    dev_table_id=dti.get(table),
                    prod_table_id=pti.get(table),
                    dev_field=f,
                    prod_field=pf,
                    notes=f"{table} dependency for Stage 17 / 057",
                    required_before_paste=True,
                    required_before_enable=True,
                    validation=f"{table}.`{match}` present",
                )
            )

    items.sort(key=lambda x: (x.get("dependencyOrder", 0), x.get("tableName") or "", x.get("fieldName") or x.get("viewName") or ""))

    counts = {
        "totalItems": len(items),
        "create": sum(1 for i in items if i.get("action") == "create"),
        "update": sum(1 for i in items if i.get("action") == "update"),
        "verify": sum(1 for i in items if i.get("action") == "verify"),
        "leaveUnchanged": sum(1 for i in items if i.get("action") == "leave unchanged"),
        "missingClassification": sum(1 for i in items if i.get("classification") == "missing"),
        "zoomAttendanceDevFieldCount": len(dza),
        "configStage17FieldCount": len(cfg_fields),
        "zoomMeetingsStage17FieldCount": len(zm_stage),
    }

    automations = {
        "pasteOrder": [
            {"order": 1, "automation": "101", "version": "unchanged", "action": "leave unchanged", "stateDuringSchema": "ON", "stateDuringPaste": "ON", "stateDuringInitialSmoke": "ON", "notes": "Live Attendees XP only; never modify"},
            {"order": 2, "automation": "117", "version": "v1.1.1", "preferredPackage": "orchestrator", "alternates": ["117a","117b","117c","117d","117e","117f"], "pasteFile": "docs/deploy-checklists/C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt", "stateDuringSchema": "OFF/absent", "stateDuringPaste": "OFF", "stateDuringInitialSmoke": "OFF until S1", "notes": "Prefer single orchestrator; modular pack is backup"},
            {"order": 3, "automation": "057", "version": "1.3", "pasteFile": "docs/deploy-checklists/C-025-stage17-057-perfect-week-v1.3-PASTE.txt", "stateDuringSchema": "prior ON ok", "stateDuringPaste": "OFF preferred", "stateDuringInitialSmoke": "OFF until Perfect Week cases"},
            {"order": 4, "automation": "042", "version": "3.1", "pasteFile": "docs/deploy-checklists/C-025-stage17-042-level-gates-v3.1-PASTE.txt", "stateDuringSchema": "prior ON ok", "stateDuringPaste": "OFF preferred", "stateDuringInitialSmoke": "OFF until gate cases"},
            {"order": 5, "automation": "115", "version": "v1.8", "pasteFile": "docs/deploy-checklists/C-025-stage17-115-etf-v1.8-PASTE.txt", "stateDuringSchema": "N/A", "stateDuringPaste": "DO NOT PASTE TO PROD by default", "stateDuringInitialSmoke": "DEV-only unless Mike authorizes Testing Scenarios table in PROD", "notes": "Requires Testing Scenarios table — not in PROD"},
        ],
        "modular117": {
            "117a": "v1.1.0 normalize",
            "117b": "v1.1.0 coach review",
            "117c": "v1.1.0 create XP",
            "117d": "v1.2.0 gate credit observe",
            "117e": "v1.2.0 perfect week observe",
            "117f": "v1.1.0 approval email",
            "recommendation": "Use orchestrator v1.1.1 in PROD unless Mike requires modular slots",
        },
        "offDuringSchemaCreation": ["117", "117a", "117b", "117c", "117d", "117e", "117f", "115"],
        "offDuringScriptPaste": ["117", "117a", "117b", "117c", "117d", "117e", "117f", "057", "042", "115"],
        "offDuringInitialSmokeExceptUnderTest": ["117", "057", "042", "115"],
    }

    double_credit = {
        "rule": "Recording path MUST NEVER write Zoom Meetings.Attendees",
        "liveOnly": "101 awards ZOOM_ATTEND_BASE|{meetingId}|{enrollmentId} when Attendees includes Enrollment",
        "recordingOnly": "117 awards ZOOM_CREDIT|{enrollmentRid}|{meetingRid}; Attendees unchanged",
        "bothPaths": "Prefer live; Zoom Credit Conflict? / soft-void recording Active?=false; live XP untouched",
        "existingHistory": "Do not delete or rewrite ZOOM_ATTEND_BASE history",
        "rerun": "Same Source Key => skip / no second event",
        "duplicateKeys": "Disjoint families ZOOM_ATTEND_BASE vs ZOOM_CREDIT",
        "legacy": "Prospective only; no historical ZA backfill required for go-live",
        "scriptGuards": "117 orchestrator CONFIG intentionally omits Attendees field",
    }

    # Unknown resolution accounting vs prior 10 unknowns
    resolved = [
        "Exact DEV Zoom Attendance table ID and full field inventory with types/formulas/choices",
        "Exact PROD confirmation Zoom Attendance absent (live Meta)",
        "Exact Config Stage 17 field name inventory from DEV",
        "Exact Zoom Meetings Stage 17 support field inventory (excl ZZZ)",
        "Exact XP Source / Bucket choices from live Meta",
        "ZOOM_ATTEND_BASE presence check via record samples",
        "View list on DEV Zoom Attendance",
        "Linked-table targets for ZA Enrollment/Meeting links",
    ]
    still = [
        "PROD Automations UI exact installed versions for 057/042/101 (API 403)",
        "Which PROD Config row becomes global default after fields are added",
        "Exact OMNI filter formula text for view Zoom Recording Quiz - Past Deadline",
        "Whether PROD needs Testing Scenarios / 115 (default no)",
        "Intake UI/Softr/form path that creates Zoom Attendance rows in PROD",
        "Formula field-ID remapping verification after recreate (must re-paste formulas in OMNI)",
    ]

    manifest = {
        "manifestVersion": "1.0.0",
        "backlogId": "C-025",
        "stage": 17,
        "generatedFrom": {
            "schemaDump": str(SRC).replace("\\", "/"),
            "schemaDumpGeneratedAt": src.get("generatedAt"),
            "devBaseId": "appTetnuCZlCZdTCT",
            "prodBaseId": "appn84sqPw03zEbTT",
            "featureBranchTipNote": "Build against feature/c025-stage17-zoom-attendance with 115 v1.8 committed",
            "mode": "read_only_meta",
        },
        "verdict": "BLOCKED — SCHEMA MIGRATION REQUIRED until curated create items completed and re-audited",
        "counts": counts,
        "configRequiredValues": {
            "Zoom Recording XP Percent of Live": 50,
            "expectedRecordingXp": 30,
            "liveBaseXpRule": "ZOOM_ATTEND_BASE=60",
            "Recording Path Enabled?": True,
            "devConfigRecordSamples": cfg_values,
            "note": "Set percent=50 on the PROD Config row that feeds Effective* formulas (confirm which row in OMNI)",
        },
        "xpRequirements": {
            "bucket": "Zoom Attendance",
            "sourceRecording": "Zoom Meeting Recording Quiz",
            "sourceLive": "Zoom Meeting Attendance Base",
            "sourceKeyRecording": "ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}",
            "sourceKeyLive": "ZOOM_ATTEND_BASE|{meetingId}|{enrollmentId}",
            "rewardRule": "ZOOM_ATTEND_BASE active 60 — do not change",
            "noHistoricalXpRewrite": True,
        },
        "automations": automations,
        "doubleCreditGate": double_credit,
        "firstProdSchemaAction": "OMNI: create table Zoom Attendance (empty) OR add missing Config Stage 17 fields first — both are safe while all Stage 17 automations remain OFF. Recommended first click: create Zoom Attendance table.",
        "previouslyUnknownResolved": resolved,
        "unresolvedUnknowns": still,
        "items": items,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"WROTE {OUT}")
    print(json.dumps(counts, indent=2))
    print("unknowns", len(still), "resolved", len(resolved))


if __name__ == "__main__":
    main()
