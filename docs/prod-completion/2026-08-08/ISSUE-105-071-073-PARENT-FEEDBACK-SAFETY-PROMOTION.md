# Issue #105 — Automation 071/073 Parent Feedback Source Safety

Date: 2026-08-08
Environment: PROD-first
Status: Repository repaired; Airtable editor paste + controlled test-mode proof pending

## Repository versions

- Automation 071: v3.6
  - `airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js`
  - repair commit `b3e9f17f854a2a33bf63a6713349cefb08aff7ff`
- Automation 073: v3.3
  - `airtable/automations/shooting-challenge/073-email-notifications-and-external-handoffs-send-video-feedback-parent-email-webhook.js`
  - repair commit `3110e10297e375f48ac4443740fa1c474054e97b`
- focused source-safety contracts:
  - `tests/email/automation-071-073-source-safety.test.js`
  - `tests/homework/automation-071-reviewer-file-url.test.js`

## 071 v3.6 source contract

Before webhook handoff, 071 now requires:

1. Parent Feedback Ready; not already Sent; Satisfactory; Award Status = Awarded; Coach Feedback present; positive XP evidence.
2. Exactly one Enrollment, Week, Homework, Program Instance, Grade Band, and an HW1/HW2 Item Slot.
3. When a Program Homework Assignment is linked: it must exist, be Active, and match Program Instance + Week + Grade Band + Homework + slot.
4. When no PHA is linked: the script checks whether a current active PHA schedule exists for the same Program Instance + Week + Grade Band + slot. If one exists, the unlinked legacy chain fails closed. Legacy fallback is permitted only when no matching active PHA schedule exists.
5. Linked source Submissions must match Enrollment + Week.
6. Every linked Submission Asset must match Enrollment, slot, exactly one source Submission, and that source Submission's Enrollment + Week.
7. Every emailed asset must have a safe parent-facing URL. Private canonical S3 identity fields are not exposed.
8. Attachment-less Final Reflection quiz remains supported when the HC has a valid quiz source.
9. Test sends go only to `testRecipientEmail`; live sends use the parent recipient.
10. Make retains ownership of final Gmail-success `Parent Feedback Sent?` / sent-time writeback.
11. HTTP success is not enough: explicit JSON `{ok:false}`, `{success:false}`, or `{sent:false}` is treated as webhook failure.

## 073 v3.3 source contract

Before webhook handoff, 073 now requires:

1. Video Feedback Active, Feedback Posted, Parent Feedback Ready, not already Sent, Coach Feedback present.
2. Exactly one Enrollment, Submission, and Submission Asset.
3. Enrollment is Active.
4. `Video Feedback Key` exactly equals `VIDEO_FEEDBACK|{Submission Asset RID}`.
5. Submission Asset belongs exclusively to the linked Submission and Enrollment, links back to the Video Feedback, and is a true Video Feedback asset.
6. Submission belongs to the same Enrollment, has exactly one Week, is countable/current, has Video Upload, and has a valid non-future Activity Date.
7. Video Feedback Week lookup is populated.
8. XP evidence is computed only from linked XP Events that are Active and match the same Enrollment + Week + Video Feedback source. A stale positive rollup alone cannot authorize an email.
9. Test sends go only to `testRecipientEmail`; live sends use the parent recipient.
10. Make retains ownership of final Gmail-success sent writeback.
11. Explicit semantic failure in an HTTP 200 response is treated as failure.

## PROD paste order

1. Paste 071 v3.6 into actual Airtable Automation 071 script step.
2. Verify existing input variables remain:
   - `recordId`
   - `makeWebhookUrl`
   - `sendMode`
   - `testRecipientEmail`
   - optional `replyTo`
3. Keep the existing trigger readiness conditions. Do not add attachment-required conditions because Final Reflection quiz may be attachment-less.
4. Paste 073 v3.3 into actual Airtable Automation 073 script step.
5. Verify the same required input variables.
6. Keep Make/Gmail final sent writeback ownership.
7. Use Test mode first. Do not live-send merely to prove source validation.

## Controlled proof cases

Use Schmidt-controlled records only.

### 071

A. Valid canonical PHA + correct HW slot + correct source assets -> test handoff succeeds.
B. Parent Feedback Sent already true -> duplicate handoff blocked.
C. Inactive PHA -> blocked before webhook.
D. Wrong PHA Week / Program Instance / Grade Band / Homework / slot -> blocked.
E. Wrong asset Enrollment -> blocked.
F. Wrong asset HW slot -> blocked.
G. Asset source Submission wrong Enrollment or Week -> blocked.
H. Valid attachment-less Final Reflection quiz -> remains eligible.
I. Make HTTP 200 with explicit semantic false -> failure recorded, not success.
J. After Make final sent writeback, replay -> blocked.

### 073

K. Valid canonical Video Feedback chain with active source XP -> test handoff succeeds.
L. Inactive Video Feedback -> blocked.
M. Key mismatch -> blocked.
N. Missing/multiple Submission Asset -> blocked.
O. Wrong asset Enrollment/source -> blocked.
P. Non-countable or future Submission -> blocked.
Q. Missing Video Upload or Week -> blocked.
R. Only inactive/stale XP remains -> blocked.
S. Active XP for wrong Enrollment/Week/source -> ignored and blocked if no valid XP remains.
T. Make HTTP 200 with semantic false -> failure recorded.
U. After final sent writeback, replay -> blocked.

## Completion rule

Issue #105 remains open until the current scripts are pasted into the actual Airtable editors, trigger/input mappings are verified, and controlled Schmidt Test-mode proof demonstrates the valid and fail-closed paths. Do not weaken recipient isolation or let Airtable mark final Gmail success.