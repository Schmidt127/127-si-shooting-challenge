# Duplicate-safe XP verification checklist

Use this checklist after any controlled XP test or before certifying a path. **Never manually create XP Events** — verify that each family’s canonical automation owns exactly one active row per Source Key.

**Base:** PROD `appn84sqPw03zEbTT`  
**Authority:** Source Key patterns in `airtable/automations/shooting-challenge/lib/v2-engine-contracts.js` and owning automation docblocks.

## How to use

For each family below:

1. Identify the test source record (Submission, Homework Completion, etc.).
2. Compute the expected **Source Key** from the pattern.
3. Search **XP Events** for that exact Source Key string.
4. Confirm count = **1** (or **0** if award not yet expected).
5. Replay the owning automation once — count must not increase.
6. Confirm **Active?** matches eligibility (inactive/deactivated when source withdrawn).

---

## 1. Submission Base XP

| Item | Value |
|------|--------|
| Owner automation | **010** |
| Source Key | `SUBMISSION_XP\|{Submission record ID}` |
| Trigger signal | Submission `Reconciliation Needed?` = 1 |
| Verify on XP Event | Links: Submission, Enrollment, Week, WAS; bucket/source = shooting base |
| Replay test | Run 010 **Run a script** with same Submission `recordId` — no second Source Key |
| Do not | Create XP manually; use 010-only reconciliation |

---

## 2. Homework XP

| Item | Value |
|------|--------|
| Owner automations | **064** (prepare) → **065** (XP Event) |
| Source Key | `HOMEWORK_XP\|{Homework Completion record ID}` |
| Trigger signal | `Homework XP Reconciliation Needed?` = 1 after review + totals |
| Verify on XP Event | HC link, Enrollment, Week, WAS; points = Total Homework XP Awarded |
| Replay test | Run 065 again with same HC `recordId` — `reused_after_recheck` / no duplicate |
| Do not | Manually create homework XP; 064 never creates XP Events |

---

## 3. Video XP

| Item | Value |
|------|--------|
| Owner automations | **113** (assign base by grade band) → **114** (XP Event) |
| Source Key | `VIDEO_SUBMISSION\|{Video Feedback record ID}` |
| Trigger signal | Video XP reconciliation / review lifecycle (114 docblock) |
| Verify on XP Event | Video Feedback link, Enrollment, Week, WAS as required by 114 |
| Replay test | Re-run 114 script on same VF `recordId` — single canonical event |
| Do not | Use retired **112**; do not hand-create video XP |

---

## 4. Zoom XP

| Item | Value |
|------|--------|
| Owner automation | **101** (live meeting attendance) |
| Source Key patterns | `ZOOM_ATTEND_BASE\|{Zoom Meeting ID}\|{Enrollment ID}` · bonus keys `ZOOM_ATTEND_BONUS_2\|{Enrollment}` · `ZOOM_ATTEND_BONUS_3\|{Enrollment}` |
| Recording credit | Separate writer path — not slot **117** (117 = Hub email handoff only) |
| Verify | One base event per meeting+enrollment pair; bonuses at most once per enrollment rule |
| Replay test | Re-trigger 101 on same meeting/enrollment — no duplicate base key |
| Do not | Enable historical Make **117f** Gmail path; do not merge with recording approval email |

---

## 5. Shot Milestone XP

| Item | Value |
|------|--------|
| Owner chain | **066** (unlock) → **059** (XP Event) |
| Source Key | `SHOT_MILESTONE\|{Enrollment ID}\|{Shot Milestone ID}` |
| Verify on unlock | Athlete Achievement Unlock → XP Event link; **059** marks Awarded |
| Replay test | Re-run 059 on same unlock — existing event linked, not duplicated |
| Do not | Create milestone XP without 066 unlock ownership |

---

## 6. Streak XP

| Item | Value |
|------|--------|
| Owner chain | **053** (rebuild occurrences) → **054** (XP Event) |
| Source Key | `STREAK_XP\|{Enrollment ID}\|{Achievement ID}\|{activity date key}` |
| Verify | One event per streak occurrence key; **Active?** follows streak lifecycle |
| Replay test | Re-run 054 for same occurrence — repair/skip, not second key |
| Do not | Edit streak occurrence tables to “force” XP without 053 ownership proof |

---

## 7. Weekly Threshold XP

| Item | Value |
|------|--------|
| Owner automation | **035** (automation **OFF** in PROD by policy — verify before any live run) |
| Source Key | `WEEKLY_THRESHOLD\|{Enrollment ID}\|{Week ID}\|{percent}` (100 / 125 / 150) |
| Verify | At most one event per enrollment+week+percent tier |
| Replay test | If 035 enabled in DEV only — replay must not duplicate tier keys |
| PROD note | Treat existing threshold rows as historical; do not enable 035 in PROD without Mike approval |

---

## 8. Perfect Week XP

| Item | Value |
|------|--------|
| Owner chain | **057** (helpers) → **058** (unlock) → **059** (XP Event) |
| Unlock Source Key (058) | `PERFECT_WEEK\|{Enrollment ID}\|{Week ID}` on Athlete Achievement Unlock |
| XP Source Key (059) | Same `PERFECT_WEEK\|{Enrollment ID}\|{Week ID}` on XP Event |
| Verify | One unlock + one XP Event after full eligibility; **059** XP Award Status = Awarded |
| Replay test | Re-run 059 on same unlock — links existing XP, no second row |
| Do not | Force `Perfect Week Eligible?` or fabricate dates to bypass 057 rules |

---

## Cross-family checks (after any test session)

| Check | Pass criteria |
|-------|----------------|
| Global Source Key search | Filter XP Events — no duplicate identical Source Key strings |
| Wrong-family links | Submission Base event must not steal homework/video keys |
| Active enrollment | Inactive enrollments must not accumulate new positive XP |
| Formula lag | If reconciliation flags stay set after success, wait one refresh cycle before FAIL |
| Manual edits | No hand-created XP Events during test window |

## Quick OMNI / view queries (optional)

- XP Events filtered by Source Key contains `SUBMISSION_XP|`, `HOMEWORK_XP|`, etc.
- Enrollment → linked XP Events count stable after replay
- Weekly Athlete Summary → XP Events for week-scoped families

## Out of scope

- **Tremendous** award fulfillment (Make scenario OFF; separate C-028 track)
- **Team Shot Tracker** (different product/repo)
- Automation **063** (retired — do not reinstall)
