# SC-007 / SC-008 Reliability Proof Runbook

**Package:** Duplicate/rerun idempotency (SC-007) + email/Make/upload failure paths (SC-008)  
**PROD base:** `appn84sqPw03zEbTT`  
**Schmidt enrollment:** `recgP9qZYjAhE7NXm`  
**Controlling doc:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`

## Safety

- Never log `AIRTABLE_API_TOKEN`, webhook secrets, upload secrets, or reviewer tokens.
- Do not send uncontrolled emails. Schmidt-only recipients for any controlled live send.
- Do not disable live Lambda or Make globally. Prefer mocks + isolated Schmidt records.
- Do not invent new Source Key / dedupe semantics when a product decision is still open.
- SC-150 owns private reviewer links — only touch that path for a verified narrow defect.

## Offline proof packs

```bash
node tools/testing/sc-007-008/run-suite.js
```

Individual packs:

```bash
node tools/testing/sc-007-008/idempotency-proof-pack.test.js
node tools/testing/sc-007-008/failure-path-pack.test.js
```

Lambda auth / viewer / token / homework-route units (invoked from the SC-008 pack):

```bash
cd lambda/upload-asset
python -m unittest tests.test_auth tests.test_viewer tests.test_token tests.test_homework_route
```

## PROD evidence (read-only)

```bash
node tools/testing/sc-007-008/prod-reliability-evidence.mjs --check-anonymous-s3
```

Writes:

- `docs/testing/evidence/2026-08-04-sc-007-008-reliability/PROD-RELIABILITY-EVIDENCE.json`
- `docs/testing/evidence/2026-08-04-sc-007-008-reliability/PROD-RELIABILITY-EVIDENCE.md`

### What it proves

| Check | How |
|-------|-----|
| No duplicate Schmidt XP Source Keys | Inventory scan |
| WAS uniqueness (Enrollment+Week) | Group scan |
| Homework XP key for known HC | `recrBnHbLvDpFyIeO` → `rec6xE4V1t0atiTIP` |
| Upload success contract on known asset | `recaXBfjeeu3bcm0t` |
| Private Canonical URL | Anonymous GET → expect 403/AccessDenied |
| Reviewer File URL | GET → expect 302 to presigned S3 (token redacted in evidence) |

## Controlled live failure inject (optional — Mike authorize)

Prefer offline packs first. If a live inject is needed:

1. **Weekly email webhook failure:** use a temporary invalid `makeWebhookUrl` input on **074** for a Schmidt WAS that is Ready + !Sent. Confirm `Send to Make?` stays checked and `Weekly Email Error` is set. Restore webhook; re-run **074** once; confirm single Live writeback Sent? and no second `WEEKLY_EMAIL|{enr}|{week}` send. SOP: `docs/next-wave/was-email/WEEKLY-EMAIL-RETRY-SOP.md` / SCN-029.
2. **Invalid upload secret:** call Lambda Function URL with wrong `X-Upload-Secret` against a Schmidt asset in Pending Link — expect 401; asset must not flip to Uploaded. Do not change the live secret.
3. **Unsupported route:** POST with a routeKey not in `ALLOW_ROUTE_KEYS` — expect rejection; no S3 object.
4. **Wrong / missing reviewer token:** open Reviewer File URL with token stripped or altered — expect 401/403 from viewer; Canonical URL remains anonymous-inaccessible.

Rollback: restore automation inputs; leave Upload Status alone if already Uploaded; do not clear Weekly Email Sent? on a real Sent week.

## Canonical dedupe keys (SC-007)

| Path | Key | Writer |
|------|-----|--------|
| Daily XP | `SUBMISSION_XP\|{submissionId}` | 010 |
| Homework HC | Enrollment+Week+Homework / Submission+HW slot | 020 / 067 |
| Homework XP | `HOMEWORK_XP\|{hcId}` | 065 |
| Video XP | `VIDEO_SUBMISSION\|{vfId}` | 114 |
| Zoom credit | `ZOOM_CREDIT\|{enr}\|`{meeting}` | 117 / 117c (one ON) |
| Streak | `STREAK_XP\|{enr}\|`{ach}`\|`{endDate}` | 054 |
| Milestone | `SHOT_MILESTONE\|{enr}\|`{ms}` | 066 → 059 |
| WAS | Enrollment+Week | 031 |
| Weekly email | `WEEKLY_EMAIL\|{enr}\|`{week}` | 072/074 + Make |

Live Zoom recording XP uses **`ZOOM_CREDIT`**, not the legacy contract alt `ZOOM_RECORDING`.

## Upload success contract (SC-008)

| Field | Expected |
|-------|----------|
| Upload Status | `Uploaded` |
| Send to Make Trigger | unchecked |
| Upload Error | blank |
| Canonical File URL | populated (private S3 identity) |
| Storage Key | populated |
| Uploaded At | populated |
| Reviewer Access Token | populated |
| Reviewer File URL | populated (formula) |

Helper: `evaluateFinalUploadSuccessContract` in `lib/upload-make-lambda-response.js` (does not change 070c writeback gates).

Confirm no Airtable automation writes Uploaded → Processing after Lambda success.
