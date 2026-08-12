# Video Feedback XP — Production Schmidt Test Packet

**Status:** Draft — repository readiness only; Production evidence pending
**Scope:** `013 → 113 → 114 → rollups → 041 → 042`
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
| Grade Band context | `013` | Current repository ownership assigns VF create/link and grade-band repair to `013`. Historical `111` only copied Grade Band; it is not an XP writer or XP eligibility rule and must not be re-enabled for this test. |
| Coach preparation | `113 v6.4` | Requires exactly one VF Enrollment + Submission, matching Submission Enrollment, and exactly one active exact `Rule Key = VIDEO_SUBMISSION` rule with positive finite amount. It writes Base XP, Pending, and arms `Ready for XP Automation?`; it can re-arm only one exact inactive canonical XP Event. |
| XP Event | `114 v6.1` | Resolves only the exact VF link or `VIDEO_SUBMISSION|{videoFeedbackRecordId}` before eligibility gates. Requires exact Enrollment/Submission/Submission Week and a matching canonical source identity. It deactivates that exact event when VF becomes inactive, unposted, or Do Not Award, then reuses/reactivates the same event when eligible again. |
| Weekly / lifetime contribution | rollups | XP Event must have active status and matching Enrollment + Week; 114 also resolves/links a canonical WAS when one is already resolvable. `XP Earned This Week` and `Lifetime XP Total` are computed values—allow settlement before judging blank/mismatch. |
| Progression | `041 v4.0 → 042 v3.4` | A settled Lifetime XP input change changes 041's signature and queues `Level Recalc Needed?`; 042 consumes the queue and is the sole writer for Current Level, Next Level, Level Gate Rule, and Level Status. `043` remains retired/not deployed. |
| Standings | Enrollment / leaderboard view | Repository contract is an active Enrollment with School Year, Program Instance, Current Level, and numeric Level Sort Order. This test can inspect the inputs; it cannot prove view membership without Mike's UI readback. |

## Required preflight — read-only and saved

1. Export or save the full console JSON from `audit-video-xp-pipeline-integrity.js` before touching the test row. Name it with UTC date/time and retain it with this packet's evidence.
2. Record the selected current Schmidt records and starting values:
   - Video Feedback ID, Submission ID, Submission Asset ID (if present), Enrollment ID, Athlete ID, Week ID, Program Instance ID, School Year, Enrollment and VF Grade Band IDs.
   - VF `Active?`, `Feedback Posted?`, `Do Not Award XP?`, Coach Feedback presence, Base/Extra/Total Video XP, Award Status, Ready flag, existing XP links.
   - Submission `Enrollment`, `Week`, `Activity Date`, and Weekly Athlete Summary link.
   - Enrollment `Active?`, `Lifetime XP Total`, `Level Recalc Needed?`, `Progression Last Queued Signature`, Current/Next Level, Level Gate Rule, Level Status, and standings inputs.
   - Existing XP Event count for exact `Source Key = VIDEO_SUBMISSION|{VideoFeedbackId}`.
3. Stop immediately if the audit reports duplicate or mislinked Video XP for the selected row, ambiguous links, missing Program Instance/Athlete/School Year, inactive Enrollment, a blank/multiple Week, a future Activity Date, or an existing active event for a different source.
4. Do not repair, deactivate, activate, delete, relink, or manually edit an XP Event during this packet. Capture the evidence and stop for a separate approved repair decision.

## Installed native-automation check — Mike records the result

Before the positive path, open Production Automations and record the version, trigger type, trigger condition(s), dynamic input mapping, and ON/OFF state:

| Automation | Required check |
|---|---|
| `013` | Current canonical Video Feedback creator/linker; record input maps to the triggering Submission Asset. |
| `111` | Historical/retired; do not enable or recreate it. If VF Grade Band is blank, record the condition and stop for an `013`/identity-chain review; Grade Band is not a 113/114 XP calculation input. |
| `113 v6.4` | Current script and trigger target the selected Video Feedback review state; never use it to send email. |
| `114 v6.1` | ON only after Mike pastes the committed script; trigger must support both award and withdrawal lifecycle changes. Do not require an empty XP link and do not use `Award Status is not Awarded` as a trigger condition. |
| `041 v4.0` | Scheduled reconciliation remains configured; optional `recordId` is blank except for an intentional controlled action. |
| `042 v3.4` | ON / view-triggered from `042 - Needs Level Assignment`, whose filters include `Level Recalc Needed?` checked and `Active?` checked. |
| `043` | Absent/off. Do not recreate it. |
| `073` | Leave OFF for this test, or leave its trigger unable to enter. Do not run it manually. Its Make webhook, recipient, and send mode are outside this XP test. |
| `077`, Make/Gmail | Leave disabled/not invoked. Do not create an Email Handoff Queue record. |

