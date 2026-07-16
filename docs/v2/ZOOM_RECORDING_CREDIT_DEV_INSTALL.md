# Zoom Recording Credit — DEV Installation Packet (C-025)

**Status:** Repository package **ready for DEV installation** — **not installed / not verified** in live Airtable by this commit  
**Base:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Do not paste or enable until DEV evidence + Mike approval  
**Authority:** S16-approved design — [C-025-zoom-recording-design-stage12.md](../deploy-checklists/C-025-zoom-recording-design-stage12.md) · [C-025-C-027-configuration-catalog-stage16.md](../deploy-checklists/C-025-C-027-configuration-catalog-stage16.md)  
**Scripts:** `117a-…js`, `117b-…js` · Numbering: [C-025-117-numbering.md](../deploy-checklists/C-025-117-numbering.md)  
**Architecture reconciliation:** [C025_ARCHITECTURE_RECONCILIATION.md](./C025_ARCHITECTURE_RECONCILIATION.md) — Stage 17 six-pack vs S16 117a/b; open Perfect Week / Total Zoom / post-award conflict gaps  
**Offline tests:** `node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js` · `python3 -m unittest tools.airtable.tests.test_c025_recording_watch_contract`  
**Executable operator sequence (2026-07-16):** [DEV-release-readiness-verification-2026-07-16.md](../deploy-checklists/DEV-release-readiness-verification-2026-07-16.md) — offline suites PASS; live DEV paste still requires Mike authorization + base ID `appTetnuCZlCZdTCT`

---

## Hard stops

- No PROD Airtable changes from this packet.
- No Cursor/agent live Airtable writes unless Mike authorizes a named DEV check.
- Do **not** modify automation **101** live attendance behavior.
- Do **not** put recording watchers on live `Attendees` (that would award full live XP via 101).
- Never hardcode 50% / 7 days in scripts when Config fields exist (scripts already fall back safely).

---

## 0. Pre-flight (read-only in DEV)

| # | Check | Expected | Done |
|---|-------|----------|------|
| 0.1 | Confirm base ID | `appTetnuCZlCZdTCT` | [ ] |
| 0.2 | Inspect **Config** active season row | Exists | [ ] |
| 0.3 | Inspect **XP Reward Rules** | Active `ZOOM_ATTEND_BASE` with XP Amount | [ ] |
| 0.4 | Inspect **Zoom Meetings** | Note existing recording URL fields (`Recording Link - Video` / Audio — **UNKNOWN if names differ**) | [ ] |
| 0.5 | Inspect **Homework** catalog | Identify HW17-style pattern for Zoom Recording Quiz | [ ] |
| 0.6 | Confirm **101** still ON for live only | Live path unchanged | [ ] |

Capture screenshots / field lists before creating anything.

---

## 1. Fields to create or verify

### 1.1 Config (active season row)

| Field name (exact) | Type | Default | Create if missing |
|--------------------|------|---------|-------------------|
| `Zoom Recording XP Percent of Live` | Number (0–100 integer) | 50 | [ ] |
| `Recording Gives Full Zoom Gate Credit?` | Checkbox | Checked | [ ] |
| `Zoom Recording Makeup Window Days` | Number | 7 | [ ] |
| `Zoom Recording Deadline Mode` | Single select: `Days After Recording Available` · `End of Program Week` · `Later of Both` · `Earlier of Both` | `Later of Both` | [ ] |
| `Recording Makeup Counts for Perfect Week?` | Checkbox | Checked | [ ] |
| `Recording Quiz Requires Coach Approval?` | Checkbox | Checked | [ ] |
| `Recording Approval Email Enabled?` | Checkbox | Checked when field exists; **missing → do not send** | [ ] |
| `Recording Approval Email Timing` | Single select: `On Satisfactory` | `On Satisfactory` | [ ] |
| `Recording Approval Email Template Key` | Single line text | `ZOOM_RECORDING_APPROVED` | [ ] |

### 1.2 Zoom Meetings

| Field name (exact) | Type | Notes | Create if missing |
|--------------------|------|-------|-------------------|
| `Recording Available At` | DateTime (America/Denver preferred) | Required for deadline calc | [ ] |
| `Makeup Window Days Override` | Number | Blank = use Config | [ ] |
| `Deadline Mode Override` | Single select (same options as Config) | Blank = use Config | [ ] |
| `Recording Attendees` | Link → Enrollments (multiple) | Gate/PW credit — **not** live `Attendees` | [ ] |
| `Recording Link - Video` | URL | **Verify existing name** — do not duplicate if already present | [ ] UNKNOWN |
| `Recording Link - Audio Only` | URL | **Verify existing name** | [ ] UNKNOWN |
| `Zoom Meeting Key` | Formula / text | Prefer existing; often `RECORD_ID()` | [ ] verify |

### 1.3 Homework Completions (quiz path)

