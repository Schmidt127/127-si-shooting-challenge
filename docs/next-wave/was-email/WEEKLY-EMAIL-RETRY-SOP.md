# Weekly Email Retry SOP (SC-041)

**Status:** Built in Repository  
**Date:** 2026-07-25  
**Owning automations:** `072` (build) → `119` (arm Send) → `074` (Make webhook) → Make `Weekly Athlete Summary - Bulk Email - May 18`  
**Related:** `docs/reliability-command-center/RETRY-POLICY.md`, `docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`

## Hard rules

1. If `Weekly Email Sent?` = checked → **do not retry** (never_retry_already_completed).
2. If `Make Send Status` = `Sent` but `Weekly Email Sent?` is unchecked → **manual review** (do not blind-retry).
3. On Make webhook failure, **074 must leave `Send to Make?` checked** and write `Weekly Email Error`.
4. **074 must never** set `Weekly Email Sent?` / `Weekly Email Sent At` / `Weekly Summary Sent At` (Make owns Live writeback).
5. No automatic bulk retry. Retry one Schmidt (or named) WAS at a time.
6. PROD 074 `sendMode` must be `Live` or blank — never fixed `Test`.

## Decision table

| WAS state | Action | Retry class |
|-----------|--------|-------------|
| `Weekly Email Sent?` = true | Stop | never_retry_already_completed |
| `Make Send Status` = Sent, Sent? false | Inspect Make + fields; do not re-arm blindly | manual_review_required |
| Ready? true, Send to Make? true, Sent? false (± Error text) | Re-run **074** with same `recordId` | automatically_retryable |
| Ready? true, Send to Make? false, Sent? false | Set `Send to Make?` = true, then run **074** | retryable_after_correcting_data |
| Ready? false | Re-run **072** (then 119/074 chain) | retryable_after_correcting_data |

Contract helpers (offline): `planWeeklyEmailWebhookOutcome`, `decideWeeklyEmailRetryAction` in `lib/v2-engine-contracts.js`.

## Controlled failure → recovery (Schmidt)

### A. Induce / identify failure

1. Table `Weekly Athlete Summary` → Schmidt WAS for the target week (`Enrollment` = `recgP9qZYjAhE7NXm`).
2. Confirm `Weekly Email Ready?` = true and package HTML present.
3. Confirm `Weekly Email Sent?` = false.
4. Confirm `Send to Make?` = true (or set true).
5. If testing deliberately: temporarily break webhook (Mike-only) **or** use a WAS that already has `Weekly Email Error` populated from a real failure.
6. Expect after failed 074:
   - `Send to Make?` still **true**
   - `Weekly Email Error` non-empty
   - `Weekly Email Sent?` still **false**

### B. Recover

1. Fix webhook / Make / recipients if needed.
2. Confirm 074 automation input `sendMode` = `Live` (or blank).
3. Re-run automation **074** with `recordId` = that WAS id (leave `Send to Make?` checked).
4. Expect:
   - Webhook 2xx
   - 074 clears `Send to Make?` and clears `Weekly Email Error`
   - Make Live writeback sets `Weekly Email Sent?` = true, `Make Send Status` = Sent, `Weekly Summary Sent At` populated
5. Re-run 074 again → must block as already sent / not armed (no second email).

### C. Cleanup

- Do not uncheck `Weekly Email Sent?` to “test again” on a real Sent week.
- For a second proof, use a different week WAS or Test recipient path Mike approves.

## Fixture

`docs/testing/scenarios/scn-029-weekly-email-retry-after-make-failure.json`

## Stopping conditions

- Stop if a retry creates a second Gmail send for an already-Sent week.
- Stop if 074 clears `Send to Make?` while webhook failed.
- Stop if 074 writes Sent? itself.
