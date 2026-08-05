# Automation 071 — Homework Feedback Email (Reviewer File URL) closeout

**Status:** Built in Repository — **PROD paste + live rerun still required**  
**Date:** 2026-08-05  
**Canonical script:** `airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js`  
**Expected version after paste:** **v3.5**  
**Prior version (rollback):** **v3.4**

---

## Confirmed PROD failure (pre-fix)

| Item | Value |
|------|--------|
| Homework Completion | `recH71jEgjxzLup6F` |
| Linked Submission Asset | `recaGfnTzKFnCDazA` |
| Automation | `071 - Email, Notifications, and External Handoffs - Send Homework Feedback Email Webhook` |

All normal send gates passed (parent ready, not sent, satisfactory, coach feedback, Awarded, XP present). Failure:

```text
Error: No Google Drive File URL or View URL was found on linked Submission Assets.
```

**Root cause:** 071 required legacy Google Drive URLs. Current upload path is AWS/Lambda/S3 and writes **`Reviewer File URL`**.

---

## Parent email asset URL priority (v3.5)

```text
Reviewer File URL → Google Drive View URL → Google Drive File URL
```

- Lambda/AWS is the current primary upload path.
- Google Drive fields remain historical fallback only.
- Filenames (`Original File Name`, `Asset Label`) are labels only — not URL substitutes.
- Do **not** use `Canonical File URL`, `Storage Key`, or private S3 object URLs in the parent email.
- Make marks **`Parent Feedback Sent?`** / **`Parent Feedback Sent On`** only after Gmail success. Automation 071 does **not** set those fields.

Display label priority:

```text
Original File Name → Asset Label → "View submitted homework"
```

(No `Stored File Name` field exists on Submission Assets in the current schema.)

---

## Script paste (PROD)

1. Open merged GitHub file:
   `airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js`
2. Confirm header/docblock **Version: v3.5** and `CONFIG.version = "v3.5"`.
3. Copy from the production docblock (`/************************************************************`) through end of file.
4. **Skip** the GitHub-only header block at the very top (lines before the production docblock).
5. In Airtable → Automations → **071** → Scripting action → replace the **full** script body.
6. Preserve existing automation inputs (`recordId`, `makeWebhookUrl`, `sendMode`, `testRecipientEmail`, optional `replyTo`) and trigger conditions.
7. Save → run Airtable syntax check.
8. Do **not** change Make scenario unless a separate contract failure appears (payload still uses `assetFiles` / `htmlOut` / `subjectOut`).

Recommended trigger conditions (unchanged):

- Parent Feedback Ready? checked
- Parent Feedback Sent? unchecked
- Satisfactory? checked
- Coach Feedback not empty
- Award Status = Awarded
- XP Events not empty

Do **not** require Upload Ready / Writeback Complete / Submission Assets not empty (blocks HW17 quiz path).

---

## Controlled rerun

Use:

```text
Homework Completion: recH71jEgjxzLup6F
Submission Asset: recaGfnTzKFnCDazA
```

### Expected Automation 071 result

- Pre-send validation passes
- **Reviewer File URL** selected for the linked asset
- `Parent Feedback Subject` populated
- Make webhook accepted (2xx + validated body)
- `Parent Feedback Send Error` blank
- **`Parent Feedback Sent?` still unchecked** until Make/Gmail succeeds

### Expected Make result

- Gmail sent
- `Parent Feedback Sent?` checked
- `Parent Feedback Sent On` populated

---

## Idempotency rerun

A second run should:

- skip because `Parent Feedback Sent?` is already checked (`skipped_already_sent`), **or**
- Make dedupe safely prevents a duplicate email

---

## Rollback

1. Open prior GitHub revision of the same file at **v3.4** (parent of the v3.5 merge commit, or tagged history).
2. Paste full v3.4 script into Airtable 071 (skip GitHub-only header).
3. Save + syntax-check.
4. Note: rollback restores the Google Drive–only requirement and will again fail AWS/Lambda assets without Drive URLs.

---

## Live Tested gate

Do **not** mark this package Live Tested / Complete in the completion master until Mike supplies successful Airtable 071 + Make/Gmail evidence for `recH71jEgjxzLup6F` (or equivalent Schmidt controlled rerun).

Offline tests:

```bash
node --check airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js
node tests/homework/automation-071-reviewer-file-url.test.js
```

Read-only audit (extension): `airtable/extension-scripts/audits/audit-homework071-trigger-readiness.js` (v1.1 — reports Reviewer / Drive presence + resolved source without logging full private URLs).
