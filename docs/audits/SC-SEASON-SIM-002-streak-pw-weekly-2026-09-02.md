# SC-SEASON-SIM-002 — Streak / Perfect Week / Weekly Email post-run findings

**Prior run (root-cause):** `SEASON-SIM-2027-20260902T202049Z-athlete1` · Enrollment `recekm0ke1bihWAc3`  
**Final successful run:** `SEASON-SIM-2027-20260902T213135Z-athlete1` (58/58 countable · 13,906 shots · 17 streak occurrences · 6 WEEKLY Accepted; PW Eligible=0 expected)  
**Date:** 2026-09-02  
**Status:** **CLOSED** — Final run succeeded using local writer arms; formulas restored; disposable cleaned. Merge writer closeout to `master` before any future execute. No second simulation.

## Current run results (healthy core)

| Metric | Value |
|---|---|
| Writer status | complete |
| Submissions countable | 58/58 · 13,906 shots |
| Homework | 18/18 (0 award errors) |
| XP Events | 87 |
| Zoom | live + recording credited |
| Emails (this enroll) | 68 Accepted → `schmidt@fairfieldbasketballclub.com` only |
| Lifetime XP | 1,865 · Level Developing Shooter |
| Streak Occurrences | **0** |
| Athlete Achievement Unlocks | **0** |
| STREAK_XP | **0** |
| Longest Streak Days (gate) | **0** (Current Shooting Streak = 11 via 055) |
| Perfect Week Eligible? | 0/10 (expected for athlete1 design) |
| WEEKLY handoffs | **0** · Build Weekly still true on 6 Saturday WAS |

## Root causes

### 1. Missing Streak Occurrences — DEFECT (writer trigger timing)

**Chain:** 053 (rebuild occurrences) → 054 (streak XP / unlocks) → Enrollment `Longest Streak Days` rollup → level gate.

**Production 053 trigger:** `recordUpdated` on Submissions watching:

| Field ID | Name | Type |
|---|---|---|
| `fldpkkSBsx8kQRZos` | Activity Date | date |
| `fld0fKiO62UiztNQH` | Enrollment | link |
| `fld1gQ2c04pndnTKe` | Count This Submission? | formula |
| `fldAqC1oUKKFZdU3p` | Total Shots Counted | formula |

`recordId` input is correctly `$ref: trigger → id`.

**Why Current Shooting Streak = 11 but occurrences = 0:** Automation **055** uses `recordMatchesConditions` (Enrollment + Activity Date nonempty + Count This = 1) and writes Current Shooting Streak directly. Gate uses **Longest Streak Days** = MAX of Streak Occurrences.`Gate Eligible Streak Days`, which only 053 creates.

**Why 053 never produced rows:** Prior writer post-create rewrote the **same** Activity Date + Enrollment and set `Build Daily Email Now?`. Build Daily is **not** watched. Identical Activity Date / Enrollment after create do **not** fire `recordUpdated`. Formula fields settling during create often do not emit a separate watched update the writer can rely on. Net: 053 did not run with a valid post-formula watched-field change → 0 occurrences → gate Streak 0/10 → no 054 / STREAK_XP / unlocks.

**Future writer fix (implemented):** After create, arm Build Daily (076); **wait** until Count This = 1 and Total Shots Counted > 0; then **clear Enrollment → restore Enrollment + Activity Date** (`SUB_STREAK_ARM`) so 053 fires after prerequisites exist. Does not manually create occurrences or XP.

### 2. Perfect Week daily “0/7 missing all days” — DEFECT (stale 057) + EXPECTED Eligible=0

**Temporary same-day/grace formulas are evaluating correctly** on live submissions (Countable / Grace / Same Day ≈ 1; shots 247 ≥ daily min 191).

**Stale calc:** WAS created ~8 minutes before submissions. 057 ran while WAS→Submissions links were empty, wrote Daily Check Detail with on-time=0 / ignored=0 / missing all days, set Status **Ready**. Queue stays satisfied on Ready and does **not** re-fire when submissions later link.

**Eligible?=0 remains EXPECTED** for athlete1 even after honest 057 re-run:

- Intentional miss days (15 / 36 / 50)
- ≤1 video per week vs Perfect Week Video Minimum = 3
- Needs Revision homework on many weeks
- Partial Early Bird / Week 9 windows