### Required paste order

1. Paste the committed `113 v6.4` script and save its native automation configuration.
2. Paste the committed `114 v6.1` script and save its native automation configuration.
3. Run the read-only preflight before any Schmidt lifecycle test.

### Automation 113 — positive review-preparation trigger

| Setting | Required Production configuration |
|---|---|
| Trigger type | When record updated |
| Table | Video Feedback |
| Watched fields | Feedback Posted?, Coach Feedback, Do Not Award XP?, Enrollment, Submission, XP Events |
| Positive review-ready conditions | Active? checked; Feedback Posted? checked; Coach Feedback nonblank; Do Not Award XP? unchecked; Enrollment and Submission present |
| Input `recordId` | Dynamically mapped to the triggering Video Feedback record |

113 prepares a positive award/re-arm only. It must not create, deactivate, reactivate, or send anything. Do not require `XP Events` to be empty: one correctly owned inactive canonical event is a valid restoration path. 114, not 113, owns withdrawal reconciliation.

### Automation 114 — award, reactivation, and withdrawal trigger

| Setting | Required Production configuration |
|---|---|
| Trigger type | When record updated |
| Table | Video Feedback |
| Watched fields | Active?, Feedback Posted?, Do Not Award XP?, Ready for XP Automation?, Total Video XP Awarded, Enrollment, Submission, XP Events |
| Input `recordId` | Dynamically mapped to the triggering Video Feedback record |

The 114 trigger must cover both positive award/reactivation changes and withdrawal changes that deactivate an existing exact XP Event. Do not apply any positive-only trigger restriction: `XP Events is empty`, `Award Status is not Awarded`, `Feedback Posted? is checked`, `Active? is checked`, or `Do Not Award XP? is unchecked`. Those restrictions prevent the correction branch from running.

### Countability boundary

`Count This Submission?` and shooting-stat countability do not control Video Feedback XP. Video XP is awarded for eligible reviewed Video Feedback; the required source checks are its exact identity, single Submission Week, and non-future Activity Date.

## Controlled Production-only Schmidt test

1. Select one fresh eligible Schmidt Video Feedback row. Use Mike's allowlisted email only if an email field must be viewed; no email automation may be armed or run.
2. Confirm the preflight identity chain is exact: one active Enrollment with one Athlete, Program Instance, School Year, and Grade Band; one matching Submission Enrollment; exactly one Week; and a non-future Activity Date. Video XP does not depend on shooting-stat countability.
3. Record the VF and Enrollment Grade Band values. If the VF Grade Band is blank, do not enable or run `111`; stop for an `013`/identity-chain review. Do not treat Grade Band as XP proof or manually use it to qualify the record.
4. Complete the coach review on the same row: nonblank Coach Feedback, `Feedback Posted? = checked`, `Do Not Award XP? = unchecked`. Run/allow `113` only if it is the installed preparation step. Record its output and the active `VIDEO_SUBMISSION` XP Reward Rule ID/amount.
5. Verify `113` produces positive Base/Total Video XP, `Award Status = Pending`, and `Ready for XP Automation? = checked`. If any is absent, stop; do not manually manufacture the event.
6. Allow the installed `114 v6.1` trigger to process exactly once. Capture its run history/output: `statusOut`, `actionOut`, `sourceKeyOut`, `xpEventIdOut`, `enrollmentIdOut`, `submissionIdOut`, `weekIdOut`, and `weeklySummaryIdOut`.
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
- the source Submission has a future Activity Date or missing Week, or the Enrollment is inactive/missing identity;
- active-point, weekly, lifetime, 041 queue, 042 result, or standings input is blank after a reasonable settlement re-read;
- an Email Handoff Queue record, Make webhook run, Gmail action, or parent-recipient path appears.

## Explicitly out of scope

This packet does not prove native trigger behavior until Mike captures Production evidence. It does not authorize sending an email, using Make/Gmail, enabling 077, modifying Communications Hub, or changing schema/formulas/views. The approved lifecycle policy is mandatory: never delete or replace the exact Video XP Event; deactivate it on withdrawn eligibility and reactivate that same ID on restoration.
