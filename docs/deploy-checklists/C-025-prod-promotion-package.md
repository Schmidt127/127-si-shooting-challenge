# C-025 — PROD promotion package (NOT APPLIED)

**Status:** Prepared after DEV DoD — **stop for Mike approval before any PROD work**  
**Date:** 2026-07-14  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD:** do not apply until Mike signs off

---

## 1. Schema changes (PROD)

| Table | Change |
|-------|--------|
| Config | C-025 recording policy fields (XP %, gate, PW, coach, makeup, deadline mode, email trio) + YN companions if used |
| Zoom Meetings | Config Program/Global links; Meeting Overrides; Program/Global Config rollups/lookups; Effective* formulas (same IDs as DEV where possible — or recreate Effectives as formulas and rewire ZA lookups) |
| Zoom Attendance | Gate Credit Applied?; Perfect Week Credit Applied?; Recording Approval Email Send Key/Sent At; Correction Count; Reviewed At; Needs Correction At (as needed) |
| Views | `Zoom Recording Quiz - Past Deadline` |

**Caution:** Effectives were converted in-place in DEV (IDs preserved). PROD may still have editable Effectives — convert via UI like DEV using `C-025-effective-to-formula-conversion.md`.

## 2. Exact formulas

- Effective* paste set: `C-025-effective-to-formula-conversion.md`
- Credit formulas: `C-025-Zoom-Recording-Formula-Repair.md` / Manual repair docs
- Deadline: `C-025-deadline-repair-design.md` §8

## 3. Automation scripts (GitHub → paste)

| # | File |
|---|------|
| 117a | `airtable/automations/shooting-challenge/117a-zoom-recording-normalize-recording-quiz-submission.js` |
| 117b | `…/117b-zoom-recording-coach-review-and-needs-correction-handling.js` |
| 117c | `…/117c-zoom-recording-create-zoom-xp-event.js` |
| 117d | `…/117d-zoom-recording-apply-zoom-gate-credit.js` |
| 117e | `…/117e-zoom-recording-apply-perfect-week-credit.js` |
| 117f | `…/117f-zoom-recording-send-approval-email.js` |

Skip GitHub header when pasting. Folder: **17 - Zoom Recording Credit**. Triggers per `C-025-automation-packages-stage17.md`.

## 4. Trigger / input configuration

- All: `recordId` from Zoom Attendance  
- 117f: `webhookUrl` from input; leave blank/disabled until Make PROD authorized  

## 5. Required Config values

Seed active season Config (defaults: XP 50%, gate on, PW on, coach on, makeup on, window 7, deadline Later of Both, email off until intentional).

## 6. Data migrations

- Copy meeting Effective values → Meeting Overrides **before** converting Effectives to formulas  
- Link Config (Program) / Config (Global) on Zoom Meetings  

## 7. Test results (DEV)

| Suite | Result |
|-------|--------|
| E2E harness (no Fillout) | **6/6 PASS** |
| Effective postconversion matrix | **13/13 PASS** · restore OK · Schmidt 4/4 (prior run) |
| Offline automation contracts | **6/6 PASS** |

## 8. Rollback / repair

- Soft-void XP via `Active? = false` (never delete ledger rows)  
- Uncheck Gate/PW Applied flags; remove Enrollment from Meeting Attendees if needed  
- Revert Review Status to Needs Correction  

## 9. PROD smoke checklist

- [ ] Schmidt-equivalent PROD test enrollment only  
- [ ] Recording Satisfactory → one XP Event (`ZOOM_CREDIT|…`)  
- [ ] Conflict live+recording → no double award  
- [ ] 117f does not send to real parents until email Config + Make PROD approved  
- [ ] Deadline view filters correct  

## 10. Docs / changelog

Update `CHANGELOG.md` § Airtable on apply. Keep this package linked from backlog C-025.
