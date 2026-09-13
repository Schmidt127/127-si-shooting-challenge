# Final Production Run — `SEASON-SIM-2027-20260913T010724Z-threeathlete`

**Verdict:** `FINAL SEASON SIMULATION FAIL — Perfect athlete Lifetime XP 4085/4910 (HW pending 8/18, streak capped at 40 missing 50/60, weekly thresholds short); Recovery and Edge not executed`

## Run metadata

- Run ID: `SEASON-SIM-2027-20260913T010724Z-threeathlete`
- Production base: `appn84sqPw03zEbTT`
- Start: `2026-09-13T01:07:24.309825+00:00`
- End: `2026-09-13T01:33:41.179Z`
- Execution status: `FAILED_STOPPED_AFTER_ATHLETE1`
- Business reconciliation: `FAIL`

## Automation versions (deployed)

- 053 = v5.6
- 076 = v8.15
- 101 = v6.9

## Temporary formula gates

- Installed before execute: YES
- Verified against canonical Season Sim packets: YES
- Fields: Activity Date Is Future?, Submitted Same Day?, Perfect Week Grace Eligible?

## Athlete IDs

- Perfect athlete: `rec5QYk66wEXMdCNG` / enrollment `recFcH7qLPzzso9s3` (Sim Perfect)
- Recovery: NOT EXECUTED
- Edge: NOT EXECUTED

## Perfect — XP buckets (expected vs actual)

| Bucket | Expected | Actual | Δ | OK |
|--------|---------:|-------:|--:|:--:|
| Submission XP | 1340 | 1340 | 0 | Y |
| Homework XP | 630 | 350 | -280 | N |
| Video XP | 750 | 750 | 0 | Y |
| Streak XP | 455 | 260 | -195 | N |
| Weekly Threshold XP | 480 | 130 | -350 | N |
| Perfect Week XP | 1000 | 1000 | 0 | Y |
| Shot Milestone XP | 165 | 165 | 0 | Y |
| Zoom XP | 90 | 90 | 0 | Y |

- **Total XP expected:** 4910
- **Total XP actual (Lifetime XP Earned):** 4085
- **Perfect Week XP events:** 10 (expected 10)
- **Public level:** All-Star / Gate Blocked
- **Gate:** Rule=Level 11 Gate | Enabled=Yes | Sub 67/52 | HW 18/18 | Vid 53/24 | Zoom 1/2 | Streak 40/45
- **Streak Current / Longest:** 67 / 40
- **Streak occurrence keys:** ['streak|recfch7qlpzzso9s3|5-day_streak|2027-04-29', 'streak|recfch7qlpzzso9s3|10-day_streak|2027-05-04', 'streak|recfch7qlpzzso9s3|3-day_streak|2027-04-27', 'streak|recfch7qlpzzso9s3|40-day_streak|2027-06-03', 'streak|recfch7qlpzzso9s3|7-day_streak|2027-05-01', 'streak|recfch7qlpzzso9s3|30-day_streak|2027-05-24', 'streak|recfch7qlpzzso9s3|20-day_streak|2027-05-14']

## Homework settlement

- Registry HW completions: 18
- WAS linked: 18
- Awarded: 10
- Pending: 8

## Zoom

- XP events: ZOOM_ATTEND_BASE=1, ZOOM_RECORDING_CREDIT=1 (90 XP) — matches expected Zoom XP
- Gate effective Zoom count remains 1/2 (live-only gate credit)

## Email handoffs (Perfect)

- Count: 79
- Statuses: {'Accepted': 79}
- Duplicate Handoff Keys: none
- Unsafe recipients: none

## Duplicate key audit

- Duplicate XP Source Keys: none

## Recovery / Edge

- Recovery expected 2305 XP / 1 PW — **not executed**
- Edge expected 3620 XP / 5 PW — **not executed**

## Errors / warnings

- total XP expected 4910 actual 4085
- Homework XP expected 630 actual 350 (8 completions still Award Status=Pending)
- Streak XP expected 455 actual 260 (occurrences through 40 only; missing 50/60; Current=67 Longest=40)
- Weekly Threshold XP expected 480 actual 130
- public level expected G.O.A.T. actual All-Star (Gate Blocked)
- Zoom gate effective Rule=Level 11 Gate | Enabled=Yes | Sub 67/52 | HW 18/18 | Vid 53/24 | Zoom 1/2 | Streak 40/45

## Tooling notes

- Stage E2_business_success did not receive live XP events (reported actual 0); post-run forensic used Enrollment-linked XP Events.
- WAS links were set on all 18 Homework Completions (orchestration fix confirmed).
- No cleanup performed on this run per Mike authorization.
- Prior failed run SEASON-SIM-2027-20260912T222521Z-threeathlete residue remained zero at pre-execute.

## Post-run safety

- Fresh-run records: PRESERVED (no cleanup)
- Production formulas: restored YES (verified no Season Sim references)
- Automations 053/076/101: not reverted
