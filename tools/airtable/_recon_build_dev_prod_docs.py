"""Build DEV↔PROD automation reconciliation MD + JSON (docs only)."""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "foundation-reset"
AUTO = ROOT / "airtable" / "automations" / "shooting-challenge"
TODAY = "2026-07-23"

# Work-package assertions (Mike). Full name lists were NOT pasted into Cursor chat.
ASSERT = {
    "devCount": 46,
    "prodCount": 50,
    "devIncludes115": True,
    "prodMissing115": True,
    "prodOnlyCandidates": ["032", "033", "063", "070c", "111"],
    "note": (
        "Mike stated DEV≈46 (includes 115; many intentionally OFF) and PROD=50 (no 115). "
        "Complete UI name lists were referenced but not found in the Cursor conversation. "
        "Presence for PROD-only candidates and 115 follows package assertions; "
        "ON/OFF for live Airtable UI remains Unable to verify except where Automations "
        "operator table or prior docs attest."
    ),
}

PROD_ONLY = set(ASSERT["prodOnlyCandidates"])
DEV_ONLY = {"115"}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def parse_version(text: str) -> str | None:
    for pat in [
        r'version:\s*["\']([^"\']+)',
        r"Version:\s*(v?[\d.]+)",
        r'CONFIG\.version\s*=\s*["\']([^"\']+)',
    ]:
        m = re.search(pat, text)
        if m:
            return m.group(1)
    return None


def parse_purpose(text: str) -> str:
    m = re.search(r"PURPOSE\s*\n((?:\s*\*.*\n){1,12})", text)
    if not m:
        return ""
    lines = []
    for line in m.group(1).splitlines():
        s = re.sub(r"^\s*\*\s?", "", line).strip()
        if s:
            lines.append(s)
    return " ".join(lines)[:280]


def repo_scripts() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for p in sorted(AUTO.glob("*.js")):
        if p.name.startswith("_"):
            continue
        m = re.match(r"(\d+[a-zA-Z]?)", p.name)
        if not m:
            continue
        num = m.group(1)
        text = p.read_text(encoding="utf-8", errors="ignore")
        rel = str(p.relative_to(ROOT)).replace("\\", "/")
        # Prefer primary orchestrator over modular for same prefix conflicts
        if num in out and num == "117" and "orchestrator" not in p.name:
            continue
        if num in out and "orchestrator" in out[num]["file"]:
            continue
        cfg = re.search(r"tables:\s*\{([^}]+)\}", text[:8000], re.S)
        table_names = re.findall(r':\s*"([^"]+)"', cfg.group(1)) if cfg else []
        out[num] = {
            "file": p.name,
            "path": rel,
            "version": parse_version(text[:5000]),
            "purpose": parse_purpose(text[:8000]),
            "configTables": table_names,
        }
    return out


def operator_map(path: Path) -> dict[str, dict]:
    raw = load_json(path)
    rows = raw.get("records") or []
    out: dict[str, dict] = {}
    for r in rows:
        f = r.get("fields", {})
        name = (f.get("Name") or "").strip()
        m = re.match(r"(\d+[a-zA-Z]?)\s*-", name)
        num = m.group(1) if m else ""
        if not num:
            continue
        out[num] = {
            "name": name,
            "status": f.get("Status"),
            "triggerType": f.get("Trigger type"),
            "triggerTable": f.get("Trigger table"),
            "conditions": f.get("Conditions"),
            "rowId": r.get("id"),
        }
    return out


def classify(num: str, row: dict) -> str:
    """Assign exactly one category."""
    # Proven retirements (repo + V2-014), shared presence
    if num == "112":
        return "Legacy and safe to remove"
    if num == "043":
        return "Legacy and safe to remove"
    if num == "115":
        return "Add missing DEV automation to PROD"
    if num in PROD_ONLY:
        # Not proven replaced — still required until merge executed
        if num == "070c":
            return "PROD-only and still required"
        if num in {"032", "033", "063", "111"}:
            return "PROD-only and still required"
    # Repo-only modular / schedule scripts with unclear UI presence
    if num in {"117a", "117b", "117c", "117d", "117e", "067", "118", "119", "117f"}:
        return "Decision needed"
    if num in {"022", "116", "117"}:
        return "Decision needed"
    if row.get("presentInDev") and row.get("presentInProd"):
        return "Keep PROD as-is"
    if row.get("presentInDev") and not row.get("presentInProd"):
        return "Add missing DEV automation to PROD"
    if row.get("presentInProd") and not row.get("presentInDev"):
        return "Decision needed"
    return "Unable to verify"


