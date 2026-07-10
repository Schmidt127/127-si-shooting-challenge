# C-013 — DEV Make Lambda scenario prep (orchestration only)

**Date:** 2026-07-09  
**Status:** **Stage 4D-R Part A PASS** · **Part B BLOCKED** (070b auto-upload path) · Parts **C/D/E/F PASS** (see § Stage 4D).
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
| **Manual Make webhook test** | **PASS (4D-R Part A)** — Module 16 returns Lambda JSON; see § Stage 4D |

---

## Pass record — Make manual webhook (2026-07-10)

| Item | Value |
|------|--------|
| **Asset** | `recthL2wrTha5nWHL` |
| **C-020 scenario** | `recTqAXWshNR3b0c1` |
| **Submission** | `recW6YsJNnY1qXJOX` |
| **Video Feedback** | `recNinD0IlztL5z26` |
| **Make HTTP** | **200** — webhook response body was **`Accepted` only** (Lambda JSON not returned to caller); upload still completed via Module 3 async path |
| **Probe** | `allPass=true` · Upload Status **Uploaded** · C-013/C-023 fields populated · attachment retained · Writeback Complete? **1** |
| **Artifacts** | `tools/airtable/_preview/c013-dev-make-webhook-recthL2wrTha5nWHL.json` · `...-verify.json` |
| **Helper** | `tools/airtable/c013_dev_make_webhook_post.py` |

**070b:** **OFF** post controlled hybrid PASS — not approved for continuous operation. Production promotion: [plan](./C-013-production-promotion-plan.md) documented — **not started**.

---

## Stage 4D — Make path + claim proof (2026-07-10)

**Git checkpoint:** `5cada82` · **070a/070b OFF** · Production untouched.

### Scenario identity (documented — not modified)

| Item | Value |
|------|--------|
| **Name** | `Shooting Challenge - DEV - Upload Engine - Lambda - v1` |
| **Module 1** | Custom webhook (070b JSON in) |
| **Module 2** | Router — `automationNumber = 070b` AND `routeKey = video_feedback` |
| **Module 3** | HTTP POST → DEV Lambda Function URL + `X-Upload-Secret` header |
| **Module 4** | Router — HTTP 2xx vs error |
| **Module 5** | Webhook response — **must map Lambda HTTP body** to response (not generic `Accepted`) |

**Scenario ID:** stored in local ops notes only (not GitHub).

### Part A — Make-only (4D-R) — **PASS** (2026-07-10)

| Item | Value |
|------|--------|
| **Asset** | `recRwPpHiii5n4m6Q` (reset to `Pending Link` for Make-only POST) |
| **Make HTTP** | **200** — full Lambda JSON (**5330** bytes), not `Accepted` |
| **Lambda fields** | `statusOut=success` · `actionOut=uploaded` · `allPass=true` · `claimActionOut=claim_acquired` |
| **Module mapping** | Module **16** body = Module **14** Data (Mike fix confirmed) |
| **Artifact** | `tools/airtable/_preview/c013-dev-4dr-partA-recRwPpHiii5n4m6Q.json` (local) |

### Part B — 070b end-to-end (4D-R) — **BLOCKED** (2026-07-10)

**Stopped per failure gate:** fresh assets do **not** remain `Pending Link` for 30s while Make/070a reportedly OFF.

| Attempt | Asset | Finding |
|---------|-------|---------|
| 1 | `rec4JbHs65LbkhPBO` | First poll `Uploaded`; reset → re-upload in **5.5s** (`Send to Make Trigger` null) |
| 2 | `recThdj2Q4u651poh` | First poll `Uploaded`; reset → re-upload in **5.6s** (`Send to Make Trigger` null) |

**Active path (most likely):** DEV **070b ON** — automation fires on video-ready / `Pending Link` intake (013 chain). GitHub 070b script does **not** check `Send to Make Trigger` in code (relies on Airtable trigger UI).

**Remediation:** Confirm **070b OFF** in UI → 30s stability → sole qualifier → Mike enables 070b for one run → disable immediately.

**070b v4.2:** GitHub `c0f91d3` confirmed (no `Processing` write on success; Lambda JSON validation). **Mike UI paste:** pending explicit confirmation.

### Part D — Claim collision — **PASS**

| Item | Value |
|------|--------|
| **Asset** | `recbjubFiO5xqZFvw` |
| **Winner** | `2622882a-4500-44ac-82b3-1c66d6bc0d73` → `uploaded` / `claim_acquired` |
| **Loser** | `112baaaf-a984-419d-aa0b-0f0237eb81e0` → `skipped_concurrent_upload` |
| **S3 objects** | **1** |

**Artifact:** `tools/airtable/_preview/c013-dev-4d-partD-concurrent-recbjubFiO5xqZFvw.json`

### Part E — Stale claim — **PASS**

| Item | Value |
|------|--------|
| **Asset** | `recMLMjuPcpjOjY94` |
| **Prep** | `Processing` + legacy claim + `Processing Started At` 35 min ago |
| **Result** | `stale_claim`; no upload; no reset; legacy claim retained |

**Artifact:** `tools/airtable/_preview/c013-dev-4d-partE-stale-recMLMjuPcpjOjY94.json`

### Part C / F — Unit tests — **PASS**

- Node `upload-make-lambda-response.test.js` → **10/10**
- Python lambda tests → **31/31**

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
