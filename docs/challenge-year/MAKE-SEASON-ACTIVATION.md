# Make Season Activation Package

**Status:** Repository evidence package — Make UI not mutated by this agent  
**Preserve email scenario:** `Weekly Athlete Summary - Bulk Email - May 18`  
**Verified chain:** `118 → 072 → 119 → 074 → Make → Gmail → Make Airtable writeback`

Do **not** redesign weekly email ownership. Do **not** treat `Weekly Athlete Summary Updated` as the email sender.

## Scenarios to inspect

| Scenario | Role | Annual change? | Repo blueprint evidence |
|----------|------|----------------|-------------------------|
| **Weekly Athlete Summary - Bulk Email - May 18** | Email sender + Live writeback | Inspect filters/mappings; keep name/lineage | **No blueprint JSON in git** — contract in `WAS-WEEKLY-EMAIL-ARCHITECTURE.md` (M-ATT-01) |
| Webhook **Weekly Athlete Summary - Email - May 18** | 074 target | Keep URL in Make/Airtable inputs only (never git) | Webhook secret must not appear in repo |
| Weekly Athlete Summary Updated | WAS calc create/update — **not** email sender | Do not repoint email here | Docs only |
| Upload Engine / Lambda routes | Asset upload | Season slug paths if used — see C-013 docs | `make/blueprints/upload-asset-engine-*.json` — PROD base `appn84sqPw03zEbTT`, table `tblhMLKxQK77agtME` (Submission Assets) |
| Zoom Recording Approval Email (117f) | Approval email | Separate from weekly summary | `make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.template.json` — DEV base `appTetnuCZlCZdTCT`; sendMode test/live branches |

### Blueprint scan notes (repository, 2026-07-24)

| Blueprint | Hard-coded base | Hard-coded year label | Config record id | Notes |
|-----------|-----------------|----------------------|------------------|-------|
| `upload-asset-engine-lambda-prod-v1.template.json` | `appn84sqPw03zEbTT` | none found | none found | PROD upload template — season slug may be path mapping (C-013) |
| `upload-asset-engine-v2-with-file-hash-duplicate-check.json` | `appn84sqPw03zEbTT` | none found | none found | Submission Assets table id present |
| `c025-117f-…-dev-v1.template.json` | DEV `appTetnuCZlCZdTCT` | none school-year | none | Explicitly must not point at PROD while testing |
| Weekly Bulk Email May 18 | **Not exported to git** | **UI attestation required** | **UI attestation required** | Preserve scenario; verify Live writeback fields |

**Writeback fields (Live branch, verified):** `Weekly Email Sent?`, `Make Send Status=Sent`, sent timestamp (`Weekly Summary Sent At` / `Weekly Email Sent At` per MVP field notes).

## Modules / fields (weekly email)

From [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md):

| Item | Must never change | May need annual review |
|------|-------------------|------------------------|
| Scenario name lineage (Bulk Email May 18) | Yes — preserve | — |
| 074 posts webhook; Make owns Live Sent? writeback | Yes | — |
| Payload: sendMode, weeklySummaryRecordId, subject, html, text, csvemail, weekLabel | Contract | weekLabel content follows Weeks |
| Test branch → Schmidt only; **no** Sent? writeback | Yes | — |
| Live branch → recipients + CC Schmidt; writeback Sent?/status/timestamp | Yes | Confirm still ON |
| Hard-coded PROD base `appn84sqPw03zEbTT` in templates | Expected for PROD templates | Do not point at DEV mid-season |
| Old-year filters on WAS queries | — | Clear any prior-year-only filters |
| Hard-coded Config / Week record IDs | — | **Must not** pin old Config/Week |

## Values requiring annual change

1. Any Make filter that names a specific challenge year label.
2. Any Airtable search module pinned to a prior Config / Week / Enrollment record id.
3. Season slug segments in upload path templates (`shooting-challenge/{seasonSlug}/…`) when a new season folder is required.
4. Test recipient list if ops contacts change (default Schmidt: `mschmidt@fairfield.k12.mt.us`).

## Values that must never change

1. Ownership: 074 webhook → Bulk Email May 18 → Gmail → Live writeback.
2. Empty-week policy source of truth remains **072** (`send_short` / etc.).
3. 119 arms `Send to Make?` only; 072 does not post webhooks.
4. PROD **074** `sendMode=Live` (or blank + WAS Live) — never fixed Test.

## Test route validation

1. Create/ensure Schmidt WAS for target Week with Ready package.
2. Set controlled Test: 074 `sendMode=Test` **only for that controlled run** (or WAS sendMode=test).
3. Confirm Gmail to Schmidt; confirm **no** Live Sent? writeback on Test branch.
4. Restore 074 to **Live** (or blank) immediately after test.

## Live route validation

1. 074 `sendMode=Live` (or blank + WAS Live).
2. Arm one Schmidt WAS via 119 path (or controlled Send to Make?).
3. Expect: email delivered; `Weekly Email Sent?` checked; `Make Send Status=Sent`; sent timestamp set.
4. Confirm WAS Enrollment + Week belong to the **new** Config/year.

## Rollback procedure

1. Do not delete the Bulk Email May 18 scenario.
2. If new-season filters were added incorrectly, restore prior mapping from screenshot/export.
3. Keep scenario ON unless aborting all email (coordinate with Airtable 118/119 rollback).
4. Re-verify 074 sendMode=Live after any Test experiment.

## Mike UI attestations

| ID | Exact question |
|----|----------------|
| M-ATT-01 | Does Bulk Email May 18 contain any filter on challenge year / Config / Week record id? |
| M-ATT-02 | Confirm Live writeback module still targets PROD WAS table in `appn84sqPw03zEbTT`. |
| M-ATT-03 | Any other Make scenarios with hard-coded `2025-2026` or prior Config `rec…`? |
