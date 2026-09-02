# SC-147 — Recorded Zoom half-XP via Automation 101 v6.8

**Status:** **Production-complete** — Automation **101 v6.8** pasted, deployed, and verified 2026-09-02  
**Date:** 2026-09-02  
**Backlog:** SC-147 / MRW-H10  
**Production base:** `appn84sqPw03zEbTT` (Production-only; **no DEV base**)

> **Do not create Automation 121.** Capacity is full. Recording credit is handled inside **Automation 101 v6.8**.

Evidence: [`docs/testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md`](../testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md)

---

## Root cause (why this change)

Production **101 v6.6** latched `Last Zoom XP Reconciled Signature` on the Create-XP-Events-off path whenever `Needed? = 1`. The Stage 17 `REC_PENDING` formula wakes 101 for approved recording quizzes, but v6.6 then acknowledges without creating `ZOOM_RECORDING_CREDIT` XP.

**Fix:** 101 v6.8 processes approved recording credit in the same reconciliation pass and **does not latch** while a valid `REC_PENDING` remains unresolved (especially while Meeting Status is Scheduled / In Progress).

---

## Current Production vs GitHub

| Item | Status |
|------|--------|
| Production Automation 101 | **v6.8 Live / verified** (2026-09-02) — Production-only base; **no DEV base** |
| GitHub script sync | Docs closeout records Production truth; bring `101-zoom-attendance-xp-award-meeting-xp.js` v6.8 into `master` via a separate implementation PR if not already merged |
| Controlled disposable proof | **PASS** on VERIFY/Schmidt disposable records — recording + replay + Perfect Week exclusion + live `ZOOM_ATTEND_BASE` |
| Historical docs claiming “101 v6.7 Live” | **Superseded / incorrect for Code column** — treat as historical |
| Automation 121 | **Does not exist and is not required** — do **not** create |
| Placeholder `147-*.js` | Repo archive only — **do not paste** |
| `REC_PENDING` formula + rollup | **Keep** — wake-up signal for 101 |
| `Activity Date Is Future?` | Production **`NOW()`** formula **restored** after temporary Season Sim gate for Week 1 WAS |
| Season Sim gate fields | Remain on Submissions; unchecked / inactive for normal athletes |

---

## Contract (101 v6.8)

| Path | Behavior |
|------|----------|
| Live attendance | Unchanged — `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{Enrollment RID}` + bonuses |
| Approved recording | `ZOOM_RECORDING_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| Recording prerequisites | Quiz satisfactory / approval guards, conflict ≠ 1, no live credit (`ZOOM_ATTEND_BASE` or `ZOOM_LIVE`), Meeting Status **Completed** |
| Mutual exclusivity | Live and recording credit for the same athlete + meeting must not both be active |
| Attendees | Recording viewers are **never** added to `Zoom Meetings.Attendees` |
| XP amount | Half of live Zoom XP — active `ZOOM_RECORDING` rule when present; else `floor(live / 2)` |
| XP Bucket / Source | Production choices: bucket **Zoom Attendance**, source **Zoom Meeting Recording Quiz** |
| Level / gate | Counts (Zoom Attendance bucket XP) |
| Perfect Week | Does **not** count (057 still reads live Attendees) |
| Email | No new family email from 101 (117 remains email-only) |
| Latch | Do not acknowledge Create-off when `REC_PENDING` is unresolved; after award / idempotent skip / confirmed clear, acknowledge so `Needed? = 0` |

---

## Operator paste (Mike only) — DONE 2026-09-02

Paste and controlled proof completed. See evidence file above.

**Season Sim note:** Temporary gated `Activity Date Is Future?` was used only to create Week 1 WAS via 031, then **restored** to Production `NOW()`. Season Sim checkbox/dateTime fields remain on Submissions (safe when unchecked).

---

## Offline tests

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
node airtable/automations/shooting-challenge/lib/zoom-live-attendance-lifecycle.test.js
```

---

## Related

| Item | Notes |
|------|-------|
| Design brief | [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md) |
| Pure helpers | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.js` |
| 101 script | `airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.js` |
| 117 v2.1 | Email only — do not add XP |
