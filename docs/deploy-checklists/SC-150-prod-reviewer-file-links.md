# PROD Lambda — secure reviewer file links (private S3 + token viewer)

| Field | Value |
|-------|--------|
| Date | 2026-08-04 |
| Status | **Complete** — PROD code-only deploy + live Interface test PASS |
| Function | `127si-upload-asset` |
| Region | `us-east-2` |
| S3 bucket | `shooting-challenge-assets` (private) |
| Function URL | `https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/` |
| PROD base | `appn84sqPw03zEbTT` |
| Related SC | **SC-150** (reviewer links); supports SC-094 / SC-096 |
| Deploy timestamp | **`2026-08-04T23:57:36Z`** (code-only; no redeploy needed) |

## Live PROD results (PASS)

| Check | Result |
|-------|--------|
| Lambda `-CodeOnly` deploy | PASS — `127si-upload-asset` @ `2026-08-04T23:57:36Z` |
| Submission Asset | `recaXBfjeeu3bcm0t` |
| `Reviewer Access Token` populated | PASS |
| `Reviewer File URL` populated | PASS |
| Interface click opens private S3 document immediately | PASS |
| Extra authentication required | None |
| S3 remains private | PASS (`Canonical File URL` is not a public open path) |
| Final upload status ownership | **Lambda** — successful assets finish as `Upload Status = Uploaded` |
| Unit tests | **78** OK |

**Separate P0 security follow-up (not part of SC-150 commit):** rotate credentials / secrets that were exposed during terminal troubleshooting. Do not rotate inside this package.

## Architecture (decision)

- S3 objects stay **private** (Block Public Access on; no public `s3:GetObject` bucket policy).
- `Canonical File URL` remains the permanent S3 object identity (anonymous open → AccessDenied is expected).
- Clickable coach/reviewer field is **`Reviewer File URL`** (formula).
- On successful upload, Lambda writes a stable **`Reviewer Access Token`** (or reuses an existing nonblank token).
- Browser `GET /file/{submissionAssetRecordId}?token=…` validates the token against Airtable, then **302** redirects to a short-lived S3 presigned GET URL (default **900s / 15 min**).
- Upload `POST` continues to require `X-Upload-Secret`. Viewer `GET` does **not** use that header (token is the auth).
- Lambda remains the authoritative owner of final `Upload Status = Uploaded` (070a must not overwrite success back to Processing).

## Exact code deploy (already completed)

```powershell
cd lambda/upload-asset
.\deploy-prod.ps1 -CodeOnly
```

Completed successfully at **`2026-08-04T23:57:36Z`**. Do **not** redeploy for SC-150 close-out.

## Optional env (already compatible defaults)

| Variable | Required? | Notes |
|----------|-----------|--------|
| `AIRTABLE_TOKEN` / `AIRTABLE_API_TOKEN` | Yes (existing) | Viewer + upload Airtable access |
| `UPLOAD_WEBHOOK_SECRET` | Yes (existing) | Upload POST only |
| `S3_BUCKET` | Yes (existing) | `shooting-challenge-assets` |
| `ENVIRONMENT` | Yes (existing) | `PROD` |
| `ALLOW_ROUTE_KEYS` | Yes (existing) | Must include routes you test (`video_feedback`, `homework_completion`) |
| `VIEWER_PRESIGN_TTL_SECONDS` | Optional | Default `900` (60–3600) |
| `VIEWER_BASE_URL` | Optional | Documentation only; Airtable formula uses Function URL |

## IAM

Existing PROD role policy already allows:

- `s3:PutObject`, `s3:GetObject`, `s3:HeadObject` on `arn:aws:s3:::shooting-challenge-assets/*`
- `s3:ListBucket` on the bucket

**No IAM change required** for presigned GET (signer uses the Lambda role’s `s3:GetObject`). Confirm the live role still matches `lambda/upload-asset/iam-policy-prod.json`.

Do **not**:

- disable Block Public Access
- add a public bucket policy
- grant anonymous `s3:GetObject`

## Airtable formula — `Reviewer File URL` (canonical)

```airtable
IF(
  {Reviewer Access Token},
  "https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/file/" &
    RECORD_ID() &
    "?token=" &
    {Reviewer Access Token},
  ""
)
```

## Final upload writeback contract (Lambda-owned)

| Field | Final success value |
|-------|---------------------|
| Upload Status | `Uploaded` |
| Upload Error | blank |
| Uploaded At | success timestamp (America/Denver) |
| Canonical File URL | permanent S3 HTTPS object URL |
| Storage Key | S3 object key |
| File Content Hash | SHA-256 hex |
| File Hash Algorithm | `SHA-256` |
| File Size Bytes | actual size |
| File MIME Type | detected MIME |
| Reviewer Access Token | preserved or newly generated |
| Reviewer File URL | formula (populated when token present) |

Lambda re-reads Airtable after writeback and **fails the request** if status is not `Uploaded` (including if still `Processing`).

## Manual PROD test (Schmidt asset) — COMPLETE

Test record:

| Item | ID |
|------|-----|
| Submission Asset | `recaXBfjeeu3bcm0t` |
| Homework Completion | `rec7Nr2M69SwwgBV8` |
| Route | `homework_completion` |
| Automation | `070a` |
| Existing Storage Key | `shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/2026-08-04-homework-recaXBfjeeu3bcm0t-Inusrance-Quote-Application-Vendor-Name.pdf` |

### Steps completed

1. Deploy Lambda code (`-CodeOnly`) — **PASS** @ `2026-08-04T23:57:36Z`.
2. Update `Reviewer File URL` formula (canonical `RECORD_ID()` form above) — **PASS**.
3. `Reviewer Access Token` populated on `recaXBfjeeu3bcm0t` — **PASS**.
4. Airtable: `Upload Status = Uploaded`, token + formula populated, S3 private — **PASS**.
5. From Airtable Interface, open **Reviewer File URL** — document opened immediately with no extra login — **PASS**.

## Rollback

```powershell
# Throttle new invokes immediately
aws lambda put-function-concurrency --function-name 127si-upload-asset --reserved-concurrent-executions 0 --region us-east-2

# Restore prior function code version / previous zip if needed
# Then clear reserved concurrency:
aws lambda delete-function-concurrency --function-name 127si-upload-asset --region us-east-2
```

Airtable formula can be cleared or reverted to the placeholder domain without affecting stored tokens.

## Unit tests (local)

```powershell
cd lambda/upload-asset
python -m unittest discover -s tests -p "test_*.py" -v
```

Expected: **78** tests OK (includes token + viewer suites). Confirmed **2026-08-04**.
