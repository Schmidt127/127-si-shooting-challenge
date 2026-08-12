# PKG-007 Homework XP — Production Schmidt Test

**Status:** Repository-ready; Production paste/proof pending
**Environment:** Production Airtable only; no DEV claim

## Paste scope

Turn 065 OFF before schema work. Create the nine fields in [`airtable/schema/current/homework-xp-reconciliation-fields.md`](../../airtable/schema/current/homework-xp-reconciliation-fields.md) in the documented order. Run the authoritative audit and resolve blockers. Dry-run, review, explicitly confirm, and run the one-time `initialize-homework-xp-reconciliation-signatures.js`; verify every existing row has Needed = 0. Then paste 020, 064 v12.2, and 065 v10.1 into their existing slots and enable 065. Keep dynamic `recordId` mappings. Do not paste 063 or 068; keep both OFF. Do not change 067. Automation 071 and email are out of scope.

## Trigger requirements

- 064: positive preparation only — review complete, satisfactory, coach feedback present, exact Enrollment/Homework/Week. It does not own correction or deactivation.
- 065: `Homework XP Reconciliation Needed? = 1`; map dynamic `recordId`. The signature wakes award, repair, withdrawal, Enrollment/PHA correction, and restoration paths.
- Do not require XP Events empty. Current Homework schema has no `Active?` or `Do Not Award XP?`; do not add or simulate those fields in this package.

## Formula-backed linked reconciliation

The source formulas and HC lookups propagate linked Enrollment, PHA, and XP Event changes into one reconciliation condition without polling or a new automation slot. Exact PHA link, Homework Assignment, Week, Program Instance, and `Item Slot`/`Homework Slot` must match. `Asset Slot` remains routing-only. Signatures wake 065; the script still validates real links and fails closed.

## Controlled Schmidt proof

1. Run the authoritative audit read-only and preserve its JSON.
2. Select one Schmidt PHA-first Homework Completion with exactly one Enrollment, Homework, Week, active Program Homework Assignment, and one Submission.
3. Complete review, check Satisfactory and Review Complete, and add Coach Feedback.
4. Verify 064 writes configured Base XP and Pending.
5. Verify 065 creates exactly one active `HOMEWORK_XP|<HC ID>` event with correct HC, Enrollment, Submission, Week, canonical WAS, and points.
6. Verify Awarded, WAS XP, Enrollment Lifetime XP, progression recalculation, and standings inputs settle.
7. Replay 064 then 065; verify the same XP Event ID and no duplicate.
8. Clear Satisfactory; verify formula-triggered 065 makes the same event inactive and totals settle downward.
9. Restore Satisfactory, run 064, and verify formula-triggered 065 reactivates the same event and totals settle upward.
10. Briefly make the linked PHA inactive, then restore it; verify automatic deactivate/reactivate uses the same event ID. Repeat with Enrollment Active? only if safe for the controlled Schmidt window.
11. Run the authoritative audit again; require zero eligible missing/duplicate/ownership/points/WAS/active-state/signature issues.

## Resubmission boundary

A Homework Completion may collect multiple legitimate Submissions. An existing XP Event may keep one Submission linked to that completion. A brand-new award with multiple candidates fails closed because no approved canonical-resubmission selector exists.

## Rollback

On failure, turn 065 OFF first and preserve records, audit JSON, and run outputs. Restore the prior 065 source/trigger if necessary. The nine additive fields may remain inert; remove them only after 065 is OFF and dependency review confirms nothing consumes them. Do not delete or clone XP Events. Keep 063/068 OFF. Airtable has no atomic uniqueness constraint; the recheck and audit detect rather than claim impossible simultaneous duplicates.
