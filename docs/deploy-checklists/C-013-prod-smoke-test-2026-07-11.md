# C-013 — PROD isolated smoke test plan

**Date:** 2026-07-11  
**Status:** **Ready for execution after PROD Lambda deploy**  
**Parent audit:** [C-013-prod-infrastructure-readiness-2026-07-11.md](../audits/C-013-prod-infrastructure-readiness-2026-07-11.md)  
**Hard stops:** Automation **070b OFF** until steps 1–10 PASS · Schmidt Testing only · no live athlete records

---

## Fixture scope (mandatory)

| Item | Value |
|------|--------|
| **Enrollment** | `recgP9qZYjAhE7NXm` |
| **Display name** | Schmidt, Testing - 2025-2026 |
| **Route key** | `video_feedback` only |
| **Automation number** | `070b` (in payload only — automation stays OFF) |
| **Test file** | Small PNG ≤ 50 KB (e.g. `BlueOrangeCircleLogo.png` from DEV proofs — non-sensitive) |

---

## Preconditions

| # | Requirement | Owner |
|---|-------------|-------|
| P1 | PROD Lambda `127si-upload-asset` deployed via `deploy-prod.ps1` | Mike |
| P2 | `UPLOAD_WEBHOOK_SECRET_PROD` set in Lambda env (non-empty) | Mike |
| P3 | PROD PAT in Lambda env (non-empty) | Mike |
| P4 | `SEASON_SLUG=2025-2026` on PROD Lambda | Mike |
| P5 | `ALLOW_ROUTE_KEYS=video_feedback` on PROD Lambda | Mike |
| P6 | Function URL saved in local ops notes | Mike |
| P7 | Automation **070b OFF** | Mike |
| P8 | OMNI field verify PASS (see audit OMNI prompt) | Mike |

---

## Fixture creation (Schmidt Testing only)

Use OMNI or controlled manual steps on **PROD** for enrollment `recgP9qZYjAhE7NXm` only:

1. Create or reuse one **Submission** linked to Schmidt Testing.
2. Run intake chain (013 / 115 test path) to produce one **Submission Asset** with:
   - Upload Destination = **Video Feedback**
   - Upload Status = **Pending Link**
   - **Airtable Attachment** = small test PNG
   - **Video Feedback** link populated
   - Send to Make Trigger = **unchecked** (070b OFF)
   - Canonical File URL, Storage Key, File Content Hash = **blank**
3. Record IDs locally (not GitHub):
   - `submissionAssetRecordId` = `rec________`
   - `targetRecordId` = Video Feedback `rec________`

---

## Test matrix

### T0 — Config rejection (no Airtable writes)

| Test | Request | Expected |
|------|---------|----------|
| T0a Missing secret | POST Function URL, no `X-Upload-Secret` | HTTP **401** · `actionOut=error_unauthorized` |
| T0b Wrong secret | Header `X-Upload-Secret: invalid` | HTTP **401** · `actionOut=error_unauthorized` |
| T0c Bad route | Valid secret · `routeKey=not_a_route` | HTTP **400** · unsupported route |

**PASS evidence:** Save redacted JSON to `tools/airtable/_preview/c013-prod-smoke-T0-*.json` (local only).

---

### T1 — Primary upload (direct Lambda — 070b OFF)

