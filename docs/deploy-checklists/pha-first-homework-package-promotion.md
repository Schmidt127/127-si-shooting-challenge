# PHA-first homework package — DEV → PROD promotion

| Field | Value |
|-------|--------|
| Date | 2026-08-10 |
| Package | **005 v5.3** · **020 v3.5** · **067 v3.4** · **115 v2.1** |
| Repository status | **Built / Verified** (offline contract tests PASS) |
| PROD status | **Controlled proof recorded 2026-08-10** — 067 quiz→Homework Completion idempotency passed; 115 produced one Submission per explicit checked request. This is not full downstream or season E2E proof. |
| Completion Master | **Do not** mark Installed or Live Tested until Mike captures live evidence |
| PROD base | `appn84sqPw03zEbTT` |
| DEV base | per `docs/PROJECT_STATE.md` |

## Purpose

`Submissions.Homework Name 1/2` store **Program Homework Assignment (PHA) record IDs**, not Homework Library IDs. Automations validate PHA directly, dereference library content from `PHA.Homework Assignment`, and write both IDs on Homework Completions. **067 v3.4** adds fail-closed validation for quiz-linked and discovered Homework Completions (exactly one link each for Enrollment, Week, Library, and PHA; duplicate matches fail closed).

## Capture active DEV PHA and Library IDs (required before testing)

**Do not assume offline fixture RIDs are the live HW17 quiz PHA.** Repository tests use fixture IDs such as `recgj8dPk4ouTwCOj` / `rechVLOeyEVIqmy2v`; production evidence tied `recgj8dPk4ouTwCOj` to a **failed submission’s selected PHA**, not independently to the HW17 reflection-quiz schedule.

Before DEV or PROD controlled tests, capture the **active** IDs from the target base:

| Step | Where | Record |
|------|--------|--------|
| 1 | Enrollment `recCyFEPeATOVNlr9` (or test athlete) | Note **Program Instance** RID |
| 2 | **Program Homework Assignments** | Active row: PI + **Homework Slot = HW1** + linked **Homework Library** with **Homework Number = HW 17** |
| 3 | Same PHA row | **PHA record ID** → Fillout Homework Name 1 / ETF Homework Assignment |
| 4 | Same PHA row | **Week** RID (067 resolves schedule from this PHA) |
| 5 | `PHA.Homework Assignment` | **Homework Library** RID (HC.Homework; never Homework Name 1/2) |

Fill in captured values below and use **only these** in controlled tests:

| Role | Record ID (capture in DEV) | Notes |
|------|----------------------------|--------|
| Program Instance | `rec5mEM0YPqPqq0hZ` | Schmidt 3-4 Early Bird — confirm on Enrollment |
| Active HW17 PHA (HW1 slot) | *(capture)* | Must be active, PI match, HW1 slot, library = HW 17 |
| Linked Homework Library (HW 17) | *(capture)* | From `PHA.Homework Assignment` |
| PHA Week | *(capture)* | From same PHA row |
| Controlled Enrollment | `recCyFEPeATOVNlr9` | Schmidt test athlete |
| HW2 library reference (slot B) | `rec6WmXjpLtIWDERo` | Optional second-slot reference only |

## DEV paste order (required)

Paste **only** the production docblock through end of script (skip GitHub header). Save each automation before pasting the next.

