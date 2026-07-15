# 070a DEV Airtable prep — v4.4 async (homework)

**Date:** 2026-07-11  
**Environment:** DEV only — `appTetnuCZlCZdTCT`  
**PROD:** Do **not** paste or enable. Evidence record `recGQ8EjAMz3bEBiW` protected (video).  
**GitHub script:** `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js`  
**Version:** **v4.4** (parity with proven **070b v4.4** + companion **070c v1.1**)  
**Overnight task:** T1 / Worker A  
**Hard stop:** Keep **070a OFF** until Worker B DEV Make/Lambda homework route + Worker C smoke are ready and Mike approves enable.

---

## Architecture alignment (070a ↔ 070b ↔ 070c)

| Piece | Proven video (C-013) | Homework (this wave) |
|---|---|---|
| Sender automation | **070b** v4.4 | **070a** v4.4 (shared body) |
| `automationNumber` | `070b` | `070a` |
| `routeKey` | `video_feedback` | `homework_completion` |
| `uploadDestination` / `targetTable` | Video Feedback | Homework Completions |
| Make HTTP 2xx body `Accepted` | `statusOut=pending`, retain trigger | Same |
| Immediate Lambda JSON | Verify `actionOut` / `allPass`; clear trigger on success | Same |
| Async writeback verify | **070c** v1.1 (destination-agnostic fields) | Same **070c** (ensure trigger not video-only) |
| Upload claim / Processing | Lambda owns | Lambda owns |

**070a must not** set `Upload Status = Processing` on Make accept (v4.1 behavior). Lambda is sole claim owner.

---

## Part 1 — Repository script (Worker A)

- [x] 070a GitHub copy = v4.4 shared body with 070b
- [x] `CONFIG.version = "v4.4"`
- [x] Accepted async path → `actionOut=lambda_upload_accepted_async`, trigger retained
- [x] Verified Lambda JSON success → clear trigger + clear Upload Error only
- [x] Webhook / Lambda failures → retain `Send to Make Trigger`
- [x] Minimal v4.1 payload fields unchanged; homework `routeKey=homework_completion`

**Paste into Airtable:** skip GitHub header (lines 1–24); paste production docblock through end of file.

---

## Part 2 — DEV automation inputs (Mike / OMNI paste)

| Input | Value |
|---|---|
| `recordId` | Triggering Submission Assets record ID |
| `makeWebhookUrl` | **DEV** Make homework/upload webhook (Worker B delivers) — not PROD |
| `automationNumber` | Literal **`070a`** |

### Recommended trigger conditions (homework)

All must match (mirror 070b video gate with destination swapped):

- `Send to Make Trigger` is checked
- `Upload Destination` = **Homework Completions**
- `Upload Status` = **Pending Link** (or existing READY formula gate if used)
- `Airtable Attachment` is not empty
- `Homework Completions` is not empty
- Prefer formula gate `Ready to Send to Make?` = ready when available

Keep automation **OFF** after paste until enable gate.

---

## Part 3 — DEV schema dependencies (Submission Assets)

Required for 070a send + 070c verify (same fields as proven video path):

| Field | Role |
|---|---|
| Upload Destination | Route to homework |
| Send to Make Trigger | Handoff latch |
| Upload Status | Pending Link / Uploaded / Error (Lambda sets Processing) |
| Upload Error | Retained on failure; cleared on verified success |
| Airtable Attachment | Source bytes for Make/Lambda |
| Submission - Linked | Safety check |
| Enrollment - Linked | Safety check |
| Homework Completions | `targetRecordId` |
| Google Drive File URL / ID | Legacy duplicate stop (parity with 070b) |
| Canonical File URL | 070c writeback |
| Storage Key | 070c writeback |
| File Content Hash | 070c writeback |
| File Hash Algorithm | 070c expects SHA-256 |
| Uploaded At | 070c writeback |
| Writeback Complete? | 070c formula gate |

**070c note:** Script is destination-agnostic. If DEV 070c trigger filters `Upload Destination = Video Feedback`, add homework (or remove destination filter) so async homework Accepted path can clear the trigger.

---

## Part 4 — Exact outgoing payload (homework)

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070a",
  "sentAtIso": "<ISO-8601 UTC>",
  "routeKey": "homework_completion",
  "uploadDestination": "Homework Completions",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "<recordId>",
  "targetTable": "Homework Completions",
  "targetRecordId": "<first linked Homework Completions record>"
}
```

---

## Part 5 — Expected responses

| Make body | 070a result | Trigger |
|---|---|---|
| Plain text `Accepted` (HTTP 2xx) | `pending` / `lambda_upload_accepted_async` | **Retained** → 070c |
| Lambda JSON `uploaded` + `writebackVerification.allPass=true` | `success` / `lambda_upload_verified` | Cleared |
| Lambda JSON `skipped_already_uploaded` | `success` / `lambda_upload_verified` | Cleared |
| HTTP non-2xx / network / invalid JSON / unverified | `error` / matching `error_*` | **Retained** |

---

## Part 6 — Enable gate (not Worker A)

Do **not** enable 070a until:

1. Worker B: DEV Make/Lambda homework route ready
2. Worker C: smoke/tests ready
3. Mike: DEV webhook URL pasted; automation still OFF until explicit enable
4. Lead: integrates worker results

---

## Related

- 070b: `070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` (v4.4)
- 070c: `070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js` (v1.1)
- Helpers/tests: `lib/upload-make-lambda-response.js` (+ `.test.js`)
- Prior homework Lambda evidence: H3e on `rec1PzA7th0qJbsN4` (CHANGELOG 2026-07-10)
