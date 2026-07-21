# C-025 — 117f DEV Make blueprint import & repair checklist

> **⚠️ SUPERSEDED — HISTORICAL DEV RECORD (2026-07-20).** This is the **DEV-phase** Make blueprint import/repair checklist. The workflow has since been **built and controlled-tested against PROD**: Airtable Automation **117** → **Make** identifier **117f** (canonical **four-part** send key `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}`) — **tested; not documented as fully live**. Note: the current shipped 117f script (**v1.1**) writes **no** Airtable records — the "117f stamps Airtable only after Make HTTP 2xx" hard rule reflects the older v1.2.0 design and no longer applies. Retained for historical evidence. **Authoritative current state:** [PROD 117f approval-email workflow](./C-025-117f-prod-zoom-recording-approval-email.md) · [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md).

**Blueprint:** [c025-117f-zoom-recording-approval-email-dev-v1.blueprint.json](../../make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.blueprint.json)  
**Scenario name:** `Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1`  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**Keep OFF** until M1–M5 pass

---

## Importability rating

**Imports, but some modules may need replacement.**

- Matches real repo exports for: `gateway:CustomWebHook`, `builtin:BasicRouter`, `airtable:ActionGetRecord`, `google-email:ActionSendEmail`, filters, routes, designer coords, metadata.
- Best-effort (may need recreate/remap after import): `gateway:WebhookRespond`, `datastore:GetRecord`, `datastore:AddRecord`, `util:SetVariable2`.
- Not fully Make-export-identical (no live export of Data Store / Webhook Response from this account in-repo).

JSON syntax: **VALID** (validated with Python `json.loads`).

---

## Import steps

1. Make → Create a new scenario (or open empty scenario).
2. ••• → **Import Blueprint** → select the `.blueprint.json` file.
3. If Make rejects unknown modules: import anyway / recreate flagged modules using labels below.
4. Leave scheduling **OFF**.

---

## Repair every reconnectable module

| # | Designer label | Action after import |
|---|----------------|---------------------|
| 1 | Custom webhook (117f) | **Create/select** new Custom webhook. Disable automatic early 2xx. Detect data structure with sample payload. Store URL **ops only**. |
| 2 | Payload validation | Verify route filters: `117f`, `ZOOM_RECORDING_APPROVED`, `ZOOM_REC_EMAIL|`, `rec…` ids. |
| 3 | HTTP 400 invalid payload | Confirm status `400` + JSON body; Content-Type `application/json`. |
| 4 | Data Store lookup by sendKey | **Create/select** Data Store `C025_117f_DEV_SendKeys`. Remap key = `{{1.sendKey}}`. If `datastore:GetRecord` missing, replace with Data store → Get a record. |
| 5 | Duplicate vs new send | Confirm filter `{{4.status}}` = `sent` on already_sent branch. |
| 6 | HTTP 200 already_sent | Confirm status `200` body `already_sent` (no Gmail on this branch). |
| 7 | Airtable Get Zoom Attendance | **Reconnect** DEV Airtable connection. Base `appTetnuCZlCZdTCT`. Table Zoom Attendance (`tblfwbt6aCDCM5gUz`). Record = `{{1.zoomAttendanceId}}`. |
| 8 | Airtable Get Enrollment | Same connection. Table Enrollments (`tbl3PFmwbRoabu1YV`). Record = `{{1.enrollmentRid}}`. |
| 9 | Airtable Get Zoom Meeting | Same connection. Table Zoom Meetings (`tblWcSHEm8vNNIxyB`). Record = `{{1.zoomMeetingRid}}`. |
| 10 | Revalidation | Confirm filters: Attendance Method = Recording Quiz; Satisfactory true; Conflict ≠ 1. Optionally add link-ID contains checks. |
| 11 | HTTP 422 revalidation failed | Confirm status `422`. |
| 12 | Test-recipient resolution | Set `testRecipientEmail` = Mike-controlled test inbox (**ops only**). Keep `sendMode=test`. If SetVariable2 fails, recreate Tools → Set multiple variables. |
| 13 | HTTP 422 missing recipient | Fallback when placeholder inbox not replaced. |
| 14 | Compose branded HTML | Remap `subject` / `html` if variable module replaced. |
| 15 | Gmail send | **Reconnect** DEV/coach Gmail. **To** = `{{12.testRecipientEmail}}` only. Reply-To = coach@. Never parent To in test mode. |
| 16 | HTTP 502 Gmail failure | Confirm attached as Gmail **error handler**; no Data Store write on this path. |
| 17 | Data Store success write | Same Data Store as #4. Write **only after** Gmail. Key = `{{1.sendKey}}`. |
| 18 | HTTP 200 sent | Final success response only after Gmail + DS write. |

---

## Hard rules (do not break while repairing)

- No early webhook 2xx
- Duplicate → 200 `already_sent`, skip Gmail
- Data Store write only after Gmail success
- Test mode → Mike test inbox only
- Make never writes Airtable Send Key / Sent At
- 117f stamps Airtable only after Make HTTP 2xx
- Never point at PROD base `appn84sqPw03zEbTT`

---

## After repair

Run [deployment checklist](./C-025-117f-dev-make-deployment-checklist.md) M1–M5 (Run once).  
Do **not** map Airtable 117f `webhookUrl` until Mike authorizes.