| Order | Automation | Version | Script file |
|-------|------------|---------|-------------|
| 1 | **005** — Submission Intake — Assign Week | **v5.3** | `005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| 2 | **020** — Homework — Link or Create Homework Completion | **v3.5** | `020-homework-link-or-create-homework-completion.js` |
| 3 | **067** — Homework — Link or Create Completion from Reflection Quiz | **v3.4** | `067-homework-link-or-create-completion-from-reflection-quiz.js` |
| 4 | **115** — Engineering Test Framework — Run Testing Scenario | **v2.0** | `115-engineering-test-framework-run-testing-scenario-daily-submission.js` |

**009** unchanged — compatible slot guard; no paste required for this package.

After **115** paste: update **Testing Scenarios** Homework rows so `Homework Assignment` = captured **PHA** RID (not library RID).

## Controlled test sequence (DEV)

Run in order after full DEV paste. Capture automation run history JSON (statusOut, actionOut, errorOut, debugStep, version). Substitute **captured PHA / library / week** RIDs everywhere below.

### A — Submission intake chain (005 → 009 → 020)

1. Create or reuse a **Testing Scenario** / controlled Fillout submission with `Homework Name 1` = **captured active PHA RID**.
2. Trigger **005** — expect `statusOut=success`, `homework1PhaId` = captured PHA, `homework1LibraryId` = captured library.
3. Let **009** create assets — expect exactly one homework asset link per slot.
4. Trigger **020** — expect HC with `Homework` = captured library, `Program Homework Assignment` = captured PHA.
5. **Replay** the same Submission/asset — expect idempotent skip/link, **no duplicate HC**.

### B — HW17 reflection quiz (067)

1. Final Reflection Quiz Submission on Enrollment `recCyFEPeATOVNlr9` with no HC link (or legacy HC with blank PHA only).
2. Trigger **067** — expect `statusOut=success`, `phaId` = captured HW17 PHA, `libraryId` = captured library, HC created or linked with both IDs.
3. **Replay** same quiz row — expect success, no second HC, no PHA overwrite on correct link.
4. Negative spot-check (optional): link quiz to HC with wrong Week — expect **fail closed** with mismatch error (clean up DEV row afterward).

### C — ETF homework scenario (115)

1. Testing Scenario with `Homework Assignment` = **captured PHA RID**.
2. Run **115** — expect homework path uses PHA on Submission.Homework Name 1.
3. Scenario with library-only link (negative test) — expect **fail closed**.

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

- [ ] Active DEV PHA + library IDs captured and filled in above
- [ ] DEV controlled sequence A + B + C PASS with captured run JSON
- [ ] No unexpected HC / Submission duplicates in DEV
- [ ] Fillout / Testing Scenarios updated to PHA RIDs in DEV
- [ ] Mike reviews this checklist and PR #132 diff

## PROD paste and evidence capture

1. Re-capture active PROD HW17 PHA + library IDs (do not copy DEV RIDs blindly).
2. Repeat **DEV paste order** in PROD: **005 → 020 → 067 → 115**.
3. Update PROD Fillout choice lists and Testing Scenarios to **captured PHA** RIDs.
4. Run **one** controlled Schmidt submission (`recCyFEPeATOVNlr9`) through 005→009→020 — capture outputs.
5. Run **one** controlled HW17 quiz (or approved ETF scenario) through 067 / 115 — capture outputs.
6. Replay each — confirm idempotency.
7. Save screenshots / automation run JSON under `docs/testing/evidence/` (dated folder).
8. Update `CHANGELOG.md` under `### Airtable` only after PROD paste attestation.

**Completion Master:** update to **Installed** / **Live Tested** only after step 7 live evidence — not from repository merge alone.

## Rollback versions and procedure

**Confirmed production field contract:** `Submissions.Homework Name 1/2` = **PHA record IDs**. Rollback must **not** restore library-first Fillout choices or any script that expects library IDs in those fields.

| Automation | Prior version (git) | Usable only if… |
|------------|---------------------|-----------------|
| **005** | **v5.2** or last PROD paste | Script **accepts PHA IDs** in Homework Name 1/2 (confirm in source before paste) |
| **020** | **v3.2.0** or last PROD paste | Script **accepts PHA-linked Submission fields** and writes HC correctly (confirm before paste) |
| **067** | **v3.3** or last PROD paste | Loses v3.4 linked-HC cardinality guards; still PHA-first |
| **115** | **v1.9** or last PROD paste | Loses PHA-required homework ETF scenarios |

**Do not** roll back to versions that treat Homework Name 1/2 as library IDs — that reintroduces the field-contract bug.

**Rollback steps:**

1. **Disable** affected automations in PROD (005, 009 downstream, 020, 067, 115 as applicable).
2. Paste **only** prior script versions confirmed **PHA-ID-compatible** (docblock through end).
3. **Keep** Fillout and Testing Scenarios on **PHA RIDs** — do not revert to library IDs.
4. If no PHA-compatible prior script exists for a step, leave that automation **disabled** until a forward fix ships.
5. Do **not** delete the PHA table or `HC.Program Homework Assignment` field.
6. Document rollback in `CHANGELOG.md` and notify Mike before re-enabling.

## Related docs

- [`HOMEWORK-FILLOUT-INTEGRATION.md`](../prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md)
- [`program-homework-assignments-mvp.md`](./program-homework-assignments-mvp.md)
- [`docs/automation-index.md`](../automation-index.md)
- PR **#132** — PHA-first homework package
