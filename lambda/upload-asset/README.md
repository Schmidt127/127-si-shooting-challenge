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
| `ALLOW_ROUTE_KEYS` | `video_feedback` |
| `SEASON_SLUG` | `2026-2027` |
| `CHALLENGE_SLUG` | `shooting-challenge` |

**Note:** Do not set `AWS_REGION` in Lambda env (reserved). Region = `us-east-2` on the function.

## Make integration (not enabled yet)

Scenario: `Shooting Challenge - DEV - Upload Engine - Lambda - v1`

```text
Webhook → Router (070b, video_feedback) → HTTP POST Lambda Function URL → 200
```

**070a / 070b:** OFF until Mike approves after Lambda direct test PASS.
