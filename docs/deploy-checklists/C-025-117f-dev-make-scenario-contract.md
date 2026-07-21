# C-025 — DEV Make scenario contract: Zoom recording approval email (117f v1.2.0)

> **⚠️ SUPERSEDED — HISTORICAL DEV RECORD (2026-07-20).** This documents the **DEV-phase** build/contract of the Zoom Recording Approval Email Make scenario. The workflow has since been **built and controlled-tested against PROD**: Airtable Automation **117** → **Make** identifier **117f** (scenario `Shooting Challenge - PROD - Zoom Recording Approval Email - 117f - v1`; Data Store `C025_117f_PROD_SendKeys`; canonical **four-part** send key `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}`) — **tested; not documented as fully live**. This doc uses an earlier **three-part** send key and 117f **v1.2.0** that stamped Airtable fields; the current shipped script is **v1.1**, a pure Make handoff that writes **no** Airtable records (Make owns dedupe). Retained for historical evidence. **Authoritative current state:** [PROD 117f approval-email workflow](./C-025-117f-prod-zoom-recording-approval-email.md) · [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md).

**Status:** Agent 1 package complete — blueprint + offline tests ready; **DEV scenario remains OFF** until Mike builds in Make and reviews recipient mapping  
**Base:** DEV `appTetnuCZlCZdTCT` only  
**Airtable sender:** Automation **117f v1.2.0** (`117f-zoom-recording-send-approval-email.js`)  
**PROD:** Do not build, enable, or point webhooks at PROD yet  
**Webhook URL:** Ops-only — **never** commit, paste into git, or display in docs  

**Implementation package:**  
- Blueprint: [c025-117f-zoom-recording-approval-email-dev-v1.template.json](../../make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.template.json)  
- Offline helpers/tests: `make/lib/c025-117f-make-scenario.js`  
- Deploy checklist: [C-025-117f-dev-make-deployment-checklist.md](./C-025-117f-dev-make-deployment-checklist.md)  
- Agent 2 handoff: [C-025-117f-agent2-handoff.md](./C-025-117f-agent2-handoff.md)

---

## 1. What already exists (reuse)

| Component | Location | Reuse for 117f? |
|-----------|----------|-----------------|
| **071** homework parent email HTML + brand tokens | `071-…send-homework-feedback-email-webhook.js` | **Yes** — blue/orange header, logo S3 URL, Coach Mike closing, summary-row layout |
| **073** video feedback parent email | `073-…send-video-feedback-parent-email-webhook.js` | **Yes** — same brand shell; different body copy |
| **074 / 077** weekly/daily → Make | scripts + Make Gmail scenarios (ops) | Pattern only: webhook → Gmail; **not** upload-engine blueprints |
| Enrollment recipient fields | `Parent Email - Cleaned`, `Parent Email`, `Parent First Name`, `Full Athlete Name` | **Yes** — same as 071/073 |
| Zoom meeting display fields | `Meeting Name`, `Start Time`, `Zoom Meeting Key`, `Week` (101 / 117) | **Yes** for summary rows |
| C-013 Make **upload** blueprints | `make/blueprints/upload-asset-engine-*.json` | **No** — different product; do not clone |
| Zoom recording Make scenario / blueprint | — | **Does not exist** — this contract is the first |
| Template key `ZOOM_RECORDING_APPROVED` | Config / Effective formulas (Stage 17) | **Yes** — only accepted `templateKey` |
| Canonical send key | `ZOOM_REC_EMAIL\|{Enrollment RID}\|{Zoom Meeting RID}` | **Yes** — Make idempotency key |
| 117 email POST | Orchestrator Section F | **No** — deferred; 117 keeps `webhookUrl` blank |

**Architectural difference vs 071/073:** Those scripts build `htmlOut` / `subjectOut` in Airtable and Make mostly sends Gmail. **117f sends IDs only** — Make must **lookup + compose + send**, then return HTTP 2xx so **117f** stamps Send Key / Sent At.

---

## 2. Scenario identity (DEV)

