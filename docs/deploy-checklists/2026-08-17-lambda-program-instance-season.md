# Lambda upload season — Program Instance resolution

> **Deployed (Mike-requested 2026-08-19):** Production function `127si-upload-asset` (`us-east-2`) updated **CodeOnly**. LastModified `2026-08-19T17:29:53.000+0000`, CodeSha256 `lwbLiBzB4cfWdzVmIVo7Z78AkiowqPuV2NmUXb+PK2w=`, LastUpdateStatus `Successful`. Unit tests: **139 OK**. Airtable **070b v4.6** already confirmed. Env `SEASON_SLUG` remains diagnostic (`2025-2026` on function); `ALLOW_SEASON_SLUG_FALLBACK` unset. Season for uploads comes from Program Instance `School Year - Linked`, not that env var.
>
> **Secret hygiene:** The AWS CLI `update-function-code` response echoed existing env secrets into the deploy log. Treat Airtable PAT + upload webhook secret as **exposed in that log** — rotate both in AWS Lambda env + Make/Airtable callers when Mike is ready. Do not paste secrets into chat or GitHub.

**Date:** 2026-08-17 (deploy evidence 2026-08-19)  
**Function:** `127si-upload-asset` (`us-east-2`)  
**Hard stops:** Do not auto-modify production Airtable records · Do not send parent emails · Do not print secrets

## Root cause

`SEASON_SLUG` on the Lambda was a global env default (`2025-2026` in the production deploy script). Active Shooting Challenge enrollments are `2026-2027`. Season must come from the asset’s Enrollment → Program Instance, not from Lambda env, filename, or the current date.

## Authoritative schema (PROD `appn84sqPw03zEbTT`)

| Step | Table | Field | Notes |
|------|-------|--------|------|
| 1 | Submission Assets | `Enrollment - Linked` | Exactly one |
| 2 | Enrollments | `Program Instance` | Exactly one; links to `Program Instance - Sync` (`tblMfALZa4YYUy70P`) |
| 3 | Program Instance - Sync | `School Year - Linked` | Authoritative `YYYY-YYYY` slug |
| Check | Enrollments | `School Year` | Consistency only; mismatch fails closed |
| Unused | Program Instance - Sync | `Season` | Fall/Spring/etc — not the S3 year |

## Contract

- 070a / 070b v4.6 send `enrollmentId` + `programInstanceId` as cross-checks.
- They do **not** send `seasonSlug`.
- Lambda re-resolves `School Year - Linked` and writes Storage Key in this shape:

```text
{LastName}_{FirstName}/{ProgramInstance}/{YYYY-MM-DD}/{UTC}_{AssetSlot}_{SubmissionAssetRecordId}_{OriginalFileName}
```

Example: `Schmidt_Xavier/Shooting_Challenge_2026-2027/2026-08-17/20260817T172732Z_HW1_recAqoUbBKfDNtTLt_Straughn_Stetson_316.jpg`

- Storage Key is persisted before S3. Retries reuse that exact value.
- `SEASON_SLUG` remains diagnostic only. `ALLOW_SEASON_SLUG_FALLBACK` must stay unset in PROD.

## Deploy (existing function only)

```powershell
cd lambda/upload-asset
python -m unittest discover -s tests -q
$env:AWS_PROFILE="default"
.\deploy-prod.ps1 -CodeOnly
```

`-CodeOnly` updates the existing `127si-upload-asset` zip. Season resolution is in code; it does not require rotating secrets or creating a new function.

After 070a/070b GitHub updates, paste those scripts in Airtable only when Mike is ready. Lambda can ship first: it resolves season from Airtable even if the payload is still v4.5.

## Safe verification (no secrets)

```powershell
$env:AWS_PROFILE="default"
aws lambda get-function-configuration --function-name 127si-upload-asset --region us-east-2 --query "{function_name:FunctionName,region:'us-east-2',season:Environment.Variables.SEASON_SLUG,environment:Environment.Variables.ENVIRONMENT,allow_route_keys:Environment.Variables.ALLOW_ROUTE_KEYS}" --output json
```

## Retry after deploy

Do not auto-write Airtable. After Lambda code is live, retry Submission Asset `recAqoUbBKfDNtTLt` with the manual Pending Link steps in `2026-08-17-homework-upload-canonical-field-restore.md`. Confirm Storage Key matches:

`{Last}_{First}/Shooting_Challenge_2026-2027/{asset-created-date}/{UTC}_{HW1 or slot}_{recAqoUbBKfDNtTLt}_{sanitized-original-filename}`

If that record already has a Storage Key, the retry must keep that exact string.
