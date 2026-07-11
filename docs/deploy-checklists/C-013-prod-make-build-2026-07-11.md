# C-013 — PROD Make scenario build specification

**Date:** 2026-07-11  
**Scenario name:** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`  
**Status:** **BUILT · manual PROD smoke PASS** (`overallPass=true`)
**070b / 070a:** **OFF** — unchanged pending secret rotation + Mike approval
**Blueprint:** [upload-asset-engine-lambda-prod-v1.template.json](../../make/blueprints/upload-asset-engine-lambda-prod-v1.template.json)  
**Runbook:** [C-013-prod-upload-engine-lambda-runbook.md](../../make/documentation/C-013-prod-upload-engine-lambda-runbook.md)  
**Parent:** [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md)

---

## 1. Architecture

```text
Airtable 070b (later, OFF now)
  → Make Custom Webhook (module 1)
  → Router: automationNumber=070b AND routeKey=video_feedback (module 2)
  → HTTP POST PROD Lambda Function URL + X-Upload-Secret (module 3)
  → Lambda → S3 + Airtable writeback
  → Make Webhook response = complete Lambda JSON body (modules 4–6)
```

Manual smoke **bypasses 070b** — POST the same JSON directly to module 1 webhook URL.

---

## 2. Scenario variables (Make — secret)

| Variable | Purpose | Repo status |
|----------|---------|-------------|
| `LAMBDA_FUNCTION_URL_PROD` | HTTP module URL | **CONFIGURED** (ops) |
| `UPLOAD_WEBHOOK_SECRET_PROD` | Header `X-Upload-Secret` — must match Lambda `UPLOAD_WEBHOOK_SECRET` | **CONFIGURED** (ops) |
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | Module 1 Custom webhook URL — for smoke scripts + 070b `makeWebhookUrl` input | **CONFIGURED** (local ops only) |

Store values in `tools/airtable/_preview/c013-prod-deploy-session.local.json` (gitignored). **Never commit.**

---

## 3. Module sequence (exact)

| # | App / module | Configuration |
|---|--------------|---------------|
| **1** | **Webhooks → Custom webhook** | Receives 070b v4.2 minimal JSON. Copy webhook URL to ops as `MAKE_UPLOAD_WEBHOOK_URL_PROD`. |
| **2** | **Flow control → Router** | **Filter (both required):** `automationNumber` **equal** `070b` · `routeKey` **equal** `video_feedback`. Reject all other routes in first PROD slice. |
| **3** | **HTTP → Make a request** | POST PROD Lambda URL · `X-Upload-Secret` · body = module 1 JSON · timeout **120 s** · parse response **ON** · **Return error if HTTP request fails OFF** |
| **4** | **Flow control → Router** | Branch A: complete Lambda JSON with `actionOut` (success or structured error) · Branch B: transport/malformed response |
| **5** | **Webhooks → Webhook response** (Lambda JSON) | Status **200** · complete Lambda JSON with top-level keys unchanged |
| **6** | **Webhooks → Webhook response** (transport failure) | Status **502** · deterministic `error_make_http_failure` JSON |

### Critical response rules (070b v4.2 gate)

Make **must not** return:

- Generic `Accepted` or `Success` text only
- HTTP status without Lambda JSON body
- Make bundle metadata as the webhook response body
- Wrapped JSON where `actionOut` is not at the top level (API Gateway `{ "body": "..." }` unwrap is OK — 070b parser handles it)

**Approved success examples:**

| Path | Required top-level keys |
|------|-------------------------|
| Upload | `statusOut=success` · `actionOut=uploaded` · `writebackVerification.allPass=true` |
| Idempotency | `statusOut=skipped` · `actionOut=skipped_already_uploaded` |

---

## 4. Request body shape (module 1 → module 3)

Exact payload 070b sends (video slice):

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

Module 3 must forward this JSON **unchanged** to Lambda.

---

## 5. Mike build checklist

| Step | Action | Done |
|------|--------|------|
| 1 | Create scenario **`Shooting Challenge - GAME - Upload Engine - Lambda - v1`** | [x] |
| 2 | Configure scenario runtime values | [x] (upload secret rotation required) |
| 3 | Module 1 webhook saved to local ops | [x] |
| 4 | Router filter `070b` + `video_feedback` | [x] |
| 5 | HTTP POST + secret header + 120 s timeout | [x] |
| 6 | Complete Lambda JSON returned, including structured errors | [x] |
| 7 | Manual smoke with 070b OFF | [x] |
| 8 | Sanitized blueprint committed | [x] |
| 9 | Rotate exposed upload secret and re-smoke | [ ] |
| 10 | Controlled Airtable-triggered Schmidt test | [ ] |

**Do not** add Amazon S3 Upload module. Lambda owns S3.

---

## 6. Manual Make smoke test (070b OFF)

**Fixture only:** Submission Asset `recGQ8EjAMz3bEBiW` · Enrollment `recgP9qZYjAhE7NXm` (Schmidt Testing).

**Bypasses automation 070b** — direct POST to Make webhook.

```powershell
cd tools/airtable
python c013_prod_make_smoke_run.py preflight
python c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW --reset
```

Or step-by-step:

```powershell
python c013_prod_make_smoke_run.py upload --asset-id recGQ8EjAMz3bEBiW --reset
python c013_prod_make_smoke_run.py idempotency --asset-id recGQ8EjAMz3bEBiW
python c013_prod_make_smoke_run.py invalid-route --asset-id recGQ8EjAMz3bEBiW
$env:WAVE7_PROBE_BASE = "appn84sqPw03zEbTT"
python _probe_c013_asset_storage_fields.py --record-id recGQ8EjAMz3bEBiW --out _preview/c013-prod-make-smoke-verify.json
```

### Pass criteria

| Test | Expected |
|------|----------|
| Preflight | Enrollment guard PASS · fixture linked to Schmidt Testing only |
| Upload | Make receives request · route filter matches · Lambda called · secret accepted · complete Lambda JSON returned · `actionOut=uploaded` · `writebackVerification.allPass=true` |
| Airtable | Probe `allPass=true` on `recGQ8EjAMz3bEBiW` |
| S3 | Object under `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/` |
| Idempotency | Repeat POST → `skipped_already_uploaded` · no duplicate S3 object |
| Invalid route | `routeKey=not_a_route` → `error_invalid_route` · complete Lambda JSON returned · Upload Status=`Error` expected · canonical URL/storage key/hash unchanged |
| Isolation | **No live athlete record touched** |

Save redacted results to `tools/airtable/_preview/c013-prod-make-smoke-*.json` (local only).

---

## 7. Rollback

| Layer | Action |
|-------|--------|
| Make scenario | **OFF** |
| 070b / 070a | **OFF** |
| Lambda | Reserved concurrency 0 if needed (`127si-upload-asset`) |
| Secrets | Rotate if exposed |
| Fixture | Reset Schmidt Testing asset only — see [C-013-prod-smoke-test-2026-07-11.md](./C-013-prod-smoke-test-2026-07-11.md) |

---

## 8. GO / NO-GO

| Gate | Status |
|------|--------|
| PROD Lambda direct smoke | **PASS** |
| Make scenario package in GitHub | **PASS** |
| Make scenario built in UI | **PASS** |
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | **CONFIGURED** (local only) |
| Manual Make webhook smoke | **PASS** (`overallPass=true`) |
| 070b script paste artifact | **READY** — [C-013-prod-070b-script-paste-v4.2.txt](./C-013-prod-070b-script-paste-v4.2.txt) |
| 070b live automation configured | **PENDING** (Mike UI) |
| 070b enabled | **NO** (correct) |

**GO for controlled 070b enable test:** **CONDITIONAL GO** after required secret rotation/re-smoke, UI verification, isolation view, and Mike approval.

---

## 9. Remaining blockers

1. Rotate the exposed upload secret in AWS Lambda, Make header, and local env
2. Re-run manual Make smoke
3. Paste/verify 070b v4.2 + inputs in Airtable builder (**automation OFF**)
4. Create/verify isolation view
5. Mike explicitly approves and runs one controlled 070b Schmidt test

---

## 10. Production v2 estimate

**~92%** — PROD Lambda and Make manual route PASS; repository package complete. Secret rotation + Airtable-triggered 070b Schmidt test remain.

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-prod-070b-ui-verification-2026-07-11.md](./C-013-prod-070b-ui-verification-2026-07-11.md) | Airtable builder + isolation view |
| [C-013-prod-smoke-test-2026-07-11.md](./C-013-prod-smoke-test-2026-07-11.md) | Full smoke matrix |
| [C-013-prod-make-deployment-2026-07-11.md](./C-013-prod-make-deployment-2026-07-11.md) | Earlier deployment record |
