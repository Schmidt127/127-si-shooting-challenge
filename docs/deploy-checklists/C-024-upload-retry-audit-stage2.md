# C-024 — Upload retry behavior audit (Stage 2)

**Date:** 2026-07-13  
**Worker:** B — Overnight V2 Stage 2  
**Branch:** `overnight/v2-run/worker-b-s2-c024-retry-audit`  
**Base SHA:** `c59dca8`  
**Backlog:** C-024 (complements C-023 file-hash layer)  
**Status:** **COMPLETE** — audit only; no automation or Lambda logic changes

**Hard stops (overnight):** DEV + repo documentation only · no PROD deploy · no schema writes · no destructive data changes

**Related:**

| Doc | Layer |
|-----|-------|
| [C-023-lambda-duplicate-hash-contract.md](../../make/documentation/C-023-lambda-duplicate-hash-contract.md) | File bytes / SHA-256 / review queue |
| [C-023-stage6-production-readiness-checklist.md](./C-023-stage6-production-readiness-checklist.md) §5 | Retries + partial failure (parent policy) |
| [C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md) | DEV sync JSON path (070a) |

**Code audited:**

| Layer | Path |
|-------|------|
| Lambda processor | `lambda/upload-asset/upload_core/processor.py` |
| Upload claim | `lambda/upload-asset/upload_core/upload_claim.py` |
| Homework sender | `airtable/automations/shooting-challenge/070a-*.js` (v4.4) |
| Video sender | `airtable/automations/shooting-challenge/070b-*.js` (v4.4) |
| Async verifier | `airtable/automations/shooting-challenge/070c-*.js` (v1.1) |

---

## Executive summary

Upload retry safety is **layered**: Lambda owns idempotent terminal state (`Uploaded` + canonical + hash); Airtable orchestration (070a/070b) owns **Send to Make Trigger** retention on failure; 070c completes async handoffs without re-invoking Lambda.

| Layer | Safe to rerun? | Primary guard |
|-------|----------------|---------------|
| **Lambda** (`processor.py`) | **Yes** when `already_uploaded()` or matching claim | `skipped_already_uploaded`, claim lease |
| **Make sync JSON** | **Yes** — passthrough re-invoke | Lambda idempotency |
| **Make async `Accepted`** | **Yes** — Lambda continues; 070c idempotent | Trigger retained until writeback verified |
| **070a / 070b** | **Yes** — re-check trigger | Retains trigger on webhook/Lambda verify failure |
| **070c** | **Yes** — writeback-only verify | Idempotent when trigger already cleared |

**Known gap (by design):** If upload PATCH succeeds but C-023 **review PATCH** fails, a Lambda retry returns `skipped_already_uploaded` and **does not** re-apply review fields. Ops must patch review fields manually or via repair script — **do not** delete S3 object or reset `Upload Status`.

---

## Path architecture — sync vs async

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 070a (homework) / 070b (video) — Send to Make Trigger checked         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Make Upload Engine — Router (070a+homework_completion | 070b+video)     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         SYNC JSON PATH                    ASYNC ACCEPTED PATH
    Module returns full Lambda JSON      Module returns plain-text "Accepted"
    (DEV homework default)               (PROD-style / long-running invoke)
                    │                               │
                    ▼                               ▼
         070a/070b validates body            Lambda continues in background
         clears trigger on verify PASS       070a/070b: trigger STAYS checked
                    │                               │
                    │                               ▼
                    │                      070c verifies Airtable writeback
                    │                      clears trigger when complete
                    └───────────────┬───────────────┘
                                    ▼
                         Lambda process_upload_asset()
                         claim → download → hash → S3 → PATCH
