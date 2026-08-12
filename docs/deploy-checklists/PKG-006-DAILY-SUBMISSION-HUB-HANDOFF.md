# PKG-006 — Daily Submission Communications Hub promotion

Status: **Repository-ready / promotion pending**
Backlog: `PKG-006` daily-submission communications; `PKG-028` Hub migration
Production change: **Not applied by Cursor**

## DEV-first order

1. Mike pastes committed Automation 076 v8.0 into the DEV Airtable
   `Submissions` automation slot. Do not create a new numbered automation.
2. Trigger recommendation: use the existing `Submissions.Build Daily Email Now?`
   checkbox as the final source signal, with `Count This Submission?` checked and
   `Submission Stat Mode` equal to `Counted` as supporting guards. Repository
   evidence does **not** identify an automation in the 023 → 005 → 007 → 010 →
   031 chain that sets `Build Daily Email Now?`; the old production inventory
   identifies it as the legacy 076 input. Mike must verify the actual Airtable
   owner and that it fires only after Enrollment, Week, duplicate review,
   counted totals, and the 010/031 downstream processing have settled.
   Until that is verified, permanent 076 enablement is blocked.
3. Run one Schmidt-only, allowlisted DEV Submission through the completed intake
   path. Verify exactly one `Email Handoff Queue` row:
   - `Handoff Key` = `DAILY_SUBMISSION|SUBMISSIONS|{Submission Record ID}`
   - `Status` = `Ready`
   - `Event Type` / `Template Key` = `DAILY_SUBMISSION`
   - `Source Table` = `Submissions`
   - `Recipients JSON` and `Payload JSON` parse successfully
   - `Attempt Count` = `0`
   - `Build Daily Email Now?` is cleared after create or existing-row reuse
4. Allow the existing Automation 079 dispatcher to process the row. Do not
   modify 079, enable 077, call Make, or call the Hub from 076.
5. In Communications Hub, verify one Hub Event, one `Sent` Delivery, one Resend
   provider id, and one attempt. Queue `Accepted` alone is intake evidence, not
   delivery proof.
6. Replay the same key and confirm the existing Event, Message, and Delivery
   are reused without another Resend call. Recipient case and object-key order
   changes must not conflict. A changed meaningful payload must return 409
   conflict/Needs Review without mutating existing records or sending again.
7. Provider failure retries the existing Delivery and creates a Delivery Attempt;
   it does not replay the source Event or create another Message/Delivery.

## Production promotion order (Mike-owned)

1. Confirm Communications PR is merged and the Hub `DAILY_SUBMISSION` contract
   is deployed and independently reviewed.
2. Confirm the DEV 076 run and Hub Delivery proof above.
3. Confirm Automation 077 remains OFF/unused and Make/Gmail are not in the path.
4. Mike pastes the exact committed 076 v8.1 source into the existing Production
   076 slot. Do not create an automation or schema field.
5. Run one controlled Schmidt Production test with `Test Mode?` checked and an
   allowlisted recipient only.
6. Capture queue, Hub Event, Delivery, Resend id, and replay evidence. Only then
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
  execution window; no production concurrency-safety claim is made until the
  queue/079 behavior is proven in DEV.
- Restore the prior committed 076 source only through the normal DEV-first
  review path.

## Schema decision

This implementation assumes the verified existing `Email Handoff Queue`
schema. It adds no fields, tables, views, or source writeback field. It clears
the already-existing `Build Daily Email Now?` checkbox after successful
reuse/create; it does not claim ownership of who sets that checkbox. Any
proposed Submission link/status writeback is deferred and requires Mike
authorization as a separate schema decision.
