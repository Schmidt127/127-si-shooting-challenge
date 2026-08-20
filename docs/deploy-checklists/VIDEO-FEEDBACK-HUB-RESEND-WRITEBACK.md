# Deploy checklist — Video Feedback Hub → Resend source writeback

**Date:** 2026-08-20  
**Repos:** `communications` (Hub) + SC docs only  
**Does not change:** 070b, 070c, 073, 079, Make upload

## Pre-deploy

1. Confirm Production Video Feedback fields exist (already verified live):
   - `Parent Feedback Sent?`
   - `Parent Feedback Sent On`
   - `Parent Feedback Delivery Status` (Pending / Sent / Delivered / Bounced / Failed / Complained / Cancelled / Unknown / Needs Review)
   - `Parent Feedback Delivery Error`
   - `Parent Feedback Hub Event ID`
   - `Parent Feedback Resend Message ID`
2. Confirm `AIRTABLE_TOKEN` used by Hub can PATCH Production SC base `appn84sqPw03zEbTT` table `Video Feedback`.
3. Set Vercel env (Production Hub project):
   - `RESEND_WEBHOOK_SECRET` = Resend webhook signing secret
   - `SHOOTING_CHALLENGE_BASE_ID` = `appn84sqPw03zEbTT` (optional; code defaults to Production)
4. Deploy Hub branch with `/api/webhooks/resend`.
5. In Resend dashboard, create webhook to `https://<hub-host>/api/webhooks/resend` for:
   `email.sent`, `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, `email.suppressed`

## Controlled proof

1. Use one allowlisted Schmidt/Xavier Video Feedback record with `Parent Feedback Sent?` unchecked.
2. Check `Parent Feedback Ready?` (manual) so 073 → 079 → Hub fires.
3. Expect immediately after Hub accept: Status `Pending`, Hub Event ID set, **Sent? still unchecked**.
4. After Resend accept: Sent? checked, Sent On set, Status `Sent`, Resend Message ID set, Delivery Error blank.
5. After `email.delivered` (if received): Status `Delivered`, Sent? remains checked.
6. Replay webhook / re-run queue: no duplicate send; no downgrade from Delivered.

## Xavier prior send

Prior Hub/Resend sends that completed before this writeback shipped cannot auto-reconcile safely from acceptance alone. Either:

- Retest with Ready? clear → re-check after deploy, or
- Manually PATCH from Hub Delivery `Provider Message ID` + Message `Source Record ID` if ops needs historical Sent? stamped.

## Out of scope / unchanged

- 070b / 070c Make upload path
- Make.com parent email
- Gmail Make scenarios
- Automation 079 logic (no change required)
