# C-013 — PROD Make smoke test results

**Date:** 2026-07-11  
**Last run:** 2026-07-11T15:04:47Z  
**Overall:** **FAIL** (runtime smoke **BLOCKED** — `MAKE_UPLOAD_WEBHOOK_URL_PROD` missing from session file)  
**Package:** **PASS** (tooling, blueprint, runbook, 070b audit)  
**GO for controlled 070b test:** **NO-GO**  
**Machine-readable:** [C-013-prod-make-smoke-result-2026-07-11.json](./C-013-prod-make-smoke-result-2026-07-11.json)  
**Deployment record:** [C-013-prod-make-deployment-2026-07-11.md](../deploy-checklists/C-013-prod-make-deployment-2026-07-11.md)

---

## Executive summary

| Item | Result |
|------|--------|
| Session file keys (2026-07-11 run) | `LAMBDA_FUNCTION_URL_PROD` **CONFIGURED** · `UPLOAD_WEBHOOK_SECRET_PROD` **CONFIGURED** · `MAKE_UPLOAD_WEBHOOK_URL_PROD` **MISSING** · `AIRTABLE_PROD_TOKEN` **CONFIGURED** (via env, not session file) |
| Make scenario built | **NO** (no webhook URL in ops session) |
| Make scenario state | **N/A** |
| Preflight (fixture + script) | **PASS** |
| Manual webhook smoke | **BLOCKED** |
| Complete Lambda JSON via Make | **NOT RUN** |
| Airtable writeback via Make | **NOT RUN** |
| S3 via Make | **NOT RUN** |
| Idempotency via Make | **NOT RUN** |
| Invalid route via Make | **NOT RUN** |
| Automation 070b | **OFF** (unchanged) |

Upstream **direct Lambda smoke PASS** on same fixture — see [lambda smoke result](./C-013-prod-lambda-smoke-result-2026-07-11.md).

---

## Fixture (Schmidt Testing only)

| Record | ID |
|--------|-----|
| Enrollment | `recgP9qZYjAhE7NXm` |
| Submission Asset | `recGQ8EjAMz3bEBiW` |
| Video Feedback | `recrvEzk8GxXfy3EE` |

**Preflight (2026-07-11T15:04:47Z):**

- Enrollment guard: **PASS**
- Upload Destination: **Video Feedback**
- Upload Status: **Uploaded** (direct Lambda test state — reset skipped because smoke blocked)
- Attachment: **present**
- Video Feedback link: **present**
- Send to Make Trigger: **unchecked**
- Script v4.2 verify: **PASS**
- No live athlete records modified

---

## Test matrix

| Test | Result | Notes |
|------|--------|-------|
| Preflight + 070b v4.2 script verify | **PASS** | `c013_prod_make_smoke_run.py preflight` exit 0 |
| Primary upload via Make | **BLOCKED** | `MAKE_UPLOAD_WEBHOOK_URL_PROD` missing |
| Complete Lambda JSON in webhook response | **NOT RUN** | |
| Airtable writeback via Make path | **NOT RUN** | |
| S3 via Make path | **NOT RUN** | |
| Idempotency via Make | **NOT RUN** | |
| Invalid route via Make | **NOT RUN** | |

---

## Session file audit (no secrets printed)

File: `tools/airtable/_preview/c013-prod-deploy-session.local.json`

| Key | Status | Note |
|-----|--------|------|
| `MAKE_UPLOAD_WEBHOOK_URL_PROD` | **MISSING** | Add from Make module 1 Custom webhook after scenario build |
| `LAMBDA_FUNCTION_URL_PROD` | **CONFIGURED** | Verify value starts with `https://` (no leading `/`) |
| `UPLOAD_WEBHOOK_SECRET_PROD` | **CONFIGURED** | |
| `AIRTABLE_PROD_TOKEN` | **Not in session file** | Available via `tools/airtable/.env` or `web/.env.local` |

---

## Remaining blockers

1. Build Make scenario `Shooting Challenge - GAME - Upload Engine - Lambda - v1` per [C-013-prod-make-build-2026-07-11.md](../deploy-checklists/C-013-prod-make-build-2026-07-11.md)
2. Add `MAKE_UPLOAD_WEBHOOK_URL_PROD` to session file
3. Re-run `c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW --reset`
4. Paste 070b v4.2 + configure inputs (automation **OFF**)
5. Create isolation view `C-013 PROD Smoke — Schmidt Testing Only`
6. Mike explicit approval for controlled 070b enable

---

## Exact next prompt (after Make build + webhook URL saved)

```
MAKE_UPLOAD_WEBHOOK_URL_PROD is configured in tools/airtable/_preview/c013-prod-deploy-session.local.json. Run C-013 PROD Make manual webhook smoke on recGQ8EjAMz3bEBiW only (070b OFF): cd tools/airtable; python c013_prod_make_smoke_run.py preflight; python c013_prod_make_smoke_run.py all --asset-id recGQ8EjAMz3bEBiW --reset. Update docs/audits/C-013-prod-make-smoke-result-2026-07-11.md to PASS if complete Lambda JSON returned. Do not enable automation 070b.
```
