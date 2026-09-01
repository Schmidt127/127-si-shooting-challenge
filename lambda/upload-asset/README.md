# Lambda — asset upload + private reviewer viewer

**PROD function:** `127si-upload-asset` (`us-east-2`)
**Function URL:** `https://qzfaiyaq7a2cugh6alpov7iyfu0nrwbf.lambda-url.us-east-2.on.aws/`
**Architecture:** Airtable 070a/070b → Make → **Lambda POST upload** → private S3 → Airtable writeback; coaches open **`Reviewer File URL`** → **Lambda GET viewer** → short-lived S3 presigned redirect.

## Layout

```text
lambda/upload-asset/
  handler.py              # Routes upload POST + viewer GET
  upload_core/
    processor.py          # Upload claim, S3 put, token writeback, read-back verify
    viewer.py             # GET /file/{recordId}?token=… → 302 presigned
    token.py              # Secure reviewer token mint / compare
    airtable.py / auth.py / …
  tests/
  deploy.ps1 / deploy-prod.ps1
  iam-policy-prod.json    # Includes s3:GetObject (required for presign)
```

## Local test (no AWS deploy)

```powershell
cd lambda/upload-asset
python -m unittest discover -s tests -p "test_*.py" -v
```

## Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/` (Function URL root) | `X-Upload-Secret` | Upload engine |
| `GET` | `/file/{rec…}?token=…` | Reviewer Access Token | Private file redirect |
| `GET` | `/` | — | `405` |
| `POST` | `/file/…` | — | `405` |

## Environment variables

| Variable | Value |
|----------|--------|
| `AIRTABLE_BASE_ID` | PROD `appn84sqPw03zEbTT` / Production `appn84sqPw03zEbTT` |
| `AIRTABLE_API_TOKEN` / `AIRTABLE_TOKEN` | *(secret — not in Git)* |
| `S3_BUCKET` | `shooting-challenge-assets` |
| `ENVIRONMENT` | `PROD` or `Production` |
| `ALLOW_ROUTE_KEYS` | `video_feedback,homework_completion` |
| `SEASON_SLUG` | Optional diagnostic / emergency fallback only. **Not** the upload season source. |
| `ALLOW_SEASON_SLUG_FALLBACK` | Must stay unset in PROD. If `true` in Production, `SEASON_SLUG` is used only when Program Instance `School Year - Linked` is missing. |
| `CHALLENGE_SLUG` | Unused in the current object-key shape; kept for env compatibility |
| `UPLOAD_WEBHOOK_SECRET` | Upload POST secret |
| `VIEWER_PRESIGN_TTL_SECONDS` | Optional; default `900` |
| `USE_FUT007_BASENAME` | **Optional — default off.** Set to `1` in DEV only after Mike approves FUT-007 proof. When enabled, new uploads use the FUT-007 basename grammar (see below). Production must stay `0` until promotion checklist is complete. |

Do not set `AWS_REGION` in Lambda env (reserved). Region = `us-east-2` on the function.

## Season and S3 object keys

Uploads do **not** use `SEASON_SLUG` as the S3 year. Lambda resolves:

`Submission Assets.Enrollment - Linked` → `Enrollments.Program Instance` → `Program Instance - Sync.School Year - Linked`

`Program Instance - Sync.Season` is Fall/Spring and is ignored. Filename and current date are not used as the season. Production fails closed if Program Instance, school year, or athlete name is missing or ambiguous. Optional payload `enrollmentId` / `programInstanceId` / `seasonSlug` are cross-checks only.

Object key (070a homework and 070b video share this builder):

```text
{LastName}_{FirstName}/{ProgramInstance}/{YYYY-MM-DD}/{UTC}_{AssetSlot}_{SubmissionAssetRecordId}_{OriginalFileName}

Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg
```

- Athlete folder comes from Enrollment `Athlete Last Name` / `Athlete First Name`.
- Program Instance folder comes from `Name - Program Instance` (spaces/`|` → `_`).
- Date and UTC stamp come from the asset `Created Time` / `Created` fields.
- Lambda writes `Storage Key` before S3. Retries reuse that exact key.
- `ATHLETE_SLUG_OVERRIDE` and `CHALLENGE_SLUG` do not shape this path.

### FUT-007 basename (opt-in — Phase 3 prep)

**Default:** legacy builder above. **Not enabled in Production.**

When `USE_FUT007_BASENAME=1` (or code constant `FUT007_BASENAME_ENABLED` in `upload_core/storage_key.py`), the filename segment becomes:

```text
{YYYYMMDD}_{HW|VIDEO|HEADSHOT}_{LastName}_{FirstName}_{CustomName}.{ext}

Boltz_Drew/Shooting_Challenge_2026-2027/2026-08-17/20260817_VIDEO_Boltz_Drew_OffTheDribble.mp4
```

- Activity Date (America/Denver) drives `YYYYMMDD` and the date folder — not Created Time.
- No `rec…` in the basename; retries reuse the persisted **Storage Key**.
- Helpers: `upload_core/fut007_basename.py` · spec: [`docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md`](../../docs/next-wave/aws-media/FUT-007-AWS-MEDIA-NAMING-SPEC.md) · promotion: [`docs/deploy-checklists/FUT-007-aws-media-naming.md`](../../docs/deploy-checklists/FUT-007-aws-media-naming.md)

## Deploy

- Production: [DEPLOY.md](./DEPLOY.md)
- PROD reviewer-link package: [SC-150-prod-reviewer-file-links.md](../../docs/deploy-checklists/SC-150-prod-reviewer-file-links.md)

```powershell
cd lambda/upload-asset
.\deploy-prod.ps1 -CodeOnly
```

## Airtable formula (`Reviewer File URL`)

See deploy checklist. Shape:

```text
{VIEWER_BASE}/file/{Record Id}?token={Reviewer Access Token}
```

PROD viewer base = Function URL above (no trailing slash before `/file/`).
