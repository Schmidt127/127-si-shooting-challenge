# Video Feedback XP — Production Schmidt Test Packet

**Status:** Draft — repository readiness only; Production evidence pending
**Scope:** `013 → 111 (when Grade Band is blank) → 113 → 114 → rollups → 041 → 042`
**Production base:** `appn84sqPw03zEbTT`
**Owner/executor:** Mike only. Mike alone pastes scripts, changes native Production automations, or initiates this test.
**Safety boundary:** This packet does not authorize schema, data, view, trigger, deployment, Make, Gmail, or email-queue changes by an agent.

## Evidence labels

| Label | Meaning |
|---|---|
| Repository/static contract evidence | Current committed source, tests, and dated schema snapshot only. |
| Offline mock/model evidence | Node tests model expected decisions only; not installed-Airtable proof. |
| Production evidence pending | Requires Mike's dated UI/run-history/record readback during this packet. |

## Current static contract

| Stage | Owner | Required conditions / result |
|---|---|---|
| Video Feedback creation/linking | `013` | Canonical creator/linker from a Submission Asset. `112` is retired/absent or OFF; do not recreate or enable it. |
| Grade Band preparation | `111` | Preparation only: copies Enrollment `Grade Band` to Video Feedback when VF Grade Band is blank. It is not an XP writer and `113`/`114` do not use Grade Band to calculate XP. |
| Coach preparation | `113` | Requires active VF, posted nonblank coach feedback, no `Do Not Award XP?`, Enrollment and Submission links, and active `VIDEO_SUBMISSION` XP Reward Rule. It writes Base XP, Pending, and arms `Ready for XP Automation?`. |
| XP Event | `114 v6.0` | Requires exactly one active VF Enrollment + Submission; active Enrollment; matching canonical Submission Enrollment; exactly one Submission Week; `Count This Submission?`; valid non-future Activity Date; positive Total Video XP; posted feedback; no do-not-award; Ready flag. Creates/updates one active `VIDEO_SUBMISSION|{videoFeedbackRecordId}` event. |
| Weekly / lifetime contribution | rollups | XP Event must have active status and matching Enrollment + Week; 114 also resolves/links a canonical WAS when one is already resolvable. `XP Earned This Week` and `Lifetime XP Total` are computed values—allow settlement before judging blank/mismatch. |
| Progression | `041 v4.0 → 042 v3.4` | A settled Lifetime XP input change changes 041's signature and queues `Level Recalc Needed?`; 042 consumes the queue and is the sole writer for Current Level, Next Level, Level Gate Rule, and Level Status. `043` remains retired/not deployed. |
| Standings | Enrollment / leaderboard view | Repository contract is an active Enrollment with School Year, Program Instance, Current Level, and numeric Level Sort Order. This test can inspect the inputs; it cannot prove view membership without Mike's UI readback. |

## Required preflight — read-only and saved

1. Export or save the full console JSON from `audit-video-xp-pipeline-integrity.js` before touching the test row. Name it with UTC date/time and retain it with this packet's evidence.
2. Record the selected current Schmidt records and starting values:
   - Video Feedback ID, Submission ID, Submission Asset ID (if present), Enrollment ID, Athlete ID, Week ID, Program Instance ID, School Year, Enrollment and VF Grade Band IDs.
   - VF `Active?`, `Feedback Posted?`, `Do Not Award XP?`, Coach Feedback presence, Base/Extra/Total Video XP, Award Status, Ready flag, existing XP links.
   - Submission `Enrollment`, `Week`, `Activity Date`, `Count This Submission?`, and Weekly Athlete Summary link.
   - Enrollment `Active?`, `Lifetime XP Total`, `Level Recalc Needed?`, `Progression Last Queued Signature`, Current/Next Level, Level Gate Rule, Level Status, and standings inputs.
   - Existing XP Event count for exact `Source Key = VIDEO_SUBMISSION|{VideoFeedbackId}`.
3. Stop immediately if the audit reports duplicate or mislinked Video XP for the selected row, ambiguous links, missing Program Instance/Athlete/School Year, inactive Enrollment, a blank/multiple Week, uncountable/future Submission, or an existing active event for a different source.
4. Do not repair, deactivate, activate, delete, relink, or manually edit an XP Event during this packet. Capture the evidence and stop for a separate approved repair decision.

## Installed native-automation check — Mike records the result

Before the positive path, open Production Automations and record the version, trigger type, trigger condition(s), dynamic input mapping, and ON/OFF state:

