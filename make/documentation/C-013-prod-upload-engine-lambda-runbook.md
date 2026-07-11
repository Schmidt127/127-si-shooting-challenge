# C-013 — PROD Make Upload Engine Lambda runbook

**Date:** 2026-07-11  
**Scenario name:** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`  
**Status:** **PROD COMPLETE** — manual smoke PASS · Airtable-triggered Schmidt test PASS (`recGQ8EjAMz3bEBiW`)  
**Scripts:** **070b v4.4** · **070c v1.1**  
**Closeout:** [C-013-prod-closeout-2026-07-11.md](../../docs/deploy-checklists/C-013-prod-closeout-2026-07-11.md)  
**Parents:** [C-013-prod-make-deployment-2026-07-11.md](../../docs/deploy-checklists/C-013-prod-make-deployment-2026-07-11.md) · [C-013-dev-make-lambda-scenario-prep.md](../deploy-checklists/C-013-dev-make-lambda-scenario-prep.md)

**Hard stops:** Schmidt Testing only for experiments · no secrets in GitHub

---

## Architecture

```text
Airtable 070b v4.4 → Make Custom Webhook
  → Router (automationNumber=070b AND routeKey=video_feedback)
  → HTTP POST PROD Lambda Function URL + X-Upload-Secret
  → Lambda → S3 + Airtable writeback
  → Make may return plain-text "Accepted" to 070b (async gateway ack)
  → 070c v1.1 verifies writeback idempotently; clears trigger only if still checked
```

070b **does not** call Lambda directly. 070b **does not** poll or use timers.

### Make `Accepted` vs immediate Lambda JSON

| Make response to 070b | 070b v4.4 behavior | 070c role |
|----------------------|-------------------|-----------|
| Plain-text **`Accepted`** (HTTP 200) | `statusOut=pending`, `actionOut=lambda_upload_accepted_async`; retains Send to Make Trigger | Verify writeback when fields complete; idempotent if trigger already cleared |
| Complete Lambda JSON (`uploaded`, etc.) | Immediate verified success path; may clear trigger | Optional idempotent confirm (`async_upload_already_verified`) |

---

## Scenario variables (Make — secret)

| Variable | Purpose | Status |
|----------|---------|--------|
| `LAMBDA_FUNCTION_URL_PROD` | PROD Lambda Function URL | CONFIGURED (ops; value not committed) |
| `UPLOAD_WEBHOOK_SECRET_PROD` | Header `X-Upload-Secret` — must match Lambda env | CONFIGURED · **rotation recommended** (exposed during prep) |

`MAKE_UPLOAD_WEBHOOK_URL_PROD` is configured locally. Keep in ops notes only — **not GitHub**.

---

## Module sequence

| # | Module | Configuration |
|---|--------|---------------|
| 1 | **Webhooks → Custom webhook** | Receives 070b v4.4 minimal JSON |
| 2 | **Router** | `automationNumber` = `070b` **AND** `routeKey` = `video_feedback` |
| 3 | **HTTP → Make a request** | POST PROD Lambda URL · header `X-Upload-Secret` · body = entire module 1 JSON · timeout **120 s** · parse response **ON** · **Return error if HTTP request fails OFF** |
| 4 | **Router** | Branch A: complete Lambda JSON · Branch B: transport/malformed |
| 5 | **Webhooks → Webhook response** (Lambda JSON path) | Status **200** · complete Lambda JSON when synchronous path applies |
| 6 | **Webhooks → Webhook response** (transport failure) | Status **502** · deterministic error JSON |

**Observed PROD behavior:** Make may return **`Accepted`** to the webhook caller while Lambda completes asynchronously. This is expected; 070b v4.4 + 070c v1.1 handle it. Scenario must be **ON** with **Immediately as data arrives** for executions to run.

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

## 070c trigger (recommended)

**Do not require** Send to Make Trigger checked.

- Upload Status = Uploaded  
- Writeback Complete? > 0  
- Canonical File URL, Storage Key, File Content Hash populated  
- File Hash Algorithm = SHA-256  
- Uploaded At populated  
- Upload Error blank  

---

## Build verification

| Step | Done |
|------|------|
| PROD Lambda deployed + direct smoke | [x] |
| Make scenario built | [x] |
| Manual webhook smoke | [x] |
| Airtable-triggered Schmidt test | [x] |
| 070b v4.4 + 070c v1.1 in GitHub | [x] |
| Optional: rotate exposed upload secret | [ ] |

---

## Manual smoke (070b not required)

**Fixture:** `recGQ8EjAMz3bEBiW` · enrollment `recgP9qZYjAhE7NXm` only.

```powershell
cd tools/airtable
python c013_prod_make_smoke_run.py preflight
python c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW --reset
```

**Do not reset** `recGQ8EjAMz3bEBiW` while it serves as production-pass evidence.

---

## Rollback

1. Scenario **OFF**
2. **070b OFF** · **070c OFF**
3. Lambda reserved concurrency 0 if needed
4. Rotate secrets if exposed

---

## Blueprint (secret-free)

[upload-asset-engine-lambda-prod-v1.template.json](../blueprints/upload-asset-engine-lambda-prod-v1.template.json)