Weeks that should show **daily PASS** after re-run (still fail overall on video/HW): 1, 3, 4, 6, 8.

**Future writer fix (implemented):** After the day loop, for each WAS: Perfect Week Automation Status **Skipped → Pending** so 057 recalculates with linked submissions. Does not force Eligible.

**Separate positive Perfect Week scenario:** **Yes — required** for Eligible=1 proof (7 countable days, ≥3 videos, 100% satisfactory HW, Zoom if required).

### 3. Missing weekly handoffs — DEFECT (Production 072 input wiring)

**072 trigger:** WAS `Build Weekly Email Now?` = true (`recordMatchesConditions`) — correct.

**Live 072 script input:** `recordId` = hardcoded `"reczxTIpVI8ZJLex0"` (missing in base). Contrast **074**, which uses `$ref: trigger → id`.

Writer correctly armed 6 Saturday WAS. 072 always loaded the dead id → throw / no writeback on the real WAS → Build stays true → no package → no WEEKLY handoff. Shot/XP/recipient checks on the sim WAS currently pass; this is **not** an XP-settlement data defect.

**Mike OMNI action (required before next email-on execute):** Fix Production 072 `recordId` to the triggering WAS record (same pattern as 074). Do not paste from agents without review.

**Future writer fix (implemented):** Arm Build Weekly **after** the full day loop with **false → true** so the match condition re-enters once 072 is wired correctly. Document the OMNI prerequisite in the arm notes.

## Email safety

- Accepted emails for this enrollment: allowlisted `schmidt@fairfieldbasketballclub.com` only.
- Two Failed Hub allowlist rows (`rec1vYc…` WELCOME, `recLGpn…` ZOOM_RECORDING) use **other** handoff keys (`recIWMKrfFkHLqg5U`, `recb36oYBIE45456t`) — unrelated leftovers.
- No family addresses. No additional emails sent during this investigation.

## Repair decision (current run)

| Issue | Root cause | Expected or defect | Safe repair now | Future writer fix | New run required |
|---|---|---|---|---|---|
| Streak Occurrences = 0 | 053 never got a post-formula watched-field change | Defect | Possible: one Enrollment clear→restore on a late submission after Mike approves (would cascade 053/054). **Do not auto-repair.** | Yes — `SUB_STREAK_ARM` | Preferred for clean evidence |
| Gate Streak 0/10 | Rollup of empty occurrences | Defect (follows above) | Same as streak | Same | Preferred |
| PW Daily Check all days missing | 057 ran on empty WAS links; stuck Ready | Defect (detail) | Possible: Status Skipped→Pending on 10 WAS (read-only refresh). **Do not auto-repair.** | Yes — `WAS_PW_REQUEUE` | Optional if requeue approved |
| PW Eligible = 0 | Scenario design | Expected | No — do not force | N/A (+ positive scenario later) | Positive scenario later |
| WEEKLY handoffs missing | 072 hardcoded `recordId` | Defect (Airtable config) | After OMNI fixes 072: false→true on 6 armed WAS (no Sent/package yet → no duplicate). **Do not auto-repair / do not send.** | Arm false→true + OMNI fix | After 072 fix |
| Achievements / STREAK_XP | Downstream of 053 | Defect (follows streak) | Via 053 repair only | Via streak arm | Preferred |

**Preserve current run for evidence** until Mike decides cleanup. Do not restore temporary formulas yet. Do not start a new simulation until writer fixes + 072 OMNI fix are reviewed.

## Formula rollback

Temporary Submitted Same Day? / Perfect Week Grace / Countable formulas remain required for sim same-day math. Rollback only after a successful future run that proves streak + PW detail + weekly (post-072 fix).

## Files changed (this session)

- `tools/season_simulation/writer.py` — formula wait + Enrollment clear/restore for 053; PW Skipped→Pending requeue; weekly false→true arm notes
- `tools/season_simulation/execute.py` — dry-run intended writes / readiness for streak arm + PW requeue
- `tools/season_simulation/memory_client.py` — offline Count This / Total Shots Counted simulation
- `tools/season_simulation/tests/test_writer.py` — streak arm + PW requeue + readiness assertions
- `docs/audits/SC-SEASON-SIM-002-streak-pw-weekly-2026-09-02.md` — this document
- `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` — SC-SEASON-SIM-002 status update
