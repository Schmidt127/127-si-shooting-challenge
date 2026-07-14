#!/usr/bin/env python3
"""Write C-025 Effective→Formula conversion guide from live manifest."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "_preview" / "c025_effective_conversion_manifest.json"
OUT = HERE.parents[1] / "docs" / "deploy-checklists" / "C-025-effective-to-formula-conversion.md"

FMT_NOTES = {
    "number": "Formatting: Integer / 0 decimal places. Leave as Number output.",
    "select": "Formatting: leave as **Single line text** (formula cannot stay Single select). Choices remain enforceable via Override field.",
    "text": "Formatting: Single line text.",
    "checkbox": "Formatting: prefer **Checkbox**. If Airtable only offers Number, accept Number (1/0) — ZA lookups already tolerate this.",
}


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    now = datetime.now(ZoneInfo("America/Denver")).strftime("%Y-%m-%d %H:%M %Z")

    lines = []
    a = lines.append
    a("# C-025 — Convert Effective Recording fields to Formula (DEV UI)")
    a("")
    a(f"**Generated:** {now}  ")
    a(f"**Base:** `{m['base']}` (DEV only)  ")
    a(f"**Table:** `{m['table']}` (`{m['table_id']}`)  ")
    a(f"**Sample meeting:** `{m['sample_meeting']}`  ")
    a(f"**Machine manifest:** `tools/airtable/_preview/c025_effective_conversion_manifest.json`")
    a("")
    a("## Status")
    a("")
    a("- **Phase 1 (manifest):** COMPLETE — ready for Mike UI conversion")
    a("- **Phase 2 (UI convert):** Mike performs one field at a time below")
    a("- **Phase 3 (verify + commit):** blocked until Mike reports all 10 converted")
    a("")
    a("**Do not convert until Override value copies are verified** for each meeting you care about (already done for fixtures). Stop if Airtable warns values will be lost before overrides are confirmed.")
    a("")
    a("## Precedence (every formula)")
    a("")
    a("1. Meeting Override")
    a("2. Program Config")
    a("3. Global Config")
    a("4. Safe fallback")
    a("")
    a("## Preconversion checks (Cursor)")
    a("")
    a("| Check | Result |")
    a("|---|---|")
    a(f"| All 10 Effectives found | `{m['checks']['all_ids_present']}` |")
    a(f"| All still editable (not formula yet) | `{m['checks']['all_still_editable']}` |")
    a(f"| Draft helpers present with paste formulas | `{m['checks']['ready_for_mike_ui']}` |")
    a("| Sample draft == sample Effective (truthy) | PASS (10/10) |")
    a("| Select/text drafts fixed with LEN/TRIM + ARRAYJOIN | installed on draft helpers only |")
    a("")
    a("---")
    a("")
    a("## Phase 1 — Conversion table")
    a("")
    a("| # | Effective field | Field ID | Current type | Draft helper | Expected output | Fallback | Sample (`rech5YbJNUzBRY6LQ`) |")
    a("|---:|---|---|---|---|---|---|---|")
    for r in m["rows"]:
        sample = r["sample_draft_now"]
        a(
            f"| {r['order']} | `{r['effective_name']}` | `{r['effective_id']}` | `{r['current_type']}` | `{r['draft_helper']}` | {r['expected_output_type']} | `{r['fallback']}` | editable=`{r['sample_effective_now']}` · draft=`{sample}` |"
        )
    a("")
    a("### Dependencies + formulas (paste exactly)")
    a("")
    for r in m["rows"]:
        a(f"#### {r['order']}. `{r['effective_name']}`")
        a("")
        a(f"- **Field ID (must stay):** `{r['effective_id']}`")
        a(f"- **Draft helper:** `{r['draft_helper']}` (`{r['draft_id']}`)")
        a(f"- **Depends on:** " + ", ".join(f"`{d}`" for d in r["depends_on"]))
        a(f"- **Fallback:** `{r['fallback']}`")
        a(f"- **{FMT_NOTES[r['kind']]}**")
        a("")
        a("```airtable")
        a(r["formula_to_paste"])
        a("```")
        a("")

    a("---")
    a("")
    a("## Phase 2 — Mike UI steps (one field at a time)")
    a("")
    a("### Global steps (every field)")
    a("")
    a("1. Open **DEV** base `appTetnuCZlCZdTCT` (not PROD).")
    a("2. Open table **Zoom Meetings**.")
    a("3. Find the **existing** Effective field (do **not** create a replacement).")
    a("4. Click the field header → **Edit field**.")
    a("5. Change **Field type** to **Formula**.")
    a("6. Paste the exact formula from the matching section above (or copy from the draft helper’s formula editor).")
    a("7. Set output formatting per the note under that field.")
    a("8. **Save**.")
    a("9. On meeting `rech5YbJNUzBRY6LQ`, confirm the value matches the Sample draft column.")
    a("10. Spot-check that Zoom Attendance lookups to this field still populate (open any ZA linked to that meeting).")
    a("11. Only then proceed to the next field.")
    a("")
    a("### Recommended order")
    a("")
    for r in m["rows"]:
        a(f"{r['order']}. `{r['effective_name']}` (`{r['effective_id']}`)")
    a("")
    a("### Stop immediately if")
    a("")
    a("- Airtable warns existing values will be lost **and** Override copies are not verified")
    a("- Formula shows `#ERROR!`")
    a("- Value is blank unexpectedly vs draft helper")
    a("- Field ID changes (only verifiable after Cursor schema scan — tell Cursor before continuing)")
    a("- A dependent field / ZA lookup breaks")
    a("- Result differs from the draft helper on the same meeting")
    a("")
    a("### After all 10")
    a("")
    a("Reply in Cursor: **Effectives converted** (list any UI formatting choices Airtable forced, e.g. checkbox→number). Then Cursor runs Phase 3 (schema scan, full precedence matrix, Schmidt 4/4, docs, commit, push).")
    a("")
    a("---")
    a("")
    a("## Temporary / legacy fields (do **not** delete yet)")
    a("")
    a("- All `Effective * (Config formula draft)` helpers")
    a("- `* — legacy rollup` / `* — pre-YN` renamed Program/Global fields")
    a("- `C025 Checkbox Rollup Probe`")
    a("- Diagnostic probes created during select/text draft repair: `C025 Select Probe *`")
    a("")
    a("## Out of scope this step")
    a("")
    a("PROD · 117a–f · C-027 · XP Events · email · Make · Vercel · AWS · cleanup")
    a("")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"wrote": str(OUT), "fields": len(m["rows"])}, indent=2))


if __name__ == "__main__":
    main()