| Item | Value |
|------|--------|
| Proposed Make name | `Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1` |
| Folder | DEV / Shooting Challenge (ops) |
| Scheduling | Custom webhook only — **scenario OFF** until review PASS |
| Airtable connection | DEV base only |
| Gmail connection | DEV / coach account used for other DEV parent emails |
| Reply-To | `coach@127sportsintensity.com` (same as 071 defaults) |

---

## 3. Required webhook payload (from 117f v1.2.0)

```json
{
  "automationNumber": "117f",
  "templateKey": "ZOOM_RECORDING_APPROVED",
  "sendKey": "ZOOM_REC_EMAIL|{enrollmentRid}|{zoomMeetingRid}",
  "enrollmentRid": "rec…",
  "zoomMeetingRid": "rec…",
  "zoomAttendanceId": "rec…",
  "timing": "On Satisfactory"
}
```

| Field | Rule |
|-------|------|
| `automationNumber` | **Must** equal `"117f"` — else HTTP **400** |
| `templateKey` | **Must** equal `"ZOOM_RECORDING_APPROVED"` — else HTTP **400** |
| `sendKey` | Required non-blank; Make idempotency key |
| `enrollmentRid` | Required `rec…` |
| `zoomMeetingRid` | Required `rec…` |
| `zoomAttendanceId` | Required `rec…` |
| `timing` | Required for contract; default display `"On Satisfactory"` if blank after validate |

---

## 4. Exact modules needed (smallest map)

Keep scenario **OFF**. Build modules in this order; no XP / Attendees / historical Zoom writes.

| # | Module | Purpose |
|---|--------|---------|
| **1** | **Custom webhook** | Receive 117f JSON. Configure so the scenario can return a custom HTTP status/body (**Webhook response** at end). |
| **2** | **JSON / Tools → Parse** (if needed) | Normalize payload keys. |
| **3** | **Router** or **Filter** — gate A | `automationNumber` = `117f` AND all required fields present → continue; else → **error path**. |
| **4** | **Filter** — gate B | `templateKey` = `ZOOM_RECORDING_APPROVED` → continue; else → **error path**. |
| **5** | **Data store** — Get / Search `sendKey` | If prior successful send for this `sendKey` → **skip Gmail**, still **Webhook response 200** `{ "status": "already_sent", "sendKey": "…" }` so Airtable can stamp if needed. |
| **6** | **Airtable — Get a record** | Table **Zoom Attendance** · ID = `zoomAttendanceId`. Read: Enrollment, Zoom Meeting, Attendance Method, Recording Quiz Satisfactory?, Zoom Credit Conflict?, Enrollment RID, Zoom Meeting RID, Zoom XP Amount (optional). |
| **7** | **Airtable — Get a record** | Table **Enrollments** · ID = `enrollmentRid`. Read recipient + athlete fields (below). |
| **8** | **Airtable — Get a record** | Table **Zoom Meetings** · ID = `zoomMeetingRid`. Read meeting display fields (below). |
| **9** | **Filter / Router** — lookup OK | Enrollment + Meeting found; parent email resolvable; ZA Conflict ≠ 1 (defense in depth). Fail → **error path**. |
| **10** | **Tools → Set variables** or **Compose HTML** | Build subject + HTML using **071 brand shell** (below). |
| **11** | **Gmail — Send an email** | To = resolved recipient (DEV: prefer scenario-level **test recipient** until mapping reviewed). Reply-To = coach@. |
| **12** | **Data store — Add/Update** | Key = `sendKey`; value = `{ sentAt, zoomAttendanceId, gmailMessageId? }` **only after Gmail success**. |
| **13** | **Webhook response** | HTTP **200** + JSON `{ "status": "sent", "sendKey": "…", "automationNumber": "117f" }` **only after** Gmail success (or already_sent short-circuit). |

### Error path (any failure)

| Module | Behavior |
|--------|----------|
| **E1** | **Webhook response** with **non-2xx** (prefer **400** validation / **404** lookup / **502** Gmail) and body `{ "status": "error", "error": "…" }` |
| **E2** | **Do not** Data-store success write; **do not** Airtable write |

