# Next-season reset + startup checklist (SC-032 / SC-065)

**Date:** 2026-08-05  
**Owner:** Mike (UI / OMNI) + Cursor (repo validators)  
**PROD base:** `appn84sqPw03zEbTT`  
**Timezone:** America/Denver  
**Authority:** [`SEASON-LAUNCH-CONTROL.md`](../challenge-year/SEASON-LAUNCH-CONTROL.md) · Completion master SC-032 / SC-065

This is the executable operator path for starting **2026–2027** (or any new challenge year) after the empty-base rebuild. It prefers small Mike actions and repository commands already in this repo.

## Hard rules

1. Do **not** mass-email real families. Schmidt / ops inboxes only until dry-run PASS.
2. Keep weekly schedules **118/119 ON** unless Mike explicitly pauses Launch Status.
3. Never paste Stage 17 orchestrator into Automation **117** (email-only).
4. Do **not** trust the **Automations** operator table as live UI ON/OFF or paste version — UI attestation required.
5. Prefer Challenge-Year CLI validators before flipping Live.

## A. Reset / hygiene (before Weeks import)

| # | Action | Tool | Done? |
|---|--------|------|-------|
| A1 | Confirm only controlled enrollments exist (Schmidt + any intentional fixtures) | OMNI / `ops_email_readiness_probe.mjs` | ☐ |
| A2 | Note stale season labels (Agent 4 found Schmidt WAS display still `2025-2026`) | Airtable WAS | ☐ |
| A3 | Decide: archive/hide prior-year Weeks vs keep for history | Mike | ☐ |
| A4 | Confirm Fillout daily intake remains OFF until SC-135 dry-run | Fillout | ☐ |
| A5 | Confirm Make weekly bulk + 117f scenarios point at Schmidt-safe recipients for Test | Make | ☐ |
| A6 | Optional: rotate secrets exposed in prior terminal troubleshooting (SC-150 follow-up) | AWS / Airtable / Make | ☐ |

## B. Generate + import Weeks (SC-065)

```bash
node tools/challenge-year/cli.js generate-week-package \
  --challenge-year 2026-2027 \
  --week-zero-start YYYY-MM-DD \
  --regular-weeks N \
  --output docs/challenge-year/generated/2026-2027/
```

Then:

| # | Action | Done? |
|---|--------|-------|
| B1 | Review CSV + Week End Key map in generated folder | ☐ |
| B2 | Import Weeks into PROD (manual / OMNI) | ☐ |
| B3 | Verify Sunday–Saturday, Week 0, Post-Challenge | ☐ |
| B4 | Link Program Instance / Config if fields exist (Mike-authorized schema only) | ☐ |
| B5 | `node tools/challenge-year/cli.js validate-export --input <export.json>` | ☐ |

## C. Launch Control gates (SC-032)

```bash
node tools/challenge-year/cli.js launch-preflight --config <recId> --input <export.json>
node tools/challenge-year/cli.js activation-preview --config <recId> --input <export.json>
node tools/challenge-year/cli.js audit-automations
```

Walk lifecycle to **Test Ready** before Live:

`Draft → Dates Pending → Weeks Generated → Weeks Imported → Config Validated → Forms Updated → Automations Validated → Make Validated → Web Validated → Test Ready → Test Passed → Approved for Live → Live`

## D. Schmidt controlled proof (before public intake)

Use [`SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md`](../challenge-year/SCHMIDT-SEASON-LAUNCH-TEST-PLAN.md).

Minimum email proofs for SC-045 closeout:

| Email | Automation | Status 2026-08-05 | Next Mike action |
|-------|------------|-------------------|------------------|
| Homework parent | 071 | **Live proven** | None |
| Weekly summary | 118→072→119→074 | Historically Live E2E; re-arm on new Weeks | Build/send one Schmidt WAS in Test/Live as authorized |
| Welcome | 075 | Package exists; Sent At present but **2025-2026** subject | Rebuild welcome for new year on Schmidt |
| Video parent | 073 | **Not re-proven** after wipe | Create VF Ready / not Sent → Test 073 |
| Zoom recording approval | 117→Make 117f | Offline handoff **PASS**; live send pending | See [`117-ZOOM-APPROVAL-GO-LIVE.md`](./117-ZOOM-APPROVAL-GO-LIVE.md) |

## E. Reliability / failure visibility (SC-147)

1. `node tools/testing/ops_rcc_export_prod.mjs --run-cli`
2. Create RCC views via [`RCC-OMNI-VIEW-INSTALL.md`](./RCC-OMNI-VIEW-INSTALL.md)
3. Review P0 weekly-email views before first live Sunday

## F. Go-live flip (Mike only)

| # | Action | Done? |
|---|--------|-------|
| F1 | Written approval: Approved for Live | ☐ |
| F2 | Set season `dryRun=false` / `sendMode=Live` inputs per 118/119/074 contracts | ☐ |
| F3 | Keep `includeSchmidt=false` for normal mass traffic | ☐ |
| F4 | Re-open Fillout only after SC-135 dry-run green | ☐ |
| F5 | Record evidence paths in completion master | ☐ |

## Commands (copy/paste)

```bash
# Inventory drift (operator table — weak signal)
node tools/testing/ops_automation_inventory_audit.mjs --write-evidence

# Email readiness (no sends)
node tools/testing/ops_email_readiness_probe.mjs --write-evidence

# RCC export + offline audit
node tools/testing/ops_rcc_export_prod.mjs --run-cli

# 117 email script offline
node tools/testing/tests/test_117_email_handoff_offline.mjs
```
