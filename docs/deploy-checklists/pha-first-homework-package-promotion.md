# PHA-first homework package — DEV → PROD promotion

| Field | Value |
|-------|--------|
| Date | 2026-08-10 |
| Package | **005 v5.3** · **020 v3.5** · **067 v3.4** · **115 v2.0** |
| Repository status | **Built / Verified** (offline tests PASS) |
| Completion Master | **Do not** mark Installed or Live Tested until Mike captures live evidence |
| PROD base | `appn84sqPw03zEbTT` |
| DEV base | per `docs/PROJECT_STATE.md` |

## Purpose

`Submissions.Homework Name 1/2` store **Program Homework Assignment (PHA) record IDs**, not Homework Library IDs. Automations validate PHA directly, dereference library content from `PHA.Homework Assignment`, and write both IDs on Homework Completions. **067 v3.4** adds fail-closed validation for quiz-linked and discovered Homework Completions (Enrollment + Week + Library + PHA exact match; duplicate matches fail closed).

## Expected PHA and Library IDs (controlled proof)

| Role | Record ID | Notes |
|------|-----------|--------|
| Program Instance (Schmidt 3-4 Early Bird) | `rec5mEM0YPqPqq0hZ` | Enrollment PI |
| Week (HW17 schedule) | `recWeVrSabnsYaHc2` | Fixture week; prod failing case used `recBrZ1sV8byWEHZU` — confirm active JIT PHA Week in DEV before test |
| PHA HW1 (HW17 slot) | `recgj8dPk4ouTwCOj` | Fillout / ETF must write this RID to Homework Name 1 |
| Homework Library HW17 | `rechVLOeyEVIqmy2v` | Derived from PHA; never written to Homework Name 1/2 |
| Homework Library HW2 | `rec6WmXjpLtIWDERo` | Second slot reference |
| Controlled Enrollment | `recCyFEPeATOVNlr9` | Schmidt test athlete |

## DEV paste order (required)

Paste **only** the production docblock through end of script (skip GitHub header). Save each automation before pasting the next.