| Automation | Required check |
|---|---|
| `013` | Current canonical Video Feedback creator/linker; record input maps to the triggering Submission Asset. |
| `111` | Only needed if the selected VF's Grade Band is blank. It is a preparer, not an XP eligibility or XP creator. |
| `113 v6.2` | Current script and trigger target the selected Video Feedback review state; never use it to send email. |
| `114 v6.0` | ON only after Mike pastes the committed script; trigger requires posted feedback, positive Total Video XP, one VF Enrollment and Submission, `Do Not Award XP?` unchecked, XP link empty, and Ready checked. Do not use `Award Status is not Awarded` as a trigger condition. |
| `041 v4.0` | Scheduled reconciliation remains configured; optional `recordId` is blank except for an intentional controlled action. |
| `042 v3.4` | ON / view-triggered from `042 - Needs Level Assignment`, whose filters include `Level Recalc Needed?` checked and `Active?` checked. |
| `043` | Absent/off. Do not recreate it. |
| `073` | Leave OFF for this test, or leave its trigger unable to enter. Do not run it manually. Its Make webhook, recipient, and send mode are outside this XP test. |
| `077`, Make/Gmail | Leave disabled/not invoked. Do not create an Email Handoff Queue record. |

## Controlled Production-only Schmidt test

1. Select one fresh eligible Schmidt Video Feedback row. Use Mike's allowlisted email only if an email field must be viewed; no email automation may be armed or run.
2. Confirm the preflight identity chain is exact: one active Enrollment with one Athlete, Program Instance, School Year, and Grade Band; one matching Submission Enrollment; exactly one Week; and a countable, non-future Activity Date.
3. If VF Grade Band is blank, let `111` populate it and verify it exactly matches the Enrollment Grade Band. Do not treat the grade-band write as XP proof.
4. Complete the coach review on the same row: nonblank Coach Feedback, `Feedback Posted? = checked`, `Do Not Award XP? = unchecked`. Run/allow `113` only if it is the installed preparation step. Record its output and the active `VIDEO_SUBMISSION` XP Reward Rule ID/amount.
5. Verify `113` produces positive Base/Total Video XP, `Award Status = Pending`, and `Ready for XP Automation? = checked`. If any is absent, stop; do not manually manufacture the event.
6. Allow the installed `114 v6.0` trigger to process exactly once. Capture its run history/output: `statusOut`, `actionOut`, `sourceKeyOut`, `xpEventIdOut`, `enrollmentIdOut`, `submissionIdOut`, `weekIdOut`, and `weeklySummaryIdOut`.
7. Verify exactly one XP Event has `Source Key = VIDEO_SUBMISSION|{VideoFeedbackId}`. It must have:
   - `Active? = checked`, `XP Source = Video Submission`, `XP Bucket = Video Feedback`, and the positive expected points;
   - exactly one link each to the selected Video Feedback, Enrollment, Submission, and Week;
   - the canonical Weekly Athlete Summary link when the Submission/WAS context resolves;
   - reason/debug fields identifying the VF ID and source key.
8. Wait for Airtable formulas/rollups to settle, then save a second read-only audit JSON. Verify:
   - the selected WAS `XP Earned This Week` includes the active XP Event;
   - Enrollment `Lifetime XP Total` changed by the expected active-point delta, accounting for any manual adjustment;
   - the selected active Enrollment's Current Level, Level Sort Order, School Year, and Program Instance inputs remain populated for standings.
9. Record the settled lifetime value and 041 signature before/after. Allow 041's normal scheduled pass (or Mike's explicit controlled action) to queue the enrollment. Verify `Level Recalc Needed? = checked` before 042 consumes it.
10. Allow 042 to consume the queue. Verify it alone updates/retains Current Level, Next Level, Level Gate Rule, and Level Status, then clears `Level Recalc Needed?`. Verify 043 remains absent/off.

## Controlled replay / idempotency check

1. Without changing eligibility, rerun only the installed 114 action for the same VF record, or make the same trigger condition re-enter through Mike's controlled native procedure.
2. Expect `updated` or `updated-after-recheck`, the same XP Event ID, the same source key, and count exactly one matching XP Event afterward.
3. Save a third read-only audit output. Stop if a second event, changed source key, different source ownership, unexpected deactivation/reactivation, or email-related record/run appears.

## Stop conditions

Stop and retain evidence before any repair if:

- an automation version, ON/OFF state, trigger, or dynamic input mapping differs from this packet;
- `112` or `043` is enabled/present unexpectedly;
- an event exists for a different VF key, multiple candidate events exist, or any required link is missing/multiple/mismatched;
- the source Submission is inactive/uncountable/future/missing Week, or the Enrollment is inactive/missing identity;
- active-point, weekly, lifetime, 041 queue, 042 result, or standings input is blank after a reasonable settlement re-read;
- an Email Handoff Queue record, Make webhook run, Gmail action, or parent-recipient path appears.

## Explicitly out of scope

This packet does not prove native trigger behavior until Mike captures Production evidence. It does not authorize sending an email, using Make/Gmail, enabling 077, modifying Communications Hub, changing schema/formulas/views, or repairing historical rejected/inactive feedback XP. The business rule for deactivating or reactivating an already-created Video XP Event after later rejection/correction remains a Mike decision; current 114 fails closed for new/update processing but does not silently retire historical XP.