| Field name (exact) | Type | Notes | Create if missing |
|--------------------|------|-------|-------------------|
| `Zoom Meeting` | Link → Zoom Meetings | **Required** for credit identity | [ ] |
| `Send Recording Approval Email?` | Checkbox | Trigger for **117b** | [ ] |
| `Recording Approval Email Sent?` | Checkbox | Idempotent send flag | [ ] |
| `XP Event` | Link → XP Events | Optional writeback from 117a | [ ] verify |
| `Completion Status` | Single select including `Satisfactory` | Existing | [ ] verify |
| `Satisfactory?` | Checkbox | Existing on many bases — **verify** | [ ] UNKNOWN |
| `Enrollment` | Link → Enrollments | Existing | [ ] verify |
| `Activity Date` | Date | Existing / confirm | [ ] UNKNOWN |
| `Week` | Link → Weeks | Existing / confirm | [ ] UNKNOWN |

### 1.4 XP Events

| Field name (exact) | Type | Notes |
|--------------------|------|-------|
| `Source Key` | Single line text | Required writable |
| `Enrollment` | Link | Required |
| `XP Points` | Number | Required |
| `XP Bucket` | Single select including `Zoom` | **Verify option exists** — UNKNOWN if named differently |
| `XP Source` | Single select including `Zoom Recording` | **Create option if missing** |
| `Week` | Link | Optional |
| `Activity Date` | Date | Optional |
| `Reason Public` / `Reason Debug` | Text | Optional |
| `Active?` | Checkbox | Optional |
| `Zoom Meeting` | Link | Optional — create if missing |
| `Homework Completion` | Link | Optional — create if missing |

### 1.5 XP Reward Rules

| Rule Key | Action |
|----------|--------|
| `ZOOM_ATTEND_BASE` | Verify active + XP Amount (authoritative live base) |
| `ZOOM_ATTEND_RECORDING` | Optional display-only row — **percent in Config remains authoritative** |

### 1.6 Enrollments

| Field | Action |
|-------|--------|
| `Total Zoom Attendances` | **Do not change blindly.** If gate credit Config is on, plan formula/count union of live `Attendees` + `Recording Attendees` — **OMNI design review required** before editing. Mark UNKNOWN until reviewed. |
| `Progress Processing Enabled?` | Use if present (C-010); else 117a treats as enabled |

### 1.7 Formulas

| Location | Formula intent | Status |
|----------|----------------|--------|
| Zoom Meetings.`Zoom Meeting Key` | Prefer `RECORD_ID()` if not already | Verify existing |
| Enrollments.`Total Zoom Attendances` | Distinct meetings in live ∪ recording when Config gate credit on | **UNKNOWN — requires OMNI review; do not invent** |

---

## 2. Views (DEV)

| View name (suggested) | Table | Filter | Done |
|-----------------------|-------|--------|------|
| `117a - Recording Quiz Ready for XP` | Homework Completions | Satisfactory + Zoom Meeting not empty + (optional) XP Event empty | [ ] |
| `117b - Recording Approval Email Queue` | Homework Completions | Satisfactory + Send Recording Approval Email? checked + Email Sent? unchecked | [ ] |
| `C-025 - Zoom Meetings with Recording` | Zoom Meetings | Recording Available At not empty OR recording URL not empty | [ ] |
| Existing Testing views (C-019) | — | Filter to test enrollments only | [ ] verify |

Exact Airtable view names may differ — create if missing; do not rename production views.

---

## 3. Automations to create

| Automation name (exact) | Script file | ON/OFF after paste |
|-------------------------|-------------|--------------------|
| `117a - Zoom Recording Credit - Award XP from Quiz Completion` | `airtable/automations/shooting-challenge/117a-zoom-recording-credit-award-xp-from-quiz-completion.js` | **OFF** until schema+tests ready, then ON in DEV only |
| `117b - Zoom Recording Credit - Send Approval Email Webhook` | `…/117b-zoom-recording-credit-send-approval-email-webhook.js` | **OFF** until Make DEV webhook ready |

**117c–117f:** Not separate scripts under S16 — see [C-025-117-numbering.md](../deploy-checklists/C-025-117-numbering.md) and [C025_ARCHITECTURE_RECONCILIATION.md](./C025_ARCHITECTURE_RECONCILIATION.md). **Perfect Week (057)**, **Total Zoom Attendances union**, and **post-award conflict soft-void** remain open behavioral gaps even with 117a/b.

---

## 4. Triggers, conditions, input variables

### 117a

| Item | Value |
|------|-------|
| Trigger table | **Homework Completions** |
| Recommended conditions | `Completion Status` is `Satisfactory` · `Zoom Meeting` is not empty · `Enrollment` is not empty |
| Input | `recordId` = Homework Completion record ID from trigger |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `sourceKeyOut`, `xpEventIdOut`, `xpAmountOut`, `enrollmentIdOut`, `meetingIdOut` |

### 117b

