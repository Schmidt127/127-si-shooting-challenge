# C-013 — DEV Lambda deploy + direct Function URL test plan

**Date:** 2026-07-08  
**Last updated:** 2026-07-10 — **Stage 4A code-only deploy complete**  
**Status:** **Phase A complete** — code deployed; **no runtime invocation**; Phase B URL test still pending Mike approval  
**Parents:** [C-013-dev-lambda-upload-plan.md](./C-013-dev-lambda-upload-plan.md) · [lambda/upload-asset/DEPLOY.md](../../lambda/upload-asset/DEPLOY.md)

**Hard stops:** DEV only · **070a / 070b OFF** · no Make changes · no Production Airtable/web · Function URL **not in GitHub**

---

## AWS DEV shell (Mike — 2026-07-08)

| Resource | Value |
|----------|--------|
| **Lambda function** | `127si-upload-asset-dev` |
| **Region** | `us-east-2` |
| **Execution role** | `127si-upload-asset-dev-role-syfw0dzs` |
| **S3 policy** | `PutObject`, `GetObject`, `HeadObject` on `arn:aws:s3:::shooting-challenge-assets/*`; `ListBucket` on bucket |
| **Function URL** | Auth `NONE` + resource policy (InvokeFunctionUrl only) — **saved locally** |
| **Repo legacy name** | `127si-dev-shooting-challenge-asset-upload` — superseded by shell above |

### Lambda environment (already set in AWS console)

| Variable | Expected |
|----------|----------|
| `AIRTABLE_BASE_ID` | `appTetnuCZlCZdTCT` |
| `AIRTABLE_TOKEN` | PAT (secret) |
| `S3_BUCKET` | `shooting-challenge-assets` |
| `ENVIRONMENT` | `DEV` |
| `ALLOW_ROUTE_KEYS` | `video_feedback` |
| `SEASON_SLUG` | `2026-2027` |
| `CHALLENGE_SLUG` | `shooting-challenge` |
| `UPLOAD_WEBHOOK_SECRET` | Shared secret (secret) |

**Do not set `AWS_REGION` in Lambda env** (reserved).

### Local-only (tools/airtable/.env — not committed)

```text
UPLOAD_WEBHOOK_SECRET=<same value as Lambda>
LAMBDA_FUNCTION_URL=<Function URL from AWS console>
LAMBDA_FUNCTION_NAME=127si-upload-asset-dev
```

---

## Phase A — Code deploy — **COMPLETE (2026-07-10)**

**Deployed commit:** `8c94475` (`origin/master`)  
**Local tests before deploy:** 31/31 PASS (`python -m unittest discover -s tests -p "test_*.py" -v`)  
**Invocation:** **None** in Stage 4A  
**070a / 070b:** **OFF** — unchanged

| Checkpoint | Pre-deploy | Post-deploy |
|------------|------------|-------------|
| `LastModified` | `2026-07-09T23:13:31Z` | `2026-07-10T11:49:09Z` |
| `CodeSha256` | `0IpfI0pSAvdJaDrg4BsIpPC5dZN+4hCf77v3XWZLRn8=` | `32fweHbTjypwvD3PYwkN53TSwDH1rDjrxLE0/UAppbs=` |
| `RevisionId` | `b229a4a9-4eb4-45bf-9725-df394cf74949` | `69469039-ed9a-47c2-8fcf-34918a68a786` |
| Runtime / Handler / Timeout / Memory | `python3.12` / `handler.lambda_handler` / 120 / 512 | **unchanged** |
| Env vars | DEV base, bucket, route keys, secrets present | **unchanged** (code-only deploy) |

**Rollback:** Re-publish prior deployment using `CodeSha256` `0IpfI0pSAvdJaDrg4BsIpPC5dZN+4hCf77v3XWZLRn8=` (AWS console → Versions or redeploy prior zip from ops backup).

**Package modules verified in zip:** `handler.py`, `upload_core/upload_claim.py`, `upload_core/duplicate.py`, `upload_core/processor.py`, `upload_core/fields.py`, and related helpers.

**Goal:** Upload GitHub `lambda/upload-asset/` handler + `upload_core` to existing function. **Do not** recreate IAM, Function URL, or overwrite console env unless intended.

### Recommended command (code-only)

```powershell
cd lambda/upload-asset
$env:AWS_PROFILE = $null
.\deploy.ps1 -FunctionName 127si-upload-asset-dev -CodeOnly
```

| Flag | Effect |
|------|--------|
| `-FunctionName 127si-upload-asset-dev` | Targets Mike's AWS shell |
| `-CodeOnly` | `update-function-code` only — **no** env/IAM/URL changes |

### Alternative (code + sync env from local .env)

