# PROD — SC-009 photo homework formulas + 070a v4.5

| Field | Value |
|-------|--------|
| Date | 2026-08-04 |
| Status | Formulas **applied in PROD**; 070a v4.5 **in GitHub — paste to Airtable still required** |
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

## 070a v4.5 paste (Mike)

1. Open PROD Automations → **070a**.
2. Paste GitHub script from `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js` (**skip GitHub header**).
3. Confirm inputs: `recordId`, `makeWebhookUrl` (PROD Upload Engine), `automationNumber=070a`.
4. Keep inventory status aligned; verify one Schmidt homework asset with `Send to Make Trigger` after paste.
5. Confirm route in Make logs: `routeKey=homework_completion`.

## Rollback

- Re-paste prior 070a v4.4 body if needed.
- Formula rollback: restore Drive-gated `Writeback Complete?` only if a consumer still requires it (none identified for S3 path).