| Item | Value |
|------|-------|
| Trigger table | **Homework Completions** |
| Recommended conditions | Satisfactory · `Send Recording Approval Email?` checked |
| Inputs | `recordId` · `makeWebhookUrl` (DEV Make webhook — secret, not in git) |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `templateKeyOut` |

---

## 5. Scripts to paste

1. Open DEV automation → Run script action.
2. From GitHub, copy **from production docblock** (`/*********`) through end — **skip** GitHub-only header (`/* Automation: … */`).
3. Paste replace entire script body.
4. Map inputs/outputs.
5. Save. Leave **OFF** until §7 activation order.

---

## 6. Deduplication / idempotency (must hold)

| Rule | Source Key / behavior |
|------|------------------------|
| Recording XP | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` |
| Live XP (101 today) | `ZOOM_ATTEND_BASE\|{ZoomMeetingKey}\|{enrollmentId}` (+ bonuses) |
| Live canonical (future) | `ZOOM_LIVE\|{meetingId}\|{enrollmentId}` |
| Exclusivity | At most one of live/recording active for same enrollment+meeting |
| Rerun 117a | `skipped_already_awarded` — no second Event |
| Live already present | `skipped_live_exists` |
| Bonuses | Recording must **not** award `ZOOM_ATTEND_BONUS_2/3` |

---

## 7. Activation order (DEV)

1. Config fields + defaults on active season row  
2. Zoom Meetings fields (`Recording Attendees`, availability, overrides)  
3. Homework Completions quiz links + email flags  
4. XP Events select options (`Zoom Recording`) if needed  
5. Homework catalog: **Zoom Recording Quiz** assignment row (content)  
6. Paste **117a** (OFF) → map I/O → turn **ON**  
7. Paste **117b** (OFF) → map I/O + DEV webhook → leave OFF until email dry-run  
8. Do **not** enable on PROD  

---

## 8. Test records to create (Schmidt / test enrollments only)

| # | Record | Setup |
|---|--------|-------|
| T1 | Zoom Meeting A | Recording Available At set; Week linked; recording URL optional |
| T2 | Homework Completion | Enrollment = test · Zoom Meeting = A · status Needs Review |
| T3 | Same as T2 | Coach marks Satisfactory |
| T4 | Second meeting B | Separate recording quiz Satisfactory for same enrollment |
| T5 | Meeting A again | Second Satisfactory attempt / rerun 117a |

---

## 9. Expected results

| Test | Expected `actionOut` / state |
|------|------------------------------|
| Needs Review only | No XP; 117a skipped_awaiting_coach_approval (if triggered) or not triggered |
| First Satisfactory, no live XP | `created`; Source Key `ZOOM_RECORDING\|recM\|recE`; XP = floor(liveBase * pct / 100) |
| Rerun 117a | `skipped_already_awarded` |
| Live 101 already awarded for meeting A | `skipped_live_exists` |
| Meeting B Satisfactory | Second recording XP allowed (different meeting) |
| Past deadline | `skipped_past_makeup_deadline` |
| Gate credit on | Enrollment appears on `Recording Attendees` |
| 117b Config email off | `skipped_email_disabled` / missing enabled |
| 117b Satisfactory + enabled | Webhook POST; Email Sent? checked |

---

## 10. Duplicate / rerun / failure tests

| # | Action | Pass criteria |
|---|--------|---------------|
| R1 | Re-run 117a on awarded completion | No new XP Event |
| R2 | Award live via 101 then attempt recording | Recording skipped |
| R3 | Award recording then attempt live 101 for same pair | **UNKNOWN live dual-detect** — 101 does not yet dual-detect recording; **do not enable conflicting PROD paths** until dual-detect is added or ops process prevents it |
| F1 | Empty/malformed `recordId` | `statusOut=error`; clear message |
| F2 | Missing Zoom Meeting link | `skipped_missing_enrollment_or_meeting` |
| F3 | Webhook 5xx on 117b | error; send trigger **not** cleared |

---

## 11. Evidence to capture

- Config field screenshot + values  
- Automation script version (`SCRIPT.version` v1.0)  
- XP Event record IDs + Source Keys  
- `statusOut` / `actionOut` JSON console logs  
- Recording Attendees before/after  
- Link evidence into [AUTOMATION_VERSION_INVENTORY.md](../AUTOMATION_VERSION_INVENTORY.md)  

---

## 12. Rollback / disable

1. Turn **117a** and **117b** **OFF**.  
2. Leave Config values (do not delete fields).  
3. Do **not** delete historical XP Events.  
4. If bad XP created: deactivate/audit by Source Key; repair with idempotent tools after Mike approval.  
5. Revert script paste to previous GitHub SHA if needed (none in PROD yet).  

---

## Status legend for release docs

| State | This package |
|-------|--------------|
| Implemented in repository | **Yes** (scripts + tests + docs) |
| Ready for DEV installation | **Yes** (this packet) |
| Verified in DEV | **No** |
| Ready for PROD promotion | **No** |
| Verified in PROD | **No** |
