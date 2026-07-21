# C-025 — PROD Zoom Recording Attendance Approval Email (117 → Make 117f)

**Backlog ID:** C-025  
**Feature:** Zoom Recording Attendance Approval Email  
**Airtable Automation:** **117** (Zoom Attendance trigger → HTTP POST to Make)  
**Make workflow identifier:** **117f**  
**PROD base:** `appn84sqPw03zEbTT`  
**Date documented:** 2026-07-20  
**Mode:** Documentation only — no Airtable / Make / Gmail / webhook / deploy changes in this package

**Companions (DEV package — historical):**

- [DEV Make contract](./C-025-117f-dev-make-scenario-contract.md)
- [DEV deployment checklist](./C-025-117f-dev-make-deployment-checklist.md)
- [Stage 17 PROD live (credit path)](./C-025-stage17-prod-live-2026-07-20.md)

---

## Status (do not over-claim)

| Layer | Documented state |
|-------|------------------|
| Make scenario built + controlled tests | **PASS** (direct webhook + Data Store + duplicate) |
| Airtable Automation 117 → Make call | **PASS** (including Airtable duplicate → `already_sent`) |
| Permanent go-live (both permanently ON for all eligible parents) | **Not confirmed in repository docs** |
| Webhook URL in git | **Never** — ops only |

