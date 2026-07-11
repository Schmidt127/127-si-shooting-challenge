# C-013 — PROD Lambda smoke test results

**Date:** 2026-07-11  
**Overall:** **PASS**  
**GO for Make smoke:** **YES** (070b remains **OFF**)  
**Machine-readable:** [C-013-prod-lambda-smoke-result-2026-07-11.json](../audits/C-013-prod-lambda-smoke-result-2026-07-11.json)  
**Deployment record:** [C-013-prod-lambda-deployment-2026-07-11.md](../deploy-checklists/C-013-prod-lambda-deployment-2026-07-11.md)

---

## Fixture (Schmidt Testing only)

| Record | ID |
|--------|-----|
| Enrollment | `recgP9qZYjAhE7NXm` |
| Submission Asset | `recGQ8EjAMz3bEBiW` |
| Video Feedback | `recrvEzk8GxXfy3EE` |
| Submission | `recM0GbWfptu06da1` |

---

## Results

| Test | Result | Evidence |
|------|--------|----------|
| Missing secret | **PASS** | HTTP 401 · `error_unauthorized` |
| Wrong secret | **PASS** | HTTP 401 · `error_unauthorized` |
| Unsupported route | **PASS** | HTTP 400 · `error_invalid_route` |
| Direct upload | **PASS** | `actionOut=uploaded` · `allPass=true` |
| S3 | **PASS** | Key under `2025-2026/.../schmidt-testing/` · 67730 bytes · `image/png` |
| Airtable writeback | **PASS** | Probe `allPass=true` on `recGQ8EjAMz3bEBiW` |
| Idempotency | **PASS** | `skipped_already_uploaded` |
| Error writeback | **PASS** | Missing attachment → `Error` + Upload Error |

**Expected storage key pattern:**

`shooting-challenge/2025-2026/shooting-challenge/schmidt-testing/{date}-video-feedback-recGQ8EjAMz3bEBiW-BlueOrangeCircleLogo.png`

**SHA-256:** `448c3126df730cf6b0cf6875f77f1f726b1fa3a2b4c36bb631b326981b25f967`

---

## Make PROD package (scenario OFF)

| Setting | Value |
|---------|--------|
| **Name** | `Shooting Challenge - GAME - Upload Engine - Lambda - v1` |
| **Status** | Not built |

**Module chain:** Webhook → Router (`070b` + `video_feedback`) → HTTP POST `LAMBDA_FUNCTION_URL_PROD` with header `X-Upload-Secret: {{UPLOAD_WEBHOOK_SECRET_PROD}}` → Router 2xx → Webhook response **= Lambda JSON body**.

**Body:** Map entire webhook JSON from module 1 (070b v4.2 shape).

**Timeout:** ≥ 120 s (match Lambda).

**Failure handling:** Non-2xx branch must not return success; log Make HTTP status + body (no secrets).

**070b enable:** **NOT authorized** until Make manual webhook PASS + Mike explicit approval.

---

## Rollback verified

| Action | Method |
|--------|--------|
| Lambda throttle | `put-function-concurrency 0` |
| 070b / 070a | Remain **OFF** |
| Fixture reset | Patch asset to `Pending Link` or delete test rows only |
| Code rollback | Redeploy prior Lambda version by `CodeSha256` |

---

## Local artifacts (not committed)

`tools/airtable/_preview/c013-prod-smoke-*.json` · `c013-prod-deploy-session.local.json` (URL + secret)
