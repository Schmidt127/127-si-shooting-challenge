# DEV Lambda deployment — `127si-dev-shooting-challenge-asset-upload`

**Status:** Code **implemented** + **local handler PASS** (2026-07-08). **AWS deploy blocked** on this machine — IAM user `127si-program-storage-uploader` lacks `lambda:*` and `iam:CreateRole`. Use an admin principal for first deploy.

**Hard stops:** DEV only. Production untouched. **070a / 070b OFF.**

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| AWS CLI | Account `021891587263`, region `us-east-2` |
| Deploy principal | `lambda:CreateFunction`, `lambda:UpdateFunction*`, `lambda:CreateFunctionUrlConfig`, `iam:CreateRole` (first time) |
| Airtable PAT | In `tools/airtable/.env` as `AIRTABLE_TOKEN` or `AIRTABLE_API_TOKEN` (deploy script reads locally; **not committed**) |

## Deploy

```powershell
cd lambda/upload-asset
$env:AWS_PROFILE = $null   # avoid broken profile override
.\deploy.ps1
```

If IAM role already exists (admin created):

```powershell
.\deploy.ps1 -ExistingRoleArn "arn:aws:iam::021891587263:role/127si-dev-shooting-challenge-asset-upload-role"
```

Creates or updates:

- IAM role `127si-dev-shooting-challenge-asset-upload-role` (inline policy from [iam-policy-dev.json](./iam-policy-dev.json))
- Lambda `127si-dev-shooting-challenge-asset-upload` (Python 3.12, 120s, 512MB)
- Function URL (`auth-type` NONE — add `X-Upload-Secret` in Make later)

**Do not set `AWS_REGION` in Lambda environment variables** — reserved by Lambda runtime. Region comes from function config (`us-east-2`).

## Environment variables (Lambda)

| Variable | Value |
|----------|--------|
| `AIRTABLE_BASE_ID` | `appTetnuCZlCZdTCT` |
| `AIRTABLE_API_TOKEN` | PAT (secret) |
| `AIRTABLE_TOKEN` | Same PAT (alias) |
| `S3_BUCKET` | `shooting-challenge-assets` |
| `ENVIRONMENT` | `DEV` |
| `ALLOW_ROUTE_KEYS` | `video_feedback` |
| `SEASON_SLUG` | `2026-2027` |
| `CHALLENGE_SLUG` | `shooting-challenge` |

## IAM (current DEV policy)

See [iam-policy-dev.json](./iam-policy-dev.json).

| Permission | Scope |
|------------|--------|
| `s3:PutObject` | `arn:aws:s3:::shooting-challenge-assets/shooting-challenge/*` |
| `logs:CreateLogGroup`, `CreateLogStream`, `PutLogEvents` | `/aws/lambda/127si-dev-shooting-challenge-asset-upload:*` |

**Tightening follow-up:** Restrict logs to `PutLogEvents` only; move Airtable token to Secrets Manager; add optional `X-Upload-Secret` validation; restrict Function URL by WAF or IAM if Make supports SigV4.

## Post-deploy smoke

```powershell
cd tools/airtable
python c013_dev_h2_video_run.py --confirm-write --prepare-only
python c013_dev_h2_video_run.py --confirm-write --scenario-id <rec> --poll-only
python c013_dev_lambda_invoke.py <assetId> --aws --out _preview/c013-dev-lambda-h2-proof-<assetId>.json
python _probe_c013_asset_storage_fields.py --record-id <assetId> --out _preview/c013-dev-lambda-h2-proof-<assetId>-verify.json
```

## Make scenario (prep — not live-tested until AWS deploy)

**Name:** `Shooting Challenge - DEV - Upload Engine - Lambda - v1`

```text
[1] Custom webhook
[2] Router: automationNumber = 070b AND routeKey = video_feedback
[3] HTTP > Make a request → POST Lambda Function URL (body = webhook JSON)
[4] Webhook response 200
```

**No Amazon S3 Upload module.** Store Function URL in ops notes only — not GitHub.

## Rollback

```powershell
aws lambda put-function-concurrency --function-name 127si-dev-shooting-challenge-asset-upload --reserved-concurrent-executions 0
```

Or disable Make scenario + keep **070b OFF**.

## Local proof (no AWS)

Handler logic verified in-process:

```powershell
python tools/airtable/c013_dev_lambda_invoke.py recLAk8TA4lfbA6eu --out _preview/c013-dev-lambda-h2-proof-recLAk8TA4lfbA6eu.json
```

Artifact: `allPass=true` — [proof](../../tools/airtable/_preview/c013-dev-lambda-h2-proof-recLAk8TA4lfbA6eu.json) · [verify](../../tools/airtable/_preview/c013-dev-lambda-h2-proof-recLAk8TA4lfbA6eu-verify.json).
