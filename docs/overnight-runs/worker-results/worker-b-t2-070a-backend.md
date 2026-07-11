# Worker B result — T2 — 070a DEV Make/Lambda homework backend

**Task ID:** T2  
**Cloud task:** `[OVERNIGHT][T2][Worker-B] 070a DEV Make/Lambda homework backend route`  
**Agent:** Worker B  
**Branch:** `overnight/worker-b-070a-backend`  
**Commit SHA (branch tip):** `ab1bf46e55a09084f196a40593bce80f66a6874d`  
**Implementation commit:** `2235340c8523b3ecde095bc63941fd0be206e580`  
**Result-doc commits:** `2d551e4` → `ab1bf46` (this tip)  
**Completed at:** 2026-07-11 (overnight run)  
**Worker A result:** Not published yet (branch `overnight/worker-a-070a-airtable` not on remote; used existing 070a v4.1 / Lambda `homework_completion` contract)

---

## Summary

Shipped the smallest complete **DEV** Make/Lambda homework backend pack aligned to the proven C-013 video architecture:

- Route key: **`homework_completion`**
- Automation number: **`070a`**
- Destination: **Homework Completions**
- Transport: Make webhook → router → HTTP POST DEV Lambda → S3 + Airtable writeback

Lambda processor already supported this route on master (`ALLOW_ROUTE_KEYS` includes `homework_completion`; `test_homework_route.py` green). T2 focused on **Make DEV blueprint + smoke tooling + docs** under assigned locks. **Did not edit `070a-*.js`.**

---

## Files and systems touched

### Repo (this branch)

| Path | Change |
|------|--------|
| `make/blueprints/upload-asset-engine-lambda-dev-v1.template.json` | **Added** — sanitized DEV dual-route template |
| `make/documentation/C-013-dev-070a-homework-lambda-runbook.md` | **Added** — Mike Make UI + smoke runbook |
| `docs/deploy-checklists/C-013-dev-070a-make-lambda-homework-route.md` | **Added** — promotion/checklist |
| `make/test-payloads/homework-completion-070a-dev.sample.json` | **Added** — sample webhook JSON |
| `tools/airtable/c013_dev_make_homework_webhook_post.py` | **Added** — Make webhook poster for 070a |
| `tools/airtable/c013_dev_h1_homework_smoke.py` | **Added** — preflight / prepare / make / lambda smoke |
| `tools/airtable/tests/test_c013_dev_homework_make_smoke.py` | **Added** — offline unit tests |
| `make/blueprints/README.md`, `make/documentation/README.md`, `make/test-payloads/README.md` | Index updates |
| `tools/airtable/README.md`, `tools/airtable/.env.example` | Smoke docs + env comments |
| `lambda/upload-asset/README.md` | Document dual-route Make filter |
| `CHANGELOG.md` | Make section entry |
| `docs/overnight-runs/worker-results/worker-b-t2-070a-backend.md` | This result file |

### Systems

| System | Action |
|--------|--------|
| GitHub issues | Created #8 (Make-DEV), #9 (AWS-DEV) — assignee API denied; bodies request `@Schmidt127` |
| Make.com DEV | **Not modified** (no UI/API access) — manual patch documented |
| AWS DEV Lambda | **Not modified** — code already supports route; env confirm is manual |
| Airtable DEV/PROD | **Not modified** — 070a remains OFF; script not edited |
| PROD Make / AWS / Airtable | **Not modified** |

---

## Tests and smoke results

| Suite | Result |
|-------|--------|
| `python3 -m unittest discover -s lambda/upload-asset/tests -p 'test_*.py'` | **38/38 PASS** (includes homework route) |
| `python3 -m unittest tools/airtable/tests/test_c013_dev_homework_make_smoke.py -v` | **8/8 PASS** |
| `python3 tools/airtable/c013_dev_h1_homework_smoke.py preflight` | **FAIL expected** — all required DEV env keys absent |

### Preflight evidence (sanitized)

```json
{
  "envPresent": {
    "AIRTABLE_TOKEN": false,
    "MAKE_DEV_UPLOAD_WEBHOOK_URL": false,
    "UPLOAD_WEBHOOK_SECRET": false,
    "LAMBDA_FUNCTION_URL": false
  },
  "allRequiredPresent": false
}
```

Live Make webhook / Lambda Function URL / Airtable probe smokes **not run** (credentials missing).

---

## DEV evidence

- Architecture mirrors C-013 Stage 4D video path (see `docs/deploy-checklists/C-013-dev-make-lambda-scenario-prep.md`).
- Lambda route constants already define `ROUTE_HOMEWORK_COMPLETION` (`routeKey=homework_completion`, `automation_number=070a`).
- `deploy.ps1` already sets `ALLOW_ROUTE_KEYS=video_feedback,homework_completion` for DEV.
- No live DEV upload execution in this agent session.

---

## Blockers

| Issue | Title | Labels |
|-------|-------|--------|
| [#8](https://github.com/Schmidt127/127-si-shooting-challenge/issues/8) | `[OVERNIGHT][T2][Make-DEV] Patch Module 2 router for homework_completion (070a)` | `overnight-blocker`, `overnight-run` |
| [#9](https://github.com/Schmidt127/127-si-shooting-challenge/issues/9) | `[OVERNIGHT][T2][AWS-DEV] Missing DEV upload credentials in Worker B cloud env` | `overnight-blocker`, `overnight-run` |

Assignee: requested `@Schmidt127` in issue body (GitHub App lacked `replaceActorsForAssignable`).

---

## Exact manual actions (Mike)

### Make DEV (#8)

1. Open **`Shooting Challenge - DEV - Upload Engine - Lambda - v1`** (DEV only).
2. Module 2 — add filter/branch: `automationNumber=070a` **AND** `routeKey=homework_completion`.
3. Wire to existing Module 3 HTTP → DEV Lambda (same as video).
4. Prefer webhook response = **complete Lambda JSON**.
5. Save; scheduling OFF; Run once only.
6. Confirm Lambda `ALLOW_ROUTE_KEYS` includes `homework_completion`.
7. Store webhook URL locally as `MAKE_DEV_UPLOAD_WEBHOOK_URL` — never commit.
8. **Do not enable Airtable 070a** until smoke PASS + approval.

### AWS / credentials (#9)

1. Provision DEV-only env into cloud or local ops: `AIRTABLE_TOKEN`, `LAMBDA_FUNCTION_URL`, `UPLOAD_WEBHOOK_SECRET`, `MAKE_DEV_UPLOAD_WEBHOOK_URL` (+ optional AWS keys).
2. Re-run:

```powershell
cd tools/airtable
python c013_dev_h1_homework_smoke.py preflight
python c013_dev_make_homework_webhook_post.py <pendingHomeworkAssetId>
python _probe_c013_asset_storage_fields.py --record-id <pendingHomeworkAssetId>
```

---

## Explicit PROD statement

**PROD was not modified.** No PROD AWS, Make, Airtable, webhook, Lambda, or automation changes were made in this task. Protected PROD evidence record `recGQ8EjAMz3bEBiW` was not touched.

---

## Locks respected

- Used: `L-070a-make-dev`, `L-070a-lambda-dev` (tools/docs/smoke only)
- Did **not** edit: `070a-*.js`, `queue.json`, overnight main log, `manual-actions-*.md`
- Did **not** begin C-023 implementation
- Did **not** delete data/S3 objects
