# C-025 — 117f DEV manual action sheet (one page)

> **⚠️ SUPERSEDED — HISTORICAL DEV RECORD (2026-07-20).** This is the **DEV-phase** manual action sheet. The workflow has since been **built and controlled-tested against PROD**: Airtable Automation **117** → **Make** identifier **117f** (canonical **four-part** send key `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}`) — **tested; not documented as fully live**. Note step D2 references a 117f **v1.2.0** paste that stamped Airtable fields; the current shipped script is **v1.1**, a pure Make handoff that writes **no** Airtable records. The example `sendKey` below is the older three-part form. Retained for historical evidence. **Authoritative current state:** [PROD 117f approval-email workflow](./C-025-117f-prod-zoom-recording-approval-email.md) · [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md).

**Use when:** Make login, webhook creation, Airtable secret entry, or Mike test inbox cannot be completed by the agent.  
**Do not invent** webhook URLs, PATs, or email addresses.  
**Base:** DEV only · Scenario / automation stay **OFF** until each step says otherwise.

**Verified fixtures (2026-07-20 re-check):** enrollment `recgP9qZYjAhE7NXm` · happy ZA `recsEERuvtyoHmDma` / meeting `recNOsPJQVH69ibah` · disabled ZA `recAqFTWmuHF1V4Z5` · conflict ZA `recbL9e1Be4iNbCZF`. Live-field gates PASS (`skipped_no_webhook` / `skipped_disabled` / `skipped_conflict` / `ready_to_post`).

---

### A. Make — create webhook (scenario OFF)

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| A1 | Make → Create scenario | Name | Text: `Shooting Challenge - DEV - Zoom Recording Approval Email - 117f - v1` | Create | Empty scenario |
| A2 | Add module | Custom webhook | New hook (JSON) | Add / Save | Hook URL shown **once** — copy to ops only; **never** paste into git/chat |
| A3 | Webhook settings | Auto-respond / immediate 2xx | **Disabled** / wait for Webhook response module | Save | Request stays open until final response |
| A4 | Scenario scheduling | On/Off | **OFF** | Save | Scenario not live |

### B. Make — ops-only variables + Data Store

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| B1 | Scenario variables | `sendMode` | Constant text `test` | Save | Test mode |
| B2 | Scenario variables | `testRecipientEmail` | Mike-controlled test inbox (real address, ops only) | Save | Not a parent address |
| B3 | Data Store | Name `C025_117f_DEV_SendKeys` | Key=`sendKey`; fields status, zoomAttendanceId, gmailMessageId, sentAt, automationNumber, templateKey | Create | Empty store |

### C. Make — wire modules (OFF) then M1–M5 Run once

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| C0 | Import / build | Modules per blueprint | Full flow + error routes | Save | Scenario OFF |
| **M1** | Run once | Body `automationNumber` ≠ `117f` (else valid shape) | JSON | Run once | HTTP **400**; no Gmail; no DS write |
| **M2** | Run once | `templateKey` ≠ `ZOOM_RECORDING_APPROVED` | JSON | Run once | HTTP **400**; no Gmail; no DS |
| **M3** | Run once | Valid payload + happy fixture IDs; sendMode=test | JSON | Run once | HTTP **200** `sent`; **one** Gmail to Mike test inbox; DS success for sendKey |
| **M4** | Run once | Identical `sendKey` as M3 | JSON | Run once | HTTP **200** `already_sent`; **no** second Gmail; no new DS overwrite required |
| **M5** | Run once | Valid shape but conflict ZA / Conflict=1 path | JSON | Run once | HTTP **422**; no Gmail; no DS success |

Happy payload IDs: enrollment `recgP9qZYjAhE7NXm` · meeting `recNOsPJQVH69ibah` · ZA `recsEERuvtyoHmDma` · sendKey `ZOOM_REC_EMAIL|recgP9qZYjAhE7NXm|recNOsPJQVH69ibah`.

### D. Airtable — paste 117f (remain OFF)

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| D1 | Automations → Folder `17 - Zoom Recording Credit` | New automation name | `117f - Zoom Recording Credit - Send Approval Email` | Create | Draft OFF |
| D2 | Script action | Script body | Paste from [C-025-stage17-117f-v1.2.0-PASTE.txt](./C-025-stage17-117f-v1.2.0-PASTE.txt) (below header) | Save | v1.2.0 |
| D3 | Input variables | `recordId` | Text / record id | Save | Required |
| D4 | Input variables | `webhookUrl` | Text — **leave blank** | Save | Blank |
| D5 | Automation toggle | Enabled | **OFF** | Save | No runs |

### E. Controlled Airtable tests (after Mike authorizes webhook map)

| Step | Screen | Field | Value type | Button | Expected |
|------|--------|-------|------------|--------|----------|
| E1 | 117f inputs | `webhookUrl` blank; `recordId`=`recsEERuvtyoHmDma` | Run | `skipped_no_webhook`; no stamps |
| E2 | ZA `recAqFTWmuHF1V4Z5` | — | Run | `skipped_disabled` |
| E3 | ZA `recbL9e1Be4iNbCZF` | — | Run | `skipped_conflict` |
| E4 | Map DEV webhook (ops) | `webhookUrl` from Make ops only | Save + one Run on happy ZA | `sent`; Send Key + Sent At stamped; **one** test Gmail |
| E5 | Identical rerun | Same ZA | Run | `skipped_already_sent`; **no** second Gmail |
| E6 | Rollback | Clear `webhookUrl`; 117f OFF; meeting override → No if needed | Save | No further mail |

### F. Rollback triggers (immediate)

Wrong recipient · duplicate email · looping error · XP change · unexpected Attendees change → turn **117f OFF**, clear **webhookUrl**, set meeting email override **No**, preserve evidence. Do **not** alter 117 / 057 / 042 unless credit fault is independently proven.