**Critical:** Custom webhook must **not** auto-ack 2xx at start. Return status **only** from module **13** / **E1** after the branch completes. Otherwise 117f will stamp Sent At even when email failed.

---

## 5. Airtable fields — recipient and template data

### From webhook (IDs only)

`enrollmentRid`, `zoomMeetingRid`, `zoomAttendanceId`, `sendKey`, `templateKey`, `timing`, `automationNumber`

### Zoom Attendance (`zoomAttendanceId`) — verify / defense

| Field | Use |
|-------|-----|
| `Enrollment` | Confirm matches `enrollmentRid` |
| `Zoom Meeting` | Confirm matches `zoomMeetingRid` |
| `Attendance Method` | Expect `Recording Quiz` |
| `Recording Quiz Satisfactory?` | Expect true |
| `Zoom Credit Conflict?` | Must **not** be `1` (skip/fail if conflict) |
| `Enrollment RID` / `Zoom Meeting RID` | Cross-check vs payload |
| `Zoom XP Amount` | Optional summary row |

**Do not write** any ZA fields from Make (117f stamps Send Key / Sent At after 2xx).

### Enrollments (`enrollmentRid`) — recipient + athlete

| Field | Use |
|-------|-----|
| `Parent Email - Cleaned` | **Primary** To: (same as 071) |
| `Parent Email` | Fallback if cleaned blank |
| `Parent First Name` | Greeting |
| `Full Athlete Name` | Subject + summary |

### Zoom Meetings (`zoomMeetingRid`) — template body

| Field | Use |
|-------|-----|
| `Meeting Name` | Summary |
| `Start Time` | Summary (America/Denver display) |
| `Zoom Meeting Key` | Optional debug / summary |
| `Week` | Optional summary (name via linked Week if easy) |

### Forbidden Make writes

- **XP Events** (create/update/deactivate)
- **Zoom Meetings → Attendees**
- Historical `ZOOM_ATTEND_BASE|…` or any live attendance fields
- Overwriting unrelated Enrollment / Meeting fields

---

## 6. Email content (brand reuse)

**Subject (canonical):**  
`Zoom Recording Quiz Approved for {Full Athlete Name}`

**HTML shell:** Copy structure from **071** / **073**:

- Header band: primary blue `#0033A0`-class (use same hex vars as 071 `CONFIG.brand`)
- Logo: existing public logo URL used by 071 (`BlueOrangeCircleLogo.png` on S3 — already in 071 defaults)
- Accent orange section titles
- Footer: `127 Sports Intensity` / Youth sports communication line
- Closing: `Thank you,` / `Coach Mike`
- Reply-To: `coach@127sportsintensity.com`

**Body copy (ZOOM_RECORDING_APPROVED only):**

- Hello {Parent First Name},
- Recording quiz for {athlete} was marked **Satisfactory**.
- Summary rows: Athlete, Meeting Name, Meeting Start, Timing, XP amount (if present), note that recording credit follows Stage 17 rules (partial credit / conflict with live attendance handled in Airtable — **do not** explain Attendees).
- No coach free-text required for v1 (unlike 071). Optional later: link to program portal if Mike adds one.

**DEV safety until recipient mapping reviewed:**

- Scenario variable `sendMode` = `test` (constant, not from payload)
- Scenario variable `testRecipientEmail` = Mike’s review inbox (ops — not in git)
- Gmail **To** = test inbox; include live parent address only in HTML comment or “intended recipient” row for review
- Banner: `TEST MODE — not sent to the live parent recipient` (same idea as 071)

---

## 7. Idempotency design

| Layer | Mechanism |
|-------|-----------|
| **Airtable 117f** | Skip if Sent At set or Send Key already = `ZOOM_REC_EMAIL\|…` |
| **Make Data store** | Key = exact `sendKey`. On hit → no second Gmail; still HTTP **200** `already_sent` |
| **Gmail** | Do not rely on Gmail alone for dedupe |
| **Stamp ownership** | **117f** writes Send Key + Sent At **only after** HTTP 2xx |
| **Failure** | Non-2xx → 117f does **not** stamp → retryable |

