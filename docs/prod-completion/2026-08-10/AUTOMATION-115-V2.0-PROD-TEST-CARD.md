# Automation 115 v2.0 — PROD Test Card

Owner: Mike + ChatGPT

Automation: `115 - Engineering Test Framework - Run Testing Scenario Daily Submission`

Trigger table: `Testing Scenarios`

Trigger: `Run Test?` checked

Input variable: `recordId` = triggering Testing Scenario RID

Scope: one focused Homework scenario proving PHA-first intake; no script paste or schema change

## Preconditions

- Complete the 067 v3.4 card first so the canonical HW17 completion identity is known.
- Confirm the Automation 115 script header and `SCRIPT.version` are **v2.0**.
- Use Schmidt test Enrollment `recgP9qZYjAhE7NXm`; 115 intentionally fails closed for other Enrollment RIDs.
- Select an active `Program Homework Assignments` RID in `Testing Scenarios.Homework Assignment`.
- The selected PHA must link exactly one Program Instance, Week, and Homework Library record and must be active.
- For the strongest reuse proof, select the same PHA proven by the 067 card.
- `Dry Run?` must be unchecked for the live proof.
- Use zero `Intake Attachments` unless a separate upload proof is explicitly requested.

## Configure the Testing Scenario

| Field | Value |
|---|---|
| `Test Intake Name` | `SCV2-APP-BASE-CLOSEOUT-001 - 115 PHA-first Homework` |
| `Scenario Type` | `Homework` |
| `Related Enrollment` | Schmidt `recgP9qZYjAhE7NXm` |
| `Submission Date` | A date inside the selected PHA's Week |
| `Homework Assignment` | The **PHA RID**, never the Homework Library RID |
| `Intake Attachments` | Blank |
| `Dry Run?` | Unchecked |
| `Run Test?` | Check only after all fields above are confirmed |

## Run order

1. Capture the Testing Scenario RID and selected PHA/Library/Week RIDs.
2. Check `Run Test?` once.
3. Allow 115 to create and link one production-shaped Submission.
4. Allow the normal homework chain to run in its configured order: 005 → 009 → 020.
5. Open the Testing Scenario, linked Submission, and linked Homework Completion.

## Required pass evidence

| Check | Expected |
|---|---|
| Testing Scenario `Last Run Status` | `Pass` / successful equivalent |
| Testing Scenario `Run Test?` | Cleared by 115 |
| Testing Scenario `Linked Submission` | Exactly one new Submission RID |
| Submission `Enrollment` | Schmidt RID |
| Submission `Homework Name 1` | Exactly the selected **PHA RID** |
| Submission `Week` | Exactly the PHA Week RID after 005 |
| Submission assets | `0` for this attachment-less scenario |
| Homework Completion `Homework` | Exactly the PHA's Homework Library RID |
| Homework Completion `Program Homework Assignment` | Exactly the selected PHA RID |
| Homework Completion `Week` | Exactly the PHA Week RID |
| Matching completions for Enrollment + Week + Library | Exactly `1` |
| XP Events created directly by 115 | `0` |

If this card intentionally uses the same PHA identity as the 067 proof, the Homework Completion RID must be the same RID proven by the 067 card; a new completion is a failure.

## Console/output to return

Return the complete final JSON console line or action outputs, including:

- `version` (must be `v2.0`);
- `statusOut` (must be `success`);
- `actionOut` (must be `created` for the Submission);
- `testingScenarioIdOut`;
- `createdSubmissionIdOut`;
- `scenarioTypeOut` (must be `Homework`);
- `createdRecordSummaryOut`;
- `errorOut` (must be blank).

Also return the Testing Scenario, Submission, Enrollment, PHA, Homework Library, Week, and Homework Completion RIDs.

## Idempotency / duplicate check

Do not re-check the same Testing Scenario merely to prove Submission idempotency: 115 creates an additional Submission by design. The required idempotency assertion is downstream identity reuse:

- the first 115-created Submission must resolve to the one canonical Homework Completion for Enrollment + Week + Library;
- the Homework Completion count remains exactly one; and
- no second homework XP Source Key exists for that completion.

## Negative guard (read-only confirmation)

Confirm from the successful Submission that `Homework Name 1` contains the PHA RID. Do not run a second scenario with a Library RID in PROD. The repository contract test covers the fail-closed `blocked_homework_library_rid` path offline.

## Stop conditions

Stop if 115 returns `blocked_homework_library_rid`, any non-success status, a Library RID is written to `Homework Name 1`, the Week differs from the PHA, or a duplicate completion appears. Do not manually repair the generated Submission.

## Cleanup

None by default. Preserve the Testing Scenario and linked Submission as proof. Cleanup is optional only after evidence capture and separate Mike approval; never delete the reused canonical Homework Completion or its XP Event.
