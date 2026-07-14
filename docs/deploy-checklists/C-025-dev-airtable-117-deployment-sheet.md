# C-025 — DEV Airtable deployment sheet (117a–117f)

**Stage:** S19 · `C-025-dev-activation-117-closeout`  
**Date:** 2026-07-14  
**Base:** DEV `appTetnuCZlCZdTCT` only — **not PROD**  
**Folder:** `17 - Zoom Recording Credit`  
**GitHub SoT:** `airtable/automations/shooting-challenge/117*.js`  
**Script versions:** 117a/d/e = **v1.0.0** · 117b/c/f = **v1.0.1** (S19 safety fixes)  
**Paste boundary (all):** Skip GitHub header lines **1–7**. Paste from line **9** (`/************************************************************`) through EOF.

**Shared outputs:** `statusOut`, `errorOut`, `debugStep`, `actionOut` (+ extras noted per script)  
**Initial state after paste:** create all **OFF**; wire inputs/outputs; turn ON in order **a → b → c → d → e → f**.  
**117f:** leave `webhookUrl` **blank**; do not use a production Make webhook.

**Activation order reason:** normalize → coach review → XP → gate roster → Perfect Week roster → email (last, skip-safe).

---

## 117a — Normalize Recording Quiz Submission

| Item | Value |
|------|--------|
| **Exact automation name** | `117a - Zoom Recording Credit - Normalize Recording Quiz Submission` |
| **Trigger type** | When record matches conditions |
| **Trigger table** | Zoom Attendance |
| **Exact trigger conditions** | `Attendance Method` is `Recording Quiz` AND `Recording Quiz Review Status` is empty |
| **Input variables** | `recordId` ← Zoom Attendance record id |
| **Script paste boundary** | Skip lines 1–7; paste from PRODUCTION docblock (`/************************************************************`) |
| **Initial ON/OFF** | Paste **OFF** → ON after inputs mapped |
| **Test record setup** | Schmidt recording ZA `recHkB9aER3vCvBsL` (or clone): Method=`Recording Quiz`; clear Review Status |
| **Expected output** | `actionOut=normalized` (or `skipped_already_normalized`); Review Status=`Needs Review`; Submitted At stamped if field present |
| **Rollback** | Reset Review Status / Submitted At on fixture; delete only if a mistaken new test row was created |

**File:** `117a-zoom-recording-normalize-recording-quiz-submission.js` (**v1.0.0**)

---

## 117b — Coach Review and Needs Correction Handling

| Item | Value |
|------|--------|
| **Exact automation name** | `117b - Zoom Recording Credit - Coach Review and Needs Correction Handling` |
| **Trigger type** | When record matches conditions |
| **Trigger table** | Zoom Attendance |
| **Exact trigger conditions** | `Attendance Method` is `Recording Quiz` AND `Recording Quiz Review Status` is any of `Satisfactory`, `Needs Correction`, `Needs Review` — watch field **Recording Quiz Review Status** (prefer “when changed” if UI offers) |
| **Input variables** | `recordId` |
| **Script paste boundary** | Skip 1–7; paste from line 9 |
| **Initial ON/OFF** | Paste **OFF** → ON after 117a proven |
| **Test record setup** | Same ZA; set Review Status=`Satisfactory` |
| **Expected output** | `actionOut=marked_satisfactory`; `Recording Quiz Satisfactory?` checked; Reviewed At stamped |
| **Rollback** | Set Review Status back; re-run syncs Satisfactory; ignore/adjust Correction Count if testing Needs Correction |

**File:** `117b-…js` (**v1.0.1** — correctionCount output fixed)

---

## 117c — Create Zoom XP Event

| Item | Value |
|------|--------|
| **Exact automation name** | `117c - Zoom Recording Credit - Create Zoom XP Event` |
| **Trigger type** | When record matches conditions |
| **Trigger table** | Zoom Attendance |
| **Exact trigger conditions** | `Attendance Method` is `Recording Quiz` AND (`Zoom Credit Approved?` is checked/1 **OR** `Zoom Credit Conflict?` is checked/1) — recommended so deactivate-on-conflict can fire when approval flips |
| **Fallback (narrower)** | Approved?=1 AND `Zoom XP Amount` > 0 (may miss deactivate; OK for first create smoke only) |
| **Input variables** | `recordId` |
| **Script paste boundary** | Skip 1–7; paste from line 9 |
| **Initial ON/OFF** | Paste **OFF** → ON after formulas show Approved=1 + Key + Amount on fixture |
| **Test record setup** | After Satisfactory: confirm `Zoom Credit Key`=`ZOOM_CREDIT|{Enrollment RID}|{Zoom Meeting RID}`, Approved, Amount>0, Conflict=0 |
| **Expected output** | First run `actionOut=created` (+ `xpEventId`); re-run `skipped_exists`. Live rows → `skipped_not_recording_quiz` (**v1.0.1**) |
| **Rollback** | Soft-void XP Event: `Active? = false` — **do not delete** |

