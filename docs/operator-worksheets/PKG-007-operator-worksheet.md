# PKG-007 — Homework and Video Operator Worksheet

**Status:** Draft companion worksheet; Mike-owned DEV/Production execution only
**Canonical packet:** [PKG-007 Homework XP production test](../deploy-checklists/PKG-007-HOMEWORK-XP-PRODUCTION-SCHMIDT-TEST.md)
**Rule:** Capture live installed versions, trigger configuration, run IDs, and record values. Repository source is not installed-version proof.

## Identity and guardrails

- [ ] Repository SHA captured: `________________`
- [ ] Environment and operator recorded: `________________`
- [ ] DEV-first gate / approved Production window confirmed: `________________`
- [ ] No schema, code, automation state, email, Make, or historical-evidence changes made by this worksheet
- [ ] Retired 063/068 remain absent or OFF; 071 remains OFF

## Homework reuse, written submission, multi-file asset

- [ ] Source Submission RID / Enrollment / Week / Program Instance recorded.
- [ ] `Homework Name 1/2` resolves to exactly one active `Program Homework Assignments` record, not a library record.
- [ ] PHA has exactly one `Homework Assignment`, matching Week, Program Instance, and `Homework Slot`.
- [ ] Written submission path captured: `Submission` → `Submission Assets` → `Homework Completions`; written content/file type and `Original File Name` recorded.
- [ ] HW1/HW2 asset slots are explicit (`Asset Slot` = `HW1` or `HW2`); `Asset Purpose` and `Asset Type` captured.
- [ ] Multiple legitimate files for one homework are linked to the same Homework Completion; no second completion is created.
- [ ] Ambiguous Enrollment + Week + Homework + Slot candidates fail closed; operator captures every candidate RID.
- [ ] `Send to Make Trigger` / upload state is captured; no email or Make side effect is counted as XP proof.

## Video lifecycle

- [ ] `013` creates/links exactly one Video Feedback record for the selected Submission; no 112 execution.
- [ ] `113` selects the configured video XP and records the exact Video Feedback identity.
- [ ] `114` creates or updates exactly one `VIDEO_SUBMISSION|<Video Feedback RID>` event.
- [ ] Video Feedback fields captured: `Active?`, `Feedback Posted?`, `Do Not Award XP?`, `Ready for XP Automation?`, `Total Video XP Awarded`, `Award Status`, `Submission`, `Enrollment`, `XP Events`.
- [ ] Withdrawal makes the same video XP Event inactive; restoration reactivates that same Event RID.

## Exact automation proof captures

### Homework path

- [ ] **020 v3.5** installed version, trigger table/condition, dynamic `recordId`, ON/OFF state, latest run ID, and outputs captured.
- [ ] 020 result records: Submission Asset RID `________`; Homework Completion RID `________`; PHA RID `________`; library Homework RID `________`; slot `________`; `actionOut/statusOut/debugStep` `________________`.
- [ ] **064 v12.2** installed version, trigger/input, ON/OFF state, run ID, and run output captured.
- [ ] 064 evidence: exact Enrollment/Homework/Week links; `Satisfactory?`; `Review Complete`; `Coach Feedback`; configured `Base XP Awarded`; `Award Status=Pending`.
- [ ] **065 v10.1** installed version, trigger `Homework XP Reconciliation Needed? = 1`, dynamic `recordId`, ON/OFF state, run ID, and outputs captured.
- [ ] 065 evidence: `HOMEWORK_XP|<HC RID>`; XP Event RID; exact HC/Submission/Enrollment/Week/WAS links; points; `Needed=0`.
- [ ] Replay confirms same Event RID and no duplicate.
- [ ] Clear `Satisfactory?`; capture same Event deactivation and settled totals.
- [ ] Restore `Satisfactory?`; capture same Event reactivation and settled totals.

### Video path

- [ ] **113 v6.4** installed version, trigger/input, ON/OFF state, run ID, and outputs captured.
- [ ] 113 evidence: Video Feedback RID, selected XP amount, `Award Status`, `Total Video XP Awarded`, and no recording/email path.
- [ ] **114 v6.1** installed version, lifecycle trigger, dynamic `recordId`, ON/OFF state, run ID, and outputs captured.
- [ ] 114 evidence: `VIDEO_SUBMISSION|<Video Feedback RID>`; XP Event RID; exact Submission/Enrollment/Week/WAS/Video Feedback links.
- [ ] Replay confirms same Event RID and no duplicate.
- [ ] Withdraw `Active?` / feedback eligibility; capture deactivation of the same Event RID.
- [ ] Restore eligibility; capture reactivation of the same Event RID.

## Same-event settlement

- [ ] Before/after WAS XP, Enrollment Lifetime XP, Current Level/queue, and standings inputs captured.
- [ ] Formula/rollup settlement reread at `T+0 / T+30s / T+2m / T+5m`: `________________`.
- [ ] Final audit JSON path and issue count: `________________`.
- [ ] Stop on duplicate key, wrong owner, replacement/deletion, ambiguous WAS, stale totals, unexpected email/Make, or recording-credit event.
