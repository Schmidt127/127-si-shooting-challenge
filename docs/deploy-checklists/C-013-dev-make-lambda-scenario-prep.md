# C-013 — DEV Make Lambda scenario prep (orchestration only)

**Date:** 2026-07-09  
**Status:** **PREP ONLY** — create scenario in Make UI; **do not enable 070b** until manual Make test PASS  
**Parents:** [C-013-make-upload-migration-plan.md](./C-013-make-upload-migration-plan.md) · [C-013-dev-lambda-deploy-and-url-test.md](./C-013-dev-lambda-deploy-and-url-test.md)

**Hard stops:** DEV only · **070a / 070b OFF** · no Production Airtable/web · secrets **not in GitHub**

---

## Prerequisites (complete before Make)

| Gate | Status |
|------|--------|
| Lambda code deploy (Phase A) | PASS |
| Function URL B1–B4 HTTP POST | PASS |
| **C-013-SEC** webhook secret rotated | Required — `UPLOAD_WEBHOOK_SECRET` in local `.env` matches Lambda |
| Airtable PAT rotated (exposed token revoked) | Mike — [airtable.com/create/tokens](https://airtable.com/create/tokens) → `--new-token-file .env.new-token` on rotation script |
| `LAMBDA_FUNCTION_URL` in `tools/airtable/.env` | Local only |

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
| Headers | `X-Upload-Secret: <UPLOAD_WEBHOOK_SECRET>` — store in Make **scenario variable** or connection secret; **not in blueprint commit** |

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
2. Copy webhook JSON shape from DEV **070b** docblock / prior Make tests
3. Make **Run once** → module 3 POST → expect **200**
4. Verify: `python _probe_c013_asset_storage_fields.py --record-id <assetId>` → `allPass=true`

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
| [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md) | Lambda deploy |
