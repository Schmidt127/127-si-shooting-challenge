# C-025 — 117a / 117b DEV Installation & Verification Packet

**Status:** Repository-ready — **do not install** until Mike authorizes a named DEV paste  
**Base:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Forbidden from this packet  
**Scripts:**  
- `airtable/automations/shooting-challenge/117a-zoom-recording-credit-award-xp-from-quiz-completion.js` (**v1.1**)  
- `airtable/automations/shooting-challenge/117b-zoom-recording-credit-send-approval-email-webhook.js`  
**Companion:** [docs/v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](../v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md)  
**Offline tests:** `node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js`

---

## Hard stops

- Do **not** paste or enable in Airtable DEV or PROD from an agent session.
- Do **not** modify automation **101** live attendance behavior.
- Do **not** put recording watchers on live `Attendees`.
- Never commit Make webhook secrets.

---

## 1. Required tables

| Table | Role |
|-------|------|
| Homework Completions | Trigger + quiz path |
| Zoom Meetings | Meeting identity + Recording Attendees |
| Enrollments | Athlete enrollment + Active?/PPE guards |
| XP Reward Rules | `ZOOM_ATTEND_BASE` live amount |
| XP Events | Append-only award rows |
| Config | Recording percent / deadline / email toggles |
| Weeks | Week end for makeup deadline modes |

---

## 2. Required fields

### Config (active season row)

| Field | Type | Default |
|-------|------|---------|
| `Zoom Recording XP Percent of Live` | Number | 50 |
| `Recording Gives Full Zoom Gate Credit?` | Checkbox | checked |
| `Zoom Recording Makeup Window Days` | Number | 7 |
| `Zoom Recording Deadline Mode` | Single select | `Later of Both` |
| `Recording Makeup Counts for Perfect Week?` | Checkbox | checked |
| `Recording Quiz Requires Coach Approval?` | Checkbox | checked |
| `Recording Approval Email Enabled?` | Checkbox | checked when present; missing → 117b must not send |
| `Recording Approval Email Timing` | Single select | `On Satisfactory` |
| `Recording Approval Email Template Key` | Text | `ZOOM_RECORDING_APPROVED` |

### Zoom Meetings

| Field | Type | Notes |
|-------|------|-------|
| `Recording Available At` | DateTime | Deadline calc |
| `Makeup Window Days Override` | Number | Optional |
| `Deadline Mode Override` | Single select | Optional |
| `Recording Attendees` | Link → Enrollments | Gate credit — **not** live `Attendees` |
| `Zoom Meeting Key` | Text/formula | Often `RECORD_ID()` |
| `Week` | Link → Weeks | Preferred |

### Homework Completions

| Field | Type | Notes |
|-------|------|-------|
| `Enrollment` | Link | Required |
| `Zoom Meeting` | Link | Required for credit identity |
| `Completion Status` | Single select | Must include `Satisfactory` |
| `Satisfactory?` | Checkbox | Verify if present |
| `Activity Date` | Date | Used for makeup window + XP Activity Date |
| `Week` | Link | Optional fallback from meeting |
| `XP Event` | Link → XP Events | 117a writeback |
| `Send Recording Approval Email?` | Checkbox | 117b trigger |
| `Recording Approval Email Sent?` | Checkbox | 117b idempotency |

### XP Events (canonical write targets)

| Field | Type | Notes |
|-------|------|-------|
| `Source Key` | Text | Required |
| `Enrollment` | Link | Required |
| `XP Points` | Number | Required |
| `XP Bucket` | Single select | Option `Zoom` |
| `XP Source` | Single select | Option `Zoom Recording` |
| `Week` | Link | Optional |
| `Activity Date` | Date | Optional but expected |
| **`XP Reason Public`** | Text | **Canonical** (not `Reason Public`) |
| **`XP Reason Debug`** | Multiline text | **Canonical** (not `Reason Debug`) |
| `Active?` | Checkbox | Optional |
| `Zoom Meeting` | Link | Optional |
| `Homework Completion` | Link | Optional |

### XP Reward Rules

| Rule Key | Action |
|----------|--------|
| `ZOOM_ATTEND_BASE` | Verify active + XP Amount (authoritative live base) |
| `ZOOM_ATTEND_RECORDING` | Optional display-only — Config percent remains authoritative |

---

## 3. Triggers / conditions / inputs

### 117a — Award XP from Quiz Completion

| Item | Value |
|------|-------|
| Trigger table | Homework Completions |
| Conditions | `Completion Status` is `Satisfactory` · `Zoom Meeting` not empty · `Enrollment` not empty |
| Optional condition | Assignment/type indicates Zoom Recording Quiz |
| Do **not** trigger on | `Needs Review` alone |
| Input | `recordId` = Homework Completion ID |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `sourceKeyOut`, `xpEventIdOut`, `xpAmountOut`, `enrollmentIdOut`, `meetingIdOut` |

