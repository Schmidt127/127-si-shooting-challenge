# LEAD-STAGE2-AUTHORIZED — C-024 dedupe keys + idempotency

**Project:** 127 SI Shooting Challenge V2  
**Lead branch:** `overnight/lead-integration`  
**Starting SHA:** `f437d4d` (post Stage 1 integration PASS)  
**Authorized at (UTC):** 2026-07-13T01:30:00Z (approx)  
**Prerequisite:** Stage 1 C-023 integrated — 62/62 lambda, 97/97 offline PASS  
**PROD:** **Prohibited**

---

## Stage 2 goal

Advance **C-024** (rock-solid dedupe keys + safe backfill reruns) in repo/DEV documentation and tests only. C-024 complements C-023: **file bytes** (hash) vs **record identity** (Source Key / dedupe keys).

**Locked tonight:**

- Document every known **Source Key** / dedupe pattern per automation writer
- Audit upload **retry** behavior (Lambda/Make/070a) — no double-write corruption
- Add/extend **idempotency** tests for asset upload + repair paths
- Define requirements for planned `audit-dedupe-key-coverage.js` (dry-run spec — implementation optional if timeboxed)
- No PROD · no schema writes via API · no destructive data changes

---

## Worker assignments — Stage 2

### Worker A — Dedupe field + automation dependency inventory

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-a-s2-c024-inventory` |
| **Base SHA** | `f437d4d` |
| **Assignment** | Inventory dedupe-related fields and automation dependencies across Submissions, Submission Assets, Homework Completions, XP Events, Achievement Unlocks. Map each automation writer (007, 009, 010, 054, 058, 059, 065, 066, 101, 114, 116, 070a/b/c) to its key pattern and recheck behavior. |
| **Allowed files** | `docs/deploy-checklists/C-024-dedupe-field-inventory-stage2.md` (new), `airtable/schema/current/**` (read + cite), `airtable/schema/notes/**`, `docs/overnight-runs/results/S2-worker-a-result.md` |
| **Prohibited** | `lambda/**`, automations logic edits, PROD, `_live-status-update.md`, creating Airtable fields |
| **Acceptance** | Table per table/field; writer matrix with Source Key pattern + recheck-before-create evidence; gaps flagged for Stage 3 audit script |
| **Result file** | `docs/overnight-runs/results/S2-worker-a-result.md` |

### Worker B — Upload retry behavior audit

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-b-s2-c024-retry-audit` |
| **Base SHA** | `f437d4d` |
| **Assignment** | Audit retry/partial-failure behavior: Lambda processor writeback, Make module chain, 070a/070b/070c trigger retention and idempotent re-send. Document safe rerun rules. |
| **Allowed files** | `docs/deploy-checklists/C-024-upload-retry-audit-stage2.md` (new), `make/documentation/C-024-*.md`, `lambda/upload-asset/upload_core/processor.py` (read; minimal comment-only if gap found), `airtable/automations/shooting-challenge/070a-*.js`, `070b-*.js`, `070c-*.js` (read), `docs/overnight-runs/results/S2-worker-b-result.md` |
| **Prohibited** | Automation logic changes without failing test proof, PROD deploy, Worker A inventory doc |
| **Acceptance** | Scenario matrix: success, partial writeback, webhook failure, duplicate trigger check, async vs sync paths; explicit "safe to rerun" verdict per layer |
| **Result file** | `docs/overnight-runs/results/S2-worker-b-result.md` |

### Worker C — Idempotency test expansion

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-c-s2-c024-idempotency-tests` |
| **Base SHA** | `f437d4d` |
| **Assignment** | Add tests for rerun/idempotency: asset upload retries (extend matrix), 070a contract double-send mocks, repair-script key guards (`tools/airtable/c023_*`, prod_116_fixture patterns). Run full regression. |
| **Allowed files** | `lambda/upload-asset/tests/**`, `tools/airtable/tests/test_c024_*` (new), `tools/airtable/tests/test_c023_*`, `web/**/*.test.js` (070a mocks only), `docs/overnight-runs/results/S2-worker-c-result.md` |
| **Prohibited** | `duplicate.py` logic changes, PROD credentials, Worker D contract doc |
| **Acceptance** | New tests PASS; full suite totals in result; assertions strengthen idempotency claims |
| **Result file** | `docs/overnight-runs/results/S2-worker-c-result.md` |

### Worker D — Dedupe key contract + audit requirements

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-d-s2-c024-dedupe-contract` |
| **Base SHA** | `f437d4d` |
| **Assignment** | Author C-024 engine contract: canonical Source Key patterns, backfill rerun standard, `audit-dedupe-key-coverage.js` requirements (tables, checks, dry-run outputs). Cross-link C-023 file-hash layer. |
| **Allowed files** | `docs/deploy-checklists/C-024-dedupe-key-contract-stage2.md` (new), `docs/deploy-checklists/C-024-audit-dedupe-key-coverage-requirements.md` (new), `docs/v2-change-backlog.md` (C-024 status note only), `docs/overnight-runs/results/S2-worker-d-result.md` |
| **Prohibited** | `lambda/**`, automations, Worker A inventory filename, PROD |
| **Acceptance** | Contract distinguishes layers; every pattern cites automation docblock; audit spec implementable by Worker C in Stage 3 |
| **Result file** | `docs/overnight-runs/results/S2-worker-d-result.md` |

---

## Overlap resolution

| Area | Owner |
|------|-------|
| Field inventory | A |
| Retry audit | B |
| Tests | C |
| Contract + audit spec | D |

Lead integrates **D → A → B → C** (contract before inventory alignment; tests last).

---

## Stop conditions

Same as Stage 1 — per-task only. Blocked worker → Lead reassigns.

**Workers: branch from `f437d4d`, begin Stage 2 immediately after reading this file.**