Only if you intentionally want deploy script to refresh Lambda env from `tools/airtable/.env`:

```powershell
.\deploy.ps1 -FunctionName 127si-upload-asset-dev -SkipIam
```

### Alternative (manual AWS CLI)

```powershell
cd lambda/upload-asset
# build zip (same as deploy.ps1)
$DistDir = "dist\package"
Remove-Item -Recurse -Force $DistDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $DistDir | Out-Null
Copy-Item handler.py $DistDir
Copy-Item -Recurse upload_core $DistDir
Compress-Archive -Path "$DistDir\*" -DestinationPath dist\lambda-upload-asset.zip -Force

aws lambda update-function-code `
  --function-name 127si-upload-asset-dev `
  --zip-file fileb://dist/lambda-upload-asset.zip `
  --region us-east-2
```

**Pre-flight:** `aws lambda get-function --function-name 127si-upload-asset-dev --region us-east-2`

---

## Phase B — Direct Function URL test (after Phase A)

**Goal:** Prove live Lambda path before any Make scenario or **070b** enable.

### B0 — Prepare fresh H2 asset (Pending Link)

```powershell
cd tools/airtable
python c013_dev_h2_video_run.py --confirm-write --prepare-only
python c013_dev_h2_video_run.py --confirm-write --scenario-id <scenarioRec> --poll-only
```

Note `assetId` with `Upload Status = Pending Link`, attachment present, Video Feedback linked.

**Do not** use `recBBi80bYuxXifVj` (already Uploaded) for primary gate unless testing idempotent skip.

### B1 — Auth negative tests (Function URL)

Use `LAMBDA_FUNCTION_URL` from local `.env` only.

**Missing secret → 401**

```powershell
# PowerShell — replace URL from local ops notes
$Url = $env:LAMBDA_FUNCTION_URL
$Body = '{"submissionAssetRecordId":"recPLACEHOLDER","routeKey":"video_feedback","automationNumber":"070b"}'
Invoke-RestMethod -Method POST -Uri $Url -ContentType "application/json" -Body $Body
# Expect 401, actionOut=error_unauthorized, no Airtable change on asset
```

**Wrong secret → 401** — add header `X-Upload-Secret: wrong-value`

**Correct secret → proceeds** — header matches `UPLOAD_WEBHOOK_SECRET`

### B2 — Live upload test (invoke helper)

```powershell
cd tools/airtable
python c013_dev_lambda_invoke.py <assetId> --function-url --out _preview/c013-dev-lambda-url-proof-<assetId>.json
```

Or explicit URL:

```powershell
python c013_dev_lambda_invoke.py <assetId> --function-url "https://....lambda-url.us-east-2.on.aws/" --out _preview/c013-dev-lambda-url-proof-<assetId>.json
```

**Pass criteria (response body):**

| Check | Expected |
|-------|----------|
| HTTP status | `200` |
| `statusOut` | `success` |
| `actionOut` | `uploaded` |
| `writebackVerification.allPass` | `true` |
| `c023Duplicate.duplicateLookupPerformed` | `true` |

### B3 — Airtable verifier (read-only)

```powershell
python _probe_c013_asset_storage_fields.py --record-id <assetId> --out _preview/c013-dev-lambda-url-proof-<assetId>-verify.json
```

**Pass:** probe `allPass=true`, attachment retained, `Writeback Complete?=1`.

### B4 — Idempotent skip (optional)

Re-POST same `assetId` with correct secret → `actionOut=skipped_already_uploaded`, no duplicate S3 harm.

### B5 — CloudWatch (optional)

Log group: `/aws/lambda/127si-upload-asset-dev` — confirm structured log line, no PAT/secret in logs.

---

## Phase C — Explicitly not in this plan

| Item | Status |
|------|--------|
| Make scenario create/edit | **NO** |
| **070b** enable | **NO** |
| **070a** enable | **NO** |
| Production Airtable / web | **NO** |
| Commit Function URL | **NO** |

**After B1–B3 PASS:** Document results in Wave 7 checklist → prep Make scenario (separate step) → **070b** last.

---

## Pass / fail summary template

| Step | Result | Notes |
|------|--------|-------|
| A Code deploy | ☐ | |
| B1 Auth 401 (missing/wrong) | ☐ | |
| B2 Function URL upload | ☐ | assetId: |
| B3 Probe allPass | ☐ | |
| B4 Idempotent skip | ☐ | optional |

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md) | Architecture + 070b gate |
| [C-013-make-upload-migration-plan.md](./C-013-make-upload-migration-plan.md) | Make orchestration (later) |
| [C-020-testing-scenarios-script-checklist.md](./C-020-testing-scenarios-script-checklist.md) | H2 harness |
