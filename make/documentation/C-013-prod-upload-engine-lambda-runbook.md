# C-013 — PROD Make Upload Engine Lambda runbook

**Date:** 2026-07-11  
**Scenario name:** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`  
**Status:** **PROD manual smoke PASS** (`overallPass=true`, 2026-07-11) · sanitized blueprint ready · Airtable-triggered 070b test pending
**Parents:** [C-013-prod-make-deployment-2026-07-11.md](../../docs/deploy-checklists/C-013-prod-make-deployment-2026-07-11.md) · [C-013-dev-make-lambda-scenario-prep.md](../deploy-checklists/C-013-dev-make-lambda-scenario-prep.md)

**Hard stops:** **070b OFF** · **070a OFF** · Schmidt Testing only · no secrets in GitHub

---

## Architecture

```text
Airtable 070b (later) → Make Custom Webhook
  → Router (automationNumber=070b AND routeKey=video_feedback)
  → HTTP POST PROD Lambda Function URL + X-Upload-Secret
  → Lambda → S3 + Airtable writeback
  → Make Webhook response = complete Lambda JSON (not generic Accepted)
```

070b **does not** call Lambda directly.

---

## Scenario variables (Make — secret)

| Variable | Purpose | Status |
|----------|---------|--------|
| `LAMBDA_FUNCTION_URL_PROD` | PROD Lambda Function URL | CONFIGURED (ops; value not committed) |
| `UPLOAD_WEBHOOK_SECRET_PROD` | Header `X-Upload-Secret` — must match Lambda env | **ROTATION REQUIRED before activation** |

`MAKE_UPLOAD_WEBHOOK_URL_PROD` is configured locally and manual smoke passed. Keep it in ops notes only — **not GitHub**.

---

## Module sequence

| # | Module | Configuration |
|---|--------|---------------|
| 1 | **Webhooks → Custom webhook** | Receives 070b v4.2 JSON |
| 2 | **Router** | `automationNumber` = `070b` **AND** `routeKey` = `video_feedback` |
| 3 | **HTTP → Make a request** | POST PROD Lambda URL · header `X-Upload-Secret` · body = entire module 1 JSON · timeout **120 s** · parse response **ON** · **Return error if HTTP request fails OFF** so structured Lambda 4xx JSON continues |
| 4 | **Router** | Branch A: complete Lambda JSON with `actionOut` (success or structured Lambda error) · Branch B: transport/malformed response |
| 5 | **Webhooks → Webhook response** (Lambda JSON) | Status **200** · body = complete Lambda JSON, preserving top-level keys |
| 6 | **Webhooks → Webhook response** (transport failure) | Status **502** · deterministic `error_make_http_failure` JSON |

### Critical response rule

**Do not** return generic `Accepted`, `Success`, or HTTP status alone. 070b v4.2 treats HTTP 2xx without `actionOut` as **`error_lambda_response_unverified`**.

Map module 5 body from module 3 **Data** (full Lambda JSON), matching DEV Part A fix (Module 16 = Module 14 Data).

**Why HTTP errors must continue:** PROD invalid-route smoke proved Lambda returns `statusOut=error`, `actionOut=error_invalid_route`. Make must pass that complete JSON to Airtable instead of terminating at module 3.

---

## 070b payload shape (exact)

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "2026-07-11T16:00:00.000Z",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recGQ8EjAMz3bEBiW",
  "targetTable": "Video Feedback",
  "targetRecordId": "recrvEzk8GxXfy3EE"
}
```

---

## Build verification (completed for manual smoke)

| Step | Action | Done |
|------|--------|------|
| 1 | Create scenario **`Shooting Challenge - GAME - Upload Engine - Lambda - v1`** | [x] |
| 2 | Configure PROD Lambda URL + upload secret | [x] (rotate secret before activation) |
| 3 | Module 1 Custom webhook URL stored in local ops | [x] |
| 4 | Module 2 Router filter `070b` + `video_feedback` | [x] |
| 5 | Module 3 HTTP POST with secret header, 120 s timeout | [x] |
| 6 | Structured Lambda errors continue to complete JSON response | [x] |
| 7 | Manual upload/idempotency/invalid-route smoke | [x] |
| 8 | Sanitized blueprint committed | [x] |
| 9 | Rotate exposed upload secret in AWS + Make + local env | [ ] |
| 10 | Airtable-triggered Schmidt test; leave approved final states | [ ] |

**Do not** paste webhook URL into 070b `makeWebhookUrl` until manual smoke PASS + explicit approval.

---

## Manual smoke (070b OFF)

**Fixture:** `recGQ8EjAMz3bEBiW` · enrollment `recgP9qZYjAhE7NXm` only.

```powershell
cd tools/airtable
python c013_prod_make_smoke_run.py preflight
python c013_prod_make_smoke_run.py upload --asset-id recGQ8EjAMz3bEBiW --reset
python c013_prod_make_smoke_run.py idempotency --asset-id recGQ8EjAMz3bEBiW
python c013_prod_make_smoke_run.py invalid-route --asset-id recGQ8EjAMz3bEBiW
python c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW --reset
```

Or single POST:

```powershell
python c013_prod_make_webhook_post.py recGQ8EjAMz3bEBiW
```

**Result:** **PASS** — complete Lambda JSON · `actionOut=uploaded` + independent probe `allPass=true` · `skipped_already_uploaded` with unchanged key/hash · `error_invalid_route` with expected `Upload Status=Error` and preserved canonical/hash fields.

Evidence: [C-013 PROD Make smoke](../../docs/audits/C-013-prod-make-smoke-result-2026-07-11.md).

---

## Required secret rotation

The PROD upload secret was displayed during local/chat preparation. Before Airtable-triggered activation, generate one new value and update all three locations in one maintenance window:

1. AWS Lambda `127si-upload-asset` → environment → `UPLOAD_WEBHOOK_SECRET`
2. Make scenario HTTP module → header `X-Upload-Secret`
3. Local `tools/airtable/.env` / gitignored session value used by smoke tooling

Then run missing-secret, wrong-secret, and full manual Make smoke again. Never print or commit the value.

---

## Rollback

1. Scenario **OFF**
2. **070b OFF**
3. Lambda reserved concurrency 0 if needed
4. Rotate secrets if exposed

---

## Blueprint (secret-free)

[upload-asset-engine-lambda-prod-v1.template.json](../blueprints/upload-asset-engine-lambda-prod-v1.template.json) — sanitized reference with placeholders; no operational URLs or secrets.