**Verdict:** Workflow is **built and verified under controlled tests**. This document does **not** claim full production go-live for parent-facing approval email until Mike confirms permanent enablement of both the Airtable sender path and the Make scenario (see [§ Remaining go-live checklist](#7-remaining-go-live-checklist)).

Stage 17 **recording credit** (XP / conflict / 057 / 042) remains separately COMPLETE per [prod-live](./C-025-stage17-prod-live-2026-07-20.md). This packet is the **approval-email follow-on**.

---

## 1. Workflow overview

```text
Zoom Attendance (Recording Quiz / Satisfactory path)
        │
        ▼
Airtable Automation 117
  • Inputs: webhookUrl, recordId, enrollmentRid, zoomMeetingRid
  • Hard-codes: automationNumber=117f, templateKey=ZOOM_RECORDING_APPROVED, timing=On Satisfactory
  • Builds sendKey = ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}
  • HTTP POST → Make Custom webhook
        │
        ▼
Make: Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1
  1. Validate payload
  2. Data Store lookup C025_117f_PROD_SendKeys
  3. If key exists → HTTP 200 already_sent (skip Gmail)
  4. Get Zoom Attendance + Enrollment + Zoom Meeting
  5. Revalidate method / satisfactory / conflict
  6. Gmail send (approval email)
  7. Write sendKey to Data Store only after Gmail success
  8. HTTP 200 sent | already_sent | or error status
```

### Identity map

| Concept | Value |
|---------|--------|
| Airtable automation number (UI / trigger) | **117** |
| Make payload `automationNumber` / scenario suffix | **117f** |
| Template key | `ZOOM_RECORDING_APPROVED` |
| Timing (hard-coded) | `On Satisfactory` |
| Make scenario name | `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1` |
| Data Store | `C025_117f_PROD_SendKeys` |
| Send key | `ZOOM_REC_EMAIL\|{EnrollmentRID}\|{ZoomMeetingRID}\|{ZoomAttendanceRID}` |

**Note:** Older DEV contract docs used a **three-part** send key (`…\|Enrollment\|Meeting`). PROD completed workflow uses the **four-part** key above (includes Zoom Attendance RID). Prefer this document for PROD operations.

### Hard rules

- Make must **not** auto-ack HTTP 2xx at webhook start — return status only after the branch completes.
- Data Store write happens **only after** Gmail succeeds.
- Make must **not** write XP Events, `Zoom Meetings.Attendees`, or live-attendance keys.
- Webhook URL stays **ops-only** (Make + Airtable input). Never commit to git.

---

## 2. Airtable Automation 117 — input variables

**Trigger table:** Zoom Attendance  
**Role in this workflow:** Script action posts the approval-email payload to Make (workflow id **117f**).

### Script input variables

| Input variable | Required | Source / mapping | Purpose |
|----------------|----------|------------------|---------|
| `webhookUrl` | Yes for send | Make Custom webhook URL (ops) | Target for HTTP POST. Blank ⇒ skip send (no invent). |
| `recordId` | Yes | Triggering Zoom Attendance record ID | Zoom Attendance RID (`zoomAttendanceId` in payload). |
| `enrollmentRid` | Yes | Linked Enrollment RID (or mapped field) | Enrollment record id in payload + send key. |
| `zoomMeetingRid` | Yes | Linked Zoom Meeting RID (or mapped field) | Zoom Meeting record id in payload + send key. |

### Hard-coded workflow values (script / config constants)

| Constant | Value |
|----------|--------|
| `automationNumber` | `117f` |
| `templateKey` | `ZOOM_RECORDING_APPROVED` |
| `timing` | `On Satisfactory` |

### Canonical send key

```text
ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}
```

Example shape (IDs illustrative):

```text
ZOOM_REC_EMAIL|recENROLL…|recMEETING…|recATTEND…
```

### Expected webhook JSON body

```json
{
  "automationNumber": "117f",
  "templateKey": "ZOOM_RECORDING_APPROVED",
  "sendKey": "ZOOM_REC_EMAIL|{enrollmentRid}|{zoomMeetingRid}|{zoomAttendanceId}",
  "enrollmentRid": "rec…",
  "zoomMeetingRid": "rec…",
  "zoomAttendanceId": "rec…",
  "timing": "On Satisfactory"
}
```

`zoomAttendanceId` must equal Airtable input `recordId`.

### Relation to Stage 17 credit orchestrator

Stage 17 **recording credit** for Automation **117** (XP create / conflict / gate-PW flags) is documented separately and is **ON** in PROD. Approval email is this Make **117f** path. Operators must keep credit behavior and email handoff distinct when troubleshooting (XP vs Gmail vs Data Store).

---

## 3. Make scenario — module-by-module

**Scenario name:** `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1`  
**Data Store:** `C025_117f_PROD_SendKeys` (key = `sendKey`)  
**Airtable connection:** PROD base `appn84sqPw03zEbTT`

| # | Module | Purpose | Success / branch notes |
|---|--------|---------|------------------------|
| **1** | **Custom webhook** | Receive JSON payload from Airtable 117. | Disable automatic early 2xx. Detect data structure from sample payload. |
| **2** | **Router — Valid 117f payload** | Gate required fields. | Continue only if `automationNumber=117f`, `templateKey=ZOOM_RECORDING_APPROVED`, `sendKey` starts with `ZOOM_REC_EMAIL\|`, and `enrollmentRid` / `zoomMeetingRid` / `zoomAttendanceId` are `rec…` ids. |
| **3** | **Webhook response (invalid)** | Reject bad payloads. | HTTP **400** · `{ "status":"error", "error":"…" }` · no Gmail · no Data Store write. |
| **4** | **Data Store — Get / Search** | Idempotency lookup by `{{1.sendKey}}` on `C025_117f_PROD_SendKeys`. | Hit with prior successful send → duplicate branch. |
| **5** | **Router — Duplicate vs new** | Split already-sent vs first send. | Duplicate when store indicates prior `sent` for this key. |
| **6** | **Webhook response (already_sent)** | Short-circuit. | HTTP **200** · `{ "status":"already_sent", "sendKey":"…", "automationNumber":"117f" }` · **skip Gmail** · no new DS write required. |
| **7** | **Airtable — Get a record** | Zoom Attendance by `zoomAttendanceId`. | Read: Attendance Method, Recording Quiz Satisfactory?, Zoom Credit Conflict?, Enrollment, Zoom Meeting, RIDs, optional XP amount. |
| **8** | **Airtable — Get a record** | Enrollments by `enrollmentRid`. | Read: Parent Email - Cleaned, Parent Email, Parent First Name, Full Athlete Name. |
| **9** | **Airtable — Get a record** | Zoom Meetings by `zoomMeetingRid`. | Read: Meeting Name, Start Time, Zoom Meeting Key, Week (as needed for body). |
| **10** | **Router — Revalidation** | Defense-in-depth after lookups. | Pass only if: Attendance Method = **Recording Quiz**; Recording Quiz Satisfactory? = **true**; Zoom Credit Conflict? **≠ 1**; relationships match payload RIDs; recipient resolvable. |
| **11** | **Webhook response (revalidation fail)** | Business-rule / lookup failure. | HTTP **422** · error JSON · no Gmail · no DS write. |
| **12** | **Compose / Set variables** | Build subject + HTML (071/073 brand shell). | Subject: `Zoom Recording Quiz Approved for {Full Athlete Name}`. |
| **13** | **Gmail — Send an email** | Deliver approval email. | Reply-To: `coach@127sportsintensity.com` (ops-standard). On Gmail failure → error route. |
| **14** | **Webhook response (Gmail fail)** | Send failure. | HTTP **502** · `{ "status":"error", "error":"…" }` · **no** Data Store write. |
| **15** | **Data Store — Add/Update** | Persist send key. | **Only after Gmail success.** Store status, zoomAttendanceId, gmailMessageId (if available), sentAt, automationNumber, templateKey. |
| **16** | **Webhook response (sent)** | Final success. | HTTP **200** · `{ "status":"sent", "sendKey":"…", "automationNumber":"117f" }`. |

### Revalidation rules (module 10)

| Check | Required value |
|-------|----------------|
| Attendance Method | `Recording Quiz` |
| Recording Quiz Satisfactory? | `true` |
| Zoom Credit Conflict? | **not** `1` |
| Enrollment / Meeting links | Match payload `enrollmentRid` / `zoomMeetingRid` |

### Forbidden Make writes

- XP Events (create / update / deactivate)
- `Zoom Meetings.Attendees`
- Historical live keys (`ZOOM_ATTEND_BASE|…`)
- Unrelated Enrollment / Meeting field overwrites

---

## 4. HTTP response contract

| Outcome | HTTP | Body (JSON) | Caller effect |
|---------|------|-------------|---------------|
| Sent | **200** | `{ "status":"sent", "sendKey":"…", "automationNumber":"117f" }` | Treat as success |
| Already sent | **200** | `{ "status":"already_sent", "sendKey":"…", "automationNumber":"117f" }` | Treat as success; no second Gmail |
| Invalid payload / wrong automation or template | **400** | `{ "status":"error", "error":"…" }` | Retry only after fixing payload |
| Revalidation / recipient / lookup failure | **422** | `{ "status":"error", "error":"…" }` | Fix Airtable data / eligibility; no stamp of “sent” from Make DS |
| Gmail / infrastructure send failure | **502** | `{ "status":"error", "error":"…" }` | Retryable; DS must **not** have new key |

---

## 5. Test results (completed)

Controlled tests completed for this workflow (2026-07-20 documentation close-out):

| # | Test | Result |
|---|------|--------|
| T1 | Direct Make webhook test (happy path) | **PASS** — response `sent` |
| T2 | Data Store write after send | **PASS** — key present in `C025_117f_PROD_SendKeys` |
| T3 | Direct Make duplicate (same send key) | **PASS** — response `already_sent`; Gmail skipped |
| T4 | Airtable Automation 117 → Make | **PASS** — Automation 117 successfully called Make |
| T5 | Airtable duplicate (same eligibility / key) | **PASS** — response / outcome `already_sent` |

**Interpretation:** End-to-end handoff and Make-side idempotency are verified under controlled conditions. Permanent parent-facing go-live remains a separate operator decision ([§7](#7-remaining-go-live-checklist)).

---

## 6. Rollback instructions

Use immediately on wrong recipient, duplicate parent email, looping errors, unexpected XP/Attendees changes, or any escalation trigger from [Stage 17 rollback plan](./C-025-stage17-rollback-plan.md).

| Step | Action | Expected |
|------|--------|----------|
| 1 | Clear Airtable Automation **117** input `webhookUrl` (or disable the email POST path) | No further POSTs to Make |
| 2 | Turn **OFF** Make scenario `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1` | No Gmail from this scenario |
| 3 | Leave Data Store keys intact unless Mike authorizes cleanup | Preserves idempotency evidence |
| 4 | Do **not** delete or rewrite XP Events / Attendees while investigating email faults | Credit path stays isolated |
| 5 | Preserve Make execution history + Airtable run history | Evidence for root cause |
| 6 | Re-enable only after root cause fixed and Mike approves | Controlled restore |

**Do not** “fix” a failed Gmail path by manually inserting a Data Store key unless Mike explicitly wants to block retries for that send key.

---

## 7. Remaining go-live checklist

Complete before treating approval email as **fully live** for all eligible Recording Quiz parents:

- [ ] Mike confirms Make scenario permanent **ON** (or approved scheduling posture)
- [ ] Mike confirms Airtable Automation **117** email handoff permanently enabled with populated `webhookUrl` (ops)
- [ ] Recipient mapping reviewed for **live** parent To: (`Parent Email - Cleaned` → fallback `Parent Email`)
- [ ] Confirm test-mode / override inboxes are **not** still intercepting live sends (if any were used during controlled tests)
- [ ] Spot-check one Schmidt Testing–only live parent send (or Mike-approved equivalent) after permanent enable
- [ ] Confirm no double-send vs historical three-part keys (if any DEV/test keys exist in other stores)
- [ ] Confirm Stage 17 credit path still healthy (117 XP / conflict / 057 / 042) after email enable — no Attendees writes
- [ ] Update [current PROD progress](../status/C-025-stage17-current-prod-progress.md) and [automation index](../automation-index.md) to **LIVE** only after the above
- [ ] Ops: webhook URL rotation plan if URL was exposed outside Make + Airtable

Until this checklist is checked off in-repo, status remains: **tested / built — not documented as fully live**.

---

## 8. Troubleshooting — HTTP 400 / 422 / 502

| HTTP | Typical `status` | Likely cause | What to check | Fix |
|------|------------------|--------------|---------------|-----|
| **400** | `error` | Invalid payload: wrong/missing `automationNumber`, `templateKey`, `sendKey`, or record ids | Make execution input vs Airtable script constants; send key prefix `ZOOM_REC_EMAIL\|`; all three RIDs start with `rec` | Correct Airtable inputs / hard-coded constants; re-run once |
| **400** | `error` | Webhook received non-117f or wrong template | Payload `automationNumber` must be `117f`; `templateKey` must be `ZOOM_RECORDING_APPROVED` | Do not point other automations at this webhook |
| **422** | `error` | Revalidation failed | ZA Attendance Method, Satisfactory?, Conflict?; Enrollment/Meeting link mismatch; missing parent email | Fix Zoom Attendance / Enrollment data; do not force-send while Conflict = 1 |
| **422** | `error` | Airtable Get miss | Wrong PROD base connection; deleted/typo RID | Confirm Make Airtable connection = PROD; verify record ids |
| **502** | `error` | Gmail send failed | Gmail connection, quota, To: address, Make error route | Fix Gmail/connection; **confirm DS has no new key**; retry after fix |
| **502** | `error` | Downstream timeout / Make infrastructure | Scenario incomplete run, connection timeout | Re-run once; if Gmail may have sent, check DS + Gmail Sent before retrying |

### Idempotency notes

| Symptom | Likely state | Action |
|---------|--------------|--------|
| First call `sent`, second `already_sent` | Healthy | No action |
| Gmail arrived but caller saw non-2xx | Gmail ok; response failed before/during ack | Check DS — if key written, retry should return `already_sent` without second mail |
| Non-2xx and no DS key | Safe to retry | Fix root cause, then retry |
| Unexpected second email | DS miss or different send key | Compare four-part keys; confirm store name `C025_117f_PROD_SendKeys` |

---

## 9. Ops hygiene

| Item | Rule |
|------|------|
| Webhook URL | Make + Airtable `webhookUrl` only |
| Parent PII | Do not paste parent emails into git / chat logs |
| Credentials | No `.env` / PAT commits |
| Repo scripts | GitHub remains source of truth for paste bodies; reconcile UI vs git if they diverge |

---

## 10. Related documents

| Doc | Role |
|-----|------|
| [C-025-117f-dev-make-scenario-contract.md](./C-025-117f-dev-make-scenario-contract.md) | DEV design contract (historical; three-part key) |
| [C-025-stage17-prod-live-2026-07-20.md](./C-025-stage17-prod-live-2026-07-20.md) | Stage 17 credit COMPLETE |
| [C-025-stage17-rollback-plan.md](./C-025-stage17-rollback-plan.md) | Broader Stage 17 rollback |
| [automation-index.md](../automation-index.md) | Automation inventory |
| [C-025-117-numbering.md](./C-025-117-numbering.md) | 117 family numbering |
