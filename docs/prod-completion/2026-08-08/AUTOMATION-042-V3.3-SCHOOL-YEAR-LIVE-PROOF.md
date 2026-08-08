# Automation 042 v3.3 — School-Year Gate-Rule PROD Live Proof

Date: 2026-08-08
Environment: PROD Airtable `appn84sqPw03zEbTT`
Automation: `042 - Levels and Progression - Assign Current and Next Level with Gate Blocking`
Repository source: `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`
Repository implementation commit: `dd745fce0565dfc9775c7924ae1552b0a87f286b`
GitHub issue: #97

## Scope

This proof closes the known Automation 042 v3.2 defect where active Level Gate Rules were selected only by Level ID and were not scoped to the Enrollment School Year / Rule Set.

Automation 042 v3.3 now:

- reads `Enrollments.School Year`;
- reads `Level Gate Rules.School Year / Rule Set`;
- selects exactly one applicable active Level + intended rule-set match;
- allows only explicit shared/default fallback;
- fails closed on stale, malformed, inactive, or duplicate applicable rules;
- never silently uses a prior-year rule;
- remains the sole writer of progression outputs.

## Controlled Enrollment

- Enrollment: `recCyFEPeATOVNlr9` — Schmidt, Testing - 2026-2027
- School Year: `2026-2027`
- Lifetime XP Total: `688`
- Total Submissions: `13`
- Total Homework Completions: `3`
- Total Video Submissions: `9`
- Total Zoom Attendances: `0`
- Longest Streak Days: `7`

## First live run

Manual Automation 042 v3.3 input:

`recordId = recCyFEPeATOVNlr9`

Result:

- status: `gate_blocked`
- message: `Level assignment blocked for Enrollment recCyFEPeATOVNlr9: Level 3 Gate blocked: Submissions 13/15.`
- enrollmentRecordId: `recCyFEPeATOVNlr9`
- lifetimeXp: `688`
- currentLevel: `Rookie Shooter`
- nextLevel: `Developing Shooter`
- levelGateRule: `Level 3 Gate`
- gateBlocked: `true`
- gateReason: `Level 3 Gate blocked: Submissions 13/15.`
- effectiveZoomCount: `0`

Console proof reported version `3.3`, current level record `rec1EJLJLmfdJLtoF`, next level record `recOdLPbf4Vl43kP7`, Level 3 Gate rule `recrLcVfwPcWGflR2`, and `levelRecalcNeededCleared: true`.

## Direct Airtable verification after first run

The controlled Enrollment was read directly from PROD and confirmed:

- School Year = `2026-2027`
- Current Level = `Rookie Shooter`
- Next Level = `Developing Shooter`
- Level Gate Rule = `Level 3 Gate` (`recrLcVfwPcWGflR2`)
- Level Status = `Gate Blocked`
- Gate Debug = `Rule=Level 3 Gate | Enabled=Yes | Sub 13/15 | HW 3/2 | Vid 9/8 | Zoom 0/0 | Streak 7/0`
- Lifetime XP Total = `688`
- the authoritative Automation 041 progression signature contains the active 2026-2027 Level 3 Gate rule with Minimum Submissions `15`, Minimum Homework `2`, Minimum Videos `8`, Minimum Zoom Meetings `0`, and Minimum Streak Days `0`.

This confirms v3.3 selected the correct 2026-2027 gate rule for the 2026-2027 Schmidt Enrollment.

## Replay proof

Automation 042 v3.3 was run a second time with the same input and unchanged data.

The replay returned the same result:

- Lifetime XP Total = `688`
- Current Level = `Rookie Shooter`
- Next Level = `Developing Shooter`
- Level Gate Rule = `Level 3 Gate`
- Level Status = `Gate Blocked`
- Gate reason = `Submissions 13/15`
- effective Zoom count = `0`
- `levelRecalcNeededCleared: true`

No unexpected Current Level, Next Level, Level Gate Rule, or Level Status churn was observed.

## Architecture verification

- Automation 042 remains the single writer of `Current Level`, `Next Level`, `Level Gate Rule`, `Level Status`, and clearing `Level Recalc Needed?`.
- Automation 043 is not deployed and must not be recreated.
- Automation 041 v4.0 remains the recalculation queue/detection layer and does not write progression outputs.

## Result

**PASS — Automation 042 v3.3 is installed and live-tested in PROD for the controlled Schmidt 2026-2027 enrollment, including first-run and replay behavior.**

The school-year gate-rule selection defect tracked by GitHub issue #97 is resolved for the controlled PROD path. Offline negative-path tests remain the evidence for stale/malformed/duplicate/inactive/fallback cases; they were part of the v3.3 repository implementation and verification suite.
