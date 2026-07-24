# Config Resolver Rollout Runbook

Agent 10 · 2026-07-24

Goal: adopt `lib/config-selection` **without** a simultaneous risky rewrite of every automation.

**Hard rules**

- Do **not** delete or modify Config records to “fix” selection.
- Do **not** paste PROD until DEV dry-run passes.
- Do **not** default to first Config record during migration.

---

## Phase 0 — Baseline (complete in this wave)

- [x] Inventory consumers (`CONFIG-CONSUMER-INVENTORY.md`)
- [x] Publish contract (`CONFIG-SELECTION-CONTRACT.md`)
- [x] Ship pure resolver + Node tests
- [x] Audit 042 (`AUTOMATION-042-CONFIG-AUDIT.md`)
- [ ] Mike: confirm school-year keys on Enrollment / Program Instance match Config `Active School Year` spellings

## Phase 1 — Observability only (no behavior change)

1. For each target script, add **debug outputs only**:
   - `configRecordIdResolvedOut`
   - `configSchoolYearOut`
   - `configSelectionSourceOut`
   - `configLegacyFirstRecordIdOut` (what `records[0]` would have been)
   - `configMismatchOut` (boolean)
2. Run DEV on known enrollments for each of the four years (or fixtures).
3. Log mismatch rate; **do not fail closed yet**.

Exit criteria: mismatch report reviewed; zero unexplained mismatches (or documented data fixes).

## Phase 2 — Fail-closed on new/touched scripts

Adopt resolver with fail-closed when:

- touching any script that currently uses `records[0]` on Config
- adding new Config reads
- Stage 17 / Zoom Global+Program Config linkage writers

## Phase 3 — High-risk consumer adoption order

| Order | Consumer | Why this order | Paste required? |
|---|---|---|---|
| 1 | Tools: `preview_final_email.py`, `generate_final_summary_preview.py` | Offline; lowest blast radius | No Airtable paste |
| 2 | Extension `repair-final-090g-…` | Manual extension; Challenge Week Count | Extension run only |
| 3 | Stage 17 deploy helpers (`_c025_stage17_prod_config_set.py`, batch deploy) | Stop heuristic “primary” patches | No paste |
| 4 | Zoom Meeting Global/Program Config linkage (OMNI or dedicated script) | Fixes Effective Config year | Possibly |
| 5 | 117 family (if any still load Config table directly) | Recording flags / XP % | Yes if automation JS changes |
| 6 | Proposed 042 guard (`proposals/042-year-aware-zoom-gate-guard.PROPOSED.js`) | Defense in depth for gates | Yes, after dry-run |
| 7 | 057 Perfect Week video minimum (future Config field) | Product tunable | Yes + formula change |
| 8 | Any future Max Videos / review-toggle readers | Currently no JS reader | When introduced |

Superseded 117a/117b: **do not revive**; document anti-pattern only.

## Phase 4 — Dry-run logging contract

Every adopting automation should emit JSON including:

```json
{
  "automation": "042",
  "version": "…",
  "configSelection": {
    "ok": true,
    "configRecordId": "rec…",
    "schoolYearKey": "2025-2026",
    "selectionSource": "enrollment_school_year",
    "legacyFirstRecordId": "rec…",
    "mismatchWithLegacy": false,
    "calendarYearUsed": false
  }
}
```

Mismatch detection rule:

`mismatchWithLegacy = (resolvedId !== legacyFirstRecordId)` when legacy path still computed.

## Phase 5 — Rollback

| Layer | Rollback |
|---|---|
| Repo | Revert adopting commit; keep resolver tests green on prior tag |
| Airtable automation | Re-paste previous GitHub version (skip GitHub header) |
| Tools | Revert Python helper; no base data change |
| Config rows | **Never** “rollback” by deleting year rows |

If fail-closed blocks production traffic: set input `configSelectionMode=legacy_warn` (temporary) **only** on the single automation, then fix data/linkage — do not re-enable first-record as default in code.

## Phase 6 — PROD validation checklist

1. Confirm four Config rows still present with Max Videos 4/6/5/4 for 2025–26…2028–29.
2. For one enrollment per active season:
   - resolved Config id matches year
   - Zoom Meetings Global/Program Config (if linked) match same year
   - Stage 17 Effective flags match that year’s Config
3. 042 dry-run: `effectiveZoomCountOut` unchanged vs pre-guard baseline when years align.
4. Final email preview Challenge Week Count matches the enrollment year’s Config.
5. No automation log shows `calendarYearUsed: true` or `firstRecordFallbackUsed: true`.

## Shared helper adoption note

Airtable Scripting cannot `require()` repo `lib/`. Options:

1. **Inline paste** of `normalizeSchoolYear` + `resolveConfig` into each automation (version comment pointing at repo SHA).
2. Later: shared automation library pattern if/when platform supports it.

Repo Node tools and tests use `require("../../lib/config-selection")` directly.
