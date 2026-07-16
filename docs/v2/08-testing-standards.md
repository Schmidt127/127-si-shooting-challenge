# 08 — Testing Standards

**Status:** Active — audit and integrity practices (integrity over unit tests).

**Last updated:** 2026-07-06 (C-020 Engineering Test Framework; golden test dataset in Constitution)

**Engineering authority:** [../ENGINEERING_CONSTITUTION.md](../ENGINEERING_CONSTITUTION.md) § Golden Test Dataset

---

## Philosophy

**Trust is everything.** Data integrity checks (extension audits + Python tools) are the primary “tests” for this system. Safe backfills require dry-run before any write.

---

## Core principle: fix the audit, not the data

**When an audit flags rows but investigation shows the data is correct, fix the audit — do not “repair” valid data to satisfy an outdated check.**

| Situation | Correct response |
|-----------|------------------|
| Audit uses wrong dedupe key (e.g. Enrollment+Achievement+Week for shot milestones) | Update audit logic to match current business rules |
| Business rules evolved; old audit assumption no longer holds | Document the rule change; update audit + [03-business-rules.md](./03-business-rules.md) if needed |
| True duplicate rows (same Source Key, same source record) | Safe backfill or manual delete **after** dry-run proves orphan risk |

**Example (2025–26):** H-001 — 090F flagged 9 “duplicate” unlock groups. Live investigation showed **multiple legitimate shot milestones in the same week** (unique `Milestone Source Key` each). **No rows deleted.** Audit updated to dedupe shot milestones on Source Key only.

**Before any backfill that deletes or merges rows:** Confirm the audit failure is a **true positive**, not a false positive from an evolved rule.

---

## Audit-first workflow

1. Run **audit** extension script (dry-run) → JSON with counts and sample record IDs.
2. **Investigate** — if counts look wrong, re-read business rules before assuming data is broken.
3. Fix via **safe-backfill** with `DRY_RUN=true`, then `CONFIRM_WRITE=true` in batches — **only for true positives**.
4. Re-run audit until clean (or until remaining flags are accepted/documented).
5. Run **field coverage** / legacy cleanup when appropriate.

---

## Canonical sources

| Doc | Content |
|-----|---------|
| [../../airtable/extension-scripts/audits/README.md](../../airtable/extension-scripts/audits/README.md) | **Pipeline audits Stages A–J + 090** |
| [../../airtable/extension-scripts/safe-backfills/README.md](../../airtable/extension-scripts/safe-backfills/README.md) | Backfill run order |
| [../airtable/stage-j-legacy-cleanup.md](../airtable/stage-j-legacy-cleanup.md) | Stage J field cleanup |
| [../post-close-hygiene-2025-26.md](../post-close-hygiene-2025-26.md) | 2025–26 hygiene backlog |
| [../../tools/airtable/README.md](../../tools/airtable/README.md) | Python schema export and close-out tools |
| [../../.github/workflows/web.yml](../../.github/workflows/web.yml) | Web CI (lint, typecheck, test) |
| [../V2_RELEASE_CHECKLIST.md](../V2_RELEASE_CHECKLIST.md) | V2 release / promote checklist |
| [../V2_END_TO_END_TEST_MATRIX.md](../V2_END_TO_END_TEST_MATRIX.md) | Athlete-scenario launch matrix |
| [./V2_DEV_EXECUTION_RUNBOOK.md](./V2_DEV_EXECUTION_RUNBOOK.md) | Executable DEV runbook — mode taxonomy, fixtures, setup/cleanup |
| [./V2_LAUNCH_SMOKE_TESTS.md](./V2_LAUNCH_SMOKE_TESTS.md) | Launch smoke subset before PROD promotion |
| [../../tools/airtable/v2_dev_runbook/](../../tools/airtable/v2_dev_runbook/) | Offline fixtures + classification + plan printer |
| [../../airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js](../../airtable/automations/shooting-challenge/lib/v2-engine-contracts.test.js) | Repo-level XP/gate/streak/date contract tests (no live Airtable) |
| [../../tools/validate-v2-release-readiness.js](../../tools/validate-v2-release-readiness.js) | Safe docs/automation consistency validator |

---

## Pre-season checklist (2026–27)

- Stages A–J on **dev** base first, then **prod**, with test enrollments.
- Final 090A–090G adapted for new season.
- Schema export to `airtable/schema/snapshots/`.
- Re-verify audit dedupe keys match [03-business-rules.md](./03-business-rules.md) Source Key patterns.

Dev base setup: [development-base-setup.md](../development-base-setup.md) (V2-015).

---

## Test Intake harness (C-020) — Engineering Test Framework

**Table name:** **Testing Scenarios** (not Test Intake).  
**Script:** **Paused** — see [checklist](../deploy-checklists/C-020-testing-scenarios-script-checklist.md) and [Phase 2B review](../phase-2b-engineering-review-2026-07-06.md) § C-020 gaps.

| Rule | Standard |
|------|----------|
| Environment | **DEV first** |
| Pipeline tables | **No** test fields — production-shaped records only |
| **Testing Scenarios only** | Scenario Type, Test Status, Expected Result, Actual Result, Pass/Fail Notes, Last Run fields |
| Testing views | Filter by **Related Enrollment** / test enrollment link |
| **Testing Scenario Library** | Future option — **do not build now** |

---

## Full standalone doc

_Make webhook smoke tests: [development-base-setup.md](../development-base-setup.md) Step 3._
