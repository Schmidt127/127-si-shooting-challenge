# Automation 117 — Zoom recording approval email go-live (SC-088 / SC-045)

**Date:** 2026-08-05  
**PROD base:** `appn84sqPw03zEbTT`  
**Canonical script:** `airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js` **v1.1**  
**Make route:** `117f` · template `ZOOM_RECORDING_APPROVED`  
**Offline proof (Agent 4):** `node tools/testing/tests/test_117_email_handoff_offline.mjs` → **7/7 PASS**

## What is already proven (do not re-do unless drift)

| Layer | Status |
|-------|--------|
| Repo script contract (payload, sendKey, US1 host, sent/already_sent) | **Offline PASS** 2026-08-05 |
| Historical controlled Make/Airtable tests | Documented PASS in `C-025-117f-prod-zoom-recording-approval-email.md` |
| Permanent parent go-live | **Not Complete** — needs Mike attestation below |

## Hard rules

- Automation **117** is **email-to-Make only**. No XP / Attendees writes.
- Do **not** paste Stage 17 orchestrator into this slot.
- Webhook URL stays in Airtable input only (never git).
- Recipients must be Schmidt / ops-controlled for this test.

## Mike — exact 10-minute live proof

### Prep

1. Confirm Make scenario `… Zoom Recording Approval Email - 117f - v1` is ON.
2. Confirm Data Store `C025_117f_PROD_SendKeys` exists.
3. Confirm Automation 117 inputs: `webhookUrl`, `recordId`, `enrollmentRid`, `zoomMeetingRid`.
4. Confirm parent destination for the test Enrollment is a Schmidt-controlled inbox.

### Fixture

1. Create or reuse **Zoom Attendance** for Schmidt Enrollment `recgP9qZYjAhE7NXm`:
   - Attendance Method = Recording Quiz
   - Recording Quiz Satisfactory? = checked
   - Zoom Meeting linked
2. Note IDs:
   - Zoom Attendance `rec…` = ________
   - Enrollment `recgP9qZYjAhE7NXm`
   - Zoom Meeting `rec…` = ________
3. Expected sendKey:
   `ZOOM_REC_EMAIL|{enrollmentRid}|{zoomMeetingRid}|{zoomAttendanceId}`

### Execute

1. Run Automation **117** Test with those three RIDs + webhook.
2. Expect outputs: `statusOut=success`, `actionOut=sent` (or `already_sent` if key exists).
3. Confirm Gmail arrived at Schmidt inbox only.
4. Re-run immediately → `actionOut=already_sent` (no second email).
5. Confirm **no new XP Event** and **no Attendees write** on the Zoom Meeting.

### Record

| Check | Result |
|-------|--------|
| First run makeStatus | ☐ sent |
| Second run makeStatus | ☐ already_sent |
| Gmail received (Schmidt only) | ☐ |
| No XP create | ☐ |
| No Attendees write | ☐ |
| Date / operator | |

When all boxes pass, update completion master: SC-088 → **Live Tested in PROD** (then Complete after go-live permanence if desired).

## If blocked

| Blocker | Owner | Next action |
|---------|-------|-------------|
| No Recording Quiz attendance row | Mike | Create fixture above |
| Webhook blank / wrong host | Mike | Paste US1 Make webhook into 117 input |
| Make scenario OFF | Mike | Enable 117f scenario |
| Fear of real-parent send | Mike | Verify Enrollment Parent Email is Schmidt-only before Test |

## Related

- [`117-zoom-recording-approval-email.md`](./117-zoom-recording-approval-email.md)
- [`C-025-117f-prod-zoom-recording-approval-email.md`](./C-025-117f-prod-zoom-recording-approval-email.md)
- Evidence: `docs/testing/evidence/2026-08-05-agent4-ops/`
