# C-013 — PROD automation 070b UI verification package

**Date:** 2026-07-11  
**PROD base:** `appn84sqPw03zEbTT`  
**Automation name:** `070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make`  
**Documentation record:** `recUu0el5XmtmLTX0`  
**Script (GitHub):** `airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js`  
**Script version:** **v4.2**  
**Hard stop:** **Do not enable 070b** until Make manual smoke PASS + Mike approval.

---

## Part 1 — Repository script verification (PASS)

| Item | Value |
|------|--------|
| **Full script path** | `airtable/automations/shooting-challenge/070b-email-notifications-and-external-handoffs-send-video-asset-payload-to-make.js` |
| **Version header** | Docblock `VERSION: v4.2 - Lambda owns upload claim (070b Option A)` · `CONFIG.version: "v4.2"` |
| **Repository commit (script file)** | `c0f91d3eba32302ce27cf6bd0e076347327f97e3` |

### Required input variables

| Variable | Source | Validation |
|----------|--------|------------|
| `recordId` | Triggering Submission Assets record ID | Required · must start with `rec` |
| `makeWebhookUrl` | PROD Make webhook URL (alias: `webhookUrl`) | Required · non-empty |
| `automationNumber` | Literal `"070a"` or `"070b"` | Required · 070b automation must use **`070b`** |

**Confirmed in script:** `recordId` · `makeWebhookUrl` · `automationNumber` · `automationNumber = 070b` path for this automation.

### Exact outgoing Make payload (070b / video)

```json
{
  "sourceName": "Airtable Upload Engine",
  "automationNumber": "070b",
  "sentAtIso": "<ISO-8601 UTC>",
  "routeKey": "video_feedback",
  "uploadDestination": "Video Feedback",
  "sourceTable": "Submission Assets",
  "submissionAssetRecordId": "<recordId>",
  "targetTable": "Video Feedback",
  "targetRecordId": "<first linked Video Feedback record>"
}
```

### Expected Make response format

- HTTP **2xx** from Make webhook
- Response **body** = complete Lambda JSON (top-level `actionOut` required)
- Optional API Gateway wrapper `{ "body": "<json string>" }` — 070b unwraps inner body

### Required success keys

| Path | Keys |
|------|------|
| Primary upload | `actionOut=uploaded` · `writebackVerification.allPass=true` |
| Idempotent skip | `actionOut=skipped_already_uploaded` |

070b maps verified success to `actionOut=lambda_upload_verified` and clears `Send to Make Trigger`.

### Error handling (070b v4.2)

| Condition | 070b `actionOut` | Send to Make Trigger |
|-----------|------------------|----------------------|
| Make HTTP non-2xx | `error_webhook_response` | **Retained** |
| Network failure | `error_webhook_request` | **Retained** |
| HTTP 2xx, blank body | `error_lambda_response_invalid` | **Retained** |
| HTTP 2xx, malformed JSON | `error_lambda_response_invalid` | **Retained** |
| HTTP 2xx, no `actionOut` (generic Accepted) | `error_lambda_response_unverified` | **Retained** |
| `uploaded` without `allPass=true` | `error_lambda_writeback_incomplete` | **Retained** |
| Lambda `error_*` / claim failures | `error_lambda_*` | **Retained** |
| Verified success | `lambda_upload_verified` | **Cleared** |

**v4.2 Option A:** 070b **does not** set `Upload Status = Processing` on Make HTTP 2xx. Lambda owns claim fields.

### Timeout behavior

- 070b uses Airtable `fetch` / `remoteFetchAsync` with **no explicit client timeout** (bounded by Airtable automation limits)
- Make HTTP module must use **≥ 120 s** to match PROD Lambda timeout

### Generic HTTP 200 responses

HTTP 2xx without top-level `actionOut` → **`error_lambda_response_unverified`** · trigger retained · `Upload Error` written.

### Malformed JSON

`parseLambdaResponseBody` → **`error_lambda_response_invalid`** · trigger retained.

### Lambda failure JSON

`statusOut=error` or `actionOut` starting with `error_` → **`error_lambda_upload_failed`** (or specific `error_lambda_<actionOut>` for claim paths).

---

## Part 2 — Script paste artifact

| Item | Value |
|------|--------|
| **Paste file** | [C-013-prod-070b-script-paste-v4.2.txt](./C-013-prod-070b-script-paste-v4.2.txt) |
| **Contents** | Docblock through end of script (GitHub header lines 1–24 excluded — Airtable production paste format) |
| **Character count** | **31,067** |
| **SHA-256** | `580acfa79f54ec51bab7ad79cf72b5dfcfe5233332f4d016058cbf252499083c` |
| **Repository commit** | `c0f91d3eba32302ce27cf6bd0e076347327f97e3` |

### Paste verification steps

