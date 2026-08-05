# PROD — SC-009 photo homework formulas + 070a v4.5

| Field | Value |
|-------|--------|
| Date | 2026-08-04 (formulas); **2026-08-05** (070a paste + final rerun) |
| Status | Formulas **applied in PROD**; **070a v4.5 pasted into PROD Airtable**; final Schmidt image rerun **operator-attested PASS** |
| Base | `appn84sqPw03zEbTT` |
| Related | SC-009, SC-096, SC-150, SC-101 |

## Formulas already patched in PROD (Meta API)

### Submission Assets — `Writeback Complete?` (`fldtl04LTU3FoMmLL`)

```airtable
AND(
  {Upload Status} = "Uploaded",
  {Canonical File URL} != BLANK(),
  {Storage Key} != BLANK(),
  {File Content Hash} != BLANK(),
  {Uploaded At} != BLANK()
)
```

Do **not** gate on Google Drive File URL / Folder fields.

### Homework Completions — `Upload Ready?` (`fldv93VB39LdydxD9`)

```airtable
IF(
  AND(
    {Enrollment},
    OR(
      AND({Airtable Attachment}, {Asset Type}),
      AND({Source System} = "Fillout", {Final Reflection Quiz Submissions}),
      AND({All Submitted Files Uploaded?} = 1, {Total Linked Submission Assets (rollup)} > 0)
    )
  ),
  1,
  0
)
```

Repo helpers:

- `tools/airtable/fix_asset_writeback_complete_formula.py`
- `tools/airtable/fix_homework_upload_ready_formula.py`

## 070a v4.5 — installed in PROD (2026-08-05)

Mike pasted GitHub `070a` v4.5 into PROD Automations (skip GitHub header). Confirmed:

1. Inputs remain `recordId`, `makeWebhookUrl` (PROD Upload Engine), `automationNumber=070a`.
2. Controlled Schmidt homework image rerun completed end-to-end.
3. Make invoked the working upload path → Lambda → final Airtable writeback.
4. Submission Asset reached successful Uploaded state; reviewer URL worked; canonical S3 stayed private.
5. No second upload writer was created.

Historical paste steps (for rollback reference only):

1. Open PROD Automations → **070a**.
2. Paste from `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` (**skip GitHub header**).
3. Confirm inputs above.
4. Verify one Schmidt homework asset after paste (`routeKey=homework_completion`).

## Rollback

- Re-paste prior 070a v4.4 body if needed.
- Formula rollback: restore Drive-gated `Writeback Complete?` only if a consumer still requires it (none identified for S3 path).
