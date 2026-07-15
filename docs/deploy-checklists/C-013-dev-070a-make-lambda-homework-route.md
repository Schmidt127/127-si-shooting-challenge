# C-013 — DEV 070a Make/Lambda homework route checklist

**Date:** 2026-07-11 · **Updated:** 2026-07-12  
**Overnight task:** T2 (Worker B) · branch `overnight/worker-b-070a-backend`  
**Status:** Repo deliverables complete · **DEV Make scenario missing** (Mike 2026-07-12) · create DEV scenario before #8 · then credentials/smoke  
**Create-DEV gate:** [C-013-create-dev-make-upload-scenario.md](./C-013-create-dev-make-upload-scenario.md)  
**Runbook:** [C-013-dev-070a-homework-lambda-runbook.md](../../make/documentation/C-013-dev-070a-homework-lambda-runbook.md)  
**Blueprint:** [upload-asset-engine-lambda-dev-v1.template.json](../../make/blueprints/upload-asset-engine-lambda-dev-v1.template.json)

**Hard stops:** DEV `appTetnuCZlCZdTCT` only · 070a OFF · **do not edit** PROD `Shooting Challenge - GAME - Upload Engine - Lambda - v1` / `C-013 PROD S3 Upload Webhook` · no `070a-*.js` edits · no C-023 implementation · no deletes

---

## Goal

Smallest complete DEV backend for homework uploads:

```text
070a JSON (routeKey=homework_completion)
  → DEV Make Upload Engine Lambda scenario
  → DEV Lambda (ALLOW_ROUTE_KEYS includes homework_completion)
  → S3 + Submission Assets writeback
```

Align with proven C-013 video path (Module 1 webhook → router → HTTP Lambda → JSON response).

---

## Repo checklist

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Lambda homework route unit tests (`test_homework_route.py`) | already on master | **PASS** (included in 38/38) |
| 2 | DEV Make blueprint with dual routes | Worker B | **DONE** |
| 3 | DEV homework Make runbook | Worker B | **DONE** |
| 4 | `c013_dev_make_homework_webhook_post.py` | Worker B | **DONE** |
| 5 | `c013_dev_h1_homework_smoke.py` + offline unit tests | Worker B | **DONE** |
| 6 | Sample payload `homework-completion-070a-dev.sample.json` | Worker B | **DONE** |

---

## Mike / live DEV checklist

| # | Action | System | Status |
|---|--------|--------|--------|
| 0 | **Create** Make scenario `Shooting Challenge - DEV - Upload Engine - Lambda - v1` with **new** DEV webhook (do **not** edit PROD GAME scenario) | Make DEV | ☐ **GATE** — see create-dev checklist |
| 1 | Ensure cloud/local agent has DEV `.env`: `AIRTABLE_TOKEN`, `MAKE_DEV_UPLOAD_WEBHOOK_URL` (**DEV webhook only**), `UPLOAD_WEBHOOK_SECRET`, `LAMBDA_FUNCTION_URL`, optional AWS keys | Local ops | ☐ Blocked if missing |
| 2 | Confirm DEV Lambda `ALLOW_ROUTE_KEYS=video_feedback,homework_completion` | AWS DEV | ☐ |
| 3 | On the **new DEV** scenario, Module 2 includes `070a` + `homework_completion` (same HTTP→Lambda chain as video) | Make DEV | ☐ (included in Phase 0 create) |
| 4 | Manual Run once + `python c013_dev_make_homework_webhook_post.py <asset>` | Make + tools | ☐ |
| 5 | Probe `allPass=true`; attachment retained | Airtable DEV | ☐ |
| 6 | Keep Airtable **070a OFF** until approval | Airtable DEV | **Enforced** |

---

## Pass criteria (live)

1. Make HTTP 200 with Lambda JSON `actionOut=uploaded` (or skipped idempotent)
2. `routeKey=homework_completion` · `automationNumber=070a`
3. `_probe_c013_asset_storage_fields.py` → `writebackVerification.allPass=true`
4. No PROD changes

---

## Rollback

1. Remove or disable homework Module 2 branch in Make (video path unchanged)
2. Keep **070a OFF**
3. Do not rotate PROD secrets; DEV secret rotation only if exposed

---

## Related worker results

- Worker A (070a script): `docs/overnight-runs/worker-results/worker-a-t1-070a-airtable.md` (read when published)
- This task: `docs/overnight-runs/worker-results/worker-b-t2-070a-backend.md`