1. Open Airtable automation 070b → script editor
2. Select all → delete stale body
3. Paste entire contents of `C-013-prod-070b-script-paste-v4.2.txt`
4. Confirm docblock shows **`VERSION: v4.2`**
5. Confirm `CONFIG.version` is **`"v4.2"`** near top of script
6. Confirm **`makeWebhookUrl`** and **`automationNumber`** appear in input section
7. Save automation — **leave OFF**

---

## Part 3 — Airtable automation builder checklist (live UI)

**Automation:** `070b - Email, Notifications, and External Handoffs - Send Video Asset Payload to Make`

| Setting | Required value | Verified |
|---------|----------------|----------|
| **State** | **OFF** | [ ] |
| **Trigger type** | When record matches conditions | [ ] |
| **Table** | Submission Assets | [ ] |
| **Condition 1** | Send to Make Trigger **is checked** | [ ] |
| **Condition 2** | Upload Status **equals** Pending Link | [ ] |
| **Condition 3** | Upload Destination **equals** Video Feedback | [ ] |
| **Action** | Run a script | [ ] |

### Input variables

| Input | Mapping | Verified |
|-------|---------|----------|
| `recordId` | Triggering **Submission Assets record ID** | [ ] |
| `makeWebhookUrl` | PROD Make Custom webhook URL (from ops — **not GitHub**) | [ ] |
| `automationNumber` | Literal **`070b`** (not a field reference) | [ ] |

### Script confirmation

| Check | How to confirm | Verified |
|-------|----------------|----------|
| Header is v4.2 | Docblock `VERSION: v4.2` | [ ] |
| Stale legacy replaced | No pre-v4.2 Processing writeback on Make 2xx; `parseLambdaResponseBody` present | [ ] |
| `makeWebhookUrl` input configured | Script inputs panel shows variable mapped | [ ] |
| `automationNumber` = `070b` | Literal string in inputs | [ ] |
| `recordId` mapped | Trigger record ID, not hardcoded | [ ] |
| Automation remains OFF | Toggle shows OFF before any test | [ ] |
| No test run yet | Do **not** check Send to Make Trigger on live records until approved window | [ ] |

**Remove legacy trigger conditions** if still present (old doc had `Ready to Send to Make?`, `Upload Status is Ready`, Google Drive empty checks — **not** approved for v4.2).

---

## Part 4 — Isolation view instructions

Create view in Airtable UI (do not modify records):

| Setting | Value |
|---------|--------|
| **Table** | Submission Assets |
| **View name** | `C-013 PROD Smoke — Schmidt Testing Only` |

### Filter

**Enrollment - Linked** contains only:

- Display: `Schmidt, Testing - 2025-2026`
- Record ID: `recgP9qZYjAhE7NXm`

### Recommended visible fields

- Submission Assets Full Name
- Enrollment - Linked
- Submission - Linked
- Airtable Attachment
- Video Feedback
- Upload Destination
- Send to Make Trigger
- Upload Status
- Upload Error
- Storage Key
- Canonical File URL
- File Content Hash
- File Hash Algorithm
- File Size Bytes
- File MIME Type
- Uploaded At
- Upload Claim Run ID
- Processing Started At
- RecordId

### Verification

| Check | Expected |
|-------|----------|
| View exists | Yes |
| Record count | Only Schmidt Testing assets (expect `recGQ8EjAMz3bEBiW` among others for test enrollment) |
| No live athlete rows | No enrollment other than `recgP9qZYjAhE7NXm` |

**Status (2026-07-11):** View **missing** on PROD — create per above before controlled 070b test.

---

## Part 5 — Test fixture (read-only reference)

| Record | ID |
|--------|-----|
| Enrollment | `recgP9qZYjAhE7NXm` |
| Submission Asset | `recGQ8EjAMz3bEBiW` |
| Video Feedback | `recrvEzk8GxXfy3EE` |

Verified: asset and VF link only to Schmidt Testing enrollment.

---

## Part 6 — GO / NO-GO

| Gate | Status |
|------|--------|
| GitHub v4.2 script verified | **PASS** |
| Script paste artifact | **READY** |
| PROD Lambda direct smoke | **PASS** |
| Make scenario built | **PENDING** |
| Make manual webhook smoke | **NOT RUN** |
| Isolation view | **MISSING** |
| Live 070b builder configured | **PENDING** (Mike UI) |
| 070b enabled | **NO** |

**Automation 070b required final state before controlled test:** **OFF** · script pasted · inputs configured · Make smoke PASS · isolation view exists · Mike approval.

---

## Related

| Doc | Topic |
|-----|--------|
| [C-013-prod-make-build-2026-07-11.md](./C-013-prod-make-build-2026-07-11.md) | Make scenario build + manual smoke |
| [C-013-production-promotion-plan.md](./C-013-production-promotion-plan.md) | Full promotion sequence |
