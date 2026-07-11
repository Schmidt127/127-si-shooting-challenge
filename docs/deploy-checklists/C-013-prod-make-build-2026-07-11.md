# C-013 — PROD Make scenario build specification

**Date:** 2026-07-11  
**Scenario name:** `Shooting Challenge - GAME - Upload Engine - Lambda - v1`  
**Initial state:** **OFF** (no scheduling)  
**070b / 070a:** **OFF** — unchanged until manual smoke PASS + Mike approval  
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
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | Module 1 Custom webhook URL — for smoke scripts + 070b `makeWebhookUrl` input | **MISSING** (save to ops after build) |

Store values in `tools/airtable/_preview/c013-prod-deploy-session.local.json` (gitignored). **Never commit.**

---

## 3. Module sequence (exact)

| # | App / module | Configuration |
|---|--------------|---------------|
| **1** | **Webhooks → Custom webhook** | Receives 070b v4.2 minimal JSON. Copy webhook URL to ops as `MAKE_UPLOAD_WEBHOOK_URL_PROD`. |
| **2** | **Flow control → Router** | **Filter (both required):** `automationNumber` **equal** `070b` · `routeKey` **equal** `video_feedback`. Reject all other routes in first PROD slice. |
| **3** | **HTTP → Make a request** | **Method:** POST · **URL:** `{{LAMBDA_FUNCTION_URL_PROD}}` · **Headers:** `Content-Type: application/json` · `X-Upload-Secret: {{UPLOAD_WEBHOOK_SECRET_PROD}}` · **Body:** entire JSON from module 1 (unchanged) · **Timeout:** **120 s** |
| **4** | **Flow control → Router** | Branch A: HTTP status 200–299 · Branch B: else (4xx/5xx/timeout) |
| **5** | **Webhooks → Webhook response** (success branch) | Status **200** · Body = **complete Lambda JSON** from module 3 response (parsed `Data` / body — top-level `actionOut`, `statusOut`, `writebackVerification`) |
| **6** | **Webhooks → Webhook response** (failure branch) | Status **502** · Body = deterministic JSON e.g. `{"statusOut":"error","actionOut":"error_make_http_failure","errorOut":"..."}` |

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
| 1 | Create scenario **`Shooting Challenge - GAME - Upload Engine - Lambda - v1`** | [ ] |
| 2 | Add scenario variables `LAMBDA_FUNCTION_URL_PROD`, `UPLOAD_WEBHOOK_SECRET_PROD` | [ ] |
| 3 | Module 1 Custom webhook — save URL to ops (`MAKE_UPLOAD_WEBHOOK_URL_PROD`) | [ ] |
| 4 | Module 2 Router — filter `070b` + `video_feedback` | [ ] |
| 5 | Module 3 HTTP POST — secret header, 120 s timeout, body = module 1 JSON | [ ] |
| 6 | Modules 4–6 — success returns **complete Lambda JSON**, not generic acknowledgement | [ ] |
| 7 | Save scenario **OFF** | [ ] |
| 8 | Add webhook URL to `c013-prod-deploy-session.local.json` | [ ] |
| 9 | Run manual smoke (below) — **070b stays OFF** | [ ] |
| 10 | Leave scenario **OFF** until controlled 070b window | [ ] |

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
python _probe_c013_asset_storage_fields.py --base-id appn84sqPw03zEbTT --record-id recGQ8EjAMz3bEBiW --out _preview/c013-prod-make-smoke-verify.json
```

### Pass criteria

| Test | Expected |
|------|----------|
| Preflight | Enrollment guard PASS · fixture linked to Schmidt Testing only |
| Upload | Make receives request · route filter matches · Lambda called · secret accepted · complete Lambda JSON returned · `actionOut=uploaded` · `writebackVerification.allPass=true` |
| Airtable | Probe `allPass=true` on `recGQ8EjAMz3bEBiW` |
| S3 | Object under `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/` |
| Idempotency | Repeat POST → `skipped_already_uploaded` · no duplicate S3 object |
| Invalid route | `routeKey=not_a_route` → rejected · no Airtable/S3 change on fixture |
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
| Make scenario built in UI | **PENDING** (Mike) |
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | **MISSING** |
| Manual Make webhook smoke | **NOT RUN** |
| 070b script paste artifact | **READY** — [C-013-prod-070b-script-paste-v4.2.txt](./C-013-prod-070b-script-paste-v4.2.txt) |
| 070b live automation configured | **PENDING** (Mike UI) |
| 070b enabled | **NO** (correct) |

**GO for controlled 070b enable test:** **NO-GO** until Make manual smoke PASS.

---

## 9. Remaining blockers

1. Build Make scenario in UI (this doc §5)
2. Save `MAKE_UPLOAD_WEBHOOK_URL_PROD` to ops session file
3. Run manual Make smoke on `recGQ8EjAMz3bEBiW`
4. Paste 070b v4.2 + configure inputs in Airtable builder (**automation OFF**) — [C-013-prod-070b-ui-verification-2026-07-11.md](./C-013-prod-070b-ui-verification-2026-07-11.md)
5. Create isolation view — same doc §6
6. Mike explicit approval for one controlled 070b enable test

---

## 10. Production v2 estimate

**~82%** — PROD Lambda smoke PASS; Make + 070b configuration package complete in GitHub; Make runtime smoke + live 070b UI paste + controlled enable remain.

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-prod-070b-ui-verification-2026-07-11.md](./C-013-prod-070b-ui-verification-2026-07-11.md) | Airtable builder + isolation view |
| [C-013-prod-smoke-test-2026-07-11.md](./C-013-prod-smoke-test-2026-07-11.md) | Full smoke matrix |
| [C-013-prod-make-deployment-2026-07-11.md](./C-013-prod-make-deployment-2026-07-11.md) | Earlier deployment record |
