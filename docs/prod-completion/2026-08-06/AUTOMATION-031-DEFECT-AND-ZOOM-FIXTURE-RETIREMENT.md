# Automation 031 Defect and Cross-Year Zoom Fixture Retirement

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`

## Automation 031 defect

Repository script:

`airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js`

Current version: v3.2

The script exits with `already_linked_to_summary` whenever a Submission has any Weekly Athlete Summary link. It does not validate that the linked summary matches the Submission's current Enrollment, Week, expected Summary Key, or Program Instance path.

This behavior explains why stale cross-week links survived after Week corrections and required direct PROD repair.

GitHub issue created:

- #96 — Fix Automation 031 existing-summary validation and cross-week repair

The Airtable Automations inventory record `recuXhBl6WGImtwo8` was updated with the confirmed defect and the required repair conditions.

## Retired cross-year Zoom fixture

The remaining isolated summary `recWi4FtZhPqQHCC1` represented an invalid historical combination:

- Enrollment: inactive Schmidt 2025-2026 `recgP9qZYjAhE7NXm`
- Week: 2026-2027 Week 2 `rec2Rewxt21z7dI9f`
- Zoom Meeting date: 2027-05-02 / XP resolved 2027-05-03
- XP Events:
  - `recnHAfNL5i2RAOfz` — Zoom Meeting Attendance Base, 60 XP
  - `rec4ILvNKK2Qe0bhu` — Zoom Meeting Attendance Bonus 3, 40 XP

The platform blocked destructive deletion, so the fixture was retired non-destructively:

1. Both XP Events were set `Active? = false`.
2. Both XP Events were unlinked from Weekly Athlete Summary.
3. Their XP Reason Debug fields were stamped as retired fixture evidence.
4. Active XP Points recalculated to zero.
5. Summary `recWi4FtZhPqQHCC1` had Week and Submission links cleared.
6. A permanent Airtable record comment documents the retirement.

The records no longer participate in active XP totals or summary-key matching.

## Repository repair status — 2026-08-07

Issue #96 repository repair is now complete on a focused branch:

- repository script updated to `airtable/automations/shooting-challenge/031-weekly-summary-and-goal-logic-find-or-create-weekly-athlete-summary-from-submission.js` v3.4;
- existing Submission -> Weekly Athlete Summary links are now validated against the current Enrollment + Week + Summary Key;
- stale links repair to the one canonical summary when exactly one safe replacement exists;
- matching non-Submission-Base XP Events for the same Enrollment + Week repair from blank/stale summary linkage to the canonical summary; Submission Base XP Events remain owned by Automation 010 via the structured `XP Source` option ID `selZw4nOkwMJCgGyR`;
- stale repair fails closed when no canonical summary can be resolved safely;
- offline regression passed: `node --test tools/testing/tests/test_031_offline.mjs`.

No Airtable automation editor paste has been performed from that package.
No controlled PROD live test has been performed from that package.

Paste/test packet:

- `docs/prod-completion/2026-08-07/AUTOMATION-031-PASTE-AND-TEST-PACKET.md`

## Completion status

No Completion Master status advanced from repository work alone.

Automation 031 remains unconfirmed in Airtable until the repaired script is pasted into the actual Airtable automation editor and proven with a controlled wrong-summary test and replay.
