# PKG-006 — Counted-Submission XP and Standings Production Schmidt Packet

Status: Production-only packet; no DEV Airtable evidence is claimed or required.

## Scope and safety

This packet verifies eventual pipeline settlement for one existing, eligible
Schmidt Submission. Mike owns every Production action. Do not change formulas,
schema, views, trigger settings, or automation enablement. Do not re-arm an
email queue row or allow 079 to dispatch as part of this packet.

The daily receipt may validly contain `submissionXp: null`, `weeklyXp: 0`, or
`weeklyGoal: 0` while downstream data settles. It is not an authoritative final
XP statement and is not a failure by itself.

## Preflight readback

1. Capture the current deployed code/version and trigger conditions for 023,
   005, 010, 031, 076, 041, and 042.
2. Select one existing counted Schmidt Submission; record its Submission,
   Enrollment, Week, and current WAS record IDs. Do not hardcode those IDs into
   an automation input.
3. Preserve any existing Queue row, run history, and error output. Do not
   create a replacement Queue row and do not send email.

## Correlation checks

1. Confirm `Count This Submission? = 1`, exactly one Enrollment, and exactly
   one Week.
2. Confirm exactly one active XP Event with
   `Source Key = SUBMISSION_XP|{Submission ID}` and links to the same
   Submission, Enrollment, Week, and canonical WAS.
3. Confirm exactly one WAS for that Enrollment + Week and that the Submission
   links to it.
4. Classify the weekly goal without collapsing outcomes:
   - no Goal Record = missing configuration/link;
   - Goal Record but blank Goal Shots Target = blank lookup/source configuration;
   - Goal Shots Target and Weekly Goal Shots Target both zero = configured zero;
   - nonzero Goal Shots Target but blank/zero Weekly Goal Shots Target = wait for
     formula settlement, then investigate if persistent.
5. After Airtable settles, compare WAS active weekly XP to active XP Events for
   the Enrollment + Week, then compare Enrollment Lifetime XP Total to active
   ledger XP plus manual adjustment.
6. Confirm 041 queues recalculation following the changed lifetime total, then
   confirm 042 clears the queue and assigns Current Level/Next Level from the
   settled value.
7. Confirm the active Enrollment has the fields required by `Web - Leaderboard`:
   current level/sort, Lifetime XP Total, Program Instance, and School Year.

## Replay and evidence

1. Replay only through the approved automation-test mechanism for the same
   Submission; do not manually modify formulas or links.
2. Verify no second `SUBMISSION_XP|{Submission ID}` record and no second
   canonical WAS are created.
3. Verify no new Email Handoff Queue row is dispatched. A historical pending
   receipt is expected to remain unchanged.
4. Save record IDs, 010/031/041/042 run timestamps and outputs, source key,
   WAS goal classification, active XP sums, Enrollment total, and final level
   values. Run the new read-only audit and save its JSON output.

## Stop conditions

Stop and preserve evidence if the XP key is duplicated/inactive, any XP link is
wrong, canonical WAS count is not one, a nonzero goal lookup produces a
persistent zero/blank formula, lifetime XP differs from the active ledger, or
the progression queue does not clear. Do not repair data or alter Production
configuration under this packet.
