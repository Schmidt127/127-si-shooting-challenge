# Homework upload failure — Canonical File URL restore + Lambda hardening

**Date:** 2026-08-17  
**Backlog / scope:** C-013 / SC-095 homework upload path (investigation + fix)  
**Asset:** `recAqoUbBKfDNtTLt` · HC: `recJE9WJiHfMeJ1cw`  
**Hard stops:** Do not auto-modify production records · Do not send parent emails · Make allowed for asset upload only

## Root cause

1. **PROD Submission Assets was missing `Canonical File URL`** (prior id `fld9NZBwDc01gxTY9`).  
   `Writeback Complete?` was **invalid** (`isValid: false`) because it still referenced the deleted field as `{column_value_fld9NZBwDc01gxTY9}`.
2. Lambda could **claim** `Pending Link` → `Processing`, upload to S3, then **fail Airtable writeback** for the missing URL field → write `Upload Status = Error`.
3. Retries then correctly returned `error_invalid_upload_status` with `got "Error"`.  
   Make surfaced that as HTTP 500 / “Scenario failed to complete.”
4. **UI vs Lambda discrepancy:** Airtable API for `recAqoUbBKfDNtTLt` showed **`Upload Status = Error`** (not Pending Link) at investigation time. A late Error writeback could also overwrite a manual Pending Link reset (addressed in Lambda hardening).

## Schema fix applied (PROD)

| Change | Detail |
|--------|--------|
| Recreated field | **Canonical File URL** (`url`) → new id `fldlVW1gGgnBI697v` |
| Formula repair | **Writeback Complete?** (`fldtl04LTU3FoMmLL`) now valid; gates on Uploaded + Canonical + Storage Key + hash + Uploaded At |

Table: [Submission Assets](https://airtable.com/appn84sqPw03zEbTT/tblhMLKxQK77agtME)

**Note:** Historical Canonical values on assets uploaded before the deletion are **not** recoverable from the deleted field. Assets that never finished writeback (including this fixture) are fine to re-upload.

## Lambda code fix (repo)

- Safe status diagnostics on `error_invalid_upload_status` (no secrets).
- Do **not** re-stamp Error when rejecting invalid starting status.
- Failure writeback **must not overwrite** `Pending Link` or `Uploaded`.
- Map unknown Airtable field errors → `error_missing_airtable_field`.
- `deploy-prod.ps1` `ALLOW_ROUTE_KEYS` includes `homework_completion` (prevents future wipe of homework route).

## Environment / configuration

| Check | Result |
|-------|--------|
| Make → correct Submission Asset ID | Yes (`recAqoUbBKfDNtTLt` in Lambda response) |
| Lambda PROD base | `appn84sqPw03zEbTT` (config / deploy script) |
| Table | `Submission Assets` |
| Field | `Upload Status` (not Upload Error) |
| Cache | None — fresh Airtable GET per invoke |
| Validation | Error still rejected; Pending Link accepted |

Confirm live Lambda env still has `ALLOW_ROUTE_KEYS` containing `homework_completion` after any env update.

Season for S3 keys is resolved from Enrollment → Program Instance → `School Year - Linked`, not from `SEASON_SLUG`. Deploy Lambda code from `2026-08-17-lambda-program-instance-season.md` before retrying this asset.

## Deploy steps (Lambda)

```powershell
cd lambda/upload-asset
.\deploy-prod.ps1 -CodeOnly
# If env must refresh ALLOW_ROUTE_KEYS without wiping secrets, prefer SkipEnvUpdate=false
# only when ops has PROD token + UPLOAD_WEBHOOK_SECRET_PROD available locally.
```

Then smoke Function URL (ops notes) with a Schmidt Pending Link asset — do not print secrets.

## Make scenario

**No email modules.** Upload Engine Lambda scenario only.  
Confirm router allows `automationNumber=070a` **and** `routeKey=homework_completion` (video-only filter must not block homework).  
HTTP module: POST Lambda URL, `X-Upload-Secret`, body = webhook JSON, preserve Lambda JSON on response.

## Airtable paste

- **070a / 070b / 070c:** no paste required for this fix.  
- **071 v4.1:** only after upload success — paste/run per `docs/deploy-checklists/071-v4.1-pha-grade-band-metadata.md`. Do **not** send parent email unless intentionally promoting live send.  
  > **Superseded (2026-09-01):** Production now runs **071 v4.3** (FUT-046). Do **not** paste v4.1.

## Safe retry (Mike — manual)

1. Open [recAqoUbBKfDNtTLt](https://airtable.com/appn84sqPw03zEbTT/tblhMLKxQK77agtME/recAqoUbBKfDNtTLt).
2. Set **Upload Status** = `Pending Link`.
3. Clear **Upload Error**.
4. Clear **Upload Claim Run ID** and **Processing Started At** (stale claim hygiene).
5. Confirm **Canonical File URL** field exists and is blank; attachment still present; HC linked.
6. Refresh and confirm status still **Pending Link**.
7. Run **070a once** for this asset (`automationNumber=070a`).
8. Expect: Upload Status=`Uploaded`, Uploaded At set, Writeback Complete?=1, Reviewer File URL populated (parent/coach safe link). Canonical File URL = private S3 URL.
9. Then re-run **071 v4.1** for `recJE9WJiHfMeJ1cw` (Hub handoff only; leave testMode as configured).