**File:** `117c-…js` (**v1.0.1** — Recording Quiz–only; live XP stays **101**)

---

## 117d — Apply Zoom Gate Credit

| Item | Value |
|------|--------|
| **Exact automation name** | `117d - Zoom Recording Credit - Apply Zoom Gate Credit` |
| **Trigger type** | When record matches conditions |
| **Trigger table** | Zoom Attendance |
| **Exact trigger conditions** | `Attendance Method` is `Recording Quiz` AND `Zoom Gate Credit Earned?` is checked/1 |
| **Input variables** | `recordId` |
| **Script paste boundary** | Skip 1–7; paste from line 9 |
| **Initial ON/OFF** | Paste **OFF** → ON after 117c create smoke |
| **Test record setup** | Same Satisfactory row with Gate Credit Earned?=1, Conflict=0 |
| **Expected output** | `linked_attendee_for_gate`; Enrollment on meeting `Attendees`; `Gate Credit Applied?` true; re-run `skipped_already_applied` |
| **Rollback** | Uncheck `Gate Credit Applied?`; remove Enrollment from `Attendees` only if 117e does not also need it |

**File:** `117d-…js` (**v1.0.0**)

---

## 117e — Apply Perfect Week Credit

| Item | Value |
|------|--------|
| **Exact automation name** | `117e - Zoom Recording Credit - Apply Perfect Week Credit` |
| **Trigger type** | When record matches conditions |
| **Trigger table** | Zoom Attendance |
| **Exact trigger conditions** | `Attendance Method` is `Recording Quiz` AND `Zoom Credit Approved?` is checked/1 AND `Effective Recording Counts for Perfect Week?` is checked/1 |
| **Input variables** | `recordId` |
| **Script paste boundary** | Skip 1–7; paste from line 9 |
| **Initial ON/OFF** | Paste **OFF** → ON after 117d (or same wave once 117d stable) |
| **Test record setup** | Same row; PW Effective flag true |
| **Expected output** | `linked_attendee_for_perfect_week` (or already-linked + Applied flag); re-run `skipped_already_applied` |
| **Rollback** | Uncheck `Perfect Week Credit Applied?`; remove from Attendees only if gate flag also false |

**File:** `117e-…js` (**v1.0.0**)

---

## 117f — Send Approval Email

| Item | Value |
|------|--------|
| **Exact automation name** | `117f - Zoom Recording Credit - Send Approval Email` |
| **Trigger type** | When record matches conditions |
| **Trigger table** | Zoom Attendance |
| **Exact trigger conditions** | `Attendance Method` is `Recording Quiz` AND `Recording Quiz Satisfactory?` is checked |
| **Input variables** | `recordId` (required); `webhookUrl` (**leave blank** for DEV closeout) |
| **Script paste boundary** | Skip 1–7; paste from line 9 |
| **Initial ON/OFF** | Paste **OFF**; may turn **ON** with blank webhook → expect `skipped_no_webhook` only. Prefer keep OFF until intentional DEV email test |
| **Test record setup** | Same Satisfactory + Approved row; email Config may be seeded enabled — **blank webhook blocks send** |
| **Expected output** | `skipped_no_webhook` (or `skipped_disabled` / `skipped_config_missing`). **Never** `sent` without intentional DEV webhook. v1.0.1 also skips unless Approved and not Conflict |
| **Rollback** | Clear Send Key + Sent At if stamped; turn automation OFF; blank webhook |

**File:** `117f-…js` (**v1.0.1** — Approved/Conflict guards)

---

## Shared outputs map

| # | Extra outputs |
|---|----------------|
| 117a | `zoomAttendanceId`, `enrollmentRid`, `zoomMeetingRid` |
| 117b | `correctionCount` |
| 117c | `xpEventId`, `xpPoints` |
| 117d–e | (core only) |
| 117f | `sendKey` |

---

## Pre-paste field check (DEV Zoom Attendance)

Confirm visible: Review Status options `Needs Review` / `Satisfactory` / `Needs Correction`; Support fields from S18 (`Gate Credit Applied?`, `Perfect Week Credit Applied?`, email Send Key/Sent At, Correction Count, Reviewed At, Needs Correction At, Submitted At); credit formulas (`Zoom Credit Key`, Approved, Conflict, Amount, Gate Earned, Effective email trio / PW Effective).
