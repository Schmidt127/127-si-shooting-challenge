# Deploy checklist — Weekly Athlete Summary Hub → Resend source writeback (FUT-006)

**Date:** 2026-09-01  
**Repos:** `communications` (Hub) + SC docs  
**Does not change:** 072, 074, 079 script logic (074 still must not write Sent?), Make upload

**Hub contract:** `communications/docs/contracts/WEEKLY_SUMMARY_SOURCE_WRITEBACK_v1.md`  
**Mirror:** [`FUT-032-homework-hub-resend-writeback.md`](./FUT-032-homework-hub-resend-writeback.md) · [`VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md`](./VIDEO-FEEDBACK-HUB-RESEND-WRITEBACK.md)

## Pre-deploy

1. Confirm Production Weekly Athlete Summary fields exist (all pre-existing — **no schema change**):
   - `Weekly Email Sent?` (`fldCCgjkgoPt7N4eK`)
   - `Weekly Email Sent At` (`fld9dzmOqNfXzRom1`)
   - `Weekly Summary Sent At` (`fldW0OwybJ0ZRMy5K`)
   - `Weekly Summary Email Status` (`fldzuHDdCi6YCvRbn`)
   - `Weekly Email Error` (`fldzZnqYAoDDrUQFm`)
   - `Hub Event ID` (`fldIUrlro7rH6kaPL`)
2. Confirm Hub `AIRTABLE_TOKEN` can PATCH Production SC `Weekly Athlete Summary` (`tbl9520d72adxlAKQ`).
3. Deploy Hub branch with weekly writeback (`source-writeback-weekly-summary.js` + welcome-processor + resend-webhook wiring).
4. Confirm Resend webhook still points at Hub `/api/webhooks/resend` for:
   `email.sent`, `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, `email.suppressed`

## Controlled proof

1. Use one allowlisted Schmidt WAS with `Weekly Email Sent?` unchecked and package Ready.
2. Arm Ready path so **074 → 079 → Hub** fires (`testMode` as appropriate).
3. Expect immediately after Hub accept: `Hub Event ID` set, **Sent? still unchecked**, `Weekly Summary Email Status` unchanged.
4. After Resend accept: Sent? checked, Sent At + Weekly Summary Sent At set, Status `Sent`, Weekly Email Error blank.
5. After `email.delivered` (if received): Sent? remains checked; no downgrade.
6. Replay webhook / re-run queue: no duplicate send; no downgrade from sent state; 074 blocked while Sent? checked.

**Harness (read-only):** Run MRW-F07 **WE-06** after steps 3–4:

```bash
# After Hub accept (step 3)
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify-writeback --was-id recXXXXXXXX

# After Resend success (step 4) — re-run same command; phase should be resend_success
node tools/testing/mrw-f07-weekly-email-positive-arm.mjs --verify-writeback --was-id recXXXXXXXX
```

Offline contract tests (no Airtable): `node tools/testing/tests/test_mrw_f07_was_writeback_contract.mjs`. Full harness doc: [`docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md`](../testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md).

## Field-name assumptions (documented)

| Assumption | Detail |
|------------|--------|
| No Resend Message ID on WAS | Unlike VF/HW, Production WAS has no dedicated Resend correlation field; Hub correlates via Delivery record only |
| No Pending delivery status | WAS `Weekly Summary Email Status` options are Not Ready / Ready for Send / Sent / Error — Hub acceptance writes `Hub Event ID` only |
| `Weekly Summary Sent At` | Hub writes on success (replaces legacy Make Live writeback for Hub path) |
| `Make Send Status` | Hub does **not** write (legacy Make only) |

## Out of scope / unchanged

- Weekly package build fields (`072` ownership)
- Automation 074 / 079 script ownership (queue only)
- Historical rows emailed before this writeback (manual PATCH only if ops needs Sent? stamped)
- Make Bulk Email scenario (retired for new sends)
