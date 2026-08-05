# Automation 071 — Homework Feedback Email (Reviewer File URL) closeout

**Status: Complete**  
**PROD deployed:** 2026-08-05  
**Live tested:** 2026-08-05  
**Canonical script:** `airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js`  
**Version deployed:** **v3.5**  
**Prior version (rollback):** **v3.4**  
**Evidence type:** Operator attestation (2026-08-05). Screenshots / detailed Make execution logs were **not** captured in-repo.

| Git | Value |
|-----|--------|
| PR | [#77](https://github.com/Schmidt127/127-si-shooting-challenge/pull/77) |
| Code commit | `e3f96f8e8d195aeb66ec808c458e41e5abc903d5` |
| Merge SHA | `5e17b85c169058b8a56e30c12aca064366f0ce1a` |

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

## Live PROD closeout (operator attestation — 2026-08-05)

Controlled records:

```text
Homework Completion: recH71jEgjxzLup6F
Submission Asset: recaGfnTzKFnCDazA
```

Operator confirmed the complete live path:

```text
Automation 071 selected Reviewer File URL
Parent Feedback Subject populated
Make webhook received
Gmail sent
Parent Feedback Sent? checked by Make
Parent Feedback Sent On populated by Make
Parent Feedback Send Error blank
No duplicate email on rerun
```

### SC items advanced by this proof

| SC | Status after closeout | Notes |
|----|----------------------|-------|
| **SC-017** | **Complete** | Unified coach review → satisfactory → XP → parent email proven on controlled HC |
| **SC-045** | **Installed in PROD** (unchanged bucket) | Homework parent email re-proven; **welcome / video / 117f** still need individual re-proof |

---

## Script paste (PROD) — completed 2026-08-05

Historical paste steps (for rollback / reinstall):

1. Open merged GitHub file (v3.5).
2. Confirm header/docblock **Version: v3.5** and `CONFIG.version = "v3.5"`.
3. Copy from the production docblock through end of file.
4. **Skip** the GitHub-only header block at the very top.
5. Replace full Airtable 071 script body; preserve inputs and trigger.
6. Save → syntax-check.

Recommended trigger conditions (unchanged):

- Parent Feedback Ready? checked
- Parent Feedback Sent? unchecked
- Satisfactory? checked
- Coach Feedback not empty
- Award Status = Awarded
- XP Events not empty

Do **not** require Upload Ready / Writeback Complete / Submission Assets not empty (blocks HW17 quiz path).

---

## Idempotency

Second run after Make writeback: skip because `Parent Feedback Sent?` is checked (`skipped_already_sent`), or Make dedupe prevents duplicate email. **Operator attested: no duplicate email on rerun.**

---

## Rollback

1. Open prior GitHub revision of the same file at **v3.4**.
2. Paste full v3.4 script into Airtable 071 (skip GitHub-only header).
3. Save + syntax-check.
4. Note: rollback restores the Google Drive–only requirement and will again fail AWS/Lambda assets without Drive URLs.

---

## Offline tests (repo)

```bash
node --check airtable/automations/shooting-challenge/071-email-notifications-and-external-handoffs-send-homework-feedback-email-webhook.js
node tests/homework/automation-071-reviewer-file-url.test.js
```

Read-only audit (extension): `airtable/extension-scripts/audits/audit-homework071-trigger-readiness.js` (v1.1 — reports Reviewer / Drive presence + resolved source without logging full private URLs).
