# Automation 022 v2.0 — Child Upload Writeback (DEV → PROD)

**Status:** Ready for DEV paste  
**Canonical script:** `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js`  
**Version:** **v2.0**  
**Prior version (rollback):** **v1.1**  
**Do not change:** Lambda upload function, Automation **070b**

---

## Root cause (why rewrite)

v1.1 synced Video Feedback primarily from **Google Drive File URL**. After the
Lambda / S3 upload path, coach-facing URLs live on **Reviewer File URL** (with
**Canonical File URL** as private identity). Parents and coaches could see a
blank or stale **Video URL or Drive Link** even when the asset upload succeeded.
v1.1 also treated already-synced runs as `skipped` without a verify latch, and
could soft-map statuses toward Pending variants.

---

## Changed fields / behavior (child tables only)

### Homework Completions (existing fields only)

| Field | Behavior |
|-------|----------|
| Upload Status | Copy asset Uploaded / Processing / Error into existing single-select |
| Google Drive File URL / ID | Sync from asset when present |
| Google Drive Folder ID / URL | Sync from asset when present |
| Upload Error | Sync from asset |
| Uploaded At | Sync from asset |
| Writeback Complete? | Set `true` when asset status is Uploaded |

### Video Feedback (existing fields only)

| Field | Behavior |
|-------|----------|
| Upload Status | Copy asset Uploaded / Processing / Error into **existing** single-select (not a lookup) |
| Video URL or Drive Link | Precedence: Reviewer File URL → Canonical File URL → Google Drive File URL; if all empty, **do not overwrite** |
| Video Asset File Name | From asset Original File Name when present |
| Video Asset Uploaded At | From asset Uploaded At |
| Upload Error | Sync from asset |
| Google Drive File/Folder/View/Download URL (+ File ID) | Sync **only if the field exists and is writable** |

**Never:** create child records, create XP Events, alter Submission Asset Upload
Status, write Pending Link to the child, clear a valid existing Video URL when
sources are empty, or gate on MIME / JPEG.

---

## Exact Airtable paste / deployment instructions

### DEV

1. Open the **DEV** base → Automations.
2. Open existing automation  
   **`022 - Submission Intake - Sync Child Upload Writeback from Submission Asset`**.
3. Confirm you are editing the **existing** 022 — do **not** create a duplicate automation.
4. Open the script action.
5. From GitHub, open  
   `airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js`.
6. Paste **from the production docblock** (`/************************************************************`) **through the end of the file**.
7. **Skip** the top GitHub-only header block (`/* Automation: 022 ... */`).
8. Map input: `recordId` = triggering Submission Assets record id.
9. Ensure these script outputs exist (add if missing):
   - `statusOut`, `actionOut`, `errorOut`, `debugStep`
   - `submissionAssetId`, `childRecordId`, `childTable`, `uploadDestination`
   - `sourceUrlUsed`, `childUploadStatus`, `writebackVerified`
10. Confirm trigger still matches:
    - Table: **Submission Assets**
    - Upload Status is **Uploaded** or **Processing** or **Error**
    - Upload Destination is **Homework Completions** or **Video Feedback**
    - Appropriate child link is not empty
11. Save. Leave OFF until smoke passes (or run once manually on a test asset).

### DEV smoke (manual)

| Case | Expect |
|------|--------|
| Video asset with Reviewer File URL + Uploaded + one VF linked | `statusOut=success`, `sourceUrlUsed=Reviewer File URL`, VF Video URL = reviewer URL, `writebackVerified=true` |
| Same asset run again | `actionOut=already_synced`, no field churn |
| Asset Upload Status = Pending Link | `skipped_pending_link` |
| No VF linked | `skipped_no_video_feedback` |
| JPEG MIME (`image/jpeg`) with Reviewer File URL | success (MIME must not block) |

### PROD (only after DEV smoke + Mike approval)

1. Repeat paste steps 2–10 in **PROD** on the **same named** 022 automation.
2. Do **not** create a new 022.
3. Do **not** modify 070b or Lambda.
4. Run one controlled video asset (Uploaded + Reviewer File URL) and confirm VF writeback.
5. Record paste date / operator attestation in this checklist when complete.

---

## Rollback

Paste prior GitHub **v1.1** body (docblock through EOF, skip GitHub header) into the same 022 automation script action.

---

## Offline tests (repo)

```bash
node --test tools/testing/tests/test_022_offline.mjs
node --check airtable/automations/shooting-challenge/022-submission-intake-sync-child-upload-writeback-from-submission-asset.js
```
