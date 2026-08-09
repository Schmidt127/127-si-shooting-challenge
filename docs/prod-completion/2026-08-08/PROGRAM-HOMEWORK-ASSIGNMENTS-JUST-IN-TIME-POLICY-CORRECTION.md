# Program Homework Assignments — Just-in-Time Scheduling Policy Correction

Date: 2026-08-08
Environment: PROD (`appn84sqPw03zEbTT`)
Program Instance: `rec5mEM0YPqPqq0hZ` — Shooting Challenge | 2026-2027

## Supersedes earlier restoration assumption

This document **supersedes** `PROGRAM-HOMEWORK-ASSIGNMENTS-2026-2027-RESTORATION.md` and any current-state statement that the 2026-2027 Shooting Challenge should contain a fixed 90-row regular-season homework schedule.

The 90-row schedule was created from an incorrect assumption and was removed after the coach clarified the actual operating model.

## Authoritative product rule

Homework is scheduled **just in time** through `Program Homework Assignments` (PHA):

- there is no fixed full-season HW1/HW2 sequence;
- the coach may assign any number of homework assignments to any Week;
- assignments are generally selected on the Sunday before the Week;
- PHA is the current Program Instance / Week / Grade Band / Slot scheduling source of truth;
- `FBC Curriculum - SYNC` is the reusable content library and must not be treated as the authoritative current-season schedule;
- unassigned published curriculum items must not appear as currently assigned merely because they retain historical Week links.

## PROD correction applied

All 90 accidentally created regular-season PHA rows were deleted.

Direct post-delete readback confirms exactly two active PHA rows remain:

1. `reca5GM1JkROhXOiy`
   - Homework: `rechVLOeyEVIqmy2v` — Shot Tracker Usage
   - Week: controlled `Early Bird - Testing` fixture `recWeVrSabnsYaHc2`
   - Grade Band: 3-4
   - Slot: HW1

2. `reccQhrgOK8e8Yngv`
   - Homework: `rec6WmXjpLtIWDERo` — Website Exploration
   - Week: controlled `Early Bird - Testing` fixture `recWeVrSabnsYaHc2`
   - Grade Band: 3-4
   - Slot: HW2

There are currently **no regular Week 1-9 PHA assignments**.

## Related season correction

The 2027 season Week records were relabeled in place without changing record IDs:

- `recBrZ1sV8byWEHZU` = real Early Bird, Apr 25-May 1
- `rec2Rewxt21z7dI9f` through `rech8lgJkNMStWh9A` = Week 1 through Week 9
- `recWeVrSabnsYaHc2` = `Early Bird - Testing`, retained as the controlled August fixture

Config `rechc1f9f4kVM1tHP` now has Challenge Week Count = 9 and excludes the August testing fixture from its canonical season Weeks link.

## Architecture consequences

### Public Homework catalog

The public site must join active PHA scheduling to curriculum content. It must not group the reusable curriculum library directly by its historical Week links.

GitHub issue: #125.

### Automation 067 / Final Reflection

HW17 is not currently scheduled. Automation 067 must resolve an applicable current-season PHA row and fail closed when no applicable PHA exists. It must not infer Week 9 or reuse a legacy curriculum Week.

GitHub issue: #120.

### Reporting / email

072/076 and any other assigned-homework reporting path must use current active PHA rows, so an unassigned curriculum item cannot appear in an athlete or parent package.

## Safety rule

Do not recreate a complete season PHA seed unless the coach explicitly changes the product model. Future automation or tooling may assist the coach with **creating the assignments selected for a specific Week**, but it must not preassign the whole season by default.