| Order | Automation | Version | Script file |
|-------|------------|---------|-------------|
| 1 | **005** — Submission Intake — Assign Week | **v5.3** | `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| 2 | **020** — Homework — Link or Create Homework Completion | **v3.5** | `020-homework-link-or-create-homework-completion.js` |
| 3 | **067** — Homework — Link or Create Completion from Reflection Quiz | **v3.4** | `067-homework-link-or-create-completion-from-reflection-quiz.js` |
| 4 | **115** — Engineering Test Framework — Run Testing Scenario | **v2.0** | `115-engineering-test-framework-run-testing-scenario-daily-submission.js` |

**009** unchanged — compatible slot guard; no paste required for this package.

After **115** paste: update **Testing Scenarios** Homework rows so `Homework Assignment` = PHA RID (not library RID).

## Controlled test sequence (DEV)

Run in order after full DEV paste. Capture automation run history JSON (statusOut, actionOut, errorOut, debugStep, version).

### A — Submission intake chain (005 → 009 → 020)

1. Create or reuse a **Testing Scenario** / controlled Fillout submission with `Homework Name 1` = `recgj8dPk4ouTwCOj` (PHA).
2. Trigger **005** on the Submission — expect `statusOut=success`, `homework1PhaId=recgj8dPk4ouTwCOj`, `homework1LibraryId=rechVLOeyEVIqmy2v`.
3. Let **009** create assets — expect exactly one homework asset link per slot.
4. Trigger **020** on the asset — expect HC with `Homework=rechVLOeyEVIqmy2v`, `Program Homework Assignment=recgj8dPk4ouTwCOj`.
5. **Replay** the same Submission/asset — expect idempotent skip/link, **no duplicate HC**.

### B — HW17 reflection quiz (067)

1. Final Reflection Quiz Submission on Enrollment `recCyFEPeATOVNlr9` with no HC link (or legacy HC with blank PHA only).
2. Trigger **067** — expect `statusOut=success`, `phaId=recgj8dPk4ouTwCOj`, `libraryId=rechVLOeyEVIqmy2v`, HC created or linked with both IDs.
3. **Replay** same quiz row — expect success, no second HC, no PHA overwrite on correct link.
4. Negative spot-check (optional): link quiz to HC with wrong Week — expect **fail closed** with mismatch error (do not leave row in error state in shared DEV without cleanup).

### C — ETF homework scenario (115)

1. Testing Scenario with `Homework Assignment` = `recgj8dPk4ouTwCOj`.
2. Run **115** — expect homework path uses PHA on Submission.Homework Name 1.
3. Scenario with library-only link (if retained for negative test) — expect **fail closed**.

## Replay / no-duplicate proof (required evidence)

Document for each path:

| Path | First run actionOut | Replay actionOut | HC count | Submission count |
|------|---------------------|------------------|----------|------------------|
| 020 idempotent link | `linked_existing` or `created` | `skipped_*` / no new HC | 1 | unchanged |
| 067 quiz bridge | `created_new` or `linked_existing` | `linked_existing_quiz` | 1 | 0 or 1 per attachment policy |
| 067 legacy blank PHA | `linked_existing_quiz_populated_pha` | `linked_existing_quiz` | 1 | PHA field populated once |

**Forbidden:** duplicate HC for same Enrollment + Week + Library; duplicate XP from replay.

## Offline verification (repository — run before paste)

```bash
node --check airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js
node --test tests/homework/automation-067-pha-direct.test.js
node --test tests/homework/*.test.js
node --test tools/testing/tests/test_homework_architecture_offline.mjs
node --test tools/testing/tests/test_*.mjs
git diff --check
```

## Mike approval gate (PROD)

**Stop — do not paste to PROD until Mike explicitly approves** after:

- [ ] DEV controlled sequence A + B + C PASS with captured run JSON
- [ ] No unexpected HC / Submission duplicates in DEV
- [ ] Fillout / Testing Scenarios updated to PHA RIDs in DEV
- [ ] Mike reviews this checklist and PR #132 diff

## PROD paste and evidence capture

1. Repeat **DEV paste order** in PROD: **005 → 020 → 067 → 115**.
2. Update PROD Fillout choice lists and Testing Scenarios to PHA RIDs.
3. Run **one** controlled Schmidt submission (`recCyFEPeATOVNlr9`) through 005→009→020 — capture outputs.
4. Run **one** controlled HW17 quiz (or approved ETF scenario) through 067 / 115 — capture outputs.
5. Replay each — confirm idempotency.
6. Save screenshots / automation run JSON under `docs/testing/evidence/` (dated folder).
7. Update `CHANGELOG.md` under `### Airtable` only after PROD paste attestation.

**Completion Master:** update to **Installed** / **Live Tested** only after step 6 live evidence — not from repository merge alone.

## Rollback versions and procedure

| Automation | Roll back to | Notes |
|------------|--------------|--------|
| **005** | **v5.2** or last known PROD paste | Restores pre-PHA-direct validation |
| **020** | **v3.2.0** or last known PROD paste | Library-first HC path |
| **067** | **v3.3** or last known PROD paste | Loses linked-HC fail-closed guards |
| **115** | **v1.9** / last known PROD paste | Loses PHA-required homework scenarios |

**Rollback steps:**

1. Disable affected automations in PROD.
2. Paste prior script versions from git history (docblock through end only).
3. Revert Fillout / Testing Scenarios to prior choice lists if PHA RIDs break legacy rows.
4. Do **not** delete PHA table or HC.Program Homework Assignment field.
5. Document rollback in `CHANGELOG.md` and notify Mike before re-enabling.

## Related docs

- [`HOMEWORK-FILLOUT-INTEGRATION.md`](../prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md)
- [`program-homework-assignments-mvp.md`](./program-homework-assignments-mvp.md)
- [`docs/automation-index.md`](../automation-index.md)
- PR **#132** — PHA-first homework package
