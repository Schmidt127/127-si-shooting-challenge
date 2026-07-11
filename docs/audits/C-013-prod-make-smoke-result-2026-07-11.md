# C-013 — PROD Make smoke test results

**Date:** 2026-07-11  
**Last run:** 2026-07-11T15:41:40Z
**Overall:** **PASS** (`overallPass=true`)
**Package:** **PASS** (tooling, blueprint, runbook, 070b audit)  
**GO for controlled 070b test:** **CONDITIONAL GO** — rotate exposed upload secret, verify 070b v4.2 UI configuration, then Mike explicitly approves one Schmidt test
**Machine-readable:** [C-013-prod-make-smoke-result-2026-07-11.json](./C-013-prod-make-smoke-result-2026-07-11.json)  
**Deployment record:** [C-013-prod-make-deployment-2026-07-11.md](../deploy-checklists/C-013-prod-make-deployment-2026-07-11.md)

---

## Executive summary

| Item | Result |
|------|--------|
| Session file keys (2026-07-11 run) | All required runtime values **CONFIGURED** (values not committed) |
| Make scenario built | **YES** — `Shooting Challenge - GAME - Upload Engine - Lambda - v1` |
| Make scenario state | Tested successfully; required controlled-test/final state documented below |
| Preflight (fixture + script) | **PASS** |
| Manual webhook smoke | **PASS** |
| Complete Lambda JSON via Make | **PASS** — not generic `Accepted` |
| Airtable writeback via Make | **PASS** — independent probe `allPass=true` |
| S3 via Make | **PASS** — storage key and canonical URL populated |
| Idempotency via Make | **PASS** — `skipped_already_uploaded`; storage key/hash unchanged |
| Invalid route via Make | **PASS** — `error_invalid_route`; canonical/hash preserved |
| Automation 070b | **OFF** (unchanged) |

Upstream **direct Lambda smoke PASS** on same fixture — see [lambda smoke result](./C-013-prod-lambda-smoke-result-2026-07-11.md).

---

## Fixture (Schmidt Testing only)

| Record | ID |
|--------|-----|
| Enrollment | `recgP9qZYjAhE7NXm` |
| Submission Asset | `recGQ8EjAMz3bEBiW` |
| Video Feedback | `recrvEzk8GxXfy3EE` |

**Controlled run (2026-07-11T15:41:40Z):**

- Enrollment guard: **PASS**
- Upload Destination: **Video Feedback**
- Primary upload: **Uploaded**
- Attachment: **present**
- Video Feedback link: **present**
- Send to Make Trigger: **unchecked**
- Script v4.2 verify: **PASS**
- Canonical File URL: **populated** (value omitted)
- Storage Key: **populated** (value omitted)
- File Content Hash: **SHA-256 populated** (value omitted)
- File Hash Algorithm: **SHA-256**
- Uploaded At: **populated**
- Writeback Complete?: **PASS**
- No live athlete records modified

---

## Test matrix

| Test | Result | Notes |
|------|--------|-------|
| Preflight + 070b v4.2 script verify | **PASS** | `c013_prod_make_smoke_run.py preflight` exit 0 |
| Primary upload via Make | **PASS** | HTTP 200 · `statusOut=success` · `actionOut=uploaded` · Lambda `allPass=true` |
| Complete Lambda JSON in webhook response | **PASS** | Top-level Lambda keys preserved |
| Airtable writeback via Make path | **PASS** | Independent probe `allPass=true` |
| S3 via Make path | **PASS** | Canonical URL/storage/hash fields populated |
| Idempotency via Make | **PASS** | `skipped_already_uploaded`; storage key/hash unchanged |
| Invalid route via Make | **PASS** | `error_invalid_route`; expected Upload Status=`Error`; canonical/hash unchanged |

---

## Secret handling

File: `tools/airtable/_preview/c013-prod-deploy-session.local.json`

All required values were configured for the successful run. Values remain local and are not reproduced here.

**Rotation required before Airtable-triggered activation:** the production upload secret was displayed in local/chat output during preparation. Rotate the same new value in:

1. AWS Lambda `127si-upload-asset` environment variable `UPLOAD_WEBHOOK_SECRET`
2. Make HTTP module header `X-Upload-Secret`
3. `tools/airtable/.env` / local session value used by smoke tooling

Re-run authorization + manual webhook smoke after rotation.

---

## Remaining operational gates

1. Rotate the exposed production upload secret in the three locations above
2. Re-run manual Make smoke after rotation
3. Verify/paste 070b v4.2 + inputs in Airtable UI (automation **OFF**)
4. Create/verify isolation view `C-013 PROD Smoke — Schmidt Testing Only`
5. Mike explicitly approves one controlled Airtable-triggered Schmidt test
6. Run the test, verify fields, then leave 070b and Make in the approved final state

---

## Exact next prompt (after secret rotation)

```
Production upload secret rotation is complete in AWS Lambda, Make X-Upload-Secret, and local tools/airtable/.env. Re-run the C-013 PROD manual Make smoke on recGQ8EjAMz3bEBiW with 070b OFF. If overallPass=true, verify the 070b v4.2 Airtable UI configuration and isolation view, then stop for Mike's explicit approval before enabling 070b for one Schmidt test.
```
