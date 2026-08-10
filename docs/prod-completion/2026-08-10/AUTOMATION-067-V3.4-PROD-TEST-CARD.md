# Automation 067 v3.4 — PROD Test Card

Owner: Mike + ChatGPT

Automation: `067 - Homework - Link or Create Completion from Reflection Quiz`

Trigger table: `Final Reflection Quiz Submissions`

Input variable: `recordId` = triggering quiz Submission RID

Scope: one controlled HW17 reflection-quiz proof; no script paste or schema change

## Preconditions

- Confirm the Airtable script header and `SCRIPT`/`CONFIG` output identify **v3.4**.
- Use the approved controlled Enrollment for the current 2026–2027 Program Instance.
- That Enrollment must link exactly one Program Instance.
- The Program Instance must have exactly one active `Program Homework Assignments` row where:
  - `Homework Slot = HW1`;
  - `Homework Assignment` links exactly one active Homework Library item whose `Homework Number = HW 17`;
  - `Week` links exactly one Week.
- Do not add an attachment; SC-014 Option B is attachment-less.
- Leave downstream coach-review/XP actions unchanged during this bridge proof.

## Run

1. Create or submit one controlled `Final Reflection Quiz Submissions` record linked to the approved Enrollment.
2. Let the normal 067 trigger run. If the trigger does not fire, use Airtable's **Test** action once with `recordId` set to that quiz RID; report which method was used.
3. Do not manually create or relink a Homework Completion.
4. Open the resulting quiz record and its linked Homework Completion.

## Required pass evidence

Record all RIDs; do not substitute names alone.

| Check | Expected |
|---|---|
| Quiz `Processing Status` | `Processed` |
| Quiz `Homework Completion` | Exactly one linked RID |
| Completion `Enrollment` | Exactly the quiz Enrollment RID |
| Completion `Week` | Exactly the Week linked by the resolved HW17 PHA |
| Completion `Homework` | Exactly the PHA's Homework Library RID |
| Completion `Program Homework Assignment` | Exactly the resolved PHA RID |
| Completion `Final Reflection Quiz Submissions` | Contains the quiz RID |
| Completion status | `Submitted`; review status `Ready for Review` when those choices exist |
| Submission Assets created by this attachment-less run | `0` |
| XP Events created directly by 067 | `0` |
| Matching completions for Enrollment + Week + Homework Library | Exactly `1` |

## Console/output to return

Return the complete final JSON console line or action outputs, including:

- `version` (must be `v3.4`);
- `statusOut` (must be `success`);
- `actionOut` (`created`, `linked_existing`, or an equivalent successful exact-link action);
- `quizSubmissionId`;
- `homeworkCompletionId`;
- `programHomeworkAssignmentId` / PHA RID when emitted;
- Homework Library RID and Week RID when emitted;
- `errorOut` (must be blank).

Also return the six RIDs independently: Enrollment, quiz, PHA, Homework Library, Week, and Homework Completion.

## Idempotency proof

Run the same quiz record through 067 one additional time only if ChatGPT requests it after inspecting the first result.

Expected replay:

- the quiz remains linked to the same Homework Completion RID;
- completion count for Enrollment + Week + Homework Library remains exactly one;
- no additional Submission Asset or XP Event is created; and
- output reports an existing/skipped exact-link action, not a new completion.

## Stop conditions

Stop and return evidence immediately if 067 reports ambiguity, multiple links, a PHA mismatch, a Week mismatch, a Library mismatch, or creates a second Homework Completion. Do not repair the row manually.

## Cleanup

None by default. Preserve the controlled quiz and completion as proof. Any deletion requires separate Mike approval and must not remove shared Homework Completion or XP evidence.
