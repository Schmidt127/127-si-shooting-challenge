# LEAD-AUTHORIZED-START — Overnight V2 Continuous Run

**Project:** 127 SI Shooting Challenge V2  
**Lead branch:** `overnight/lead-integration`  
**Starting SHA:** `ba6c8440890e4db97e65c48224250dc02bb961a0`  
**Authorized at (UTC):** 2026-07-13T00:00:00Z (approx)  
**Lead agent:** Cursor Lead (continuous queue)  
**Authorization status:** **AUTHORIZED — Workers A–D may begin Stage 1**

---

## Confirmed baseline (do not contradict)

| Item | Status |
|------|--------|
| DEV homework upload E2E | **PASS** |
| Flow | 070a → DEV Make → DEV Lambda → S3 → Airtable writeback |
| Make response mode | **Synchronous Lambda JSON** (Module 16 `{{14.data}}`) |
| 070c on current DEV path | **Not required** |
| Writeback fields | Upload Status, Canonical File URL, Storage Key, File Content Hash, File Hash Algorithm, Uploaded At — **confirmed** |
| 022 child sync | Canonical URL synced to Homework Completion |
| PROD | **Prohibited** — no Airtable, Make, Lambda, or web changes |

**Hard rules (all workers + lead):** No PROD · no master merge · no force push · no `reset --hard` · no record/S3 deletion · no automatic duplicate blocking tonight · no stash restore · no unrelated untracked file edits · every task → result file + commit + push + tests.

---

## Operating model

- **Lead** works only on `overnight/lead-integration` for integration, review, queue updates.
- **Workers A–D** each use a **dedicated branch** created from starting SHA `ba6c844`.
- **No worker may checkout or commit in the Lead working tree.**
- Workers continue to **second and third assignments** after Lead integrates Stage 1 (queue below).
- Lead publishes integration gates; workers do not self-merge to lead.

---

## Stage 1 queue — C-023 file hash duplicate detection

**Owner decisions (locked tonight):**

- Detect duplicate SHA-256 hashes.
- Mark likely duplicates as **Needs Review** (via `Potential Asset Reuse?` / review fields — not upload block).
- Do **not** delete files or records.
- Do **not** automatically reuse S3 objects.
- Do **not** block valid uploads.
- **DEV and repo only.**

**Existing code context:** `lambda/upload-asset/upload_core/duplicate.py`, `processor.py`, `test_duplicate_review.py`, H3 matrix tooling, C-023 policy docs. Stages 1–5 largely implemented — Stage 1 tonight = complete detection contract, tests, schema/OMNI prep, and documentation alignment.

---

## Worker assignments — Stage 1