def risk_for(classification: str, num: str) -> str:
    if classification == "Legacy and safe to remove":
        return "Medium" if num == "112" else "Medium"
    if num == "115":
        return "Low"
    if num in PROD_ONLY:
        return "High"
    if classification == "Decision needed":
        return "High"
    if classification == "Unable to verify":
        return "High"
    return "Low"


def build():
    scripts = repo_scripts()
    prod_op = operator_map(OUT / "prod-automations-table-raw.json")
    # Prefer freshly fetched DEV if present
    dev_path = OUT / "dev-automations-table-raw.json"
    if not dev_path.exists():
        # fallback to prior prod-shaped inventory only
        dev_op = {}
    else:
        # unwrap if wrapped
        raw = load_json(dev_path)
        if "records" in raw and isinstance(raw["records"], list) and raw["records"] and "fields" in raw["records"][0]:
            dev_op = operator_map(dev_path)
        else:
            dev_op = {}

    # Union of numbers
    numbers = sorted(
        set(prod_op)
        | set(dev_op)
        | set(scripts)
        | DEV_ONLY
        | PROD_ONLY
        | {"022", "070c", "115", "116", "117", "117f", "118", "119"},
        key=lambda x: (
            int(re.match(r"\d+", x).group()),
            x,
        ),
    )

    # Presence model from package math:
    # shared=45, DEV-only={115}, PROD-only={032,033,063,070c,111} ⇒ 46 / 50
    # Operator table lists 032/033/063/111 on both — treat operator table as STALE for presence.
    matrix = []
    for num in numbers:
        # Skip modular 117a-e from primary matrix? Include as Decision needed rows.
        op_p = prod_op.get(num) or {}
        op_d = dev_op.get(num) or {}
        script = scripts.get(num) or {}

        if num in DEV_ONLY:
            present_dev, present_prod = True, False
            presence_basis = "package assertion (DEV includes 115; PROD missing 115)"
        elif num in PROD_ONLY:
            present_dev, present_prod = False, True
            presence_basis = "package assertion (listed as PROD-only candidate)"
        elif num in {"117a", "117b", "117c", "117d", "117e"}:
            present_dev, present_prod = None, None
            presence_basis = "repo modular reference scripts; prefer orchestrator 117 — UI presence Unable to verify"
        elif num in {"067", "118", "119", "117f", "022", "116", "117"}:
            present_dev, present_prod = None, None
            presence_basis = "repo script exists; live UI presence Unable to verify (not in Automations operator table and not in package PROD-only/DEV-only lists)"
        elif num in prod_op or num in dev_op:
            # Assume shared core (45) when in operator table and not special-cased
            present_dev, present_prod = True, True
            presence_basis = "assumed shared core (operator table lists both bases; package math implies shared≈45). UI attestation still required."
        else:
            present_dev, present_prod = None, None
            presence_basis = "Unable to verify"

        # DEV replaces PROD?
        dev_replaces_prod = False
        absorbed_by = None
        if num == "030":
            # Explicitly does NOT absorb 032/033
            absorbed_by = None
        if num in {"032", "033"}:
            absorbed_by = "NOT absorbed by current repo 030 (030 only copies Grade Band)"
        if num == "063":
            absorbed_by = "Planned merge into 020 (V2-014) — NOT executed"
        if num == "111":
            absorbed_by = "Planned merge into 013 (V2-014) — NOT executed"
        if num == "112":
            absorbed_by = "013 (duplicate VF create path; V2-014 Category F)"
        if num == "043":
            absorbed_by = "042 (assigns Level Gate Rule; V2-014 Category F)"
        if num == "008" and num in numbers:
            absorbed_by = "116 (asset reuse consequences; docs)"

        row = {
            "automationNumber": num,
            "fullDevName": op_d.get("name")
            or (f"{num} - {script['file']}" if script else None)
            or (f"115 - Engineering Test Framework - Run Testing Scenario Daily Submission" if num == "115" else None),
            "fullProdName": op_p.get("name")
            or (f"{num} - (name from repo {script['file']})" if script else None),
            "presentInDev": present_dev,
            "presentInProd": present_prod,
            "presenceBasis": presence_basis,
            "devOnOffStatus": op_d.get("status")
            if present_dev is True and op_d
            else ("Unable to verify — many DEV automations intentionally OFF per Mike; operator Status≠live UI ON/OFF"),
            "prodOnOffStatus": op_p.get("status")
            if present_prod is True and op_p
            else ("Unable to verify" if present_prod is not False else "N/A — not in PROD"),
            "devTriggerType": op_d.get("triggerType"),
            "prodTriggerType": op_p.get("triggerType"),
            "repositoryScriptPath": script.get("path"),
            "repositoryScriptVersion": script.get("version"),
            "intendedCurrentPurpose": script.get("purpose")
            or "See automation-index / script header",
            "tablesRead": script.get("configTables") or None,
            "tablesWritten": script.get("configTables") or None,
            "importantFieldsRead": None,
            "importantFieldsWritten": None,
            "downstreamAutomations": None,
            "makeDependencies": None,
            "filloutDependencies": None,
            "lambdaOrUploadDependencies": None,
            "emailDependencies": None,
            "websiteDependencies": None,
            "dedupeOrSourceKeyDependencies": None,
            "devVersionReplacesProdVersion": dev_replaces_prod,
            "absorbedByOtherAutomation": absorbed_by,
            "migrationAction": None,
            "riskLevel": None,
            "evidence": [],
            "mikeDecisionNeeded": False,
            "classification": None,
        }

        # Enrich known specials
        if num == "030":
            row["tablesRead"] = ["Weekly Athlete Summary", "Enrollments"]
            row["tablesWritten"] = ["Weekly Athlete Summary"]
            row["importantFieldsWritten"] = ["Grade Band"]
            row["evidence"].append(
                "030 docblock: only copies Grade Band; does not assign Goal Record or Homework"
            )
        if num == "032":
            row["tablesRead"] = ["Weekly Athlete Summary", "Target Goal Shots"]
            row["tablesWritten"] = ["Weekly Athlete Summary"]
            row["importantFieldsWritten"] = ["Goal Record"]
            row["evidence"].append("Separate Goal Record writer; merge with 030+033 only Planned in V2-014")
        if num == "033":
            row["tablesRead"] = ["Weekly Athlete Summary", "FBC Curriculum - SYNC"]
            row["tablesWritten"] = ["Weekly Athlete Summary"]
            row["importantFieldsWritten"] = ["Homework"]
            row["evidence"].append("Separate Homework writer; merge with 030+032 only Planned in V2-014")
        if num == "063":
            row["tablesRead"] = ["Homework Completions", "Enrollments"]
            row["tablesWritten"] = ["Homework Completions"]
            row["importantFieldsWritten"] = ["Grade Band"]
            row["evidence"].append("020 may set Grade Band at create; 063 still listed; merge→020 Planned only")
        if num == "111":
            row["tablesRead"] = ["Video Feedback", "Enrollments"]
            row["tablesWritten"] = ["Video Feedback"]
            row["importantFieldsWritten"] = ["Grade Band"]
            row["evidence"].append("013 may set Grade Band at create; 111 still listed; merge→013 Planned only")
        if num == "070c":
            row["tablesRead"] = ["Submission Assets"]
            row["tablesWritten"] = ["Submission Assets"]
            row["importantFieldsWritten"] = ["Send to Make Trigger (clear when verified)"]
            row["makeDependencies"] = "Companion to 070b async Accepted path"
            row["lambdaOrUploadDependencies"] = "Verifies Lambda writeback fields"
            row["evidence"].append(
                "070c PURPOSE: required for async Accepted verify; not for sync full JSON path"
            )
        if num == "115":
            row["fullDevName"] = (
                "115 - Engineering Test Framework - Run Testing Scenario Daily Submission"
            )
            row["fullProdName"] = None
            row["tablesRead"] = ["Testing Scenarios", "Submissions", "Enrollments"]
            row["tablesWritten"] = ["Testing Scenarios", "Submissions"]
            row["filloutDependencies"] = "Creates Fillout-shaped Submissions; not a Fillout replacement"
            row["downstreamAutomations"] = ["057", "042"] # C025 scenario
            row["evidence"].append("SC-001 allows PROD paste; repo v1.8; PROD slot blocked at 50")
            row["mikeDecisionNeeded"] = False  # SC-001 resolved allow
        if num == "021":
            row["tablesRead"] = ["Submissions"]
            row["tablesWritten"] = ["Submissions"]
            row["importantFieldsWritten"] = ["Attachment Upload Status"]
            row["evidence"].append(
                "021 sets Attachment Upload Status only; does not create assets; expand/replace of PROD 021 not proven"
            )
        if num == "022":
            row["tablesRead"] = ["Submission Assets"]
            row["tablesWritten"] = ["Homework Completions", "Video Feedback"]
            row["makeDependencies"] = "Post-Make/Lambda child writeback sync"
            row["evidence"].append("V2-014 Keep; OFF≠obsolete; UI presence Unable to verify")
            row["mikeDecisionNeeded"] = True
        if num == "112":
            row["evidence"].append("V2-014 Category F retire; duplicate of 013; OFF—monitor then delete")
            row["mikeDecisionNeeded"] = True
        if num == "043":
            row["evidence"].append("V2-014 Category F retire; 042 owns gate assignment")
            row["mikeDecisionNeeded"] = True
        if num == "116":
            row["dedupeOrSourceKeyDependencies"] = "VIDEO_SUBMISSION| / HOMEWORK_XP| consequences"
            row["evidence"].append("Intended production asset-reuse path; UI presence Unable to verify")
            row["mikeDecisionNeeded"] = True
        if num == "117":
            row["dedupeOrSourceKeyDependencies"] = "ZOOM_CREDIT|{Enrollment}|{Meeting}"
            row["evidence"].append(
                "Stage 17 orchestrator intended final Zoom recording path; UI presence vs PROD count Unable to verify"
            )
            row["mikeDecisionNeeded"] = True

        row["classification"] = classify(num, row)
        row["riskLevel"] = risk_for(row["classification"], num)

        # Migration actions
        if row["classification"] == "Legacy and safe to remove":
            row["migrationAction"] = (
                f"After Mike UI confirms OFF/superseded: delete PROD automation {num} to free 1 slot"
            )
        elif row["classification"] == "Add missing DEV automation to PROD":
            row["migrationAction"] = "Free 1 PROD slot first, then create/paste 115 per MIKE-ACTION-INSTALL-115-PROD.md"
        elif row["classification"] == "PROD-only and still required":
            row["migrationAction"] = "Keep in PROD until merge/retirement proven; do not delete for 115 capacity"
        elif row["classification"] == "Keep PROD as-is":
            row["migrationAction"] = "No capacity action; optional later version paste from repo after attestation"
        elif row["classification"] == "Decision needed":
            row["migrationAction"] = "Mike UI attestation required before keep/remove/add"
            row["mikeDecisionNeeded"] = True
        else:
            row["migrationAction"] = "Unable to verify — gather UI evidence"

        row["evidence"].append(presence_basis)
        matrix.append(row)

    # Summary sets
    shared = [r["automationNumber"] for r in matrix if r["presentInDev"] is True and r["presentInProd"] is True]
    dev_only = [r["automationNumber"] for r in matrix if r["presentInDev"] is True and r["presentInProd"] is False]
    prod_only = [r["automationNumber"] for r in matrix if r["presentInProd"] is True and r["presentInDev"] is False]
    unverified = [r["automationNumber"] for r in matrix if r["presentInDev"] is None or r["presentInProd"] is None]

    confirmed_replacements = [
        {
            "retired": "112",
            "replacedBy": "013",
            "status": "Approved retirement (V2-014); delete not yet executed",
            "evidence": "Same VF create path; 112 wrong key; keep 013",
        },
        {
            "retired": "043",
            "replacedBy": "042",
            "status": "Approved retirement (V2-014); delete not yet executed",
            "evidence": "042 assigns Level Gate Rule",
        },
    ]
    confirmed_duplicate_writers = [
        {
            "pair": ["013", "112"],
            "fieldArea": "Video Feedback create from Submission Assets",
            "keep": "013",
            "retire": "112",
        },
        {
            "pair": ["042", "043"],
            "fieldArea": "Enrollment Level Gate Rule",
            "keep": "042",
            "retire": "043",
        },
    ]
    # Explicitly NOT confirmed
    not_replacements = [
        {
            "claim": "DEV 030 replaces PROD 030+032+033",
            "verdict": "FALSE for current scripts",
            "evidence": "030 PURPOSE: only Grade Band; does not assign Goal Record or Homework; V2-014 merge Planned only",
        },
        {
            "claim": "Grade Band logic makes 063/111 unnecessary",
            "verdict": "NOT PROVEN",
            "evidence": "Create-path copy exists in 020/013; merge Planned; scripts still required until merge executed + proven",
        },
        {
            "claim": "070c obsolete",
            "verdict": "FALSE for async Accepted path",
            "evidence": "070c still required to verify Lambda writeback after 070b Accepted",
        },
    ]

    safe_deletion_candidates = [
        {
            "number": "112",
            "rank": 1,
            "why": "Approved Category F retire; duplicate of 013; historically OFF",
            "slotGain": 1,
            "mikeMustConfirm": "PROD UI shows 112 OFF and no recent required runs",
        },
        {
            "number": "043",
            "rank": 2,
            "why": "Approved Category F retire; superseded by 042",
            "slotGain": 1,
            "mikeMustConfirm": "042 live script assigns Level Gate Rule; 043 has no unique writes still needed",
        },
    ]

    capacity_plan = {
        "airtableLimit": 50,
        "currentProdCount": 50,
        "freeSlotsNow": 0,
        "steps": [
            {
                "step": 1,
                "action": "Delete PROD automation 112 (Create Video Feedback from Submission Asset)",
                "replacesWith": None,
                "evidence": "V2-014 Category F; duplicate of 013; OFF—monitor period documented",
                "testAfter": "Create video Submission Asset on Schmidt; confirm 013 still creates/links Video Feedback; no 112 run needed",
                "rollback": "Recreate automation 112 from repo script 112-*.js (v2.1), leave OFF, restore trigger conditions from PROD inventory row",
                "freeSlotsAfter": 1,
            },
            {
                "step": 2,
                "action": "Install Automation 115 in the freed slot",
                "replacesWith": "115 v1.8 from repo",
                "evidence": "SC-001 approved; MIKE-ACTION-INSTALL-115-PROD.md",
                "testAfter": "Dry Run then live Testing Scenario on Schmidt enrollment",
                "rollback": "Disable/delete 115; do not restore 112 unless video path regresses",
                "freeSlotsAfter": 0,
                "when115Installs": "Immediately after Step 1 succeeds and video path smoke test passes",
            },
            {
                "step": 3,
                "action": "Optional: delete PROD 043 after 042 attestation",
                "replacesWith": None,
                "evidence": "V2-014 Category F; 042 owns gate rule",
                "testAfter": "Force Level Recalc Needed on Schmidt; confirm gate rule set by 042 only",
                "rollback": "Recreate 043 from repo 043-*.js v2.0, leave OFF",
                "freeSlotsAfter": 1,
            },
            {
                "step": 4,
                "action": "Do NOT delete 032/033/063/070c/111 for capacity",
                "evidence": "Not proven superseded; required until merge waves execute",
                "freeSlotsAfter": "unchanged",
            },
        ],
        "futureSlotsSafelyCreatableAfterApprovedRetirements": 2,
        "futureSlotsFromUnexecutedMergesOnlyIfClarityAllows": {
            "030+032+033": 2,
            "111→013": 1,
            "063→020": 1,
            "006+021": 1,
            "note": "Merges Planned only — do not count as available capacity until executed and proven",
        },
        "recommendedFinalProdCount": {
            "nearTerm": 50,
            "explanation": "Keep at 50 after swapping 112→115; then optionally drop to 49 by retiring 043",
            "longerTermIfMergesProven": "approximately 45–48 depending on which Category C merges pass four-axis review",
        },
        "exactFirstAutomationChange": {
            "change": "Delete PROD automation 112",
            "whySafest": "Only candidate with approved retirement + duplicate-writer proof + historically OFF; does not remove a PROD-only pipeline helper",
            "slotFreedFor": "115",
            "rollback": "Recreate 112 OFF from GitHub script; restore prior trigger from Automations inventory",
        },
    }

    payload = {
        "generated": TODAY,
        "controllingDoc": "docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md",
        "scope": "Investigation and documentation only — no Airtable automation mutations",
        "inventorySources": {
            "mikePackageAssertions": ASSERT,
            "devAutomationsOperatorTable": "docs/foundation-reset/dev-automations-table-raw.json",
            "prodAutomationsOperatorTable": "docs/foundation-reset/prod-automations-table-raw.json",
            "operatorTableCaveat": (
                "DEV and PROD Automations operator tables both returned 48 nearly identical rows "
                "including 032/033/063/111. That table is NOT a reliable live UI presence/ON-OFF source "
                "for this reconciliation. Mike UI export still required."
            ),
            "repoScripts": "airtable/automations/shooting-challenge/*.js",
            "roadmap": "docs/v2-014-automation-modernization-roadmap.md",
            "automationIndex": "docs/automation-index.md",
        },
        "counts": {
            "devAutomationCountAsserted": 46,
            "prodAutomationCountAsserted": 50,
            "sharedAssumedCore": len(shared),
            "devOnly": dev_only,
            "prodOnly": prod_only,
            "uiPresenceUnverified": unverified,
            "operatorTableRowsDev": len(dev_op),
            "operatorTableRowsProd": len(prod_op),
        },
        "confirmedReplacements": confirmed_replacements,
        "confirmedDuplicateWriters": confirmed_duplicate_writers,
        "notConfirmedReplacements": not_replacements,
        "safeDeletionCandidates": safe_deletion_candidates,
        "mikeVerificationNeeded": [
            "Paste complete DEV UI automation list (name + ON/OFF + trigger type) into repo evidence",
            "Paste complete PROD UI automation list confirming exactly 50 and naming the 2 slots beyond the 48 operator-table rows",
            "Confirm 112 is OFF in PROD UI before delete",
            "Confirm whether 022 / 116 / 117 / 117f / 118 / 119 exist in DEV and/or PROD UI",
            "Confirm DEV truly lacks 032/033/063/070c/111 (operator table still lists them)",
            "Attest live script versions for critical path after any paste",
        ],
        "specificInvestigations": {
            "prod030_032_033": not_replacements[0],
            "dev021_vs_prod021": {
                "verdict": "Unable to verify expansion/replacement",
                "evidence": "Repo 021 v2.0 only sets Attachment Upload Status; no proof DEV absorbed other writers",
            },
            "gradeBand_063_111": not_replacements[1],
            "070c": not_replacements[2],
            "116_117_final_set": {
                "verdict": "Intended yes (repo + completion master SC-094/097/074)",
                "uiPresence": "Unable to verify against asserted 50 PROD count",
            },
            "unnamed_022": {
                "verdict": "Keep disposition in V2-014; OFF≠obsolete; UI presence Unable to verify",
            },
            "115_slot": {
                "requiredName": "115 - Engineering Test Framework - Run Testing Scenario Daily Submission",
                "version": "v1.8",
                "slotToFreeFirst": "112",
                "installDoc": "docs/foundation-reset/MIKE-ACTION-INSTALL-115-PROD.md",
            },
        },
        "capacityPlan": capacity_plan,
        "matrix": matrix,
    }

    json_path = OUT / f"DEV-PROD-AUTOMATION-RECONCILIATION-{TODAY}.json"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    md = render_md(payload)
    md_path = OUT / f"DEV-PROD-AUTOMATION-RECONCILIATION-{TODAY}.md"
    md_path.write_text(md, encoding="utf-8")
    print("Wrote", md_path)
    print("Wrote", json_path)
    print(
        "shared",
        len(shared),
        "dev_only",
        dev_only,
        "prod_only",
        prod_only,
        "unverified",
        len(unverified),
    )


