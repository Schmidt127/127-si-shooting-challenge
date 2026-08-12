# PKG-006 — Daily Submission Communications Hub promotion

Status: **Repository-ready / promotion pending**
Backlog: `PKG-006` daily-submission communications; `PKG-028` Hub migration
Production change: **Not applied by Cursor**

## Automation 031 v4.0 creator-ownership restoration + Automation 076 v8.4

This bounded corrective child scope replaces the repository 031 source version
from v3.9 to **v4.0** while updating 076 to **v8.4**. It restores the already
approved 031 normal-athlete-activity creator ownership documented in
`WAS-CREATOR-RESOLUTION.md`; this is not a new architecture:

- `Submissions -> Count This Submission?` remains the existing formula field;
  v4.0 requires field existence and reads its evaluated result through
  `isChecked()`.
- `Submissions -> Submission Stat Mode` remains the existing formula field;
  v4.0 requires field existence and accepts only trimmed, case-insensitive
  evaluated text equal to `Simple Total` or `Detailed Shooting`.
- `Submissions -> Build Daily Email Now?` remains a required writable
  `checkbox` and is still checked only after final summary validation.
- Automation 076 v8.4 applies the same count/mode guard before queue work,
  preserves deterministic Draft/recheck/Ready behavior, and clears the
  readiness checkbox only after successful queue create/reuse.
- Automation 076 v8.4 uses the verified Production table `Program Instance -
  Sync` for Program Instance lookup. The Submission field `Program Instance -
  Synced` is a separate field and remains unchanged.
- Automation 076 v8.4 requires `Enrollments.Parent Email - Cleaned` as the
  authoritative parent recipient. It may include
  `Enrollments.Athlete Email - Cleaned` when valid, deduplicated
  case-insensitively. Raw `Parent Email` is never used as a fallback.
- When zero fully valid canonical summaries exist, 031 creates one with the
  Submission Enrollment and Week plus `Complete` status when writable; it never
  writes formula `Summary Key`, requeries after creation, and stops on any
  residual duplicate/concurrency conflict.
- No schema, formula, Automation 010, Automation 077, Make, Gmail, Hub, or
  email change is included.

Before any Production replacement, Mike must complete the controlled Production
test packet for v4.0/v8.4 using the existing valid Schmidt Submission and Mike's
allowlisted email. No DEV Airtable evidence is required or claimed.

Recommended Production trigger conditions:

- `Build Daily Email Now?` is checked;
- `Count This Submission?` evaluates to `1`.

Do not require `Submission Stat Mode = Counted`. The scripts remain the final
guard and accept only `Simple Total` or `Detailed Shooting`. If the trigger
also filters on mode, configure an OR group for those two values.

## 076 v8.4 Production replacement and controlled test

1. Open the existing Production Automation 076 slot; do not create a new
   automation, table, or field.
2. Replace the full script with the committed v8.4 source, omitting only the
   GitHub header comment when pasting into Airtable.
3. Confirm the script uses the existing Production table
   `Program Instance - Sync` (table ID `tblMfALZa4YYUy70P`, display field
   `Name - Program Instance`). Do not rename or alter the Submission field
   `Program Instance - Synced`; that is a field, not a table.
4. Confirm recipient resolution uses only `Enrollments.Parent Email - Cleaned`
   for the required parent recipient. `Enrollments.Athlete Email - Cleaned` is
   optional when valid; raw `Parent Email` must not satisfy the requirement.
5. Verify the permanent input mapping is dynamic: `recordId` must receive the
   Airtable record ID from the triggering Submission. Never permanently
   hardcode `rec58gdymfPKKeVRI`; it is manual-test-only.
6. Use Airtable's Test action to select or temporarily supply
   `rec58gdymfPKKeVRI`, rerunning only the existing valid Schmidt Submission.
   Verify one `DAILY_SUBMISSION` queue row with the deterministic Handoff Key,
   `Status = Ready`, and `Build Daily Email Now?` cleared after queue
   create/reuse.
7. After testing, verify the saved Production input remains dynamically mapped
   to the triggering Submission. Do not manually change formula results to
   exercise negative cases; those cases are covered offline.

## Controlled Production promotion order

Production Airtable is the only Airtable environment for this integration.

1. Mike pastes the exact committed Automation 076 v8.4 source first into the
   existing Production `Submissions` automation slot. Do not create a new
   numbered automation or schema field.
2. Automation 031 is the sole owner that checks
   `Submissions.Build Daily Email Now?`, and it does so only after Enrollment,
   Week, Program Instance, duplicate review, canonical summary linkage, eligible
   XP-link repair, and final summary validation succeed. Automation 076 consumes
   and clears the checkbox after queue creation or reuse.
