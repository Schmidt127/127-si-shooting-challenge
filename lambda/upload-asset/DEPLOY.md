# DEV Lambda deployment — `127si-upload-asset-dev`

**Status:** AWS **shell complete** (2026-07-08). **Code deploy + Function URL test** — [C-013-dev-lambda-deploy-and-url-test.md](../../docs/deploy-checklists/C-013-dev-lambda-deploy-and-url-test.md) (**awaiting Mike approval**).

**Hard stops:** DEV only. Production untouched. **070a / 070b OFF.** No Make changes in deploy slice.

## AWS shell (live)

| Item | Value |
|------|--------|
| Function | `127si-upload-asset-dev` |
| Region | `us-east-2` |
| Role | `127si-upload-asset-dev-role-syfw0dzs` |
| S3 | `shooting-challenge-assets` (`PutObject` / `GetObject` / `HeadObject` / `ListBucket`) |
| Function URL | Auth `NONE` — **`X-Upload-Secret` validated in handler** — URL in local ops notes only |

> Repo docs previously referenced `127si-dev-shooting-challenge-asset-upload` — use **`127si-upload-asset-dev`** for deploy/invoke.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| AWS CLI | Principal with `lambda:UpdateFunctionCode` on `127si-upload-asset-dev` |
| Local `.env` | `tools/airtable/.env` — `UPLOAD_WEBHOOK_SECRET`, optional `LAMBDA_FUNCTION_URL` (**not committed**) |

## Deploy code (recommended — shell already exists)

```powershell
cd lambda/upload-asset
$env:AWS_PROFILE = $null
.\deploy.ps1 -FunctionName 127si-upload-asset-dev -CodeOnly
```

`-CodeOnly` updates the zip only — does **not** change IAM, Function URL, or Lambda env vars already set in console.

### Sync env from local .env (optional)

```powershell
.\deploy.ps1 -FunctionName 127si-upload-asset-dev -SkipIam
```

### New function from scratch (not needed if shell exists)

```powershell
.\deploy.ps1 -FunctionName 127si-upload-asset-dev -ExistingRoleArn "arn:aws:iam::021891587263:role/127si-upload-asset-dev-role-syfw0dzs"
```

## Environment variables (Lambda console — already set)

See [deploy-and-url-test plan](../../docs/deploy-checklists/C-013-dev-lambda-deploy-and-url-test.md#lambda-environment-already-set-in-aws-console).

**Auth:** Every POST must send `X-Upload-Secret` matching `UPLOAD_WEBHOOK_SECRET`. Missing/invalid → **401**, no Airtable PATCH.

## Post-deploy smoke (Function URL)

Full sequence: [C-013-dev-lambda-deploy-and-url-test.md](../../docs/deploy-checklists/C-013-dev-lambda-deploy-and-url-test.md).

```powershell
cd tools/airtable
python c013_dev_h2_video_run.py --confirm-write --prepare-only
python c013_dev_h2_video_run.py --confirm-write --scenario-id <rec> --poll-only
python c013_dev_lambda_invoke.py <assetId> --function-url --out _preview/c013-dev-lambda-url-proof-<assetId>.json
python _probe_c013_asset_storage_fields.py --record-id <assetId> --out _preview/c013-dev-lambda-url-proof-<assetId>-verify.json
```

## Rollback

```powershell
aws lambda put-function-concurrency --function-name 127si-upload-asset-dev --reserved-concurrent-executions 0 --region us-east-2
```

Keep **070b OFF**.

## Local proof (no AWS)

```powershell
python tools/airtable/c013_dev_lambda_invoke.py <assetId>
```

Uses in-process handler (no Function URL).