def render_md(p: dict) -> str:
    c = p["counts"]
    cap = p["capacityPlan"]
    lines = [
        f"# DEV↔PROD Automation Reconciliation and Capacity Plan — {TODAY}",
        "",
        "**Controlling source of truth:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`",
        "",
        "**Mode:** Investigation and documentation only. **No** Airtable automation create/delete/enable/disable/rename/modify was performed.",
        "",
        "## 0. Inventory integrity notice",
        "",
        p["inventorySources"]["mikePackageAssertions"]["note"],
        "",
        p["inventorySources"]["operatorTableCaveat"],
        "",
        "### Reconstructed presence model (needs Mike UI confirmation)",
        "",
        "| Set | Count | Members |",
        "|-----|------:|---------|",
        f"| DEV (asserted) | {c['devAutomationCountAsserted']} | shared core + **115** |",
        f"| PROD (asserted) | {c['prodAutomationCountAsserted']} | shared core + **032, 033, 063, 070c, 111** |",
        f"| Shared core (assumed) | {c['sharedAssumedCore']} | operator-table numbers excluding PROD-only/DEV-only specials |",
        f"| DEV-only (asserted) | {len(c['devOnly'])} | {', '.join(c['devOnly'])} |",
        f"| PROD-only candidates (asserted) | {len(c['prodOnly'])} | {', '.join(c['prodOnly'])} |",
        f"| UI presence unverified (repo extras) | {len(c['uiPresenceUnverified'])} | {', '.join(c['uiPresenceUnverified'])} |",
        "",
        f"Arithmetic from operator table: shared core listed = **{c['sharedAssumedCore']}** (48 operator rows minus 032/033/063/111). "
        f"Adding asserted DEV-only **115** ⇒ **{c['sharedAssumedCore'] + len(c['devOnly'])}** (Mike asserts **46** — **gap of {46 - (c['sharedAssumedCore'] + len(c['devOnly']))}**). "
        f"Adding asserted PROD-only five ⇒ **{c['sharedAssumedCore'] + len(c['prodOnly'])}** (Mike asserts **50** — **gap of {50 - (c['sharedAssumedCore'] + len(c['prodOnly']))}**). "
        "Likely explanation: one additional shared UI automation not in the Automations operator table (candidates: **022**, **116**, or **117**), and/or one extra DEV-only and one extra PROD-only. **Confirm with UI exports — do not migrate on this arithmetic alone.**",
        "",
        "## 1. Executive findings",
        "",
        "1. **DEV 030 does not replace PROD 030+032+033.** Repo 030 only copies Grade Band.",
        "2. **063 and 111 are not proven obsolete.** Create-time Grade Band copy in 020/013 does not retire the repair helpers until merge waves execute.",
        "3. **070c remains required** for the async `Accepted` video upload verify path with 070b/Lambda.",
        "4. **Confirmed duplicate writers / safe retirements:** **112→013**, **043→042** (approved, not yet deleted).",
        "5. **Safest first PROD capacity action:** delete **112** to free the slot for **115**.",
        "6. **Do not delete 032/033/063/070c/111** for capacity — not proven superseded.",
        "",
        "## 2. Specific investigations",
        "",
    ]
    for key, val in p["specificInvestigations"].items():
        lines.append(f"### {key}")
        lines.append("")
        if isinstance(val, dict):
            for k, v in val.items():
                lines.append(f"- **{k}:** {v}")
        lines.append("")

    lines += [
        "## 3. Confirmed replacements",
        "",
        "| Retired | Replaced by | Status | Evidence |",
        "|---------|-------------|--------|----------|",
    ]
    for r in p["confirmedReplacements"]:
        lines.append(
            f"| {r['retired']} | {r['replacedBy']} | {r['status']} | {r['evidence']} |"
        )

    lines += [
        "",
        "## 4. Confirmed duplicate writers",
        "",
        "| Pair | Area | Keep | Retire |",
        "|------|------|------|--------|",
    ]
    for d in p["confirmedDuplicateWriters"]:
        lines.append(
            f"| {' / '.join(d['pair'])} | {d['fieldArea']} | {d['keep']} | {d['retire']} |"
        )

    lines += [
        "",
        "## 5. Safe deletion candidates (capacity)",
        "",
        "| Rank | # | Why | Slot gain | Mike must confirm |",
        "|-----:|---|-----|----------:|-------------------|",
    ]
    for s in p["safeDeletionCandidates"]:
        lines.append(
            f"| {s['rank']} | {s['number']} | {s['why']} | {s['slotGain']} | {s['mikeMustConfirm']} |"
        )

    lines += [
        "",
        "## 6. Capacity plan (keep PROD ≤ 50 at every step)",
        "",
        f"- **Limit:** {cap['airtableLimit']}",
        f"- **Current PROD count:** {cap['currentProdCount']}",
        f"- **Free slots now:** {cap['freeSlotsNow']}",
        "",
        "### Exact first change",
        "",
        f"- **Change:** {cap['exactFirstAutomationChange']['change']}",
        f"- **Why safest:** {cap['exactFirstAutomationChange']['whySafest']}",
        f"- **Frees slot for:** {cap['exactFirstAutomationChange']['slotFreedFor']}",
        f"- **Rollback:** {cap['exactFirstAutomationChange']['rollback']}",
        "",
        "### Staged steps",
        "",
    ]
    for step in cap["steps"]:
        lines.append(f"#### Step {step['step']}: {step['action']}")
        lines.append("")
        for k in ["evidence", "testAfter", "rollback", "freeSlotsAfter", "when115Installs", "replacesWith"]:
            if k in step and step[k] is not None:
                lines.append(f"- **{k}:** {step[k]}")
        lines.append("")

    lines += [
        f"**When 115 can be installed:** after Step 1 delete of **112** and video-path smoke test (freeSlotsAfter=1).",
        "",
        f"**Additional future slots:** up to **{cap['futureSlotsSafelyCreatableAfterApprovedRetirements']}** from approved retirements (112+043). Category C merges are **not** counted until executed.",
        "",
        f"**Recommended final PROD count (near-term):** {cap['recommendedFinalProdCount']['nearTerm']} — {cap['recommendedFinalProdCount']['explanation']}",
        "",
        "## 7. Mike verification checklist",
        "",
    ]
    for item in p["mikeVerificationNeeded"]:
        lines.append(f"- [ ] {item}")

    lines += [
        "",
        "## 8. Comparison matrix (one row per automation)",
        "",
        "Full machine-readable fields are in the companion JSON. Condensed table:",
        "",
        "| # | Classification | DEV? | PROD? | Repo ver | Migration action | Risk | Mike decision |",
        "|---|----------------|------|-------|----------|------------------|------|---------------|",
    ]
    for r in p["matrix"]:
        lines.append(
            "| {n} | {c} | {d} | {p_} | {v} | {m} | {risk} | {md} |".format(
                n=r["automationNumber"],
                c=r["classification"],
                d=r["presentInDev"],
                p_=r["presentInProd"],
                v=r["repositoryScriptVersion"] or "—",
                m=(r["migrationAction"] or "")[:80],
                risk=r["riskLevel"],
                md="Yes" if r["mikeDecisionNeeded"] else "No",
            )
        )

    lines += [
        "",
        "## 9. Detailed matrix notes (PROD-only + critical)",
        "",
    ]
    for r in p["matrix"]:
        if r["automationNumber"] not in {
            "021",
            "022",
            "030",
            "032",
            "033",
            "043",
            "063",
            "070c",
            "111",
            "112",
            "115",
            "116",
            "117",
        }:
            continue
        lines.append(f"### Automation {r['automationNumber']}")
        lines.append("")
        lines.append(f"- **DEV name:** {r['fullDevName']}")
        lines.append(f"- **PROD name:** {r['fullProdName']}")
        lines.append(f"- **Present DEV/PROD:** {r['presentInDev']} / {r['presentInProd']}")
        lines.append(f"- **Presence basis:** {r['presenceBasis']}")
        lines.append(f"- **DEV/PROD ON-OFF:** {r['devOnOffStatus']} / {r['prodOnOffStatus']}")
        lines.append(f"- **Triggers:** {r['devTriggerType']} / {r['prodTriggerType']}")
        lines.append(f"- **Repo:** `{r['repositoryScriptPath']}` @ {r['repositoryScriptVersion']}")
        lines.append(f"- **Purpose:** {r['intendedCurrentPurpose']}")
        lines.append(f"- **Tables R/W:** {r['tablesRead']} / {r['tablesWritten']}")
        lines.append(f"- **Fields written:** {r['importantFieldsWritten']}")
        lines.append(f"- **Make/Lambda/email/Fillout/web/SourceKey:** Make={r['makeDependencies']}; Lambda={r['lambdaOrUploadDependencies']}; email={r['emailDependencies']}; Fillout={r['filloutDependencies']}; web={r['websiteDependencies']}; key={r['dedupeOrSourceKeyDependencies']}")
        lines.append(f"- **DEV replaces PROD version?** {r['devVersionReplacesProdVersion']}")
        lines.append(f"- **Absorbed by?** {r['absorbedByOtherAutomation']}")
        lines.append(f"- **Classification:** {r['classification']}")
        lines.append(f"- **Migration action:** {r['migrationAction']}")
        lines.append(f"- **Risk:** {r['riskLevel']}")
        lines.append(f"- **Evidence:** {'; '.join(r['evidence'])}")
        lines.append(f"- **Mike decision needed:** {r['mikeDecisionNeeded']}")
        lines.append("")

    lines += [
        "## 10. Companion file",
        "",
        f"- `docs/foundation-reset/DEV-PROD-AUTOMATION-RECONCILIATION-{TODAY}.json`",
        "",
        "## 11. Next approved migration package (recommended)",
        "",
        "**Name:** PROD Slot Recovery for Automation 115 (112 delete → 115 paste)",
        "",
        "**Includes:** Mike UI confirm 112 OFF → delete 112 → smoke-test 013 video path → paste 115 v1.8 → Dry Run + live Schmidt scenario → update Automations operator table.",
        "",
        "**Explicitly excluded:** deleting 032/033/063/070c/111; merging 030+032+033; enabling 070a; weekly schedule 118/119 enable.",
        "",
        "---",
        "",
        f"*Generated {TODAY}. No Airtable automation mutations in this package.*",
        "",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    build()
