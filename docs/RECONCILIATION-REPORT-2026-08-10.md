# Repository Reconciliation Report — 2026-08-10

**Backlog:** `SCV2-SEASON-LAUNCH-CONSOLIDATION-001`  
**Phase 2 approval:** Mike, 2026-08-10  
**Branch:** `reconcile/scv2-season-launch-consolidation-001`  
**Fresh `origin/master` baseline:** `3aea908bc1674b54959254d2f6756acc3f51ff97`  
**Scope:** Documentation, release-control metadata, one automation header
correction, and a deterministic offline audit. No live-system changes.

## Truth hierarchy after reconciliation

1. GitHub committed code and scripts are the source for repository behavior.
2. [`SHOOTING_CHALLENGE_COMPLETION_MASTER.md`](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md)
   is the sole human-readable release-status authority.
3. [`agent-runs/CONTROL.json`](./agent-runs/CONTROL.json) is the
   machine-readable run-control and release-control file.
4. [`AUTHORITY-MAP.md`](./AUTHORITY-MAP.md) defines system ownership and
   evidence boundaries.
5. Airtable, Fillout, Make/Gmail/Lambda, and Vercel remain the authorities for
   their live state.
6. Dated evidence and historical packets are preserved but are not current
   release status.

## Evidence inventory

### Current/canonical

- Completion Master: release status, evidence ledger, proof matrix, and rolling
  owners/actions.
- CONTROL.json: branch/SHA coordination, canonical paths, season policy, and
  evidence boundaries.
- Authority Map: system ownership, 2027 season policy, document routing, and
  stale-audit policy.
- PROJECT_STATE.md: live-ops pointer and repository snapshot; it no longer
  presents itself as the release-status master.
- `docs/challenge-year/`: season-launch contracts and operator/test procedures;
  these are not live Airtable attestations.

### Narrow-purpose evidence retained

- `docs/prod-completion/`: dated release evidence and proof boundaries.
- `docs/testing/evidence/`: test artifacts and historical controlled evidence.
- `docs/deploy-checklists/`: operator installation and promotion procedures.
- `docs/challenge-year/`: season-calendar and activation contracts.
- `docs/architecture/`, `docs/data-flow/`, and runbooks: technical contracts.
- `docs/overnight/`, `docs/recovery/`, and launch-certification packets:
  historical handoffs and snapshots.

## Redirected or explicitly historical documents

No historical document was deleted or moved. The following were changed only
to prevent them from competing with the active authority:

- `docs/SHOOTING_CHALLENGE_PROD_OPERATING_MODE.md` — historical PROD-first
  experiment; no longer active instructions.
- `docs/launch-certification/START-HERE.md`,
  `LAUNCH-DECISION.md`, and `LAUNCH-CLOSEOUT.md` — dated certification
  snapshots; current status routes to the Completion Master.
- `docs/overnight/FINAL-OVERNIGHT-RECONCILIATION.md` — historical overnight
  evidence.
- `docs/CHATGPT-MASTER-PLAN-BRIEF.md` — planning aggregate only.
- `docs/v2-change-backlog.md` — live backlog only, not release status.

## Contradictions corrected

- Replaced the old PROD-first/no-preservation operating posture with the
  repository’s DEV-first, Mike-approval, no-live-mutation guardrails.
- Reconciled CONTROL.json’s stale July SHA and next action to the merged
  PR #137–#139 baseline.
- Corrected Automation 115’s active source header from v2.0/paste-pending to
  v2.1 controlled-proof wording; retained v2.0 only in version history.
- Recorded that 115 intentionally creates one Submission per explicit checked
  request and is not an idempotent Submission processor.
- Recorded that 115 creation does not prove 005/009/020/064, XP, summary,
  Make/S3, email, or full season behavior.
- Replaced the old Homework Library scheduling ambiguity with
  Program Homework Assignments as the scheduling identity while preserving
  Homework Library as content identity.
- Added the exact 2027 season window, Early Bird dates, Week 1 start,
  manually maintained Weeks authority, Level 1/zero-XP reset, Fillout
  enrollment control, and temporary Early Bird fixture warning.