**Payload shape** (replace record IDs):

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "2026-07-11T16:00:00.000Z",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recSUBMISSION_ASSET",
  "targetTable": "Video Feedback",
  "targetRecordId": "recVIDEO_FEEDBACK"
}
```

**Invoke:**

```powershell
cd tools/airtable
$env:BASE_ID = "appn84sqPw03zEbTT"
$env:LAMBDA_FUNCTION_NAME = "127si-upload-asset"
# Set LAMBDA_FUNCTION_URL and UPLOAD_WEBHOOK_SECRET to PROD values in .env locally
python c013_dev_lambda_invoke.py recSUBMISSION_ASSET --aws --target-record-id recVIDEO_FEEDBACK --out _preview/c013-prod-smoke-T1-upload.json
```

**Expected Lambda response:**

| Field | Expected pattern |
|-------|------------------|
| `statusOut` | `success` |
| `actionOut` | `uploaded` |
| `claimActionOut` | `claim_acquired` |
| `writebackVerification.allPass` | `true` |
| `environment` | `PROD` |
| `baseId` | `appn84sqPw03zEbTT` |

**Expected Airtable writeback:**

| Field | Expected |
|-------|----------|
| Upload Status | **Uploaded** |
| Storage Key | `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/{YYYY-MM-DD}-video-feedback-{recId}-{filename}` |
| Canonical File URL | `https://shooting-challenge-assets.s3.us-east-2.amazonaws.com/{encoded Storage Key}` |
| File Content Hash | 64-char lowercase hex SHA-256 |
| File Hash Algorithm | **SHA-256** |
| File Size Bytes | Matches attachment byte size |
| File MIME Type | `image/png` (or detected type) |
| Uploaded At | America/Denver ISO timestamp |
| Upload Error | **blank** |
| Upload Claim Run ID | UUID (non-empty during Processing; may remain on record) |
| Processing Started At | Populated when claim acquired |
| Airtable Attachment | **Retained** (not cleared) |
| Writeback Complete? | **1** |

**Probe:**

```powershell
python _probe_c013_asset_storage_fields.py --base-id appn84sqPw03zEbTT --record-id recSUBMISSION_ASSET --out _preview/c013-prod-smoke-T1-verify.json
```

Expect **`allPass=true`**.

**S3 verify:**

```powershell
aws s3api head-object --bucket shooting-challenge-assets --key "shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/..." --region us-east-2
```

Compare `ETag`/downloaded bytes hash to **File Content Hash**.

---

### T2 — Idempotency retry

Repeat **identical** T1 invoke.

| Expected | |
|----------|--|
| `actionOut` | `skipped_already_uploaded` |
| Upload Status | **Uploaded** (unchanged) |
| S3 object count | **1** (no duplicate PutObject) |

---

### T3 — Error writeback (optional second fixture)

On a **separate** Schmidt Testing asset left at Pending Link **without** attachment:

- Invoke with valid secret
- Expect `actionOut=error_missing_attachment` (or equivalent)
- Upload Status → **Error** · Upload Error populated · no S3 object

---

## Rollback / reset procedure

After tests complete (success or fail):

1. **070b OFF** (confirm)
2. Make Production upload scenario **OFF**
3. Reset Schmidt Testing Submission Asset fields (manual or safe-backfill):
   - Upload Status → **Pending Link** (or delete test asset if disposable)
   - Clear Canonical File URL, Storage Key, hash fields if re-testing
   - Uncheck Send to Make Trigger
4. Optional: delete test S3 object under `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/` for that record only
5. Lambda throttle drill: `aws lambda put-function-concurrency --function-name 127si-upload-asset --reserved-concurrent-executions 0 --region us-east-2`
6. Restore: `--reserved-concurrent-executions 1` (or remove concurrency limit)

**Do not** modify live athlete enrollments.

---

## Gate: when Make + 070b may proceed

Direct Lambda tests **T0–T2 PASS** → Mike may build Make scenario → manual webhook PASS → paste 070b script (still OFF) → **G6 approval** → one 070b enable test → **070b OFF**.

---

## CloudWatch verification

Log group: `/aws/lambda/127si-upload-asset`

Confirm structured log lines contain `statusOut`, `actionOut`, `allPass` — **no PAT or webhook secret values**.

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md) | Full promotion sequence |
| [C-013-dev-lambda-deploy-and-url-test.md](./C-013-dev-lambda-deploy-and-url-test.md) | DEV reference |
| [lambda/upload-asset/deploy-prod.ps1](../../lambda/upload-asset/deploy-prod.ps1) | PROD deploy |
