# C-013 — DEV Make/Lambda homework route (070a / `homework_completion`)

**Date:** 2026-07-11  
**Overnight task:** T2 (Worker B)  
**Status:** **REPO READY** — Make UI patch + live DEV smoke gated on credentials / Mike actions  
**Architecture parent:** [C-013-dev-make-lambda-scenario-prep.md](../../docs/deploy-checklists/C-013-dev-make-lambda-scenario-prep.md) (proven video path)  
**Blueprint:** [upload-asset-engine-lambda-dev-v1.template.json](../blueprints/upload-asset-engine-lambda-dev-v1.template.json)  
**Lambda routes:** `lambda/upload-asset/upload_core/routes.py` (`ROUTE_HOMEWORK_COMPLETION`)

**Hard stops:** DEV only (`appTetnuCZlCZdTCT`) · **070a OFF** until smoke PASS + Mike approval · no PROD Make/AWS/Airtable · no secrets in GitHub · do not edit `070a-*.js` in this task · do not start C-023 implementation

---

## Architecture (mirrors C-013 video)

```text
Airtable 070a (later, OFF now)
  → Make Custom Webhook (module 1)
  → Router: automationNumber=070a AND routeKey=homework_completion
  → HTTP POST DEV Lambda Function URL + X-Upload-Secret
  → Lambda: download → SHA-256 → C-023 flag-only duplicate → S3 → Airtable writeback
  → Make returns complete Lambda JSON (preferred for DEV manual smoke)
```

Same Module 3–6 chain as **video_feedback**. Only Module 2 gains a homework branch (or OR filter).

---

## Route contract

| Field | Homework value | Video value (reference) |
|-------|----------------|-------------------------|
| `automationNumber` | `070a` | `070b` |
| `routeKey` | `homework_completion` | `video_feedback` |
| `uploadDestination` | `Homework Completions` | `Video Feedback` |
| `targetTable` | `Homework Completions` | `Video Feedback` |
| `targetRecordId` | first linked Homework Completions id | first linked Video Feedback id |
| `submissionAssetRecordId` | Submission Assets `rec…` | same |

Lambda rejects mismatched `routeKey` vs asset **Upload Destination**, wrong automation number, or missing Homework Completions link (`error_missing_homework_completion`).

DEV Lambda env must include:

```text
ALLOW_ROUTE_KEYS=video_feedback,homework_completion
```

(`deploy.ps1` already sets this; confirm live function env.)

---

## Sample webhook JSON (Run once)

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070a",
  "sentAtIso": "2026-07-12T04:00:00.000Z",
  "routeKey": "homework_completion",
  "uploadDestination": "Homework Completions",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recREPLACE_WITH_PENDING_HOMEWORK_ASSET",
  "targetTable": "Homework Completions",
  "targetRecordId": "recREPLACE_WITH_HOMEWORK_COMPLETION"
}
```

Sanitized copy: [homework-completion-070a-dev.sample.json](../test-payloads/homework-completion-070a-dev.sample.json)

---

## Mike Make UI checklist (exact)

Existing scenario: **`Shooting Challenge - DEV - Upload Engine - Lambda - v1`**

| Step | Action | Done |
|------|--------|------|
| 1 | Open DEV scenario (do **not** create a PROD scenario) | ☐ |
| 2 | Module 2 Router — **add** branch/filter: `automationNumber` = `070a` **AND** `routeKey` = `homework_completion` | ☐ |
| 3 | Wire homework branch to the **same** Module 3 HTTP POST used by video | ☐ |
| 4 | Confirm Module 3: 120s timeout, parse response ON, return-error-if-fails **OFF**, `X-Upload-Secret` from DEV variable | ☐ |
| 5 | Confirm Module 5 returns **complete Lambda JSON** (not generic Accepted) for manual smoke | ☐ |
| 6 | Save scenario; leave **scheduling OFF**; use **Run once** only | ☐ |
| 7 | Confirm DEV Lambda `ALLOW_ROUTE_KEYS` includes `homework_completion` | ☐ |
| 8 | Store webhook URL in local ops / `tools/airtable/.env` as `MAKE_DEV_UPLOAD_WEBHOOK_URL` — **not GitHub** | ☐ |
| 9 | Run smoke (below) → probe `allPass=true` | ☐ |
| 10 | **Do not** enable Airtable **070a** until step 9 PASS + explicit approval | ☐ |

---

## Smoke tooling (070a OFF)

```powershell
cd tools/airtable
# Requires local .env: AIRTABLE_TOKEN, MAKE_DEV_UPLOAD_WEBHOOK_URL, UPLOAD_WEBHOOK_SECRET, optional LAMBDA_FUNCTION_URL

# A) Direct Lambda Function URL (bypasses Make) — proves homework route key
python c013_dev_lambda_invoke.py <homeworkAssetId> --target-record-id <hcRecId> --function-url $env:LAMBDA_FUNCTION_URL

# B) Make webhook (Run once waiting) — proves Make router + Lambda
python c013_dev_make_homework_webhook_post.py <homeworkAssetId>

# C) Orchestrated DEV smoke (prepare Pending Link homework asset when --confirm-write)
python c013_dev_h1_homework_smoke.py preflight
python c013_dev_h1_homework_smoke.py make-webhook --asset-id <id>   # or --prepare --confirm-write
```

Pass criteria:

| Check | Expected |
|-------|----------|
| HTTP | 200 |
| `actionOut` | `uploaded` (or `skipped_already_uploaded` on re-run) |
| `routeKey` | `homework_completion` |
| `automationNumber` | `070a` |
| Probe | `_probe_c013_asset_storage_fields.py` → `allPass=true` |
| Attachment | **Retained** |
| Drive fields | Untouched |

---

## Explicitly out of scope (T2)

| Item | Status |
|------|--------|
| Edit `070a-*.js` | **NO** (Worker A lock) |
| Enable Airtable 070a | **NO** until Mike approval |
| PROD Make / Lambda / Airtable | **NO** |
| C-023 implementation | **NO** |
| Delete S3 objects / attachments / records | **NO** |

---

## Related

| Doc | Topic |
|-----|-------|
| [C-013-dev-070a-make-lambda-homework-route.md](../../docs/deploy-checklists/C-013-dev-070a-make-lambda-homework-route.md) | Deploy checklist |
| [C-013-prod-upload-engine-lambda-runbook.md](./C-013-prod-upload-engine-lambda-runbook.md) | PROD video reference (do not copy secrets) |
| [upload-asset-engine-lambda-prod-v1.template.json](../blueprints/upload-asset-engine-lambda-prod-v1.template.json) | PROD video-only template |
