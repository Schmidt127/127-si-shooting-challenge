# Production Lambda deployment — `127si-upload-asset`

**Status:** Production function deployed. Use the production deployment script below for controlled updates.

**Hard stops:** Production only. **070a / 070b OFF.** No Make changes in this deployment procedure.

## AWS shell (live)

| Item | Value |
|------|--------|
| Function | `127si-upload-asset` |
| Region | `us-east-2` |
| Role | `127si-upload-asset-role-syfw0dzs` |
| S3 | `shooting-challenge-assets` (`PutObject` / `GetObject` / `HeadObject` / `ListBucket`) |
| Function URL | Auth `NONE` — **`X-Upload-Secret` validated in handler** — URL in local ops notes only |

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| AWS CLI | Principal with `lambda:UpdateFunctionCode` on `127si-upload-asset` |
| Local `.env` | `tools/airtable/.env` — `UPLOAD_WEBHOOK_SECRET`, optional `LAMBDA_FUNCTION_URL` (**not committed**) |

## Deploy code (recommended — shell already exists)

```powershell
cd lambda/upload-asset
$env:AWS_PROFILE = $null
.\deploy-prod.ps1 -FunctionName 127si-upload-asset -CodeOnly
```

`-CodeOnly` updates the zip only — does **not** change IAM, Function URL, or Lambda env vars already set in console.

### Sync env from local .env (optional)

```powershell
.\deploy-prod.ps1 -FunctionName 127si-upload-asset -SkipIam
```

### New function from scratch (not needed if shell exists)

```powershell
.\deploy-prod.ps1 -FunctionName 127si-upload-asset -ExistingRoleArn "arn:aws:iam::021891587263:role/127si-upload-asset-role-syfw0dzs"
```

## Environment variables (Lambda console — already set)

See [deploy-and-url-test plan](../../docs/deploy-checklists/C-013-production-lambda-deploy-and-url-test.md#lambda-environment-already-set-in-aws-console).

**Auth:** Upload `POST` must send `X-Upload-Secret` matching `UPLOAD_WEBHOOK_SECRET`. Missing/invalid → **401**, no Airtable PATCH.

**Viewer:** `GET /file/{recordId}?token=…` does **not** use `X-Upload-Secret` (token auth). See [SC-150-prod-reviewer-file-links.md](../../docs/deploy-checklists/SC-150-prod-reviewer-file-links.md).

## Post-deploy smoke (Function URL)

Full sequence: [C-013-production-lambda-deploy-and-url-test.md](../../docs/deploy-checklists/C-013-production-lambda-deploy-and-url-test.md).

```powershell
cd tools/airtable
python c013_prod_h2_video_run.py --confirm-write --prepare-only
python c013_prod_h2_video_run.py --confirm-write --scenario-id <rec> --poll-only
python c013_prod_lambda_invoke.py <assetId> --function-url --out _preview/c013-prod-lambda-url-proof-<assetId>.json
python _probe_c013_asset_storage_fields.py --record-id <assetId> --out _preview/c013-prod-lambda-url-proof-<assetId>-verify.json
```

## Rollback

```powershell
aws lambda put-function-concurrency --function-name 127si-upload-asset --reserved-concurrent-executions 0 --region us-east-2
```

Keep **070b OFF**.

## Local proof (no AWS)

```powershell
python tools/airtable/c013_prod_lambda_invoke.py <assetId>
```

Uses in-process handler (no Function URL).
