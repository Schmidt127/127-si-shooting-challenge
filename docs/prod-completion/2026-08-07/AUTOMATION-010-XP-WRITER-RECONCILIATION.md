# Automation 010 XP Writer Reconciliation — 2026-08-07

## Scope

Reconcile Automation 010 — Submission Intake and Asset Creation — Create XP Event from Submission against current PROD data and the repository source of truth.

Controlling source remains `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`.

## Version reconciliation

- Airtable automation inventory record: `recfxxUD50a5rbIRr`
- Airtable inventory Status: Live
- Stored inventory code: v10.1
- Repository source of truth: `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` v10.5
- `Ran Through Cursor?` was cleared in the Airtable inventory.
- The inventory notes now explicitly warn that `Live` does not prove the actual Airtable automation editor contains current/replay-safe code.

No Airtable automation editor code was changed by this package.

## Current Schmidt PROD evidence

Controlled enrollment: `recCyFEPeATOVNlr9` — Testing - 2026-2027

Canonical Early Bird Weekly Athlete Summary: `recMMeJENu6Pg8l58`

Two canonical current Early Bird submissions have healthy Submission Base XP linkage:

### Submission `recElDBcFvuE6jWwc`

- XP Event: `recHHhpkgQS1hhIHo`
- Enrollment: current Schmidt `recCyFEPeATOVNlr9`
- Week: current Early Bird `recWeVrSabnsYaHc2`
- Weekly Athlete Summary: `recMMeJENu6Pg8l58`
- XP Source: Submission Base
- XP Points: 20
- Active: true
- Source Key: `SUBMISSION_XP|recElDBcFvuE6jWwc`
- Normalized dedupe key is populated and submission-specific.

### Submission `recbr8gduRKmpiDkd`

- XP Event: `recEr0XcplpOvkOny`
- Enrollment: current Schmidt `recCyFEPeATOVNlr9`
- Week: current Early Bird `recWeVrSabnsYaHc2`
- Weekly Athlete Summary: `recMMeJENu6Pg8l58`
- XP Source: Submission Base
- XP Points: 20
- Active: true
- Source Key: `SUBMISSION_XP|recbr8gduRKmpiDkd`
- Normalized dedupe key is populated and submission-specific.

No current canonical Schmidt Submission Base XP contamination was found.

## Replay-safety defect in repository v10.4

Repository v10.4 adds Weekly Athlete Summary resolution/link repair, but its `resolveWeeklySummaryId()` path accepts exactly one pre-existing Submission -> Weekly Athlete Summary link immediately, without first validating that the linked summary matches the Submission's current Enrollment + Week.

Impact:

- a stale single summary link can survive replay;
- that stale link can then be copied to the Submission Base XP Event;
- duplicate XP protections can remain intact while the XP event is still attached to the wrong summary.

This is a repair/replay correctness defect, not evidence of current data corruption.

## Repository repair package — issue #106

Repository repair is now complete on the focused issue branch for Automation 010.

Implemented in `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` v10.5:

1. Validate a pre-existing single Submission -> Weekly Athlete Summary link against the current Submission Enrollment + Week.
2. If the existing summary is stale/wrong, resolve the unique canonical Enrollment + Week summary before continuing.
3. Repair both the Submission and Submission Base XP Event summary links to that canonical summary.
4. Fail closed when a stale/missing source summary exists but no canonical repair target can be resolved safely.
5. Preserve existing duplicate-XP protections and source-key behavior.

Added focused offline harness/tests:

- `tools/testing/tests/run_010_script.mjs`
- `tools/testing/tests/test_010_offline.mjs`

## Offline verification

Repository-only verification completed:

- Command: `node --test tools/testing/tests/test_010_offline.mjs`
- Result: **PASS** (2/2 tests)
- Covered cases:
  - stale single summary link repairs to the canonical Enrollment + Week summary;
  - stale single summary link with no canonical replacement fails closed.

No Airtable automation editor paste was performed for this package.
No controlled PROD live test was performed for this package.

## GitHub tracking

Issue #106 — `Automation 010 must validate existing Weekly Summary link before XP replay`

Required repair:

1. Validate a pre-existing single summary link against Submission Enrollment + Week.
2. If stale/wrong, resolve the unique canonical Enrollment + Week summary.
3. Repair both Submission and XP Event summary linkage.
4. Fail closed on zero/multiple canonical summaries when a summary is required.
5. Preserve duplicate XP protections.
6. Prove replay creates zero duplicate XP Events on the controlled Schmidt enrollment.

## Deployment gate

Do not insert Automation 010 ahead of the controlling Program Instance isolation paste order:

`023 v3.1 -> 053 v5.3 -> 066 v3.5 -> 118 v1.7 -> 119 v1.7 -> 043 v2.1 if Live`

Repository repair is complete, but Airtable installation remains unconfirmed.

Next required operator steps:

1. Paste the full `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js` v10.5 script into the live Airtable automation editor for Automation 010.
2. Verify the actual trigger, conditions, and input variable mapping in Airtable.
3. Run the controlled Schmidt first-run and replay tests.
4. Record resulting Submission/XP/Weekly Summary evidence before advancing any completion status.
