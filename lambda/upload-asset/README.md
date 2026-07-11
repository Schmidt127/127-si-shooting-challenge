# DEV Lambda — asset upload (C-013 / C-023)

**Function name:** `127si-dev-shooting-challenge-asset-upload`  
**Architecture:** Airtable 070b payload → Make (later) → **this Lambda** → S3 → Airtable writeback

## Layout

```text
lambda/upload-asset/
  handler.py           # Lambda entry
  upload_core/         # Shared logic (ported from c013_dev_s3_upload_proof.py)
  tests/
  deploy.ps1
  iam-policy-dev.json
```

## Local test (no AWS deploy)

```powershell
cd lambda/upload-asset
python -m unittest discover -s tests -p "test_*.py" -v
```

**Stage 2A/2B (2026-07-10):** Lambda-owned upload claim (`upload_core/upload_claim.py`) and contextual asset-reuse review (`upload_core/duplicate.py`) — **38+ unit tests PASS**. Homework route (`homework_completion` / **070a**) added 2026-07-10 for H3e.

Legacy path helpers and DEV invoke (requires env; not part of unit tests):

```powershell
python tests/test_core.py

cd ../../tools/airtable
python c013_dev_h2_video_run.py --confirm-write --prepare-only
python c013_dev_lambda_invoke.py <assetId> --out _preview/c013-dev-lambda-h2-proof-<assetId>.json
python _probe_c013_asset_storage_fields.py --record-id <assetId> --out tools/airtable/_preview/c013-dev-lambda-h2-proof-<assetId>-verify.json
```

## Deploy (DEV)

See [DEPLOY.md](./DEPLOY.md). Summary:

```powershell
cd lambda/upload-asset
.\deploy.ps1
```

## Environment variables (Lambda console / deploy script)

| Variable | Value |
|----------|--------|
| `AIRTABLE_BASE_ID` | `appTetnuCZlCZdTCT` |
| `AIRTABLE_API_TOKEN` | *(Secrets Manager or env — not in Git)* |
| `AIRTABLE_TOKEN` | Same PAT (alias) |
| `S3_BUCKET` | `shooting-challenge-assets` |
| `ENVIRONMENT` | `DEV` |
| `ALLOW_ROUTE_KEYS` | `video_feedback,homework_completion` |
| `SEASON_SLUG` | `2026-2027` |
| `CHALLENGE_SLUG` | `shooting-challenge` |
| `UPLOAD_WEBHOOK_SECRET` | Random string (secret — Lambda env + Make header only) |

**Note:** Do not set `AWS_REGION` in Lambda env (reserved). Region = `us-east-2` on the function. **`X-Upload-Secret` required** on every request when `UPLOAD_WEBHOOK_SECRET` is set.

## Make integration (DEV)

Scenario: `Shooting Challenge - DEV - Upload Engine - Lambda - v1`

```text
Webhook → Router
  (070b + video_feedback) OR (070a + homework_completion)
  → HTTP POST Lambda Function URL → complete Lambda JSON
```

Blueprint: [upload-asset-engine-lambda-dev-v1.template.json](../../make/blueprints/upload-asset-engine-lambda-dev-v1.template.json)  
Homework runbook: [C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md)

**070a / 070b:** OFF until Mike approves after Make manual webhook PASS.