3. Run one controlled Production test using a Schmidt test Submission and
   Mike's allowlisted email (`mschmidt@fairfield.k12.mt.us`), with `testMode=true`.
   Verify exactly one `Email Handoff Queue` row:
   - `Handoff Key` = `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}`
   - `Status` = `Ready`
   - `Event Type` / `Template Key` = `DAILY_SUBMISSION`
   - `Source Table` = `Submissions`
   - `Recipients JSON` and `Payload JSON` parse successfully
   - `Attempt Count` = `0`
   - `Build Daily Email Now?` is cleared after create or existing-row reuse
4. Allow the existing Production Automation 079 dispatcher to process the row.
   Do not modify 079, enable 077, call Make, or call the Hub from 076.
5. In Communications Hub, verify one Hub Event, one `Sent` Delivery, one Resend
   provider id, and one attempt. Queue `Accepted` alone is intake evidence, not
   delivery proof.
6. Replay the same key and confirm the existing Event, Message, and Delivery
   are reused without another Resend call. Recipient case and object-key order
   changes must not conflict. A changed meaningful payload must return 409
   conflict/Needs Review without mutating existing records or sending again.
7. Provider failure retries the existing Delivery and creates a Delivery Attempt;
   it does not replay the source Event or create another Message/Delivery.
8. Capture queue, Hub Event, Delivery, Resend id, and replay evidence. Only then
   consider 077 a retirement candidate; it is not retired by this PR.

## 031 v4.0 replacement steps (after controlled Production test and Mike approval)

1. Open the existing Production Automation 031 slot; do not create a new slot.
2. Replace the full script with the committed v4.0 source, omitting only the
   GitHub header comment when pasting into Airtable.
3. Verify the permanent input mapping is dynamic: `recordId` must receive the
   Airtable record ID from the triggering Submission. Never permanently
   hardcode `rec58gdymfPKKeVRI` into Automation 031.
4. Verify the existing formulas `Count This Submission?` and
   `Submission Stat Mode` are unchanged, and that `Build Daily Email Now?` is
   still a physical writable checkbox.
5. Use Airtable's Test action to select or temporarily supply
   `rec58gdymfPKKeVRI` as the test record, then rerun only that existing valid
   Schmidt Submission. Verify its count evaluates to `1` and its mode evaluates
   to `Simple Total` (the controlled evidence), and 031 reuses the existing
   canonical WAS or creates exactly one if none exists before checking
   `Build Daily Email Now?` only after final summary validation.
6. Do not manually change formula results to exercise count `0` or another stat
   mode in Production. Those negative cases are covered offline; do not
   intentionally alter the Submission merely to exercise them.
7. After testing, verify the saved Production automation input remains
   dynamically mapped to the triggering Submission.
8. If any step fails, turn Automation 031 OFF and preserve the failed
   Submission and output/error evidence. Do not alter either formula or field
   type. Do not restore v3.6 or v3.7; leave 031 OFF until a corrected repository
   version is approved.

This v4.0/v8.4 hotfix packet authorizes repository replacement instructions only. It
does not authorize a Production Airtable paste, a live record mutation, a queue
dispatch, an email send, a Make/Gmail action, or enabling 077.

## Rollback

- Turn Automation 031 OFF.
- Preserve the failed Submission and all output/error evidence.
- Do not change either Airtable formula or field type.
- Do not restore Automation 031 v3.6 or v3.7; leave 031 OFF until a corrected
  repository version is approved.
- Do not restore superseded 031 v3.8/v3.9 as the creator correction; 076 v8.4
  remains unchanged unless separately approved.
- Do not treat or restore the superseded 031 v3.8 or 076 v8.3 versions as the
  corrected Production pair.
- Do not enable 077 or Make/Gmail as a rollback.
- Stop arming new `Email Handoff Queue` rows and disable the 076 trigger if
  needed; leave Hub Delivery history intact.
- Do not re-enable 077 or any Make/Gmail daily sender as an automatic rollback.
- Existing Ready rows may be cancelled or held for Mike review; do not replace
  a conflicting Handoff Key.
- A query/recheck/create sequence is not an Airtable atomic uniqueness guarantee.
  031 creates only after a zero pre-query, then requeries and requires exactly
  one canonical Enrollment+Week+Program Instance+Summary Key result. If
  multiple results appear, stop and report all IDs; do not delete or archive a
  competitor automatically.
  076 stages a new row as `Draft`, rechecks exact-key matches, marks concurrent
  matches `Needs Review`, and only then promotes the single row to `Ready`.
  This reduces the dispatch race but does not eliminate a narrow simultaneous
  execution window; no concurrency-safety claim is made until the
  Production queue/079 behavior is proven.
- Restore the prior committed 076 v8.2 source only through the normal
  Production review and controlled-test path.

## Schema decision

This implementation assumes the verified existing `Email Handoff Queue`
schema. It adds no fields, tables, views, or source writeback field. It clears
the already-existing `Build Daily Email Now?` checkbox after successful
reuse/create; Automation 031 is the sole owner that checks that checkbox. Any
proposed Submission link/status writeback is deferred and requires Mike
authorization as a separate schema decision.