Duplicate delivery window: if Gmail succeeds but webhook response fails, Data store should already record `sendKey` so a retry does not double-email; 117f can still get 200 on retry and stamp.

---

## 8. HTTP response contract (for 117f)

| Outcome | HTTP | Body (JSON) | 117f effect |
|---------|------|-------------|-------------|
| Sent | **2xx** (200) | `{ "status": "sent", "sendKey": "…" }` | Stamps Send Key + Sent At |
| Already sent (Make DS) | **200** | `{ "status": "already_sent", "sendKey": "…" }` | Stamps if not yet stamped |
| Missing / invalid fields | **400** | `{ "status": "error", "error": "…" }` | `error_webhook_http`; **no stamp** |
| Bad `automationNumber` / `templateKey` | **400** | same | no stamp |
| Airtable lookup miss / no parent email | **404** or **422** | same | no stamp |
| Gmail / send failure | **502** or **500** | same | no stamp |

---

## 9. Smallest safe DEV test plan

**Prereq:** Scenario built **OFF**; webhook URL stored in ops only; 117f **not** installed/enabled yet.

| # | Test | How | Pass |
|---|------|-----|------|
| T0 | Module map review | Mike reviews this doc + Make UI module list | Written OK |
| T1 | Recipient mapping review | Confirm cleaned vs raw email + test-mode To: | Written OK |
| T2 | Validation reject | Manual webhook POST missing `automationNumber` | Non-2xx; no Gmail; no DS write |
| T3 | Template reject | `templateKey` = `WRONG` | Non-2xx |
| T4 | Lookup fail | Valid shape, fake `enrollmentRid` | Non-2xx |
| T5 | Happy path (Make Run once) | Sanitized payload → real DEV fixture IDs; `sendMode=test` | Gmail to **test** inbox; DS has `sendKey`; HTTP 200 |
| T6 | Idempotent rerun | Same `sendKey` again | No second Gmail; HTTP 200 `already_sent` |
| T7 | 117f dry wiring | After T5–T6: install 117f **OFF**, map DEV webhook, one controlled ON with fixture | `actionOut=sent`; ZA Sent At + Send Key set; **no** Attendees/XP churn beyond existing credit |
| T8 | Rollback | Clear 117f `webhookUrl`; scenario OFF; DS key optional retain | No further emails |

**Fixture:** Dedicated DEV enrollment + recording ZA (Satisfactory, Conflict ≠ 1, Effective email enabled, blank Send Key / Sent At). Never use PROD athletes.

Sample payload file (sanitized IDs): [make/test-payloads/c025-117f-zoom-recording-approved.sample.json](../../make/test-payloads/c025-117f-zoom-recording-approved.sample.json)

---

## 10. Explicit non-goals

- No PROD Make scenario in this phase
- No webhook URL in git / chat / CHANGELOG
- No enable of 117f until T0–T1 PASS and Mike authorizes T7
- No changes to 101 / 117 credit / 057 / 042 / 115
- No Airtable writeback of XP or Attendees from Make

---

## 11. Revised time remaining

| Slice | Estimate |
|-------|----------|
| Mike review of module map + recipient/test-mode mapping | **0.5 h** |
| Build Make modules 1–13 + error path (DEV OFF) | **1.5–2.5 h** |
| T2–T6 manual webhook tests | **0.5–1 h** |
| T7 117f OFF paste + one controlled send (later) | **0.5–1 h** |
| **Remaining to DEV Make integration ready (through T6)** | **~2.5–4 h** |
| **Remaining to first controlled 117f DEV send (T7)** | **~3–5 h** total from now |

Previously ~5–8 h end-to-end; script contract is done — **Make build + review is the critical path**.

---

## 12. Review checklist (must PASS before scenario ON or 117f webhook populate)

- [ ] Module map matches §4
- [ ] Recipient: Cleaned → fallback; DEV To: = test inbox
- [ ] Webhook waits for final response (no early 2xx)
- [ ] Data store keyed by `sendKey`
- [ ] Gmail uses 071 brand shell + approved subject/body
- [ ] No XP / Attendees / historical Zoom writes
- [ ] Webhook URL only in Make + Airtable input (ops), never git