```

| Path | Make response | 070a/070b outcome | 070c required? | Trigger cleared by |
|------|---------------|-------------------|----------------|-------------------|
| **Sync JSON** | Full Lambda JSON (`{{14.data}}`) | `lambda_upload_verified` → clear trigger | **No** (DEV 070a) | 070a/070b on verify PASS |
| **Async Accepted** | Plain text `Accepted` | `lambda_upload_accepted_async`; trigger retained | **Yes** | 070c when writeback verified |
| **Webhook HTTP error** | 4xx/5xx or network fail | `error_webhook_*`; trigger **retained** | No | Operator re-checks trigger |
| **Invalid Lambda body** | HTTP 2xx but bad JSON | `error_lambda_response_*`; trigger **retained** | No | Operator re-checks trigger |

**070c scope:** Destination-agnostic (homework + video). Recommended trigger: `Upload Status = Uploaded` + writeback fields populated; `Send to Make Trigger` optional (v1.1 idempotent re-fire).

---

## Lambda layer — retry scenario matrix

Source: `processor.py`, `upload_claim.py`, C-023 contract.

### Pre-upload gates

| # | Scenario | Starting Airtable state | Lambda `actionOut` | S3 PutObject | Duplicate lookup | Safe rerun? |
|---|----------|-------------------------|----------------------|--------------|------------------|-------------|
| L1 | First upload | `Pending Link`, attachment present | `claim_acquired` → `uploaded` | **Yes** (new key) | **Yes** | **Yes** — idempotent after L2 |
| L2 | Same-record retry after success | `Uploaded` + canonical + valid hash | `skipped_already_uploaded` | **No** | **No** | **Yes** — preferred idempotent path |
| L3 | Claim continuation (crash mid-upload) | `Processing`, matching `Upload Claim Run ID`, lease active | `claim_continuation` → `uploaded` | **Yes** (same attempt resumes) | **Yes** | **Yes** — same claim only |
| L4 | Concurrent worker | `Processing`, different claim, lease active | `skipped_concurrent_upload` | **No** | **No** | **Wait** — do not force parallel |
| L5 | Claim conflict (legacy Processing) | `Processing`, no claim run id | `error_claim_conflict` | **No** | **No** | **Manual** — fix claim fields first |
| L6 | Stale claim | `Processing`, lease >30 min, no terminal upload | `stale_claim` | **No** | **No** | **Manual** — v1 never auto-resets |
| L7 | Invalid starting status | e.g. `Error` without recovery | `error_invalid_upload_status` | **No** | **No** | **Manual** — reset to `Pending Link` per SOP |
| L8 | Route mismatch | Wrong `routeKey` vs Upload Destination | `error_invalid_route` | **No** | **No** | **Fix payload** — not a blind retry |

Evidence: `already_uploaded()` (processor L124–130); `evaluate_upload_claim()` matrix (upload_claim.py L89–185); tests `test_retry_after_successful_upload_skips_s3_and_lookup`, `test_homework_same_record_retry_skips_s3`.

### Upload path — partial failure

| # | Scenario | Upload PATCH | Review PATCH | Terminal `Upload Status` | Lambda retry behavior | Safe rerun? |
|---|----------|--------------|--------------|--------------------------|----------------------|-------------|
| P1 | Full success | OK | OK | `Uploaded` | L2 skip | **Yes** |
| P2 | S3 OK, upload PATCH OK, review PATCH fails | OK | **Fail** | `Uploaded` + canonical + hash | L2 skip — **review NOT reapplied** | **Partial** — ops patch review fields |
| P3 | Hash lookup throws | Proceeds | `Duplicate File Status = Error` | `Uploaded` if S3 OK | L2 skip after P1 state | **Partial** — ops may fix duplicate fields |
| P4 | S3 fails before PATCH | — | — | `Error` (via `process_with_error_writeback`) | L1 if reset to `Pending Link` | **Yes** after status reset |
| P5 | Download attachment fails | — | — | `Error` | Same as P4 | **Yes** after fix + reset |
| P6 | Duplicate bytes (C-023) | OK | OK (flag only) | `Uploaded` | L2 skip | **Yes** — never blocks upload |

Evidence: `processor.py` L298–330 (S3 before review PATCH; review best-effort); `test_review_writeback_failure_preserves_upload`; `test_retry_after_partial_writeback_review_not_reapplied`.

### Error writeback (`process_with_error_writeback`)

| # | Exception type | Airtable write | HTTP status | Retry after fix |
|---|----------------|----------------|-------------|-----------------|
| E1 | `UploadError` | `Upload Status = Error`, `Upload Error = message` | 400 (typical) | Reset status + re-trigger |
| E2 | Uncaught exception | Same error writeback | 500 | Investigate + reset |

**Invariant:** Error writeback never clears attachment or deletes S3 (no delete paths in upload core).

---

## Make layer — retry scenario matrix

| # | Scenario | Make behavior | Downstream effect | Safe rerun? |
|---|----------|---------------|-------------------|-------------|
| M1 | Sync JSON success | Returns Lambda body verbatim | 070a/070b verifies + clears trigger | **Yes** |
| M2 | Sync JSON — Lambda `skipped_already_uploaded` | Passthrough | 070a/070b treats as verified success | **Yes** |
| M3 | Sync JSON — Lambda error in body | Passthrough | 070a/070b fails verify; trigger retained | **Yes** — re-check trigger |
| M4 | Async `Accepted` | Returns immediately | Lambda async; 070c completes | **Yes** — 070c idempotent |
| M5 | HTTP timeout to Lambda | Make error module / non-2xx | 070a/070b `error_webhook_response`; trigger retained | **Yes** |
| M6 | Malformed Lambda JSON | 070a/070b `error_lambda_response_invalid` | Trigger retained | **Yes** |
| M7 | Duplicate Make webhook delivery | Second invoke hits L2 at Lambda | No second S3 object | **Yes** — idempotent |

**DEV homework default:** Sync JSON — 070c not on critical path ([C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md)).

---

## Airtable orchestration — 070a / 070b retry matrix

Shared logic (070a v4.4 / 070b v4.4). **Option A:** scripts never set `Upload Status = Processing`; Lambda owns claim.

### Trigger retention rules

| # | Scenario | `Send to Make Trigger` | `Upload Error` | `Upload Status` writer |
|---|----------|------------------------|----------------|------------------------|
| A1 | Webhook network failure | **Retained** | Error message | None (070a/b) |
| A2 | Make HTTP non-2xx | **Retained** | Error message | None |
| A3 | Lambda verify failure | **Retained** | Error message | None |
| A4 | Sync verify success | **Cleared** | Cleared | Lambda only |
| A5 | Async `Accepted` | **Retained** | Unchanged | Lambda only |
| A6 | Pre-send skip (`skipped_pending_link`) | **Cleared** | Set or cleared per path | 070a/b may set `Pending Link` |
| A7 | Legacy Drive guard (`skipped_already_uploaded`) | **Cleared** | Block message | 070a/b sets `Uploaded` |

Evidence: `stopWithLambdaHandoffFailure` — explicit "Retain Send to Make Trigger" (070a L525); webhook errors use `uncheckTrigger: false` (L848, L867); success clears trigger (L977).

### Lambda response verification (sync path)

| Lambda `actionOut` | 070a/070b verdict | Clears trigger? |
|--------------------|-------------------|-----------------|
| `uploaded` + `writebackVerification.allPass=true` | `lambda_upload_verified` | **Yes** |
| `skipped_already_uploaded` | `lambda_upload_verified` | **Yes** |
| `uploaded` + `allPass=false` | `error_lambda_writeback_incomplete` | **No** |
| `skipped_concurrent_upload`, `stale_claim`, `error_claim_conflict` | `error_lambda_*` | **No** |
| `error_*` / `statusOut=error` | `error_lambda_upload_failed` | **No** |

Evidence: `VERIFIED_SUCCESS_ACTIONS`, `evaluateLambdaHandoffResult()` (070a L330–481).

### Duplicate trigger re-send

| # | Operator action | Expected outcome |
|---|-----------------|------------------|
| D1 | Re-check `Send to Make Trigger` after sync success (trigger already cleared) | Automation may not re-fire; no harm if Lambda invoked directly |
| D2 | Re-check trigger after verify failure | Full chain re-runs; Lambda L2 if already uploaded |
| D3 | Re-check trigger during active `Processing` + same claim | Lambda L3 continuation |
| D4 | Re-check trigger during active `Processing` + different worker | Lambda L4 concurrent skip; trigger stays until lease expires or manual fix |

---

## 070c — async completion retry matrix

| # | Scenario | Writeback checks | Trigger state | 070c `actionOut` | Clears trigger? |
|---|----------|------------------|---------------|------------------|-----------------|
| C1 | Full writeback, trigger checked | All pass | Checked | `async_upload_verified_trigger_cleared` | **Yes** |
| C2 | Full writeback, trigger already cleared | All pass | Unchecked | `async_upload_already_verified` | **No** (idempotent) |
| C3 | Incomplete writeback | Fail | Any | `async_writeback_verification_failed` | **No** |
| C4 | Re-fire 070c after C1 | All pass | Unchecked | `async_upload_already_verified` | **No** |

**070c does not re-invoke Make or Lambda** — read-only verify + optional trigger clear.

Evidence: `decide070cAction()` (070c L275–314); v1.1 docblock — writeback independent of trigger state.

---

## End-to-end scenario matrix (operator view)

| ID | User-visible situation | Sync path behavior | Async path behavior | **Safe to rerun?** | Operator action |
|----|------------------------|--------------------|---------------------|-------------------|-----------------|
| S1 | Upload succeeded, trigger cleared | Normal complete | 070c cleared or already clear | **Yes** | None |
| S2 | Upload succeeded, trigger still checked (async) | N/A | 070c pending or failed | **Yes** | Wait for Lambda; run/fix 070c trigger |
| S3 | Make timeout, trigger checked | Error retained | Same | **Yes** | Re-check trigger after Make/Lambda healthy |
| S4 | Lambda returned error, trigger checked | Error retained | Same | **Yes** | Fix root cause; re-check trigger |
| S5 | Asset `Uploaded` but duplicate review missing | Sync may have cleared trigger | Same | **Partial** | Manual review PATCH — Lambda retry won't fix (P2) |
| S6 | Stale `Processing`, no canonical | Lambda `stale_claim` | Same | **Manual** | Run stuck-upload audit; Mike recovery |
| S7 | Two kids upload same bytes | Both `uploaded`; C-023 flags review | Same | **Yes** | Review queue — never block |
| S8 | Same asset double-click trigger | Second invoke → `skipped_already_uploaded` | Async: 070c idempotent | **Yes** | None |
| S9 | Partial multi-file video (2/3 uploaded) | Each row independent L2/L1 | Per-row 070c | **Yes** | Retry only failed rows |
| S10 | Webhook OK but `allPass=false` | Trigger retained | Rare on async | **Yes** | Investigate writeback; re-trigger |

---

## Safe rerun verdict by layer

| Layer | Verdict | Conditions |
|-------|---------|------------|
| **Lambda direct re-invoke** | **SAFE** | Terminal `Uploaded` → skip; `Pending Link` or matching claim → proceed |
| **Make scenario re-run** | **SAFE** | Passthrough; relies on Lambda idempotency |
| **070a / 070b re-trigger** | **SAFE** | Failures retain trigger by design; success clears once |
| **070c re-fire** | **SAFE** | Idempotent; never double-uploads |
| **Blind retry on `stale_claim`** | **UNSAFE** | Requires manual claim recovery (v1) |
| **Reset `Upload Status` to force re-upload when canonical exists** | **UNSAFE** | Would create second S3 object — use only with Mike approval + orphan S3 plan |
| **Delete S3 object to "retry"** | **PROHIBITED** | Policy — never delete from upload path |

---

## Cross-layer invariants (C-024 + C-023)

1. **One terminal success per asset row:** `Uploaded` + canonical + hash → all layers must treat as done.
2. **Trigger is the retry signal:** 070a/070b retain trigger on orchestration failure; never clear on unverified Lambda body.
3. **Lambda owns claim:** 070a/070b must not write `Processing` (Option A) — prevents split-brain retries.
4. **C-023 review is best-effort after upload:** Upload success is not rolled back on review PATCH failure.
5. **Mike decision lock:** Retry must not overwrite nonblank `Asset Reuse Decision` (C-023; enforced in `build_review_writeback`).
6. **No S3 reuse:** Retries never copy another asset's storage key ([C-023 contract](../../make/documentation/C-023-lambda-duplicate-hash-contract.md)).

---

## Gaps flagged for Stage 3 (Worker C tests / ops tooling)

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| P2 review PATCH not retried by Lambda | **Known / accepted** | Document ops SOP; optional repair extension |
| `stale_claim` manual recovery | **Ops** | `audit-stuck-upload-processing.js` |
| 070a async + 070c on homework | **Config** | Confirm trigger wiring if PROD uses Accepted for HW |
| Duplicate Make delivery | **Low** | Covered by L2; Worker C may add mock test |

**Code changes this task:** None — audit PASS; behavior matches C-023 contract and existing tests.

---

## Test evidence cited

| Test | File | Asserts |
|------|------|---------|
| Retry skip | `test_duplicate_matrix_stage1.py::test_retry_after_successful_upload_skips_s3_and_lookup` | No S3/lookup on L2 |
| Partial review | `test_duplicate_matrix_stage1.py::test_retry_after_partial_writeback_review_not_reapplied` | Review not re-PATCHed |
| Review failure preserve | `test_processor.py::test_review_writeback_failure_preserves_upload` | Upload stays `Uploaded` |
| Homework retry | `test_homework_route.py::test_homework_same_record_retry_skips_s3` | Route-specific L2 |
| Claim matrix | `test_upload_claim.py` | L3–L6 claim outcomes |

---

## Related backlog

| ID | Relationship |
|----|--------------|
| C-023 | File-hash duplicate detection — review queue on retry skip |
| C-024 | Record-key dedupe (Worker A/D) — orthogonal to upload retry |
| C-013 | Upload engine parent — Make/Lambda/070a/b/c wiring |
