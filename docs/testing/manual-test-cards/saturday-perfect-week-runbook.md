# Saturday Perfect Week runbook — 057 → 058 → 059

| Field | Value |
|-------|--------|
| Week | `recT3EXo4Tz7BKFIb` (Perfect Testing Week — verify label in UI) |
| Weekly Athlete Summary | `reczxTIpVI8ZJLex0` |
| Sequence | **057** → **058** → **059** (helpers → unlock → XP Event) |
| Base | PROD `appn84sqPw03zEbTT` |
| Day context | Saturday — natural week-end eligibility check |

## Purpose

Run the Perfect Week award chain on a real WAS when organic data meets requirements. This runbook **does not** force eligibility, check override fields, or fabricate Activity Dates.

## Hard rules

| Rule | Detail |
|------|--------|
| Do not force eligibility | Never hand-set **Perfect Week Eligible?** (formula-owned) |
| Do not fabricate dates | Submissions must be real same-day countable rows per production formulas |
| Do not use override | **Perfect Week Test Override?** must remain unchecked (ignored / FAIL if used) |
| Do not create XP manually | **059** owns Perfect Week XP Events |
| One unlock | **058** creates at most one Perfect Week unlock per Enrollment+Week |

## Preconditions (inspect WAS `reczxTIpVI8ZJLex0` before running)

Confirm organic state — if any row fails, **stop** and complete real submissions/homework/video/zoom work first:

| Requirement | Where to verify |
|-------------|-----------------|
| Enrollment **Active?** | WAS → Enrollment |
| Week link = `recT3EXo4Tz7BKFIb` | WAS → Week |
| Goal Record settled | WAS **Goal Record** + **Weekly Goal Shots Target** numeric |
| Seven qualifying daily submission days | 057 helper fields after run |
| ≥ 3 qualifying videos | **Perfect Week Video Count** |
| Zoom rule | If week has Zoom meetings → attendance or approved recording credit; if none → not required |
| 100% satisfactory homework | **Perfect Week Homework Assigned Count** = **Perfect Week Homework Satisfactory Count** |
| **Perfect Week Calculation Queue?** | May be used to arm 057 per live UI (confirm in Automations UI — not Automations table conditions) |

## Step 1 — Automation 057 (Calculate Perfect Week Eligibility)

**Input:** `recordId` = `reczxTIpVI8ZJLex0` (WAS record ID)

**Run:** Automations → **057** → **Run a script** with that `recordId`.

### Expected WAS fields after 057 success

| Field | Pass pattern |
|-------|----------------|
| **Perfect Week Daily Check Status** | `Pass` when all seven days qualify |
| **Perfect Week Daily Requirement Met?** | true |
| **Perfect Week Video Count** | ≥ 3 |
| **Perfect Week Video Requirement Met?** | true (when count met) |
| **Perfect Week Zoom Meeting Count** | Matches week reality |
| **Perfect Week Zoom Attendance Count** | Meets rule when meetings exist |
| **Perfect Week Homework Assigned Count** | Matches assigned homework |
| **Perfect Week Homework Satisfactory Count** | Equals assigned count |
| **Perfect Week Homework Requirement Met?** | 1 / true |
| **Perfect Week Automation Status** | `Ready` |
| **Perfect Week Automation Error** | empty |
| **Perfect Week Eligible?** | Formula → **1** when all helpers pass (057 does not write this) |

**057 does not:** create unlock, create XP, or write **Perfect Week Eligible?** directly.

### 057 duplicate-safety

- Re-run 057 with same `recordId` — helper fields should stabilize; no duplicate downstream records.
- If status stays non-Ready, read **Perfect Week Automation Error** — do not bypass with overrides.

## Step 2 — Automation 058 (Create Perfect Week Unlock)

**Precondition:** WAS shows **Perfect Week Eligible?** = 1 and **Perfect Week Automation Status** = `Ready`; **Perfect Week Unlock** empty or restorable.

**Input:** `recordId` = `reczxTIpVI8ZJLex0`

### Expected after 058 success

| Location | Field | Expected |
|----------|-------|----------|
| WAS | **Perfect Week Unlock** | Linked to exactly one Athlete Achievement Unlock |
| WAS | **Perfect Week Automation Error** | cleared |
| Unlock | **Achievement** | Active Perfect Week achievement (Reward Rule Key `PERFECT_WEEK`) |
| Unlock | **Enrollment** / **Week** | Match WAS |
| Unlock | **Source Key** | `PERFECT_WEEK\|{Enrollment ID}\|{Week ID}` |
| Unlock | **XP Award Status** | `Pending` |
| Unlock | **Active?** | checked |

### 058 duplicate-safety

- Re-run 058 — must reuse/link same unlock, not create a second unlock for the pair.
- Search Athlete Achievement Unlocks for Source Key `PERFECT_WEEK|…|recT3EXo4Tz7BKFIb` — count = 1.

## Step 3 — Automation 059 (Create XP Event from Achievement Unlock)

**Input:** `recordId` = Athlete Achievement Unlock record ID from step 2 (not the WAS ID).

**Trigger note:** Prefer lifecycle trigger on unlock updates; for manual proof use **Run a script** on the unlock record.

### Expected after 059 success

| Location | Field | Expected |
|----------|-------|----------|
| Unlock | **XP Events** | Linked to one XP Event |
| Unlock | **XP Award Status** | `Awarded` |
| XP Event | **Source Key** | `PERFECT_WEEK\|{Enrollment ID}\|{Week ID}` |
| XP Event | **XP Points** | Active **PERFECT_WEEK** rule amount (commonly **100** — verify rule) |
| XP Event | **Weekly Athlete Summary** | Linked to `reczxTIpVI8ZJLex0` or canonical lookup |
| XP Event | **Active?** | checked |

### 059 duplicate-safety

- Re-run 059 on same unlock — links existing XP Event; **no second Source Key**.
- Global XP Events search for `PERFECT_WEEK|…|recT3EXo4Tz7BKFIb` — exactly one row.

## End-state checklist (Saturday)

| # | Check | Pass |
|---|-------|------|
| 1 | Seven organic daily submissions for week `recT3EXo4Tz7BKFIb` | ☐ |
| 2 | 057 helpers Pass + Status Ready | ☐ |
| 3 | **Perfect Week Eligible?** = 1 without override | ☐ |
| 4 | One unlock via 058 | ☐ |
| 5 | One XP Event via 059 | ☐ |
| 6 | Replay 057→058→059 — no duplicates | ☐ |

## Failure / stop conditions

| Condition | Action |
|-----------|--------|
| Daily requirement not met mid-week | Complete real submissions; do not backdate |
| Video count < 3 | Complete video review path (**113/114**) first |
| Homework incomplete | Finish 064/065 path for assigned PHAs |
| 058 skipped — not Ready | Return to 057 evidence; fix organic data |
| Multiple unlocks or XP rows | Stop — duplicate safety failure |

## Related records (context)

- Week `recT3EXo4Tz7BKFIb` documented as Perfect Testing Week in [2026-08-16 reconciliation](../../prod-completion/2026-08-16/SC-2026-08-16-CURRENT-STATE-RECONCILIATION.md).
- WAS `reczxTIpVI8ZJLex0` — Mike-provided test row; verify links in UI before run.

## Out of scope

- Tremendous · Team Shot Tracker · **063**
- Gated timestamp fixtures ([`PERFECT-WEEK-FIXTURE-METHOD.md`](../perfect-week/PERFECT-WEEK-FIXTURE-METHOD.md)) — this Saturday runbook is **organic only**
