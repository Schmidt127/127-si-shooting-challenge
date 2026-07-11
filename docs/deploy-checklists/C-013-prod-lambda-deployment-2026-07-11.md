# C-013 — PROD Lambda deployment record

**Date:** 2026-07-11  
**Status:** **DEPLOYED** · direct smoke **PASS** · Make manual route **PASS** · **070b OFF**
**Parent:** [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md)

---

## Deployment summary

| Item | Value |
|------|--------|
| **AWS account** | `021891587263` |
| **Region** | `us-east-2` |
| **Function name** | `127si-upload-asset` |
| **Function ARN** | `arn:aws:lambda:us-east-2:021891587263:function:127si-upload-asset` |
| **Runtime** | `python3.12` |
| **Handler** | `handler.lambda_handler` |
| **Memory** | 512 MB |
| **Timeout** | 120 s |
| **Architecture** | `x86_64` |
| **Code SHA-256** | `o6DD1Fpp3YAzw/ebb8aBZV3/bR871PrBSdv3Pz23zGQ=` |
| **Last modified** | `2026-07-11T14:17:47Z` |
| **Repo commit (deploy source)** | `01cc16d` + smoke-session fixes on branch |
| **Deploy script** | `lambda/upload-asset/deploy-prod.ps1` |

---

## IAM role

| Item | Value |
|------|--------|
| **Role name** | `127si-upload-asset-role` |
| **Role ARN** | `arn:aws:iam::021891587263:role/127si-upload-asset-role` |
| **Trust** | `lambda.amazonaws.com` |
| **Inline policy** | `127si-upload-asset-role-s3-inline` (`iam-policy-prod.json`) |
| **Managed policy** | `AWSLambdaBasicExecutionRole` |

**Allowed S3 actions:** `PutObject`, `GetObject`, `HeadObject` on `arn:aws:s3:::shooting-challenge-assets/*`; `ListBucket` on bucket.

**Not granted:** `s3:DeleteObject`, admin, unrelated buckets.

---

## Lambda environment (names only)

| Variable | Status |
|----------|--------|
| `AIRTABLE_BASE_ID` | CONFIGURED (`appn84sqPw03zEbTT`) |
| `AIRTABLE_TOKEN` / `AIRTABLE_API_TOKEN` | CONFIGURED (PROD PAT — ops only) |
| `S3_BUCKET` | CONFIGURED |
| `ENVIRONMENT` | CONFIGURED (`PROD`) |
| `ALLOW_ROUTE_KEYS` | CONFIGURED (`video_feedback`) |
| `SEASON_SLUG` | CONFIGURED (`2025-2026`) |
| `CHALLENGE_SLUG` | CONFIGURED (`shooting-challenge`) |
| `UPLOAD_WEBHOOK_SECRET` | CONFIGURED (new PROD value — ops only) |

**Secret source:** `AIRTABLE_PROD_TOKEN` from `web/.env.local` at deploy time; new `UPLOAD_WEBHOOK_SECRET_PROD` generated for PROD (not reused from DEV).

---

## Function URL

| Item | Value |
|------|--------|
| **Auth type** | `NONE` (application auth via `X-Upload-Secret` in handler) |
| **URL** | **CONFIGURED** — stored in local ops notes / `tools/airtable/_preview/c013-prod-deploy-session.local.json` (gitignored) |
| **Resource policy** | `FunctionUrlAllowPublic` (`lambda:InvokeFunctionUrl`) + `AllowPublicInvokeFunction` (`lambda:InvokeFunction`) |

**Note:** Initial HTTP tests returned **403** until `lambda:InvokeFunction` public permission was added. `deploy-prod.ps1` now adds both permissions.

---

## Smoke test fixture (Schmidt Testing only)

| Item | Value |
|------|--------|
| **Enrollment** | `recgP9qZYjAhE7NXm` |
| **Submission Asset** | `recGQ8EjAMz3bEBiW` |
| **Video Feedback** | `recrvEzk8GxXfy3EE` |
| **Submission** | `recM0GbWfptu06da1` |
| **Label** | C-013 PROD Lambda Smoke Test |

---

## Test results (summary)

| Test | Result |
|------|--------|
| Missing `X-Upload-Secret` | **PASS** (401) |
| Wrong secret | **PASS** (401) |
| Unsupported route | **PASS** (400) |
| Direct upload | **PASS** (`actionOut=uploaded`, `allPass=true`) |
| S3 object | **PASS** (`2025-2026` prefix, `image/png`, 67730 bytes) |
| Airtable writeback probe | **PASS** (`allPass=true`) |
| Idempotency | **PASS** (`skipped_already_uploaded`) |
| Error writeback | **PASS** (`error_missing_attachment` → Upload Status Error) |

Full machine-readable summary: [C-013-prod-lambda-smoke-result-2026-07-11.json](../audits/C-013-prod-lambda-smoke-result-2026-07-11.json)

---

## Rollback

1. **070b OFF** · **070a OFF** (unchanged)
2. Make Production upload scenario **OFF** (not built yet)
3. Throttle Lambda:  
   `aws lambda put-function-concurrency --function-name 127si-upload-asset --reserved-concurrent-executions 0 --region us-east-2`
4. Code rollback: redeploy prior zip by `CodeSha256` from AWS console versions
5. Fixture reset: set Schmidt Testing asset `recGQ8EjAMz3bEBiW` to `Pending Link` or delete test rows only

**Test S3 object retention:** Keep under `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/` for audit; delete only Schmidt Testing fixture objects when Mike approves.

---

## Make PROD package (not activated)

See smoke-result doc § Make configuration. Scenario name: **`Shooting Challenge - GAME - Upload Engine - Lambda - v1`** · remains **OFF**.

---

## Next step

Rotate exposed PROD upload secret in AWS Lambda + Make + local env → re-run auth and manual Make smoke → paste/verify **070b v4.2** (automation **OFF**) + isolation view → Mike approval → one controlled **070b** Schmidt test → leave **070b/Make** in Mike-approved final states.
