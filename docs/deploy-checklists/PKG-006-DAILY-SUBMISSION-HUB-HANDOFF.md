# PKG-006 — Daily Submission Communications Hub promotion

Status: **Repository-ready / promotion pending**
Backlog: `PKG-006` daily-submission communications; `PKG-028` Hub migration
Production change: **Not applied by Cursor**

## Controlled Production promotion order

Production Airtable is the only Airtable environment for this integration.

1. Mike pastes the exact committed Automation 076 v8.1 source into the
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

## Rollback

- Stop arming new `Email Handoff Queue` rows and disable the 076 trigger if
  needed; leave Hub Delivery history intact.
- Do not re-enable 077 or any Make/Gmail daily sender as an automatic rollback.
- Existing Ready rows may be cancelled or held for Mike review; do not replace
  a conflicting Handoff Key.
- A query/recheck/create sequence is not an Airtable atomic uniqueness guarantee.
  076 stages a new row as `Draft`, rechecks exact-key matches, marks concurrent
  matches `Needs Review`, and only then promotes the single row to `Ready`.
  This reduces the dispatch race but does not eliminate a narrow simultaneous
  execution window; no concurrency-safety claim is made until the
  Production queue/079 behavior is proven.
- Restore the prior committed 076 source only through the normal Production
  review and controlled-test path.

## Schema decision

This implementation assumes the verified existing `Email Handoff Queue`
schema. It adds no fields, tables, views, or source writeback field. It clears
the already-existing `Build Daily Email Now?` checkbox after successful
reuse/create; Automation 031 is the sole owner that checks that checkbox. Any
proposed Submission link/status writeback is deferred and requires Mike
authorization as a separate schema decision.
