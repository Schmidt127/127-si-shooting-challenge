# Weekly email PROD install runbook — 118 / 119

**Agent:** 12 · **Date:** 2026-07-24  
**Base:** PROD `appn84sqPw03zEbTT`  
**Authority:** Install **OFF**; do **not** enable schedules unless Mike explicitly authorizes.  
**Scripts:**  
- `airtable/automations/shooting-challenge/118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` (**v1.3**)  
- `airtable/automations/shooting-challenge/119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js` (**v1.3**)

No agent may turn Live schedules on from this package.

---

## Preflight

1. Confirm free automation slots (or reuse OFF stubs).
2. Confirm Schmidt enrollment `recgP9qZYjAhE7NXm` exists for Test-mode.
3. Confirm 072 (build package) and 074 (Make send) exist and behave as expected.
4. Confirm empty-week product decision status (may remain undecided — default send_normal).

---

## Install 118 (Build arm) — schedule OFF

1. Create automation in folder **07 - Email, Notifications, and External Handoffs**.
2. Name: `118 - Email - Schedule Weekly Summary Email Build`
3. Trigger: **At a scheduled time** — Weekly — **Sunday 05:00** — **America/Denver**
4. **Leave automation OFF** after paste.
5. Action: Run script — paste from GitHub (skip GitHub SoT header if present).
6. Input variables:

| Variable | Default / install value |
|---|---|
| `dryRun` | `"true"` |
| `sendMode` | `"Test"` |
| `includeSchmidt` | `"false"` (set `"true"` only for Schmidt-only tests) |
| `excludedEnrollmentIds` | blank (Schmidt hard-excluded unless includeSchmidt) |
| `emptyWeekPolicy` | `"send_normal"` |

7. Map outputs: statusOut, actionOut, errorOut, debugStep, armedCountOut, skippedCountOut, createdWasCountOut, errorCountOut, scheduledWeekEndKeyOut, targetWeekIdOut, duplicateWasSkippedOut.

---

## Install 119 (Send arm) — schedule OFF

1. Same folder.
2. Name: `119 - Email - Schedule Weekly Summary Email Send`
3. Trigger: Weekly — **Sunday 10:00** — **America/Denver**
4. **Leave OFF**.
5. Paste script v1.3.
6. Inputs:

| Variable | Default |
|---|---|
| `dryRun` | `"true"` |
| `includeSchmidt` | `"false"` |
| `excludedEnrollmentIds` | blank |
| `emptyWeekPolicy` | `"send_normal"` |

7. Map outputs: statusOut, actionOut, errorOut, debugStep, armedCountOut, skippedCountOut, notReadyCountOut, errorCountOut, scheduledWeekEndKeyOut.

---

## Dry run (manual trigger while OFF)

1. Keep `dryRun=true`.
2. Manually run 118 once (Test).
3. Expect: `actionOut=dry_run_complete`, counts only, **no** WAS creates, **no** Build Weekly Email Now? writes.
4. Manually run 119 once. Expect dry-run counts; no Send to Make? writes.

## Schmidt-only test (still Test mode)

1. Set 118/119 `includeSchmidt=true`, `sendMode=Test` (118), `dryRun=false` only when Mike authorizes a controlled write.
2. Never combine `includeSchmidt=true` with Live sendMode.
3. Verify one WAS for Schmidt × target week; 072 builds Test package; 119 arms Send only when Ready? && !Sent?.
4. Confirm 074 webhook success before treating Sent? as authoritative (074 owns stamp).

## Expected fields touched

| Script | Writes |
|---|---|
| 118 | May create WAS (Enrollment+Week); sets Build Weekly Email Now?; sendMode=Test |
| 119 | Sets Send to Make? when Ready && !Sent |
| 072/074 | Package + Make (existing) |

## Rollback

1. Turn 118/119 OFF (if ever ON).
2. Clear accidental Build/Send checkboxes on affected WAS.
3. Revert script paste to prior version from Git history if needed.
4. Do not delete WAS rows without dry-run evidence.

## Evidence to collect

- Automation run JSON (statusOut, scheduledWeekEndKeyOut, counts)
- WAS record id(s) for Schmidt
- 072 package subject/recipients non-blank
- 074 webhook response / Weekly Email Sent? timing
- Screenshot of schedule remaining OFF until Live auth

## Remaining before Live

- [ ] Mike empty-week decision recorded
- [ ] Schmidt Test-mode end-to-end PASS
- [ ] Explicit authorization to enable Sunday schedules
- [ ] Live sendMode still refused by 118 when dryRun=false until policy changes
