# C-013 — PROD Make smoke test results

**Date:** 2026-07-11  
**Overall:** **FAIL** (runtime smoke **BLOCKED** — Make scenario not built)  
**Package:** **PASS** (tooling, blueprint, runbook, 070b audit)  
**GO for controlled 070b test:** **NO-GO**  
**Machine-readable:** [C-013-prod-make-smoke-result-2026-07-11.json](./C-013-prod-make-smoke-result-2026-07-11.json)  
**Deployment record:** [C-013-prod-make-deployment-2026-07-11.md](../deploy-checklists/C-013-prod-make-deployment-2026-07-11.md)

---

## Executive summary

| Item | Result |
|------|--------|
| Make scenario built | **NO** |
| Make scenario state | **N/A** (not created) |
| `LAMBDA_FUNCTION_URL_PROD` | **CONFIGURED** |
| `UPLOAD_WEBHOOK_SECRET_PROD` | **CONFIGURED** |
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | **MISSING** |
| Manual webhook smoke | **BLOCKED** |
| Complete Lambda JSON via Make | **NOT TESTED** |
| Idempotency via Make | **NOT TESTED** |
| Invalid route via Make | **NOT TESTED** |
| Automation 070b | **OFF** (unchanged) |

Upstream **direct Lambda smoke PASS** on same fixture — see [lambda smoke result](./C-013-prod-lambda-smoke-result-2026-07-11.md).

---

## Fixture (Schmidt Testing only)

| Record | ID |
|--------|-----|
| Enrollment | `recgP9qZYjAhE7NXm` |
| Submission Asset | `recGQ8EjAMz3bEBiW` |
| Video Feedback | `recrvEzk8GxXfy3EE` |

**Preflight (2026-07-11):**

- Enrollment guard: **PASS**
- Upload Destination: **Video Feedback**
- Upload Status: **Uploaded** (from direct Lambda test — reset required before Make upload smoke)
- Attachment: **present**
- Video Feedback link: **present**
- Send to Make Trigger: **unchecked**
- Probe `allPass`: **true** (direct Lambda writeback)

---

## Test matrix

| Test | Result | Notes |
|------|--------|-------|
| Preflight + 070b v4.2 script verify | **PASS** | GitHub `version: "v4.2"` |
| Primary upload via Make | **BLOCKED** | No webhook URL |
| Complete Lambda JSON in webhook response | **NOT RUN** | |
| Airtable writeback via Make path | **NOT RUN** | Direct Lambda writeback PASS |
| S3 via Make path | **NOT RUN** | Direct Lambda S3 PASS |
| Idempotency via Make | **NOT RUN** | |
| Invalid route via Make | **NOT RUN** | |

---

## 070b v4.2 handoff expectations (verified from script)

| Scenario | Expected 070b outcome |
|----------|---------------------|
| Lambda `uploaded` + `allPass=true` | Verified success · clear Send to Make Trigger |
| `skipped_already_uploaded` | Verified success |
| Generic HTTP 200 `Accepted` | `error_lambda_response_unverified` |
| Malformed JSON | `error_lambda_response_invalid` |
| Lambda `error_*` | Failure · trigger retained |

---

## Make scenario specification (ready to build)

| Item | Value |
|------|--------|
| **Name** | `Shooting Challenge - GAME - Upload Engine - Lambda - v1` |
| **State after build** | **OFF** |
| **Blueprint** | `make/blueprints/upload-asset-engine-lambda-prod-v1.template.json` |
| **Runbook** | `make/documentation/C-013-prod-upload-engine-lambda-runbook.md` |

---

## Rollback

Unchanged from Lambda deployment — **070b OFF** · Make OFF when built · Lambda throttle available.

---

## Remaining blockers

1. Mike builds Make scenario in UI
2. Webhook URL stored in ops session file
3. Manual Make webhook smoke PASS on `recGQ8EjAMz3bEBiW`
4. Mike explicit approval for controlled 070b enable

---

## Exact next prompt (after Make build)

```
MAKE_UPLOAD_WEBHOOK_URL_PROD is configured in tools/airtable/_preview/c013-prod-deploy-session.local.json. Run C-013 PROD Make manual webhook smoke on recGQ8EjAMz3bEBiW only (070b OFF): c013_prod_make_smoke_run.py all --reset. Update docs/audits/C-013-prod-make-smoke-result-2026-07-11.md to PASS if complete Lambda JSON returned. Then prepare controlled 070b enablement — do not turn 070b ON without my explicit approval.
```
