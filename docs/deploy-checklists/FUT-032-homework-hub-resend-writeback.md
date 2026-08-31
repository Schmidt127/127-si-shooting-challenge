# Deploy checklist — Homework Completions Hub → Resend source writeback (FUT-032)

**Date:** 2026-08-31  
**Repos:** `communications` (Hub) + SC docs  
**Does not change:** 070a, 022, 071 script logic (071 still must not write Sent?), Make upload

**Hub contract:** `communications/docs/contracts/HOMEWORK_FEEDBACK_SOURCE_WRITEBACK_v1.md`  
**Mirror:** [`VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md`](./VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md)

## Pre-deploy

1. Confirm Production Homework Completions fields exist:
   - `Parent Feedback Sent?` / `Parent Feedback Sent On` / `Parent Feedback Send Error` (existing)
   - `Parent Feedback Delivery Status` (`fldC5GNeGUlXiMZ5b`) — created 2026-08-31
   - `Parent Feedback Delivery Error` (`fldGWLMbn3ijSoIgY`) — created 2026-08-31
   - `Parent Feedback Hub Event ID` (`fldP6rZsLlFckFbQH`) — created 2026-08-31
   - `Parent Feedback Resend Message ID` (`fldgKclVfTg2AUzVM`) — created 2026-08-31
2. Confirm Hub `AIRTABLE_TOKEN` can PATCH Production SC `Homework Completions` (`tblv58ppTFDBXb3nv`).
3. Deploy Hub branch with homework writeback (`source-writeback-homework-feedback.js` + welcome-processor + resend-webhook wiring).
4. Confirm Resend webhook still points at Hub `/api/webhooks/resend` for:
   `email.sent`, `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, `email.suppressed`

## Controlled proof

1. Use one allowlisted Schmidt Homework Completion with `Parent Feedback Sent?` unchecked.
2. Arm Ready path so **071 → 079 → Hub** fires (`testMode` as appropriate).
3. Expect immediately after Hub accept: Status `Pending`, Hub Event ID set, **Sent? still unchecked**.
4. After Resend accept: Sent? checked, Sent On set, Status `Sent`, Resend Message ID set, Delivery Error blank.
5. After `email.delivered` (if received): Status `Delivered`, Sent? remains checked.
6. Replay webhook / re-run queue: no duplicate send; no downgrade from Delivered; 071 blocked while Sent? checked.

## Out of scope / unchanged

- `Completion Status` / `Satisfactory?` / XP / S3 `Writeback Complete?`
- Automation 071 / 079 script ownership (queue only)
- Historical rows emailed before this writeback (manual PATCH only if ops needs Sent? stamped)
