# Automation 041 v4.0 — PROD Live Proof Progress

Date: 2026-08-08  
PROD base: `appn84sqPw03zEbTT`  
Controlled Enrollment: `recCyFEPeATOVNlr9`  
GitHub issues: #98 and execution issue #118

## Current status

Automation 041 v4.0 is installed in the native PROD Airtable editor. The additive signature field exists:

- Enrollments.`Progression Last Queued Signature`
- field ID `fldw2p0bfT54vk6ag`

041 is a queue/request mechanism. Automation 042 v3.3 remains the progression-output writer.

The full A–N controlled proof matrix is **not complete**. This document records only evidence actually observed or provable from installed/repository architecture.

## Live cases completed

### Case L — unchanged replay / idempotency — PASS

Controlled manual run using:

`recordId = recCyFEPeATOVNlr9`

Observed output:

- `debugStep = 05 - Complete`
- `statusOut = skipped`
- `actionOut = skipped_unchanged`
- `queuedCount = 0`
- `scannedCount = 1`

Console summary reported one scanned Enrollment, zero queued, one unchanged.

This proves unchanged authoritative inputs do not repeatedly requeue the Enrollment after 042 clears the queue checkbox.

### Case E — manual XP adjustment — PASS both directions

Baseline manual adjustment 0 was changed to 1 and then restored to 0.

Each changed state caused one 041 queue result on the controlled Enrollment:

- `statusOut = success`
- `actionOut = queued`
- `queuedCount = 1`
- `scannedCount = 1`

The Enrollment returned to manual adjustment 0.

### Case K — Level Gate Rule threshold change — PASS both directions

Controlled rule:

- `reciCGdog1M6rnOAM`
- `Level 12 Gate - GOAT`
- School Year / Rule Set `2026-2027`

Minimum Submissions was changed 60 → 61 and then restored 61 → 60.

Each changed rule-set state caused exactly one controlled 041 queue result. The gate was restored to 60.

### Case B — XP Event deactivation — forward PASS

Controlled XP Event:

- `recHHhpkgQS1hhIHo`
- source key `SUBMISSION_XP|recElDBcFvuE6jWwc`
- Enrollment `recCyFEPeATOVNlr9`
- XP Points 20

`Active?` true → false caused one 041 queue result:

- `success`
- `queued`
- `scannedCount = 1`
- `queuedCount = 1`

The XP Event was subsequently restored to `Active? = true`.

### Case B reverse — not claimed as isolated proof

Current PROD readback confirms `recHHhpkgQS1hhIHo` is Active again and linked to the controlled Enrollment, Early Bird Week, source Submission, and canonical summary.

The current stored progression signature also reflects the current aggregate Enrollment state. However, other controlled work changed the Enrollment's aggregate XP/video values in the interval, so this evidence cannot isolate the XP-event reactivation as the sole cause of a queue. Do not mark the reverse branch PASS from this state alone.

## Static ownership cases completed

### Case M — 041 never writes progression outputs — PASS by source inspection

Repository v4.0 declares the progression fields for architectural documentation but does **not** load them in `requiredEnrollmentFields` and does not write them.

The only Enrollment update created by 041 is:

- `Level Recalc Needed? = true`
- `Progression Last Queued Signature = current signature`

041 does not write:

- Current Level
- Next Level
- Level Gate Rule
- Level Status

Repository source:
`airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js`

### Case N — 042 remains progression-output writer — PASS for deployed architecture

Automation 042 v3.3 explicitly owns writes to:

- Enrollments.Current Level
- Enrollments.Next Level
- Enrollments.Level Gate Rule
- Enrollments.Level Status
- Enrollments.Level Recalc Needed? clearing
- Zoom Attendance.Gate Credit Applied? only for recording credit actually counted

Controlled first-run and replay proof for 042 v3.3 passed on 2026-08-08.

Automation 043 is not deployed in the native PROD Automation UI, is marked Off in governance, and must not be recreated.

Evidence:
- `docs/prod-completion/2026-08-08/AUTOMATION-042-V3.3-SCHOOL-YEAR-LIVE-PROOF.md`
- issue #97 closed Completed
- issue #95 closed Not Planned

This establishes the intended deployed progression-writer architecture for the #98 proof matrix.

## Current Enrollment state at latest readback

Do not use the earlier 688-XP / 9-video values as a permanent baseline. Concurrent controlled work has legitimately moved the current aggregates.

Latest readback during this proof update:

- Lifetime XP Total: 708
- Lifetime XP Manual Adjustments: 0
- Total Submissions: 13
- Total Homework Completions: 3
- Total Video Submissions: 11
- Total Zoom Attendances: 0
- Longest Streak Days: 7
- School Year: 2026-2027
- Active?: true
- Level Recalc Needed?: false at read time
- stored signature matches the current 708 / 13 / 3 / 11 / 0 / 7 state and current gate rules

These changed aggregates are why later live cases must use fresh before/after snapshots rather than relying on the earlier baseline documented in the original proof packet.

## Remaining A–N live work

Still requires controlled proof without interfering with concurrent agent changes:

- A — new positive XP change
- B — isolated reverse/reactivation branch if desired
- C — XP Points downward correction, including zero
- D — XP Enrollment ownership move old/new
- F — Submission count gain/loss without XP
- G — Homework count gain/loss
- H — Video count gain/loss
- I — effective Zoom gate evidence gain/loss including recording-credit path
- J — longest streak gain/loss

Cases E, K, L, M, N and B-forward are supported as above.

## Safety rule for remaining proof

Because other agents are currently changing XP/video/asset integrity, do not stage a long-lived mutated fixture. For each remaining case:

1. snapshot current Enrollment signature inputs;
2. make one controlled change;
3. run/observe 041;
4. allow 042 to process or clear only as designed;
5. restore the source state;
6. verify the current signature again;
7. record exact output before moving to the next case.

Do not close #98/#118 until the remaining acceptance matrix is satisfied or the issue is explicitly narrowed with evidence.
