# 070a DEV Airtable prep — v4.4 async (homework)

**Date:** 2026-07-11  
**Environment:** DEV only — `appTetnuCZlCZdTCT`  
**PROD:** Do **not** paste or enable. Evidence record `recGQ8EjAMz3bEBiW` protected (video).  
**GitHub script:** `airtable/automations/shooting-challenge/070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js`  
**Version:** **v4.4** (parity with proven **070b v4.4** + companion **070c v1.1**)  
**Overnight task:** T1 / Worker A  
**Hard stop:** Keep **070a OFF** when idle. **DEV homework upload E2E PASS (2026-07-12)** on synchronous Lambda JSON path — **070c not required** for that path.

---

## When 070c is required (path distinction)

| Make response to 070a | 070c required? | Who clears `Send to Make Trigger` |
|---|---|---|
| **Full Lambda JSON** (DEV Module 16 `{{14.data}}`) | **No** | **070a** on verified success |
| Plain-text **`Accepted`** | **Yes** (companion verify) | **070c** v1.1 after Lambda writeback |

**DEV PASS (2026-07-12):** Synchronous JSON path — all writeback fields populated, trigger cleared by 070a, **022** synced Canonical URL to Homework Completion, no duplicate asset.

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
| Async writeback verify | **070c** v1.1 (destination-agnostic fields) | **Only if** Make returns plain-text `Accepted`; **not required** for sync JSON path (DEV PASS) |
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

Required for 070a send + Lambda writeback (070c verify fields only on `Accepted` async path):

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
| Canonical File URL | **Lambda** writeback (070c verifies on `Accepted` path only) |
| Storage Key | **Lambda** writeback |
| File Content Hash | **Lambda** writeback |
| File Hash Algorithm | SHA-256 expected |
| Uploaded At | **Lambda** writeback |
| Writeback Complete? | Formula gate |

**070c note (Accepted path only):** If DEV Make returns plain-text `Accepted` and a 070c slot exists, ensure trigger is not video-only. **Not applicable** to DEV synchronous JSON path (070a clears trigger).

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

## Part 6 — Enable gate

**Status (2026-07-12):** **DEV homework upload E2E PASS** — synchronous Lambda JSON path.

- [x] Worker B: DEV Make/Lambda homework route — **PASS**
- [x] Worker C: smoke/tests — **PASS** (offline + live)
- [x] Mike: 070a v4.4 in DEV — **PASS**
- [x] Lead: worker results integrated on `overnight/lead-integration` — **PASS**
- [x] Live E2E: Send to Make Trigger → 070a → Make → Lambda → writeback — **PASS**
- [x] **070c not required** for current DEV Make config (Module 16 returns full Lambda JSON)

**Idle rule:** Turn **070a OFF** and DEV Make **OFF** when not testing. **PROD remains OFF.**

---

## Related

- 070b: `070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` (v4.4)
- 070c: `070c-email-notifications-and-external-handoffs-verify-async-video-asset-upload.js` (v1.1)
- Helpers/tests: `lib/upload-make-lambda-response.js` (+ `.test.js`)
- Prior homework Lambda evidence: H3e on `rec1PzA7th0qJbsN4` (CHANGELOG 2026-07-10)