### 117b — Send Approval Email Webhook

| Item | Value |
|------|-------|
| Trigger table | Homework Completions |
| Conditions | Satisfactory · `Send Recording Approval Email?` checked · `Recording Approval Email Sent?` unchecked |
| Inputs | `recordId` · `makeWebhookUrl` (DEV secret — not in git) |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `templateKeyOut` |

---

## 4. Expected Source Key / XP Source / Activity Date / writebacks

| Concern | Expected |
|---------|----------|
| Source Key | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` |
| XP Source | `Zoom Recording` |
| XP Bucket | `Zoom` |
| XP amount | `floor(ZOOM_ATTEND_BASE * Config% / 100)` |
| Activity Date | Homework Completion `Activity Date` (Denver key), else today Denver |
| XP Reason Public | `Zoom recording quiz credit` |
| XP Reason Debug | `C-025 v1.1 ZOOM_RECORDING\|…` |
| Writeback HC | `XP Event` → new XP Event |
| Writeback Zoom | Enrollment appended to `Recording Attendees` when gate credit Config on |
| Live exclusivity | Skip if active live family key exists for same meeting+enrollment (`ZOOM_ATTEND_BASE\|…` or `ZOOM_LIVE\|…`) |
| Idempotency | Rerun → `skipped_already_awarded` |

---

## 5. DEV test records needed

| ID | Setup |
|----|-------|
| T1 | Zoom Meeting A — `Recording Available At` set, Week linked |
| T2 | Test Enrollment (not Schmidt unless intentional) — Active? true |
| T3 | Homework Completion — Enrollment=T2, Zoom Meeting=A, status Needs Review |
| T4 | Same completion — coach marks Satisfactory |
| T5 | Meeting B + second Satisfactory quiz for same enrollment |
| T6 | Meeting A with live 101 XP already awarded for T2 |
| T7 | Past-deadline completion (Activity Date after makeup deadline) |

---

## 6. Pass / fail checklist

| # | Check | Pass criteria | Done |
|---|-------|---------------|------|
| P1 | 117a paste version | `SCRIPT.version` = **v1.1** | [ ] |
| P2 | Reason fields | XP Event has **XP Reason Public** + **XP Reason Debug** populated | [ ] |
| P3 | First award | `actionOut=created`; Source Key `ZOOM_RECORDING\|recM\|recE` | [ ] |
| P4 | Amount | Matches floor(liveBase × pct / 100) | [ ] |
| P5 | Rerun | `skipped_already_awarded`; no second Event | [ ] |
| P6 | Live blocks recording | `skipped_live_exists` | [ ] |
| P7 | Second meeting | Separate Source Key allowed | [ ] |
| P8 | Past deadline | `skipped_past_makeup_deadline` | [ ] |
| P9 | Gate credit | Enrollment on `Recording Attendees` | [ ] |
| P10 | 117b disabled Config | No send / skipped | [ ] |
| P11 | 117b enabled | DEV webhook only; Sent? checked; no PROD webhook | [ ] |
| P12 | 101 unchanged | Live path still awards `ZOOM_ATTEND_*` only | [ ] |

---

## 7. Rollback

1. Turn **117a** and **117b** **OFF**.
2. Leave Config/schema fields in place (do not delete).
3. Do **not** delete historical XP Events.
4. Soft-void bad awards by Source Key only after Mike approval.
5. Re-paste prior GitHub SHA if needed (none in PROD yet).

---

## 8. Activation order (Mike-authorized DEV only)

1. Schema/fields on Config, Zoom Meetings, Homework Completions, XP Events options.  
2. Verify `ZOOM_ATTEND_BASE` rule.  
3. Paste **117a v1.1** OFF → map I/O → ON for Schmidt/test only.  
4. Paste **117b** OFF → map DEV webhook → leave OFF until email dry-run.  
5. Capture evidence (console JSON + XP Event IDs).  
6. Do **not** enable PROD.

---

## Status

| State | Value |
|-------|-------|
| Implemented in repository | Yes |
| Ready for DEV installation | **Superseded for this base** — use Stage 17 packet [C-025-stage17-zoom-recording-dev-installation-packet.md](./C-025-stage17-zoom-recording-dev-installation-packet.md). S16 HC fields will **not** be created. Preflight stop: [C-025-117a-117b-dev-install-preflight-stop-2026-07-18.md](./C-025-117a-117b-dev-install-preflight-stop-2026-07-18.md) |
| Installed / verified in DEV | **No** |
| Ready for PROD | **No** |
