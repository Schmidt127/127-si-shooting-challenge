# C-025 Stage 17 — PROD isolated smoke test

**Status:** **COMPLETE** (2026-07-20) — Stage 17 PROD verification PASS; **117 / 057 / 042 ON**; **101** unchanged; **`webhookUrl` blank**.  
**S3 + S5 evidence:** [verification](./C-025-stage17-prod-117-verification-2026-07-20.md) · [live](./C-025-stage17-prod-live-2026-07-20.md)  
**PROD:** `appn84sqPw03zEbTT`
**Fixtures:** Dedicated PROD test Enrollment + Zoom Meeting (Schmidt Testing used for 117 S3/S5)
**Authority:** [C-025-stage17-prod-schema-manifest.json](./C-025-stage17-prod-schema-manifest.json) · [implementation checklist](./C-025-stage17-prod-implementation-checklist.md)

> Procedure steps below retain controlled ON/OFF windows used during smoke. Current production posture is **COMPLETE** with Stage 17 automations **ON** (except 115 never installed; webhook blank).

---

## Preconditions

| Check | Required |
|-------|----------|
| Zoom Attendance table + critical fields/formulas | Present |
| Config recording % | **50** |
| XP Source option | `Zoom Meeting Recording Quiz` |
| `ZOOM_ATTEND_BASE` | Active **60** |
| Automations 117 / 057 / 042 | Pasted; **OFF** except the one under test |
| Automation **101** | ON / unchanged |
| Automation **115** | Not in PROD |
| Webhook / email on 117 | Blank / disabled |

Record IDs (fill during test):

| Role | Record ID |
|------|-----------|
| Test Athlete | (Schmidt Testing fixture) |
| Test Enrollment | `recgP9qZYjAhE7NXm` |
| Test Zoom Meeting | `reczeUT0AJUWMmEOb` |
| Test Zoom Attendance (recording) | `recfqsgM7zDobxsPf` |
| Live XP Event (if any) | |
| Recording XP Event | `recOceuW34jQz7suD` |

---

## Smoke-test order

### S0 — Schema sanity

1. Confirm ZA formulas: Credit Key `ZOOM_CREDIT|…`, XP Amount **30** for approved recording path.
2. Confirm Attendees field exists and is Enrollment link.
3. **Pass if:** blockers = 0 and amount formula resolves.

### S1 — Zoom Attendance creation (recording)

1. Create ZA: Method = **Recording Quiz**; link Enrollment + Meeting; review Satisfactory; approved flags as required by formulas; gate/PW effective flags set so credit is eligible.
2. Keep **117 OFF**; manually verify formulas before enabling.
3. **Pass if:** Credit Key populated; XP Amount = 30; Attendees on meeting still empty for this athlete.

### S2 — Live attendance XP (101 only)

1. With **117 OFF**, add test Enrollment to meeting **Attendees**, satisfy 101 trigger prerequisites (`Create XP Events` etc. per current PROD 101).
2. **Pass if:** exactly one XP Event Source Key `ZOOM_ATTEND_BASE|…`, Points **60**, Bucket `Zoom Attendance`, live source label, Enrollment + Meeting linked.
3. Remove trigger flags so 101 does not loop.

### S3 — Recording quiz XP (117 only)

1. Ensure test Enrollment is **not** in Attendees (or use a separate meeting for recording-only).
2. Turn **117 ON** briefly; Test/trigger on recording ZA; then **OFF**.
3. **Pass if:** exactly one XP Event Source Key `ZOOM_CREDIT|…`, Points **30**, Source `Zoom Meeting Recording Quiz`, Bucket `Zoom Attendance`, Enrollment + Meeting linked; **Attendees unchanged**.

**PROD result 2026-07-20:** **PASS** — ZA `recfqsgM7zDobxsPf` → XP `recOceuW34jQz7suD` (30 XP; Awarded By `117-orchestrator-v1.1.1`). 117 was returned **OFF** after the controlled smoke window (later permanently enabled for Stage 17 COMPLETE).

### S4 — No double XP (both paths)

1. Same Enrollment + Meeting with live Attendees membership **and** recording ZA approved.
2. Run 117 once.
3. **Pass if:** live `ZOOM_ATTEND_BASE|…` untouched; recording either skipped/conflict soft-void (`Active? = false`) or not created as second live; **no second live XP**; Attendees not mutated by 117.

### S5 — Source-key dedupe / rerun

1. Re-run 117 on same ZA.
2. **Pass if:** no second `ZOOM_CREDIT|…` row (skip/exists).

**PROD result 2026-07-20:** **PASS** — second run on `recfqsgM7zDobxsPf` → **`skipped_exists`**; still one XP Event `recOceuW34jQz7suD`.

### S6 — Perfect Week credit (057)

1. Prepare WAS for test Enrollment/Week; clear Applied? on ZA if needed.
2. Turn **057 ON**; force Queue? re-entry (Status Skipped → Pending) or use Test; then **OFF**.
3. **Pass if:** WAS Zoom attendance count reflects recording once where live absent; `Perfect Week Credit Applied?` set when counted; Attendees unchanged.

### S7 — Level recalculation / gate (042)

1. Turn **042 ON**; force view re-entry (Level Recalc Needed? leave/re-enter); then **OFF**.
2. **Pass if:** effective zoom counting includes recording when earned; `Gate Credit Applied?` set when counted; Current/Next Level behave per rules; Attendees unchanged.

### S8 — Totals / history protection

1. Confirm Enrollment `Total Zoom Attendances` reflects **live** count semantics (count of meetings in Attendees) — recording must not inflate live Attendees.
2. Soft-void any intentional wrong **test** `ZOOM_CREDIT|…` via `Active? = false`.
3. **Pass if:** no historical live XP rewritten/deleted; no unrelated email/Make/Softr side effects.

---

## Expected matrix

| Case | Live XP | Recording XP | Attendees write |
|------|---------|--------------|-----------------|
| Live only | 1 × 60 `ZOOM_ATTEND_BASE` | 0 | Yes (101 path only) |
| Recording only | 0 | 1 × 30 `ZOOM_CREDIT` | **Never** |
| Both | 1 × 60 live kept | soft-void/skip recording | **Never from 117** |
| Rerun recording | unchanged | still 1 | Never |

---

## Stop conditions

- Recording path writes Attendees
- Two active XP events for same enrollment+meeting with conflicting live/recording awards
- Historical live XP deleted or points changed
- Amount ≠ 30 for eligible recording with Config 50%
- 117 left ON after test window

---

## Signoff

| Role | Name / date | Result |
|------|-------------|--------|
| Executor | Mike / Cursor close-out 2026-07-20 | S3 + S5 **PASS**; Stage 17 **COMPLETE** |
| Mike approval to enable 117 | 2026-07-20 | **Done** — 117 / 057 / 042 **ON** ([live](./C-025-stage17-prod-live-2026-07-20.md)) |
