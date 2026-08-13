# PKG-007 Homework XP — Production Schmidt Test

**Status:** Production installed; controlled Schmidt lifecycle proof passed
**Environment:** Production Airtable only; no DEV claim
**Evidence source:** Mike supplied the Production installation and run evidence. Cursor did not independently access Airtable.

The passed scope is the Homework XP lifecycle for the supplied Schmidt test:
creation, automatic withdrawal, and restoration of the same canonical XP Event.
This does not prove every Homework path, progression rollup, standings path,
natural trigger in every configuration, or full-season behavior. Daily-submission
XP reversal remains a separate P0 concern and does not invalidate this passed
Homework lifecycle proof.

## Paste scope

Mike installed Automation 020 v3.5, 064 v12.2, and 065 v10.1. Automation
063 and 068 are absent/retired; 071 is OFF. The nine fields were created in
the documented order in [`airtable/schema/current/homework-xp-reconciliation-fields.md`](../../airtable/schema/current/homework-xp-reconciliation-fields.md).
The historical signature initializer was correctly skipped because Production
Homework Completions and XP Events were empty before this controlled test.
Dynamic `recordId` mappings were retained. Automation 067 and email remain out
of scope.

## Trigger requirements

- 064: positive preparation only — review complete, satisfactory, coach feedback present, exact Enrollment/Homework/Week. It does not own correction or deactivation.
- 065: `Homework XP Reconciliation Needed? = 1`; dynamic `recordId`. Production final state was 064 ON, 065 ON, and 071 OFF. The signature wakes award, repair, withdrawal, Enrollment/PHA correction, and restoration paths. Positive award, repair, and reactivation require exactly one canonical Weekly Athlete Summary for the Homework Completion's exact Enrollment + Week; zero or multiple candidates block the positive path. Ineligible corrections still deactivate an exact owned event even if WAS is missing or ambiguous.
- Do not require XP Events empty. Current Homework schema has no `Active?` or `Do Not Award XP?`; do not add or simulate those fields in this package.

## Formula-backed linked reconciliation

The source formulas and HC lookups propagate linked Enrollment, PHA, and XP Event changes into one reconciliation condition without scheduled polling or a new automation slot. Exact PHA link, Homework Assignment, Week, Program Instance, and `Item Slot`/`Homework Slot` must match. `Asset Slot` remains routing-only. Signatures wake 065; the script still validates real links and fails closed. Its bounded post-write formula rereads are short consistency checks inside one execution—not scheduled polling and not another automation.

## Controlled Schmidt proof

1. Run the authoritative audit read-only and preserve its JSON.
2. Select one Schmidt PHA-first Homework Completion with exactly one Enrollment, Homework, Week, active Program Homework Assignment, and one Submission.
3. Complete review, check Satisfactory and Review Complete, and add Coach Feedback.
4. Verify 064 writes configured Base XP and Pending.
5. Verify exactly one canonical WAS exists for the selected Enrollment + Week. Verify 065 creates exactly one active `HOMEWORK_XP|<HC ID>` event with correct HC, Enrollment, Submission, Week, canonical WAS, and points. Zero or multiple WAS candidates must block a new award or restoration.
6. Verify Awarded, WAS XP, Enrollment Lifetime XP, progression recalculation, and standings inputs settle.
7. Replay 064 then 065; verify the same XP Event ID and no duplicate.
8. Clear Satisfactory; verify formula-triggered 065 makes the same event inactive and totals settle downward.
9. Restore Satisfactory, run 064, and verify formula-triggered 065 reactivates the same event and totals settle upward.
10. Briefly make the linked PHA inactive, then restore it; verify automatic deactivate/reactivate uses the same event ID. Repeat with Enrollment Active? only if safe for the controlled Schmidt window.
11. Run the authoritative audit again; require zero eligible missing/duplicate/ownership/points/WAS/active-state/signature issues. It must separately report zero/multiple canonical WAS, blank event WAS, wrong event WAS, and multiple event WAS links.

## Supplied Production result

- Homework Completion: `rec3FDdZXlXjhcTj4`
- Canonical XP Event: `recJGcfipFyKwiSC5`
- Canonical Source Key: `HOMEWORK_XP|rec3FDdZXlXjhcTj4`
- Weekly Athlete Summary: `receNfggQO9HtWCkr`
- Points: `35`
- Creation: `success`, `created_or_reactivated`, awarded, active, Needed returned to `0`
- Withdrawal after unchecking Satisfactory: `skipped`, `reconciled_ineligible`, same event deactivated
- Restoration after rechecking Satisfactory: `success`, `reused_after_recheck`, same event reactivated
- No duplicate event, replacement, warning, or source-key change
- Audit before installation/test: dry run, `checked: 0`, `issueCount: 0`, `issues: []`

## Resubmission boundary

A Homework Completion may collect multiple legitimate Submissions. An existing XP Event may keep one Submission linked to that completion. A brand-new award with multiple candidates fails closed because no approved canonical-resubmission selector exists.

## Rollback

On failure, turn 065 OFF first and preserve records, audit JSON, and run outputs. Restore the prior 065 source/trigger if necessary. The nine additive fields may remain inert; remove them only after 065 is OFF and dependency review confirms nothing consumes them. Do not delete or clone XP Events. Keep 063/068 OFF. Airtable has no atomic uniqueness constraint; the recheck and audit detect rather than claim impossible simultaneous duplicates.