### Worker A — Schema, formulas, views, OMNI instructions

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-a-s1-c023-schema` |
| **Base SHA** | `ba6c844` |
| **Assignment** | Inventory Submission Assets duplicate/review fields from **committed** schema sources; document formula/view/trigger implications; produce OMNI-ready UI instructions. |
| **Allowed files** | `docs/deploy-checklists/C-023-dev-omni-*.md` (new), `docs/deploy-checklists/C-023-schema-impact-*.md` (new), `airtable/schema/current/**`, `airtable/schema/notes/**`, `docs/overnight-runs/results/S1-worker-a-result.md` |
| **Read-only** | `airtable/schema/snapshots/c023-stage3-verify-dev/**` (untracked — inventory only; do not commit snapshots without Lead approval) |
| **Prohibited** | `lambda/**`, `make/**`, `tools/airtable/*.py` (except read), `070a-*.js`, `070b-*.js`, `070c-*.js`, `docs/overnight-runs/_live-status-update.md`, `queue.json`, `agent-status.json`, PROD, creating Airtable fields via API |
| **Acceptance** | Result COMPLETE with field inventory table, view/formula recommendations, OMNI step list, trigger implications for 116/022/070a, no invented field names without schema citation |
| **Result file** | `docs/overnight-runs/results/S1-worker-a-result.md` |

### Worker B — Lambda/Make duplicate-hash contract

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-b-s1-c023-lambda-contract` |
| **Base SHA** | `ba6c844` |
| **Assignment** | Document and align Lambda response/writeback contract for hash duplicate detection; ensure flag-only behavior (upload continues, new S3 object, review fields); define Make-visible response fields; small code fixes only if tests prove gap. |
| **Allowed files** | `lambda/upload-asset/upload_core/duplicate.py`, `lambda/upload-asset/upload_core/processor.py`, `lambda/upload-asset/upload_core/fields.py`, `lambda/upload-asset/README.md`, `make/documentation/C-023-*.md` (new/updated), `docs/overnight-runs/results/S1-worker-b-result.md` |
| **Prohibited** | `airtable/automations/**`, `docs/deploy-checklists/C-023-dev-omni-*` (Worker A), `docs/deploy-checklists/C-023-implementation-*` (Worker D), PROD deploy, blocking uploads, S3 object reuse, deleting records |
| **Acceptance** | Contract doc + code/tests pass; `uploadBlocked` remains false; canonical URL always new object; Needs Review fields populated on same-enrollment contextual match |
| **Result file** | `docs/overnight-runs/results/S1-worker-b-result.md` |

### Worker C — Duplicate detection test matrix

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-c-s1-c023-tests` |
| **Base SHA** | `ba6c844` |
| **Assignment** | Add/extend tests for: same file same name, same file renamed, different file same name, retry after success, retry after partial writeback, multi-file one duplicate, missing hash, hash lookup failure. Run full regression (`c070a_overnight_offline_suite.py` + lambda tests). |
| **Allowed files** | `lambda/upload-asset/tests/**`, `tools/airtable/tests/test_c023_*` (new), `tools/airtable/c023_*` (test helpers only), `docs/overnight-runs/results/S1-worker-c-result.md` |
| **Prohibited** | `duplicate.py` logic changes (Worker B owns — coordinate via contract doc), `docs/deploy-checklists/**` (Worker D), automations, PROD smoke with live credentials unless mocked |
| **Acceptance** | All new tests PASS; full suite totals in result; no weakened assertions |
| **Result file** | `docs/overnight-runs/results/S1-worker-c-result.md` |

### Worker D — Implementation docs, audit, architecture cleanup

| Item | Value |
|------|-------|
| **Branch** | `overnight/v2-run/worker-d-s1-c023-docs` |
| **Base SHA** | `ba6c844` |
| **Assignment** | C-023 implementation guide, audit/rollback checklist, update stale upload-architecture docs (070c path rules), readiness/completion criteria for Stage 1. |
| **Allowed files** | `docs/deploy-checklists/C-023-implementation-*.md` (new), `docs/deploy-checklists/C-023-stage6-production-readiness-checklist.md` (append § only), `docs/asset-storage-migration.md`, `docs/overnight-runs/worker-results/**` (read), `docs/overnight-runs/results/S1-worker-d-result.md`, `CHANGELOG.md` (C-023 section only) |
| **Prohibited** | `lambda/**`, `airtable/schema/**`, `docs/deploy-checklists/C-023-dev-omni-*` (Worker A), `_live-status-update.md`, automations |
| **Acceptance** | Implementation doc distinguishes sync JSON vs Accepted paths; rollback steps; Stage 1 completion checklist with explicit open items |
| **Result file** | `docs/overnight-runs/results/S1-worker-d-result.md` |

---

## Known file overlap (Stage 1)

| Path / area | Workers | Resolution |
|-------------|---------|------------|
| `docs/deploy-checklists/C-023-*` | A, D | **A** → `C-023-dev-omni-*`, `C-023-schema-impact-*` · **D** → `C-023-implementation-*`, Stage 6 appendix |
| `lambda/upload-asset/upload_core/duplicate.py` | B, C | **B** owns implementation · **C** tests only (mock/patch) |
| `lambda/upload-asset/tests/test_duplicate_review.py` | B, C | **C** primary author · **B** may add minimal contract asserts if required |
| `docs/asset-storage-migration.md` | D only | — |
| Upload / 070c architecture docs | D only | Align with DEV PASS (sync JSON; 070c Accepted-only) |

**No overlap** between A and B/C on code paths. Lead integrates in order: **B → C → A → D** (contract before tests; docs last).

---

## Stage 2 queue (after Stage 1 Lead integration PASS)

| Worker | Assignment |
|--------|------------|
| A | Inventory Airtable dedupe/source-key fields and automation dependencies (C-024) |
| B | Audit retry behavior across Lambda/Make upload execution |
| C | Rerun/idempotency tests for assets and repair scripts |
| D | Canonical dedupe key patterns and audit requirements doc |

Branches: `overnight/v2-run/worker-{a,b,c,d}-s2-c024-*` from post-Stage-1 lead SHA.

---

## Stage 3 queue (after Stage 2 checkpoint)

- Canonical URL coverage audit
- Attachment-clearing readiness
- Uploaded / Failed / Needs Review operational views spec
- Regression suite expansion
- Stale documentation cleanup

---

## Stop conditions (per-task, not whole run)

Stop **affected task** and notify Lead if:

- PROD access required
- Destructive migration required
- Mike must choose between materially different business behaviors
- Secret exposed
- Schema reality conflicts with documentation (Worker A escalates)
- Two workers would edit same file
- Tests fail with unclear cause

**Blocked worker** → Lead reassigns to another repo-only approved task.

---

## Worker launch checklist

- [x] Starting SHA recorded: `ba6c844`
- [x] Branches named per worker
- [x] Assignments published
- [x] Allowed/prohibited files listed
- [x] Acceptance criteria defined
- [x] Overlap documented
- [x] **AUTHORIZED**

**Workers: create your branch from `ba6c844`, do not touch `overnight/lead-integration`, begin Stage 1.**

---

## Lead immediate actions

1. Commit + push this authorization file on `overnight/lead-integration`.
2. Launch Workers A–D on separate branches.
3. Do not integrate until all four Stage 1 result files exist.
4. Morning output per parent prompt after Stage 1–3 progress.
