# PKG-006R — Counted-Submission XP and Standings Production Schmidt Packet

Status: Production-only packet; no Production Airtable evidence is claimed or required.
This is distinct from Completion Master `PKG-006` Fillout-intake proof work.

## Scope and safety

This packet verifies eventual pipeline settlement for one existing, eligible
Schmidt Submission and Mike's allowlisted email (`mschmidt@fairfield.k12.mt.us`).
Mike alone owns every Production action. Do not change formulas,
schema, views, trigger settings, or automation enablement. Do not re-arm an
email queue row or allow 079 to dispatch as part of this packet.

The daily receipt may validly contain `submissionXp: null`, `weeklyXp: 0`, or
`weeklyGoal: 0` while downstream data settles. It is not an authoritative final
XP statement and is not a failure by itself.

## Preflight readback

1. **Mike only, read-only:** run
   `audit-counted-submission-xp-standings-reliability.js` in Airtable Scripting
   and save its JSON before any automation test. Stop on any `error` finding.
2. Resolve and record the exact eligible Schmidt Enrollment using
   `docs/online-agents/enrollment-season/SCHMIDT-ENROLLMENT-CONTRACT.md`; stop
   if more than one candidate is plausible for the selected Submission.
3. Capture the current deployed code/version, ON/OFF state, and trigger
   conditions for 010,
   031, 035, 041, and 042. Confirm Automation 043 remains OFF/retired.
4. Select one existing counted Schmidt Submission; record its Submission,
   Enrollment, Week, and current WAS record IDs. Do not hardcode those IDs into
   an automation input.
5. Confirm 076, 079, 072, 074, 118, and 119 cannot create or dispatch an
   email during this correlation. Preserve any existing Queue row, run history,
   and error output. Do not
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
5. After Airtable settles, calculate expected weekly XP as the sum of
   `Active XP Points` for all XP Events linked to the Enrollment + Week,
   including eligible Submission Base and any prior eligible award; inactive
   or duplicate-removed events contribute zero. Compare that sum with WAS
   `XP Earned This Week`.
6. Calculate expected Enrollment Lifetime XP as all Enrollment-linked `Active
   XP Points` plus the approved `Lifetime XP Manual Adjustments`; compare it to
   `Lifetime XP Total`.
7. When `Threshold XP Ready? = 1`, record Goal Completion % and the active
   threshold rule keys, then run only Mike's explicitly approved Automation
   035 test. Verify one event per met 100/125/150 tier, source key
   `WEEKLY_THRESHOLD|{Enrollment ID}|{Week ID}|{Percent}`, correct WAS link,
   and a replay that creates zero additional events. 035 remains OFF unless
   separately authorized. If readiness is not set, do not force it merely to
   test 035.
8. Confirm 041 queues recalculation following the changed lifetime total, then
   confirm 042 clears the queue and assigns Current Level/Next Level from the
   settled value.
9. Confirm the active Enrollment has the repository standings inputs:
   Full Athlete Name, Grade, Current Level - Public Facing Display, Level Sort
   Order - For Softr, Lifetime XP Total, Total Shots Counted, School Year, and
   Program Instance Name Only. This proves underlying inputs only; Production
   view membership and public rendering remain separate evidence.
10. Mike verifies the active Enrollment is present in the Production `Web -
    Leaderboard` view. A public `/shoot` spot-check is optional and outside
    this packet; the repository audit cannot prove view membership.

## Replay and evidence

1. Replay only through the approved automation-test mechanism for the same
   Submission; do not manually modify formulas or links.
2. Verify no second `SUBMISSION_XP|{Submission ID}` record and no second
   canonical WAS are created.
3. Verify no new Email Handoff Queue row is dispatched. A historical pending
   receipt is expected to remain unchanged.
4. Save record IDs, 010/031/035/041/042 run timestamps and outputs, source
   keys, WAS goal classification, weekly/lifetime active-XP calculations,
   Enrollment total, final level values, and standings input values. Run the
   new read-only audit and save its JSON output.

## Stop conditions

Stop and preserve evidence if the XP key is duplicated/inactive, any XP link is
wrong, canonical WAS count is not one, a nonzero goal lookup produces a
persistent zero/blank formula, lifetime XP differs from the active ledger, or
the progression queue does not clear. Do not repair data or alter Production
configuration under this packet.
