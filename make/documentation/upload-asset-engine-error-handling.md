# Upload Asset Engine — Error Writeback (Make.com)

Apply these changes in the live **Shooting Challenge - GAME - Upload Engine** scenario.  
GitHub blueprint: [upload-asset-engine-v1.json](../blueprints/upload-asset-engine-v1.json)

## Goals

1. Never leave Submission Assets on **Processing** when Make fails.
2. Write **Upload Status = Error** and a readable **Upload Error** message.
3. For video assets, mirror the same on **Video Feedback**.
4. Fetch a **fresh Airtable attachment URL** before HTTP download (expired URL fix).

## A. Fresh attachment URL (before HTTP download)

**Insert after webhook (module 1), before HTTP Download (module 5):**

| Module | App | Action |
|--------|-----|--------|
| New | Airtable | **Get a record** |

**Settings**

- Base: `127 SI Shooting Challenge` (`appn84sqPw03zEbTT`)
- Table: `Submission Assets`
- Record ID: `{{1.recordId}}` (or your payload field name)
- Fields: `Airtable Attachment`, `Upload Status`, `Upload Error`

**Update HTTP Download (module 5)**

- URL: first attachment URL from the **Get a record** module (not raw webhook attachment URL)

Example mapping path (adjust module id after insert):

```text
{{6.Airtable Attachment[].url}}
```

## B. Error handler route (scenario level)

Add a **scenario error handler** route (Make: wrench icon → Error handlers → Add).

On any failure after webhook:

### B1. Update Submission Assets

| Field | Value |
|-------|--------|
| Upload Status | `Error` |
| Upload Error | `Make upload failed: {{error.message}}` (truncate ~500 chars) |

- Base / table / record from webhook payload: `{{1.recordId}}`
- Use same Airtable connection as success path

### B2. Video Feedback branch

If `{{1.uploadDestination}}` = `Video Feedback` and payload includes `videoFeedbackRecordId`:

| Field | Value |
|-------|--------|
| Upload Status | `Error` |
| Upload Error | same message as asset |

### B3. Do not clear success-only fields

- Do **not** set Google Drive File URL / ID on error
- Do **not** set Upload Status = Uploaded

## C. HTTP download failure (inline)

If not using scenario error handler yet, disable **Stop on error** only when followed by a router that writes Error status.

Preferred: keep `stopOnHttpError: true` and rely on scenario error handler (section B).

## D. Test plan (run while challenge is active)

1. **Success path** — one homework + one video asset → `Uploaded` + Drive URLs populated
2. **Forced failure** — temporarily break download URL or use test asset with expired attachment → asset ends on `Error` with message (not stuck `Processing`)
3. Re-run [audit-stuck-upload-processing.js](../../airtable/extension-scripts/audits/audit-stuck-upload-processing.js) → expect 0 issues

## E. Deploy checklist

- [ ] Airtable Get Record module added and HTTP URL remapped
- [ ] Scenario error handler writes Error + Upload Error on Submission Assets
- [ ] Video Feedback error writeback on video route
- [ ] One homework + one video live test passed
- [ ] Note change in `CHANGELOG.md`

## Related

- [upload-asset-engine.md](./upload-asset-engine.md) — status ladder contract
- Airtable **070a** / **070b** — set Processing before webhook; Make owns terminal status
