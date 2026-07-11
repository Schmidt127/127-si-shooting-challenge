# C-013 — PROD Make deployment and 070b enablement prep

**Date:** 2026-07-11  
**Status:** **Package READY** · Make scenario **NOT built** · manual webhook smoke **BLOCKED** · **070b OFF**  
**Lambda smoke:** [PASS](../audits/C-013-prod-lambda-smoke-result-2026-07-11.md)  
**Make smoke:** [BLOCKED](../audits/C-013-prod-make-smoke-result-2026-07-11.md)  
**Runbook:** [C-013-prod-upload-engine-lambda-runbook.md](../../make/documentation/C-013-prod-upload-engine-lambda-runbook.md)  
**Blueprint:** [upload-asset-engine-lambda-prod-v1.template.json](../../make/blueprints/upload-asset-engine-lambda-prod-v1.template.json)

**Hard stops:** Do **not** enable **070b** or **070a** until Make manual webhook PASS + Mike explicit approval.

---

## 1. Scenario identity

| Item | Value |
|------|--------|
| **Name** | `Shooting Challenge - GAME - Upload Engine - Lambda - v1` |
| **Initial state** | **OFF** (no scheduling) |
| **First slice** | `automationNumber=070b` · `routeKey=video_feedback` only |
| **No Amazon S3 Upload module** | Lambda owns S3 |

---

## 2. Secure variables

| Name | Purpose | Status |
|------|---------|--------|
| `LAMBDA_FUNCTION_URL_PROD` | Make HTTP module URL | **CONFIGURED** (ops) |
| `UPLOAD_WEBHOOK_SECRET_PROD` | Make scenario variable → `X-Upload-Secret` header | **CONFIGURED** (ops) |
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | Module 1 webhook URL for 070b input + smoke scripts | **MISSING** |

Values live in `tools/airtable/_preview/c013-prod-deploy-session.local.json` (gitignored) — **never commit**.

---

## 3. Module sequence

| # | Module | Notes |
|---|--------|-------|
| 1 | Custom webhook | Receives 070b v4.2 minimal JSON |
| 2 | Router | `automationNumber = 070b` AND `routeKey = video_feedback` |
| 3 | HTTP Make a request | POST PROD Lambda URL · `X-Upload-Secret` from scenario variable · body = module 1 JSON · **120 s** timeout |
| 4 | Router | HTTP 2xx vs failure |
| 5 | Webhook response (success) | **Body = complete Lambda JSON** (`statusOut`, `actionOut`, `writebackVerification`, etc.) |
| 6 | Webhook response (failure) | Deterministic error JSON — not generic 200 success |

### Anti-patterns (DEV lesson)

- Returning **`Accepted`** only while Lambda runs async — 070b v4.2 **fails** with `error_lambda_response_unverified`
- HTTP 200 when Lambda returned 4xx/5xx
- Wrapping Lambda JSON so `actionOut` is not at top level (proxy envelope without unwrap is OK if 070b parser handles it — prefer flat Lambda body)

---

## 4. 070b v4.2 audit (Phase 1)

**Script:** `airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js`  
**Version:** **v4.2** (GitHub confirmed)

### Required inputs

| Input | Value |
|-------|--------|
| `recordId` | Triggering Submission Assets record ID |
| `makeWebhookUrl` | PROD Make webhook URL (alias: `webhookUrl`) |
| `automationNumber` | `"070b"` |

### Payload fields (exact — from script)

| Field | 070b video value |
|-------|------------------|
| `sourceName` | `Airtable Upload Engine` |
| `automationNumber` | `070b` |
| `sentAtIso` | ISO timestamp UTC |
| `routeKey` | `video_feedback` |
| `uploadDestination` | `Video Feedback` |
| `sourceTable` | `Submission Assets` |
| `submissionAssetRecordId` | `recordId` |
| `targetTable` | `Video Feedback` |
| `targetRecordId` | First linked Video Feedback record |

### Success criteria

| Condition | 070b action |
|-----------|-------------|
| Make HTTP 2xx + `actionOut=uploaded` + `writebackVerification.allPass=true` | Clear Upload Error · uncheck Send to Make Trigger |
| Make HTTP 2xx + `actionOut=skipped_already_uploaded` | Same verified success path |
| Lambda owns claim | 070b **does not** set Upload Status = Processing on Make 2xx |

### Failure criteria

| Condition | 070b actionOut |
|-----------|----------------|
| Make HTTP non-2xx | `error_webhook_response` |
| Network failure | `error_webhook_request` |
| HTTP 2xx, blank body | `error_lambda_response_invalid` |
| HTTP 2xx, malformed JSON | `error_lambda_response_invalid` |
| HTTP 2xx, no `actionOut` (generic Accepted) | `error_lambda_response_unverified` |
| `uploaded` without `allPass=true` | `error_lambda_writeback_incomplete` |
| Lambda `error_*` actionOut | `error_lambda_upload_failed` |
| Claim collision paths | `error_lambda_skipped_concurrent_upload`, etc. |

