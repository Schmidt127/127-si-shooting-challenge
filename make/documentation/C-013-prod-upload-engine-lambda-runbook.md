# C-013 — PROD Make Upload Engine Lambda runbook

**Date:** 2026-07-11  
**Scenario name:** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`  
**Status:** **Package ready** · scenario **NOT built in Make UI** · **OFF** after build  
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
| `LAMBDA_FUNCTION_URL_PROD` | PROD Lambda Function URL | CONFIGURED (ops) |
| `UPLOAD_WEBHOOK_SECRET_PROD` | Header `X-Upload-Secret` — must match Lambda env | CONFIGURED (ops) |

Store webhook URL from module 1 in ops notes as `MAKE_UPLOAD_WEBHOOK_URL_PROD` — **not GitHub**.

---

## Module sequence

| # | Module | Configuration |
|---|--------|---------------|
| 1 | **Webhooks → Custom webhook** | Receives 070b v4.2 JSON |
| 2 | **Router** | `automationNumber` = `070b` **AND** `routeKey` = `video_feedback` |
| 3 | **HTTP → Make a request** | POST `{{LAMBDA_FUNCTION_URL_PROD}}` · header `X-Upload-Secret: {{UPLOAD_WEBHOOK_SECRET_PROD}}` · body = entire module 1 JSON · timeout **120 s** |
| 4 | **Router** | Branch A: HTTP 200–299 · Branch B: else (4xx/5xx/timeout) |
| 5 | **Webhooks → Webhook response** (success) | Status **200** · body = **Lambda HTTP response body** (parsed JSON with `actionOut`) |
| 6 | **Webhooks → Webhook response** (failure) | Status **502** · body = deterministic JSON e.g. `{"statusOut":"error","actionOut":"error_make_http_failure","errorOut":"..."}` |

### Critical response rule

**Do not** return generic `Accepted`, `Success`, or HTTP status alone. 070b v4.2 treats HTTP 2xx without `actionOut` as **`error_lambda_response_unverified`**.

Map module 5 body from module 3 **Data** (full Lambda JSON), matching DEV Part A fix (Module 16 = Module 14 Data).

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

## Mike checklist — build scenario (OFF)

| Step | Action | Done |
|------|--------|------|
| 1 | Create scenario **`Shooting Challenge - GAME - Upload Engine - Lambda - v1`** | [ ] |
| 2 | Add scenario variables `LAMBDA_FUNCTION_URL_PROD`, `UPLOAD_WEBHOOK_SECRET_PROD` | [ ] |
| 3 | Module 1 Custom webhook — copy URL to ops (`MAKE_UPLOAD_WEBHOOK_URL_PROD`) | [ ] |
| 4 | Module 2 Router filter `070b` + `video_feedback` | [ ] |
| 5 | Module 3 HTTP POST with secret header, 120 s timeout | [ ] |
| 6 | Module 4–6 response routers — Lambda JSON on success | [ ] |
| 7 | Save scenario **OFF** | [ ] |
| 8 | Add webhook URL to `tools/airtable/_preview/c013-prod-deploy-session.local.json` | [ ] |
| 9 | Run manual smoke (below) | [ ] |
| 10 | Leave scenario **OFF** until controlled 070b window | [ ] |

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

**Pass criteria:** Make returns complete Lambda JSON · `actionOut=uploaded` + `allPass=true` (upload) · `skipped_already_uploaded` (idempotency) · invalid route rejected without Airtable/S3 change.

---

## Rollback

1. Scenario **OFF**
2. **070b OFF**
3. Lambda reserved concurrency 0 if needed
4. Rotate secrets if exposed

---

## Blueprint (secret-free)

[upload-asset-engine-lambda-prod-v1.template.json](../blueprints/upload-asset-engine-lambda-prod-v1.template.json)
