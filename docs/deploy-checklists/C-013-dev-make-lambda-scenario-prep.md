# C-013 — DEV Make Lambda scenario prep (orchestration only)

**Date:** 2026-07-09  
**Status:** **Make manual webhook PASS (2026-07-10)** — `recthL2wrTha5nWHL` via `Shooting Challenge - DEV - Upload Engine - Lambda - v1`. **070b hybrid controlled test PASS (2026-07-09)** on `recF86pJTIMFoEypJ`. **070b / 070a OFF** post-test — not approved for continuous operation.
**Parents:** [C-013-make-upload-migration-plan.md](./C-013-make-upload-migration-plan.md) · [C-013-dev-lambda-deploy-and-url-test.md](./C-013-dev-lambda-deploy-and-url-test.md)

**Hard stops:** DEV only · **070a / 070b OFF** · no Production Airtable/web · secrets **not in GitHub**

---

## Prerequisites (complete before Make)

| Gate | Status |
|------|--------|
| Lambda code deploy (Phase A) | **PASS** |
| Function URL B1–B4 HTTP POST | **PASS** |
| **C-013-SEC** PAT + webhook secret rotated | **PASS** (2026-07-09) |
| Exposed PAT revoked in Airtable UI | **PASS** (Mike) |
| `LAMBDA_FUNCTION_URL` + `UPLOAD_WEBHOOK_SECRET` in `tools/airtable/.env` | Local only |
| **Manual Make webhook test** | **PASS** (2026-07-10) — see § Pass record |

---

## Pass record — Make manual webhook (2026-07-10)

| Item | Value |
|------|--------|
| **Asset** | `recthL2wrTha5nWHL` |
| **C-020 scenario** | `recTqAXWshNR3b0c1` |
| **Submission** | `recW6YsJNnY1qXJOX` |
| **Video Feedback** | `recNinD0IlztL5z26` |
| **Make HTTP** | **200** · `statusOut=success` · `actionOut=uploaded` · `runtime=lambda` · `environment=DEV` |
| **Probe** | `allPass=true` · Upload Status **Uploaded** · C-013/C-023 fields populated · attachment retained · Writeback Complete? **1** |
| **Artifacts** | `tools/airtable/_preview/c013-dev-make-webhook-recthL2wrTha5nWHL.json` · `...-verify.json` |
| **Helper** | `tools/airtable/c013_dev_make_webhook_post.py` |

**070b:** **OFF** post controlled hybrid PASS — not approved for continuous operation. Production promotion: [plan](./C-013-production-promotion-plan.md) documented — **not started**.

---

## Mike checklist — create scenario in Make UI

**070b stays OFF.** Build scenario only; test with **Run once**.

| Step | Action | Done |
|------|--------|------|
| 1 | Make → **Create scenario** → name **`Shooting Challenge - DEV - Upload Engine - Lambda - v1`** | ✅ |
| 2 | Module **1** — **Webhooks → Custom webhook** → copy webhook URL to **local ops notes only** (not GitHub) | ✅ |
| 3 | Module **2** — **Router** — route when `automationNumber` = `070b` **AND** `routeKey` = `video_feedback` | ✅ |
| 4 | Module **3** — **HTTP → Make a request** — see § Module 3 below | ✅ |
| 5 | Module **4** — **Router** — success when HTTP status **200–299** | ✅ |
| 6 | Module **5** — **Webhooks → Webhook response** — status **200** on success branch | ✅ |
| 7 | Save scenario **OFF** (no scheduling) | ✅ |
| 8 | H2 fresh asset: `python c013_dev_h2_video_run.py --confirm-write --prepare-only` then `--poll-only` | ✅ |
| 9 | **Run once** + `python c013_dev_make_webhook_post.py <assetId> ...` | ✅ |
| 10 | Probe: `python _probe_c013_asset_storage_fields.py --record-id <assetId>` → `allPass=true` | ✅ |
| 11 | Record Make scenario ID + webhook URL in **local ops notes** | ✅ |

**Do not** paste Make webhook URL into **070b** `makeWebhookUrl` until step 10 PASS + explicit approval.

---

## Sample webhook JSON (Run once — replace asset id)

