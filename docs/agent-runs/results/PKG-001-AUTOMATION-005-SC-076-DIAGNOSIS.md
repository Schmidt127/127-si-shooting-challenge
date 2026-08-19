# PKG-001 — Automation 005 / SC-076 Investigation

**Investigation-only report.** No Airtable, Fillout, Make, Vercel, secret, deployment, production-data, or live-system access was used.

## Question and baseline

- Package: `PKG-001`; scope: Automation 005 and the SC-076 dependency boundary.
- Branch baseline: `origin/master` at `410fa21cadaec67cd36489536487a0dd38f49607` (fresh fetch; worktree HEAD matched).
- CONTROL was read but not edited by this package; its baseline is reconciled separately by PKG-003.

## Sources consulted

- `airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` — v5.3, date-first PI-scoped Week resolution, direct PHA validation.
- `airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js` — v3.1, Enrollment/PI resolution.
- `tools/testing/tests/test_005_023_chain_offline.mjs`, `tools/testing/tests/run_005_023_chain.mjs`.
- `tests/homework/automation-005-020-pha-direct.test.js` — 005/020 PHA contract and fail-closed cases.
- `docs/prod-completion/2026-08-09/HOMEWORK-CURRICULUM-PHA-CROSS-YEAR-AUDIT.md` — historical controlled failure hypothesis and dependency trace.
- `docs/prod-completion/2026-08-06/PROGRAM-INSTANCE-ISOLATION-PACKAGE.md` — prior 005/023 overlap root causes and live 005/023 evidence.
- `docs/overnight/2026-08-05-OVERNIGHT-MASTER-HANDOFF.md`, `docs/prod-completion/2026-08-08/AUTOMATION-066-V3.5-LIVE-PROOF.md` — SC-076/066 failure and replay boundary.
- `docs/prod-completion/2026-08-08/PROD-STATE-RECONCILIATION-010-031-066-118-119-043.md` — weekly-chain status and proof boundaries.

## Findings

1. **Current repository 005 v5.3 is internally coherent and fail-closed.** It resolves `Submission.Activity Date` to exactly one active `Weeks` row within `Enrollment.Program Instance`, then loads each selected `Homework Name 1/2` record as a **PHA**, validates active/PI/Week/slot/exactly-one-library-link, and writes only `Submission.Week`. It does not reverse-search the PHA table or use Grade Band for scheduling.
2. **Reproducible failure A — legacy intake identity mismatch (code/config contract).** If Fillout or the deployed intake still writes a Homework Library RID into `Submissions.Homework Name 1/2`, v5.3 calls `Program Homework Assignments.selectRecordAsync(libraryRid)` and fails `Program Homework Assignment not found`. The Aug-09 audit documents that historical Fillout mapping as library-direct, while the current v5.3 contract requires PHA RIDs. Repository evidence does not prove which mapping is live now.
3. **Reproducible failure B — Week/PHA tuple mismatch (data/config).** A PHA whose PI or Week differs from the Activity-Date-selected Week fails closed with an explicit mismatch. The offline suite proves the wrong-Week case. The Aug-09 audit identifies controlled Submission `reccRpYDUfh3Pddzy` / Asset `recIoGmcCgvxmgEAh` and expected PHA `reca5GM1JkROhXOiy`; it correctly labels the live Week value as unconfirmed, so this remains a high-confidence hypothesis rather than live proof.
4. **Reproducible failure C — overlapping active Week fixture (fixture/config).** Multiple active same-PI Weeks containing the Activity Date produce 005's explicit multi-match error. The isolation package records the historical PWTEST Week `reci5GdxEC57vfoS3` overlapping operational Early Bird `recWeVrSabnsYaHc2`; PI scoping fixes cross-year collisions but cannot select between same-PI overlaps.
5. **Reproducible failure D — missing/late Enrollment (config/trigger).** 005 requires Enrollment to derive PI when Activity Date is present. 023 must assign Enrollment first or 005 errors. The offline `023 → 005` chain passes, but the repository cannot prove deployed trigger type, view filters, action order, or re-entry behavior.
6. **SC-076 is not a current 005 defect.** The historical 066 v3.3 natural multi-create failure was the raw-map/`createRecordsAsync` `fields` contract; the current live evidence is 066 v3.5 existing-unlock replay: 8 eligible, 0 created, 8 skipped, no duplicate XP. That proves idempotent replay, not first-create natural behavior. 005 only supplies intake Week/identity context; it does not create milestone unlocks or XP.
7. **Weekly chain boundary:** after `023 → 005`, downstream `009 → 020` can create/reuse homework completion; `031` requires Enrollment + Week; `010` owns Submission Base XP. Existing evidence proves selected replay/no-duplicate paths, while 118/119 evidence proves no-target fail-safe paths, not normal positive weekly build/send. No report here upgrades those claims.

## Exact next repair package

Do not change 005 logic or weaken 020 matching yet. The next package should be a **read-only live contract/readback package**, followed by a separately approved repair:

1. Mike provides the deployed 005/023 script exports and versions, trigger types, trigger views, all view filters/formulas, and one run-history/action-order trace for a fresh controlled Submission.
2. Mike provides read-only values for the controlled failing Submission/Asset, Enrollment PI/Grade Band, Activity Date, selected Homework IDs and record names/types, all matching active PI Weeks, and the target PHA's PI/Week/slot/Active/library links.
3. Verify whether Fillout writes PHA RIDs or Library RIDs. If Library RIDs are live, repair the Fillout/pre-intake mapping to active PHA choices (or obtain an explicitly approved compatibility package); do not make 005 guess.
4. If the tuple is only stale data, repair the controlled Submission/PHA/Week alignment under a separate Mike-approved Production/live package, then rerun 005→009→020 and verify 031/010 outputs.
5. Keep fixture cleanup separate: deactivate/isolate overlapping PWTEST Weeks only after dependency inspection; do not delete historical evidence.

## Offline validation

Command:

```text
node --test tools/testing/tests/test_005_023_chain_offline.mjs tests/homework/automation-005-020-pha-direct.test.js
```

Result: **13/13 PASS** (005 source contract, PHA success and fail-closed cases, 020 creation/replay, and 023→005 chain).

Additional command:

```text
node --test tools/testing/tests/test_homework_architecture_offline.mjs
```

Result: **12/12 PASS**.

No tiny test-only fix was necessary. No merge or PR was attempted.