- Preserved PR #138’s imagery and pre-launch `noindex, nofollow` policy as
  release evidence; no web implementation was changed.

## GitHub and Vercel read-only state

At inspection time:

- PRs [#137](https://github.com/Schmidt127/127-si-shooting-challenge/pull/137),
  [#138](https://github.com/Schmidt127/127-si-shooting-challenge/pull/138),
  and [#139](https://github.com/Schmidt127/127-si-shooting-challenge/pull/139)
  were merged, with merge commits
  `3aea908`, `6772d59`, and `03c0f16`; reported required checks were successful.
- Open draft PRs remained [#127](https://github.com/Schmidt127/127-si-shooting-challenge/pull/127),
  [#129](https://github.com/Schmidt127/127-si-shooting-challenge/pull/129),
  [#130](https://github.com/Schmidt127/127-si-shooting-challenge/pull/130),
  and [#131](https://github.com/Schmidt127/127-si-shooting-challenge/pull/131).
- Read-only Vercel CLI inspection showed the latest listed Production
  deployment `https://127-si-shooting-challenge-rr0d347lx-127-sports-intensity.vercel.app`
  as **READY**, with alias `https://127-si-shooting-challenge.vercel.app`.
  The latest listed Preview deployment
  `https://127-si-shooting-challenge-8rspnptkw-127-sports-intensity.vercel.app`
  was also **READY**.
- These deployment states and URLs do not prove Vercel environment-variable
  values, Airtable configuration, Fillout state, or production behavior.

## Changed files

- `CHANGELOG.md`
- `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js`
- `docs/AUTHORITY-MAP.md`
- `docs/CHATGPT-MASTER-PLAN-BRIEF.md`
- `docs/PROJECT_STATE.md`
- `docs/RECONCILIATION-REPORT-2026-08-10.md`
- `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
- `docs/SHOOTING_CHALLENGE_PROD_OPERATING_MODE.md`
- `docs/agent-runs/CONTROL.json`
- `docs/launch-certification/LAUNCH-CLOSEOUT.md`
- `docs/launch-certification/LAUNCH-DECISION.md`
- `docs/launch-certification/START-HERE.md`
- `docs/overnight/FINAL-OVERNIGHT-RECONCILIATION.md`
- `docs/v2-change-backlog.md`
- `tools/testing/audit-source-of-truth.mjs`
- `tools/testing/tests/test-source-of-truth-audit.mjs`

## Validation

| Command | Result |
|---|---|
| `node tools/testing/audit-source-of-truth.mjs` | PASS |
| `node --test tools/testing/tests/test-source-of-truth-audit.mjs tools/testing/tests/test_115_offline.mjs tools/testing/tests/test_homework_architecture_offline.mjs tests/homework/automation-005-020-pha-direct.test.js tests/homework/automation-067-pha-direct.test.js` | **72/72 PASS** |
| `node tools/testing/check-completion-master-integrity.js` | PASS; 13 existing duplicate-SC-row warnings, no failure |
| `node --check` on audit, audit test, and Automation 115 | PASS |
| `git diff --check` | PASS |

The stale-reference audit is deterministic, CI-suitable, and excludes only
documented historical evidence paths plus the explicitly historical
PROD-operating-mode packet. It checks canonical control markers, CONTROL JSON
consistency, stale active 115 versions, deprecated active status claims, and
duplicate human-readable authority phrases.

## Remaining live-PROD evidence

Mike must still verify in the named live systems:

1. Current Airtable Weeks/config rows for the 2027 calendar and the temporary
   Early Bird fixture.
2. Fillout enrollment availability and season activation.
3. Season-sensitive automation configuration and natural-trigger behavior.
4. Make/Gmail safety and any email-send readiness.
5. Fresh Schmidt athlete-path proof after the current base reset.
6. Vercel production settings and the preserved pre-launch indexing policy,
   if current deployment metadata needs a dashboard-level confirmation.

## No-write cleanup and rollback statement

This package made no Airtable, Fillout, Make, Gmail, Lambda, Vercel setting,
environment-variable, secret, schema, deployment, send, or production-data
change. It does not enable or disable any live automation. Rollback is a
normal Git revert of this focused branch/PR; historical evidence remains
available in its original paths.