Use a **fresh** H2 asset with `Upload Status = Pending Link`. Shape matches **070b v4.1** / `c013_dev_lambda_invoke.py`:

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "2026-07-09T23:00:00.000Z",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recREPLACE_WITH_FRESH_ASSET",
  "targetTable": "Video Feedback",
  "targetRecordId": ""
}
```

**Pass (live upload):** HTTP **200**, response `actionOut=uploaded`, `writebackVerification.allPass=true`.

---

## Module 2 — Router filters

| Field | Operator | Value |
|-------|----------|-------|
| `automationNumber` | Equal to | `070b` |
| `routeKey` | Equal to | `video_feedback` |

Homework **070a** route is **out of scope** for this scenario (add later after H1 gate).

---

## Scenario to create

| Item | Value |
|------|--------|
| **Name** | `Shooting Challenge - DEV - Upload Engine - Lambda - v1` |
| **Base** | DEV Airtable `appTetnuCZlCZdTCT` (070b webhook source — **automation still OFF**) |
| **Lambda** | `127si-upload-asset-dev` · `us-east-2` |
| **Function URL** | From local ops notes / `.env` — **never commit** |

**Do not reuse:** `Shooting Challenge - DEV - Upload Engine - S3 - v1` (S3 module abandoned).

---

## Module chain (5 steps)

| # | Module | App | Purpose |
|---|--------|-----|---------|
| **1** | Custom webhook | Webhooks | Receives **070b v4.1** JSON (same shape as Production upload engine) |
| **2** | Router | Flow control | Filter: `automationNumber = 070b` AND `routeKey = video_feedback` |
| **3** | HTTP — Make a request | HTTP | **POST** Lambda Function URL |
| **4** | Router | Flow control | HTTP status 2xx vs error |
| **5** | Webhook response | Webhooks | Return **200** on success path (070b sets `Processing` on 2xx) |

**Removed vs Drive/S3 paths:** Airtable Get Record, HTTP download, hash, S3 upload, Airtable success PATCH — **Lambda owns all of that**.

---

## Module 3 — HTTP POST config

| Setting | Value |
|---------|--------|
| Method | `POST` |
| URL | `LAMBDA_FUNCTION_URL` from local ops notes |
| Body type | Raw / JSON |
| Body | **Map entire webhook JSON** from module 1 (070b payload unchanged) |
| Headers | `Content-Type: application/json` |
| Headers | `X-Upload-Secret: <UPLOAD_WEBHOOK_SECRET>` — copy from **`tools/airtable/.env`** into Make scenario variable; **not in blueprint commit** |

**Make scenario variable (recommended):** create `uploadWebhookSecret` at scenario level; reference in module 3 header. Rotate by updating variable + Lambda env together (`c013_dev_rotate_secrets.py`).

**Required JSON fields (070b slice):** `submissionAssetRecordId`, `routeKey`, `uploadDestination`, `sourceTable`, `targetTable`, `targetRecordId`, `automationNumber`, `sentAtIso`

---

## Module 4 — Success router

| Branch | Condition | Next |
|--------|-----------|------|
| Success | HTTP status 200–299 | Module 5 → respond 200 |
| Error | else | Log `statusOut`, `actionOut`, `errorOut` from response body; **do not** enable 070b |

**Pass criteria in response body:**

| Field | Expected (live upload) | Expected (idempotent re-run) |
|-------|------------------------|--------------------------------|
| `statusOut` | `success` | `skipped` |
| `actionOut` | `uploaded` | `skipped_already_uploaded` |
| `writebackVerification.allPass` | `true` | may be absent on skip |

---

## Manual test (before 070b)

**070b remains OFF.** Test with **Run once** + sample webhook JSON pointing at a **fresh** H2 `Pending Link` asset.

1. H2 harness: `python c013_dev_h2_video_run.py --confirm-write --prepare-only` then `--poll-only`
2. In PowerShell — POST webhook (Make **Run once** must be waiting):

```powershell
cd tools/airtable
# One-time: copy webhook URL from Make module 1 into .env as MAKE_DEV_UPLOAD_WEBHOOK_URL
python c013_dev_make_webhook_post.py <assetId> --scenario-id <scenarioRec> --submission-id <submissionRec>
```

Or pass URL inline (not saved):

```powershell
python c013_dev_make_webhook_post.py <assetId> --webhook-url "https://hook....make.com/..." --scenario-id <scenarioRec>
```

Helper: [`c013_dev_make_webhook_post.py`](../../tools/airtable/c013_dev_make_webhook_post.py) — builds 070b v4.1 JSON, resolves `targetRecordId` from Video Feedback link.

3. Probe after Make green:

**Do not** connect 070b webhook URL to this scenario until manual test PASS + Mike approval.

---

## Explicitly not in this step

| Item | Status |
|------|--------|
| Enable **070b** | **NO** |
| Enable **070a** | **NO** |
| Production Make / Airtable | **NO** |
| Web changes | **NO** |
| Export blueprint with secrets | **NO** — export structure only; redact URL + secret |

---

## After manual Make PASS

1. Document scenario ID + webhook URL in Wave 7 checklist (local ops notes)
2. Enable **070b** on one DEV asset (separate approval)
3. Production promotion — separate checklist + `docs/deploy-checklists/` entry

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-make-upload-migration-plan.md](./C-013-make-upload-migration-plan.md) | Full migration architecture |
| [C-013-dev-lambda-upload-plan.md](./C-013-dev-lambda-upload-plan.md) | Lambda request/response contract |
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | 070b enable prep (**after** Make manual PASS) |
| [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md) | Lambda deploy |
