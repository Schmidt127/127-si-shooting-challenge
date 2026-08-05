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
| `AIRTABLE_BASE_ID` | PROD `appn84sqPw03zEbTT` / DEV `appTetnuCZlCZdTCT` |
| `AIRTABLE_API_TOKEN` / `AIRTABLE_TOKEN` | *(secret — not in Git)* |
| `S3_BUCKET` | `shooting-challenge-assets` |
| `ENVIRONMENT` | `PROD` or `DEV` |
| `ALLOW_ROUTE_KEYS` | `video_feedback,homework_completion` |
| `SEASON_SLUG` / `CHALLENGE_SLUG` | season path segments |
| `UPLOAD_WEBHOOK_SECRET` | Upload POST secret |
| `VIEWER_PRESIGN_TTL_SECONDS` | Optional; default `900` |

Do not set `AWS_REGION` in Lambda env (reserved). Region = `us-east-2` on the function.

## Deploy

- DEV: [DEPLOY.md](./DEPLOY.md)
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
