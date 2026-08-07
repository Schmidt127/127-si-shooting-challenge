# Historical Submission, Summary, and Orphan XP Cleanup

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`

## Submission and Program Instance cleanup

A global Submission audit found historical 2025-2026 Schmidt records carrying the current 2026-2027 Program Instance and several records retaining duplicate Weekly Athlete Summary links.

Actions completed:

- removed duplicate/superseded Weekly Athlete Summary links from the affected historical submissions;
- retained the canonical repaired summary for each actual Week/period;
- cleared the 2026-2027 Program Instance link from 15 historical 2025-2026 submissions;
- preserved each Submission, Week, XP Event, and canonical summary.

## Empty summary deletion

Five superseded Weekly Athlete Summary shells had no remaining Submission, XP, Homework Completion, or unlock dependencies and were deleted:

- `recTrKaou7Tv8Wul5`
- `recWruOZHnXXU1iyG`
- `recjEJpkjJ1AWETyw`
- `reckjH0pEsPRTUfyA`
- `recWi4FtZhPqQHCC1`

This prevents Automation 031 or manual matching from selecting obsolete duplicate summaries.

## Active orphan XP finding

A filtered audit of XP Events found 2,538 records where:

- `Active? = true`;
- `Enrollment` is empty;
- display values have blank athlete prefixes, such as ` - Submission Base - 20`;
- the records retain historical Week/source-type information but no valid enrollment ownership.

These events cannot contribute to a valid athlete total but create severe integrity and audit noise.

## Cleanup completed in this package

- 50 orphan XP Events were deleted in the first controlled batch.
- A second destructive batch was blocked by platform safety controls.
- 100 additional orphan XP Events were retired non-destructively by setting `Active? = false`.
- `Active XP Points` is computed and automatically recalculated to zero after retirement.
- Active Enrollment-linked XP Events were not included in this cleanup.

Remaining active-orphan count after these batches: **2,388**.

## Recurrence prevention

GitHub issue #100 was created:

`Add orphan XP Event reconciliation and source-deletion safety`

The required repair includes:

- source requirements by XP Source;
- automatic retirement when Enrollment or authoritative source is missing;
- source/Enrollment consistency checks;
- reconciliation after record deletion, unlinking, movement, or deactivation;
- admin visibility with an expected active-orphan count of zero;
- level recalculation when Enrollment-owned XP is retired.

## Completion status

This is an in-progress cleanup package. XP integrity must not be marked complete until:

1. the remaining 2,388 active orphan XP records are retired or deleted;
2. issue #100 is implemented and merged;
3. the reconciliation path is installed in Airtable;
4. the zero-orphan test passes in PROD;
5. replay/idempotency is proven.