### Timeout

070b uses Airtable `fetch` / `remoteFetchAsync` with **no explicit timeout** — bounded by Airtable automation limits. Make HTTP module must use **≥ 120 s** to match Lambda.

### Response parsing

Uses `parseLambdaResponseBody` + `evaluateLambdaHandoffResult` (shared lib `upload-make-lambda-response.js`). Unwraps API Gateway `{ body: "..." }` envelope if present.

---

## 5. Manual webhook smoke (Phase 5–7)

**Status:** **BLOCKED** — `MAKE_UPLOAD_WEBHOOK_URL_PROD` missing.

**Fixture (Schmidt Testing only):**

| Record | ID |
|--------|-----|
| Enrollment | `recgP9qZYjAhE7NXm` |
| Submission Asset | `recGQ8EjAMz3bEBiW` |
| Video Feedback | `recrvEzk8GxXfy3EE` |

**Current fixture state (direct Lambda smoke):** Upload Status **Uploaded** · probe `allPass=true` · Send to Make Trigger unchecked.

**When webhook available:**

1. Reset fixture to Pending Link (smoke runner `--reset`)
2. Make scenario **Run once** (or ON briefly for smoke)
3. `python c013_prod_make_webhook_post.py recGQ8EjAMz3bEBiW`
4. Idempotency: repeat same payload
5. Invalid route: `--route-key not_a_route`

**Helpers:** `c013_prod_make_webhook_post.py` · `c013_prod_make_smoke_run.py`

---

## 6. Automation 070b configuration (Phase 8 — do not enable)

| Setting | Value |
|---------|--------|
| **Name** | `070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make` |
| **Trigger** | When record matches conditions |
| **Table** | Submission Assets |
| **Conditions** | Send to Make Trigger **checked** · Upload Status = **Pending Link** · Upload Destination = **Video Feedback** |
| **Action** | Run script |
| **recordId** | Triggering record ID |
| **makeWebhookUrl** | `MAKE_UPLOAD_WEBHOOK_URL_PROD` (secure) |
| **automationNumber** | `070b` |
| **Script** | Paste from GitHub `070b-...-send-video-asset-payload-to-make.js` v4.2 |
| **State** | **OFF** |

---

## 7. Controlled 070b enablement test (Phase 9 — Mike only)

**Not executed in this session.**

1. Confirm Make scenario **ON** only for controlled smoke window
2. Confirm automation **070b OFF**
3. Reset Schmidt Testing fixture (`recGQ8EjAMz3bEBiW`) to Pending Link · clear canonical/hash if re-testing
4. Upload Status = **Pending Link**
5. Upload Destination = **Video Feedback**
6. Check **Send to Make Trigger**
7. Turn **070b ON**
8. Trigger **one** controlled record
9. Confirm Make, Lambda, S3, Airtable results · probe `allPass=true`
10. Confirm no other records entered trigger (C-013 Schmidt Testing view)
11. If unexpected record queued → **070b OFF immediately**
12. Leave **070b ON** only after full PASS and Mike approval

---

## 8. Rollback

| Layer | Action |
|-------|--------|
| **070b** | OFF |
| **070a** | OFF |
| **Make** | Scenario OFF |
| **Lambda** | Reserved concurrency 0 |
| **Secrets** | Rotate if exposed |
| **Fixture** | Reset or delete Schmidt Testing rows only |

---

## 9. GO / NO-GO

| Gate | Result |
|------|--------|
| Make package in GitHub | **PASS** |
| Make scenario built | **FAIL** (Mike UI) |
| Secure vars Lambda + secret | **CONFIGURED** |
| Webhook URL | **MISSING** |
| Manual webhook smoke | **BLOCKED** |
| Idempotency via Make | **BLOCKED** |
| Invalid route via Make | **BLOCKED** |
| 070b script v4.2 verified | **PASS** |
| 070b enabled | **NO** (correct) |

**GO for controlled 070b test:** **NO-GO**

---

## 10. Remaining manual actions

1. Build Make scenario per [runbook](../../make/documentation/C-013-prod-upload-engine-lambda-runbook.md)
2. Save webhook URL to session file
3. Run `c013_prod_make_smoke_run.py all --reset`
4. Update [make smoke result](../audits/C-013-prod-make-smoke-result-2026-07-11.md) to PASS
5. Paste webhook into 070b input (automation still OFF)
6. Execute controlled 070b test (Phase 9) with Mike approval

---

## 11. Production v2 estimate

**~78%** — PROD Lambda smoke PASS; Make deployment package ready; Make runtime smoke + 070b enablement remain.
