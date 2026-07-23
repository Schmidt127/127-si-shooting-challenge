from pathlib import Path

p = Path("docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md")
text = p.read_text(encoding="utf-8")

replacements = {
    "| SC-046 | Data Integrity | Field ownership matrix (one correct writer per field) | Planned | Stage J notes; C-012 queued | Build matrix; enforce in reviews | — | Blocks safe cleanup | C-012; stage-j-legacy-cleanup | — | P0 | 2026-07-23 |":
    "| SC-046 | Data Integrity | Field ownership matrix (one correct writer per field) | Built in Repository | Initial critical-path matrix published for foundation tables | Expand to full Stage K; fix remaining multi-writer conflicts outside Schmidt foundation | SC-055 | Only Schmidt Active? corrected in this pack | `docs/foundation-reset/CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md`; C-012 | — | P0 | 2026-07-23 |",
    "| SC-055 | Data Integrity | Fresh schema export after rebuild waves | Planned | Dated snapshots (incl. 20260706; later verify folders) | Export PROD after foundation; refresh `schema/current` | — | Treat stale maps as unsafe | K-M8; schema snapshots | — | P0 | 2026-07-23 |":
    "| SC-055 | Data Integrity | Fresh schema export after rebuild waves | Complete | PROD exports `prod-foundation-reset-20260723/` + post-Testing-Scenarios `prod-foundation-reset-20260723-post-ts/` | Optional: refresh hand-maintained `schema/current/` later | — | Historical snapshots preserved | `docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md`; snapshot folders | — | P0 | 2026-07-23 |",
    "| SC-058 | Data Integrity | Automation version inventory filled from live UI | Planned | `AUTOMATION_VERSION_INVENTORY.md` mostly UNKNOWN; C-025 rows partially updated | Mike/OMNI pass: record live versions | — | Inventory drift caused Stage 16 vs 17 confusion | AUTOMATION_VERSION_INVENTORY; K-H2 | — | P0 | 2026-07-23 |":
    "| SC-058 | Data Integrity | Automation version inventory filled from live UI | Built in Repository | Fresh PROD inventory from Automations table (48 rows) + repo version crosswalk; script body match UNKNOWN via API | Mike UI attestation for live script versions; confirm whether 115/116/117/070c/118/119 exist outside Automations table | — | API cannot read live script source | `docs/foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md` | Attest live versions | P0 | 2026-07-23 |",
}

# Fallback: replace by ID prefix match if exact line drifted
lines = text.splitlines()
out = []
for line in lines:
    replaced = False
    for old, new in replacements.items():
        if line.startswith("| SC-046 ") and new.startswith("| SC-046 "):
            out.append(new)
            replaced = True
            break
        if line.startswith("| SC-055 ") and new.startswith("| SC-055 "):
            out.append(new)
            replaced = True
            break
        if line.startswith("| SC-058 ") and new.startswith("| SC-058 "):
            out.append(new)
            replaced = True
            break
    if not replaced:
        out.append(line)
text = "\n".join(out) + "\n"

text = text.replace(
    "| Scope | Documentation and planning only (this file does not change Airtable, Make, Lambda, Fillout, or the website) |",
    "| Scope | Controlling completion plan (updated by Foundation Reset Pack 2026-07-23) |",
)

old_decisions = """## 7. Mike Decisions

Only decisions that need Mike (not pure engineering choices):

| ID | Decision needed | Why it matters |
|----|-----------------|----------------|
| SC-001 | Allow Testing Scenarios / script **115** in emptied PROD? | Old rule forbade PROD install; new operating rules may change that |
| SC-014 | Quiz path: Fillout PDF into normal pipeline **or** attachment-less redesign? | Blocks HW17/Final Reflection reliability |
| SC-035 | Empty-activity weeks: still send weekly parent email? | Default in design is yes |
| SC-044 | Major-event alerts: SMS vs email; parent vs athlete; opt-in rules? | Product/comms policy |
| SC-066 | Keep early-bird period for next season? | Calendar/config work |
| SC-068 | How should Schmidt `Active?` interact with XP/email vs leaderboard-only hide? | Conflicts with hard Active? guards |
| SC-081 | Change streak repeat-after-break behavior, or only tune amounts? | Code vs config |
| SC-095 | When to turn **070a** homework S3 upload ON in PROD? | Currently intentionally OFF |
| SC-112 | Athlete auth approach for real dashboard/profiles? | Unlocks web Phase 3 |
| SC-114 / SC-115 | Softr cutover timing + public indexing (noindex removal)? | Public traffic / SEO |
| SC-067 | When to schedule Program Instance multi-year wave? | Large architecture |
| SC-002 / SC-006 | Build Scenario Library + auto Expected-vs-Actual now or later? | Testing investment level |
"""

new_decisions = """## 7. Mike Decisions

Only decisions that need Mike (not pure engineering choices):

| ID | Decision needed | Why it matters |
|----|-----------------|----------------|
| SC-014 | Quiz path: Fillout PDF into normal pipeline **or** attachment-less redesign? | Blocks HW17/Final Reflection reliability |
| SC-035 | Empty-activity weeks: still send weekly parent email? | Default in design is yes |
| SC-044 | Major-event alerts: SMS vs email; parent vs athlete; opt-in rules? | Product/comms policy |
| SC-066 | Keep early-bird period for next season? | Calendar/config work |
| ~~SC-068~~ | ~~Schmidt Active? vs standings~~ | **Resolved in Foundation Reset:** Active?=true for processing; exclude standings via view filter (no new field) |
| SC-081 | Change streak repeat-after-break behavior, or only tune amounts? | Code vs config |
| SC-095 | When to turn **070a** homework S3 upload ON in PROD? | Currently intentionally OFF |
| SC-112 | Athlete auth approach for real dashboard/profiles? | Unlocks web Phase 3 |
| SC-114 / SC-115 | Softr cutover timing + public indexing (noindex removal)? | Public traffic / SEO |
| SC-067 | When to schedule Program Instance multi-year wave? | Large architecture |
| SC-002 / SC-006 | Build Scenario Library + auto Expected-vs-Actual now or later? | Testing investment level |

**Resolved this pack**

| ID | Decision | Outcome |
|----|----------|---------|
| SC-001 | Testing Scenarios / 115 in PROD? | **Allowed** — orchestration only; table created; 115 paste still required |
| SC-004 | Schmidt Active? | **Active?=true** for core processing; public standings exclusion via existing view/`Active?` mechanisms (view filter still needed) |
"""

if old_decisions not in text:
    raise SystemExit("decisions block not found exactly")
text = text.replace(old_decisions, new_decisions)

# Update section 9 status note
text = text.replace(
    "**Name:** Foundation Reset Pack (empty PROD)",
    "**Name:** Foundation Reset Pack (empty PROD) — **EXECUTED 2026-07-23** (115 paste + Testing views still open)",
)

p.write_text(text, encoding="utf-8")
print("patched completion master")
