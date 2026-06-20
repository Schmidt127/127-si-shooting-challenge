# Upload Asset Engine (Make.com)

**Scenario name:** Shooting Challenge - GAME - Upload Engine - April 2026  
**Blueprint:** [../blueprints/upload-asset-engine-v1.json](../blueprints/upload-asset-engine-v1.json)  
**Webhook:** Shooting Challenge UPLOAD ENGINE (hook id 2673043 in export — live URL stays in Make only)

## Trigger

Custom webhook from Airtable automations **070a** (homework assets) and **070b** (video assets).

## Flow (high level)

1. Webhook receives asset payload (attachment URL, folder/file names, record IDs)
2. HTTP — download file from `attachment.url`
3. Google Drive — search for athlete folder under root folder `1e4ymb1M4IlAMBgjAhSMiuYdaSiUtYM80`
4. Router — create folder if missing, else use existing
5. Google Drive — upload file
6. Router by `uploadDestination`:
   - **Video Feedback** — update Video Feedback + Submission Assets
   - **Homework Completions** — update Submission Assets only

## Airtable writeback

| Table | Key fields written |
|-------|-------------------|
| Submission Assets | Upload Status = Uploaded, Google Drive IDs/URLs, Uploaded At |
| Video Feedback | Upload Status, Drive links, Submission Asset link, uploaded timestamp |

## Known fix (v1 export → GitHub)

On the **NEW folder** branch (modules 17 → 42/43), **Google Drive File ID** on Submission Assets was mapped to `{{17.webContentLink}}` (a URL). Correct value is `{{17.id}}`.

The **existing folder** branch (modules 24 → 44/45) already used `{{24.id}}` correctly.

GitHub blueprint has this fix. Re-import or manually update those two Airtable modules in Make.

## Related Airtable automations

- `070a` — Send Homework Asset Payload to Make
- `070b` — Send Video Asset Payload to Make
- `009` — Create Submission Assets (does not send to Make)
- `020` — Link Homework Completion (must exist before 070a for homework)

## Deploy workflow

1. Fix scenario in Make (or import blueprint from GitHub)
2. Test one homework asset + one video asset
3. Confirm Submission Assets / Video Feedback show Uploaded and valid Drive File ID
4. Note change in `CHANGELOG.md`
