# C-013 — DEV Lambda upload implementation plan

**Date:** 2026-07-08  
**Status:** **IMPLEMENTED** (code in `lambda/upload-asset/`, local handler PASS 2026-07-08). **AWS deploy** pending admin IAM. **070a/070b OFF.**
**Permanent architecture (locked):**

```text
Airtable 070b (v4.1 payload)
  → Make.com webhook / orchestration only
  → HTTP POST AWS Lambda
  → Lambda: download → SHA-256 → C-023 duplicate lookup → S3 PutObject → Airtable writeback
  → structured JSON response → Make (200) → 070b sets Processing
```

**Source logic (proven):** [`tools/airtable/c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py)  
**Parents:** [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md) · [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md)

**Dropped permanently:** Make **Amazon S3 Upload** module troubleshooting — do not revisit.

---

## Hard stops (this slice)

| Stop | Rule |
|------|------|
| Environment | **DEV only** — base `appTetnuCZlCZdTCT` |
| **070a** | **OFF** — no homework route |
| **070b** | **OFF** until Lambda + Make dry-run PASS + Mike approval |
| Production | **Untouched** — no prod base, Lambda alias, or webhook URL |
| Attachments | **Do not clear** Airtable Attachment |
| Drive fields | **Do not remove** |
| Formulas / views | **No cutover** to Canonical File URL |
| Make S3 module | **Never use** |
| H1 homework | **Do not run** |

---

## 1. Lambda function name recommendation

| Scope | Name | Notes |
|-------|------|-------|
| **DEV (deploy first)** | `127si-dev-shooting-challenge-asset-upload` | Implemented in repo; AWS deploy pending admin IAM |
| **PROD (later)** | `shooting-challenge-prod-upload-asset` | Separate function + IAM + secret — not this slice |
| **Repo path (proposed)** | `lambda/upload-asset/` | Handler + shared library extracted from SDK proof |

**AWS resource tags (DEV):**

- `Project=shooting-challenge`
- `Environment=dev`
- `Component=upload-asset`
- `Backlog=C-013,C-023`

---

## 2. Runtime / language recommendation

| Choice | Recommendation | Rationale |
|--------|----------------|-----------|
| **Language** | **Python 3.12** | Matches `c013_dev_s3_upload_proof.py`; boto3 mature; team already proved path |
| **Lambda runtime** | `python3.12` | Align with local SDK tests |
| **Dependencies** | `boto3` (Lambda layer or bundle), `urllib3` / stdlib `urllib` for download | Avoid heavy deps; no `requests` required in Lambda if using stdlib |
| **Packaging** | Zip deploy or **AWS SAM / CDK** (Mike preference) | Start with zip + console/CLI for DEV; IaC optional follow-up |
| **Timeout** | **120 s** | Attachment download + Airtable + S3; SDK uses 180s download — tune after first runs |
| **Memory** | **512 MB** | Video/images up to ~100 MB; increase to 1024 if OOM |
| **Architecture** | `x86_64` | Default; arm64 optional later |

**Code organization (post-approval implementation):**

```text
lambda/upload-asset/
  handler.py              # Lambda entry: parse event → orchestrate → response JSON
  upload_core/            # Extracted from c013_dev_s3_upload_proof.py (shared with CLI)
    __init__.py
    airtable.py
    s3.py
    duplicate.py
    paths.py
  requirements.txt
  tests/
    test_event_dev_video.json
  README.md
```

CLI [`c013_dev_s3_upload_proof.py`](../../tools/airtable/c013_dev_s3_upload_proof.py) becomes a thin wrapper over `upload_core` so Lambda and local runs stay identical.

---

## 3. Environment variables needed

Store secrets in **AWS Secrets Manager** (recommended) or Lambda env (DEV bootstrap only). **Never commit values.**

| Variable | Required | Example / source | Notes |
|----------|----------|------------------|-------|
| `AIRTABLE_BASE_ID` | Yes | `appTetnuCZlCZdTCT` | Lambda **must** reject `appn84sqPw03zEbTT` |
| `AIRTABLE_TOKEN` | Yes | PAT from Secrets Manager | Scopes: `data.records:read`, `data.records:write` on DEV |
| `S3_BUCKET` | Yes | `shooting-challenge-assets` | Same bucket as SDK proof |
| `AWS_REGION` | Yes | `us-east-2` | Implicit in Lambda; set for boto3 client |
| `SEASON_SLUG` | Yes | `2026-2027` | Path segment — match SDK default |
| `CHALLENGE_SLUG` | Yes | `shooting-challenge` | Path segment |
| `ENV_NAME` | Yes | `dev` | Logging + response metadata |
| `UPLOAD_WEBHOOK_SECRET` | Recommended | Random string | Make sends `X-Upload-Secret` header; Lambda validates |
| `ATHLETE_SLUG_OVERRIDE` | No | — | DEV test only; prefer enrollment lookup like SDK |
| `LOG_LEVEL` | No | `INFO` | `DEBUG` for DEV troubleshooting |

**Not in Lambda env:** Make webhook URL (lives in Airtable 070b input + Make scenario only).

---

## 4. IAM permissions needed

**Execution role:** `shooting-challenge-dev-upload-asset-role`

| Service | Actions | Resource |
|---------|---------|----------|
| **S3** | `s3:PutObject`, `s3:PutObjectAcl` (if needed) | `arn:aws:s3:::shooting-challenge-assets/shooting-challenge/*` |
| **S3** | `s3:GetObject` (optional) | Same — for idempotency head-object checks |
| **Logs** | `logs:CreateLogGroup`, `CreateLogStream`, `PutLogEvents` | `arn:aws:logs:us-east-2:*:log-group:/aws/lambda/shooting-challenge-dev-upload-asset:*` |
| **Secrets Manager** | `secretsmanager:GetSecretValue` | `arn:aws:secretsmanager:us-east-2:*:secret:shooting-challenge/dev/*` |

**Explicitly omit:** `s3:*` on `*`, Production bucket ARNs, cross-account.

**Airtable:** No AWS IAM — token in secret; outbound HTTPS only.

**Network:** Default Lambda public egress (Airtable CDN + Airtable API). VPC **not** required unless org policy mandates it.

---

## 5. Payload contract from Make / 070b

Lambda receives **HTTP POST** (Function URL or API Gateway) with JSON body = **070b v4.1 minimal payload** (Make forwards webhook body as-is).

### Request headers (recommended)

| Header | Purpose |
|--------|---------|
| `Content-Type` | `application/json` |
| `X-Upload-Secret` | Shared secret matching `UPLOAD_WEBHOOK_SECRET` |
| `X-Request-Id` | Optional correlation id from Make |

### Request body (required fields)

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "2026-07-08T16:00:00.000Z",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "recXXXXXXXXXXXXXX",
  "targetTable": "Video Feedback",
  "targetRecordId": "recYYYYYYYYYYYYYY"
}
```

### Lambda validation rules

| Rule | On fail |
|------|---------|
| `submissionAssetRecordId` starts with `rec` | HTTP 400 |
| `automationNumber` = `070b` (DEV slice) | HTTP 400 — reject `070a` until homework wave |
| `routeKey` = `video_feedback` | HTTP 400 |
| `uploadDestination` = `Video Feedback` | HTTP 400 |
| Secret header matches (if configured) | HTTP 401 |

**Lambda does not require** `targetRecordId` for upload writeback (Submission Assets only) but should log it for traceability. Reference: [`c013-manual-webhook-recBBi80bYuxXifVj.json`](../../tools/airtable/_preview/c013-manual-webhook-recBBi80bYuxXifVj.json).

---

## 6. Response contract back to Make

Make **070b** requires **HTTP 2xx** to set `Upload Status = Processing` and clear `Send to Make Trigger`. Lambda final **Uploaded** state is written by Lambda to Airtable directly.

### Success (HTTP 200)

```json
{
  "ok": true,
  "statusOut": "success",
  "actionOut": "uploaded",
  "environment": "dev",
  "submissionAssetRecordId": "recXXXXXXXXXXXXXX",
  "routeKey": "video_feedback",
  "automationNumber": "070b",
  "s3": {
    "bucket": "shooting-challenge-assets",
    "region": "us-east-2",
    "storageKey": "shooting-challenge/2026-2027/shooting-challenge/schmidt-mike/2026-07-08-video-feedback-recXXX-file.png"
  },
  "hash": {
    "algorithm": "SHA-256",
    "hex": "<64-char-lowercase-hex>"
  },
  "c023Duplicate": {
    "duplicateLookupPerformed": true,
    "duplicateMatchCount": 0,
    "duplicateBehaviorDecision": "no_match",
    "duplicateMatches": []
  },
  "writebackVerification": {
    "allPass": true,
    "canonicalUrlPopulated": true,
    "storageKeyPopulated": true,
    "fileContentHashPopulated": true,
    "fileHashAlgorithmSha256": true,
    "uploadedAtPopulated": true,
    "uploadStatusUploaded": true,
    "uploadErrorCleared": true,
    "attachmentRetained": true
  },
  "durationMs": 8421
}
```

### Skipped — idempotent (HTTP 200)

Asset already `Uploaded` with populated Canonical URL + hash; no re-upload.

```json
{
  "ok": true,
  "statusOut": "skipped",
  "actionOut": "skipped_already_uploaded",
  "submissionAssetRecordId": "recXXXXXXXXXXXXXX",
  "message": "Asset already uploaded with canonical URL and hash."
}
```

### Client error (HTTP 400)

Missing attachment, wrong route, invalid record id. Lambda **should** PATCH Airtable: `Upload Status = Error`, `Upload Error = <message>`.

### Server error (HTTP 500)

Airtable or S3 transient failure. Lambda **should** PATCH `Upload Error`; leave status `Processing` or set `Error` per policy below. Make may retry — see §9.

---

## 7. Error handling strategy

| Failure | Airtable writeback | HTTP | Make / 070b |
|---------|-------------------|------|-------------|
| Invalid payload / wrong route | Optional: `Error` + message | 400 | 070b sets Error (webhook not ok) |
| Missing attachment | `Upload Status=Error`, `Upload Error` | 400 | 070b error path |
| Missing enrollment (slug) | `Error` | 400 | — |
| Airtable GET/PATCH 4xx | `Error` with API snippet | 400 | — |
| Airtable 5xx / timeout | `Upload Error` set; status `Processing` or `Error` | 500 | 070b may error; safe to retry if idempotent |
| S3 PutObject failure | `Error` | 500 | Retry |
| Download timeout | `Error` | 500 | Retry |
| Duplicate lookup failure | **Continue upload**; set `Duplicate Check Error` + `Duplicate File Status=Error` | 200 if upload succeeds | Flag-only per C-023 |

**Align with** [upload-asset-engine-error-handling.md](../../make/documentation/upload-asset-engine-error-handling.md): terminal status owned by upload runtime (Lambda), not Make.

**070b interaction:** On Lambda **200**, 070b sets **Processing**. Lambda sets **Uploaded** on success — final state matches SDK proof (`Writeback Complete? = 1`).

---

## 8. Logging strategy

| Log type | Destination | Content |
|----------|-------------|---------|
| **Structured JSON** | CloudWatch `/aws/lambda/shooting-challenge-dev-upload-asset` | One line per invocation: `requestId`, `submissionAssetRecordId`, `routeKey`, `durationMs`, `statusOut`, `actionOut`, hash prefix, duplicate count |
| **Secrets** | Never logged | No Airtable token, no attachment URLs with tokens, no full PAT |
| **PII** | Minimize | Athlete slug only; no parent emails |
| **Debug** | `LOG_LEVEL=DEBUG` in DEV | Storage key, duplicate match ids (not full URLs in prod) |

**Correlation:** Propagate Make `X-Request-Id` or API Gateway request id into all log lines.

**Metrics (optional DEV):** CloudWatch metric filters on `statusOut=error` for alarm later.

---

## 9. Retry / idempotency strategy

| Layer | Behavior |
|-------|----------|
| **Make** | May retry webhook on timeout; Lambda must be idempotent |
| **070b** | Clears `Send to Make Trigger` on first 200 — reduces duplicate fires |
| **Lambda — pre-check** | If `Upload Status = Uploaded` AND `Canonical File URL` AND `File Content Hash` (64-char) populated → return `skipped_already_uploaded` **without** S3 PUT |
| **Lambda — same key** | Storage key includes `record_id` — deterministic per asset; re-PUT overwrites same object (acceptable) |
| **Lambda — concurrent** | Two overlapping invokes for same `rec`: last PATCH wins; acceptable for DEV; optional DynamoDB lock later for prod |
| **Airtable PATCH** | Merge fields in one PATCH like SDK; skip unchanged values if implementing optimization |

**Not idempotent:** Re-running on asset with **different** file bytes same record id — out of scope; operator must create new asset.

---

## 10. Duplicate lookup behavior (C-023)

**Port exactly from** `c013_dev_s3_upload_proof.py`:

1. Compute SHA-256 from downloaded bytes **before** S3 upload.
2. `GET Submission Assets` with `filterByFormula`:

   ```text
   AND({File Content Hash} = "<hash>", RECORD_ID() != "<currentAssetId>")
   ```

3. Exclude current record; max 5 matches for reporting.
4. **Do not block upload** on duplicate match (flag-only).
5. Write duplicate fields via `typecast`:

| Field | No match | Match found |
|-------|----------|-------------|
| File is Duplicate? | `false` | `true` |
| Duplicate File Status | `Unique` | `Exact Duplicate` |
| Duplicate Match Strength | `Exact SHA-256 Hash` | `Exact SHA-256 Hash` |
| Duplicate Match Record | `[]` | `[firstMatchRecordId]` |
| Duplicate Match Notes | `No matching file hash found.` | Human note with match id |
| Duplicate Checked At | UTC ISO ms | UTC ISO ms |
| Duplicate Check Error | blank | blank on success |

6. Report in response `c023Duplicate` block (same shape as SDK JSON artifact).

**H2 proof reference:** `recL9r4a7navUxEhg` matched `recBBi80bYuxXifVj` — `match_found_written_to_existing_field`.

---

## 11. S3 key naming rules

**Identical to SDK** (`build_storage_key` in proof script):

```text
shooting-challenge/{seasonSlug}/{challengeSlug}/{athleteSlug}/{date}-{assetType}-{recordId}-{safeOriginalFileName}
```

| Token | Source | Example |
|-------|--------|---------|
| `seasonSlug` | Env `SEASON_SLUG` | `2026-2027` |
| `challengeSlug` | Env `CHALLENGE_SLUG` | `shooting-challenge` |
| `athleteSlug` | Enrollment lookup or `{last}-{first}` slugified | `schmidt-mike` |
| `date` | America/Denver `YYYY-MM-DD` at processing time | `2026-07-08` |
| `assetType` | `video-feedback` if destination/type contains video | `video-feedback` |
| `recordId` | Submission Asset id | `recL9r4a7navUxEhg` |
| `safeOriginalFileName` | `Original File Name` or attachment filename, sanitized | `BlueOrangeCircleLogo.png` |

**Canonical URL:**

```text
https://{bucket}.s3.{region}.amazonaws.com/{url-encoded-key}
```

---

## 12. Airtable writeback fields

**Table:** Submission Assets  
**Base:** `appTetnuCZlCZdTCT` (DEV only)

### Success PATCH (merge with duplicate fields)

| Field | Value |
|-------|-------|
| Upload Status | `Uploaded` |
| Canonical File URL | HTTPS S3 URL |
| Storage Key | Full key path |
| File Content Hash | 64-char lowercase SHA-256 hex |
| File Hash Algorithm | `SHA-256` |
| Uploaded At | America/Denver ISO ms (match SDK) |
| File Size Bytes | Integer |
| File MIME Type | From download / guess |
| Upload Error | `null` / cleared |
| + C-023 duplicate fields | §10 |

### Fields Lambda must NOT write

- Airtable Attachment (do not clear)
- Google Drive * fields
- Formula / rollup / lookup fields
- Video Feedback child URLs (022 scope later)

### Verifier alignment

Probe [`_probe_c013_asset_storage_fields.py`](../../tools/airtable/_probe_c013_asset_storage_fields.py) `allPass` checks — Lambda response `writebackVerification.allPass` should mirror these.

---

## 13. Local test path

**Before any AWS deploy:**

| Step | Command / action |
|------|------------------|
| 1 | Extract `upload_core` from SDK script (implementation phase) |
| 2 | `python -m pytest lambda/upload-asset/tests/` — unit tests for path, hash, duplicate formula |
| 3 | `python tools/airtable/c013_dev_s3_upload_proof.py <recId> --confirm-write` — regression vs extracted core |
| 4 | `python -m upload_core.cli <recId>` — same as Lambda handler logic locally |
| 5 | **SAM local invoke** or `python handler.py` with test event file |

**Env:** `tools/airtable/.env` + `web/.env.local` (existing pattern); never commit.

**Test records:**

| Record | Use |
|--------|-----|
| Fresh H2 Pending Link asset | Primary — create via `c013_dev_h2_video_run.py --prepare-only` |
| `recBBi80bYuxXifVj` | Regression / duplicate target |
| `recL9r4a7navUxEhg` | Already Uploaded — idempotency skip test |

---

## 14. DEV deployment path

**Prerequisites:** Mike approves this plan.

| Step | Action | Owner |
|------|--------|-------|
| 1 | Implement `lambda/upload-asset/` + extract `upload_core` | Cursor |
| 2 | Unit tests PASS locally | Cursor |
| 3 | Create IAM role §4 | Mike / AWS |
| 4 | Store `AIRTABLE_TOKEN` in Secrets Manager `shooting-challenge/dev/airtable` | Mike |
| 5 | Create Lambda `shooting-challenge-dev-upload-asset` §1 | Mike / AWS |
| 6 | Configure env vars §3 | Mike |
| 7 | Deploy zip artifact (or SAM `sam deploy --config-env dev`) | Mike / CI |
| 8 | Enable **Lambda Function URL** (auth: NONE + secret header, or AWS_IAM if Make supports SigV4 — unlikely) | Mike |
| 9 | Smoke: manual invoke §15 | Cursor / Mike |
| 10 | Refactor Make scenario → **SDK Hybrid → Lambda** §16 | Mike |
| 11 | Manual POST to Make webhook (**070b OFF**) | Mike |
| 12 | H2 through Lambda §17 | Mike / Cursor |
| 13 | Document Function URL in ops notes only — **not GitHub** | Mike |
| 14 | **070b enable** only after §17 PASS + §18 rollback understood | Mike |

**No Production deploy** in this slice.

---

## 15. Manual Lambda test event

Save as `lambda/upload-asset/tests/test_event_dev_video.json`:

```json
{
  "version": "2.0",
  "routeKey": "$default",
  "rawPath": "/",
  "headers": {
    "content-type": "application/json",
    "x-upload-secret": "<DEV_SECRET>"
  },
  "requestContext": {
    "http": {
      "method": "POST"
    }
  },
  "body": "{\"sourceName\":\"Airtable Upload Engine\",\"automationNumber\":\"070b\",\"sentAtIso\":\"2026-07-08T16:00:00.000Z\",\"routeKey\":\"video_feedback\",\"uploadDestination\":\"Video Feedback\",\"sourceTable\":\"Submission Assets\",\"submissionAssetRecordId\":\"recREPLACE_ME\",\"targetTable\":\"Video Feedback\",\"targetRecordId\":\"recREPLACE_VF\"}",
  "isBase64Encoded": false
}
```

**CLI invoke (post-deploy):**

```bash
aws lambda invoke \
  --function-name shooting-challenge-dev-upload-asset \
  --payload file://lambda/upload-asset/tests/test_event_dev_video.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-upload-response.json
```

**Function URL curl (post-deploy):**

```bash
curl -sS -X POST "$LAMBDA_FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "X-Upload-Secret: $UPLOAD_WEBHOOK_SECRET" \
  -d @tools/airtable/_preview/c013-manual-webhook-recBBi80bYuxXifVj.json
```

(Use `webhookPayload` object from preflight JSON as body.)

---

## 16. Make webhook integration plan

**Scenario name (DEV):** `Shooting Challenge - DEV - Upload Engine - Lambda - v1`

```text
[1] Custom webhook          ← receives 070b v4.1 JSON
[2] Router                  automationNumber = "070b" AND routeKey = "video_feedback"
[3] HTTP > Make a request   POST → Lambda Function URL
                              Headers: Content-Type, X-Upload-Secret
                              Body: {{1}} (webhook payload)
[4] Router on HTTP status   200 → success branch (optional log)
                              non-200 → optional Airtable error note (or rely on Lambda PATCH)
[5] Webhook response 200    ← so 070b automation completes
```

**Remove / never add:** Amazon S3 Upload, Google Drive modules, legacy `…S3 - v1` upload chain.

**070b `makeWebhookUrl`:** Points to module **[1]** DEV webhook URL only.

**Order of testing:**

1. Lambda Function URL direct curl (070b OFF)
2. Make scenario Run once with sample payload (070b OFF)
3. Airtable 070b ON (last)

---

## 17. H2 test plan through Lambda

| # | Step | 070b | Pass criteria |
|---|------|------|---------------|
| 1 | Create fresh H2 video asset (`c013_dev_h2_video_run.py --prepare-only`) | OFF | `Pending Link`, attachment, VF linked, `Send to Make Trigger` checked |
| 2 | Note `submissionAssetRecordId` + `targetRecordId` | OFF | — |
| 3 | Invoke Lambda directly with §15 event | OFF | HTTP 200, `writebackVerification.allPass=true` |
| 4 | Probe: `_probe_c013_asset_storage_fields.py --record-id <id>` | OFF | `allPass=true` |
| 5 | POST same payload via Make scenario | OFF | Make green + same Airtable state |
| 6 | Save artifacts: `tools/airtable/_preview/c013-dev-lambda-h2-proof-<id>.json` | OFF | — |
| 7 | Idempotency: re-invoke Lambda | OFF | `skipped_already_uploaded` |
| 8 | Duplicate: same file bytes new asset (optional) | OFF | C-023 flags prior asset |
| 9 | **Mike approval** | — | — |
| 10 | Enable **070b** only; trigger **one** fresh asset | ON | End-to-end PASS |
| 11 | Confirm attachment retained, Drive blank, 070a OFF | ON | — |

**Do not run H1.**

---

## 18. Rollback / disable plan

| Action | How | When |
|--------|-----|------|
| **Disable 070b** | Airtable automation OFF | Immediate stop of new uploads |
| **Disable 070a** | Confirm stays OFF | Always this slice |
| **Disable Make scenario** | Toggle OFF in Make | Stops webhook → Lambda |
| **Disable Lambda trigger** | Disable Function URL or set reserved concurrency = 0 | Kill switch without delete |
| **Delete Function URL** | AWS console | If URL compromised |
| **Rotate secret** | `UPLOAD_WEBHOOK_SECRET` + Make header | Leak response |
| **Revert asset** | Manual Airtable only — clear erroneous `Upload Error`; do **not** clear attachment | Bad deploy |
| **Code rollback** | Previous Lambda version alias → `$LATEST` publish rollback | Failed logic |
| **Production** | **No action** — prod untouched | Always |

**Recovery:** Re-run SDK CLI `c013_dev_s3_upload_proof.py` on stuck `Processing` assets if Lambda failed mid-flight (070b OFF).

---

## Approval gate

| # | Item | Approved |
|---|------|----------|
| 1 | Architecture lock: Airtable → Make → Lambda → S3 → Airtable | ☐ Mike |
| 2 | Function name + Python 3.12 | ☐ Mike |
| 3 | Payload / response contracts §5–6 | ☐ Mike |
| 4 | IAM + secrets approach §3–4 | ☐ Mike |
| 5 | Make scenario design §16 | ☐ Mike |
| 6 | H2 test plan §17 | ☐ Mike |
| 7 | Proceed to **implement DEV Lambda only** | ☐ Mike |

**Until row 7 checked:** **No deploy. 070b OFF. 070a OFF.**

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-sdk-hybrid-runtime.md](./C-013-sdk-hybrid-runtime.md) | Architecture lock + H2 gate |
| [C-013-dev-070b-hybrid-prep.md](./C-013-dev-070b-hybrid-prep.md) | 070b trigger (update after Lambda URL exists) |
| [C-013-make-s3-writeback-mapping.md](./C-013-make-s3-writeback-mapping.md) | Field map |
| [make/documentation/C-013-dev-s3-make-ui-runbook.md](../../make/documentation/C-013-dev-s3-make-ui-runbook.md) | Legacy S3 UI — **superseded by Lambda** |
