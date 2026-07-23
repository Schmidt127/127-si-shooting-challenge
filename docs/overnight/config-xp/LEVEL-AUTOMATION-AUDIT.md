# Level Automation Audit — 041 / 042 (043 retired)

Overnight Agent 2 · 2026-07-23

## Ownership confirmation

| Field (Enrollments) | Owner | Verified |
|---|---|---|
| Level Recalc Needed? | 041 sets → 042 clears | code review |
| Current Level | **042** | code review + live: Schmidt = Beginner |
| Next Level | **042** | live: Rookie Shooter |
| Level Gate Rule | **042** | live: "Level 2 Gate" `reccFKwOVHZ3hn36i` |
| Level Status | **042** | live: "Assigned" |
| Gate diagnostic fields (`Meets Gate: *`, `Gate Minimum: *`) | Airtable formulas/lookups fed by 042's Level Gate Rule link | live: all 1/[0] for Schmidt |

**043 retirement confirmed:** deleted from PROD (per assignment facts), 042 writes every field 043
used to own, and the live Schmidt enrollment shows a complete, consistent 042 write-set. No repo
document should list 043 as required; the completion master row for 043-era level assignment should
reference 042 only. Not restored.

## Behavior verification (code review + offline tests)

All items below are covered by `lib/overnight-level-gate-boundaries.test.js` (23 tests, passing),
which exercises the shared production helpers `evaluateGate`, `determineAllowedLevelWithGateBlocking`,
and the new `buildGateRuleMap` with fixtures mirroring live PROD levels/gates:

- no XP → Beginner; exact threshold (200) advances; ±1 point boundaries correct
- first gated level (rank 7 Deadeye, 1200 XP): unmet gate blocks with reason "Submissions 0/30…"
- gate exactly met / exceeded → advances
- Current Level cannot advance past an unmet gate even at 2200 XP
- requirement drop after assignment → rolls back to highest passable level (rerun-consistent)
- next level + next gate rule exposure when unblocked (042 writes the next level's gate rule)
- highest level: next level and gate rule null at G.O.A.T.
- missing gate rule → level treated as ungated (explicit reason)
- duplicate active gate rules → **throws** (buildGateRuleMap; mirrors 042's guard)
- changed Zoom / homework / video / streak counts flip block↔clear at exact boundaries
- rerun with identical inputs → identical output (no oscillation)

## Recalc-loop analysis

- 041 triggers on XP-event-driven conditions and only sets the flag when unset — no repeated marking.
- 042 clears the flag as part of its write batch; 042's own field writes do not re-trigger 041 (041's
  trigger watches XP changes, not level fields). No infinite loop path found in code review.
- 042 skips writes when values are unchanged (write-if-different), which prevents automation churn.

## Zoom counting

042 composes combined Zoom credit (live attendance + recording credit) subject to the Config-table
recording flags. Because the Config table currently has 4 conflicting records (see
CONFIG-HARDCODE-AUDIT #12), the effective flag set depends on which record 042's lookup resolves.
This is the single highest-risk configuration input to 042 → MIKE-ACTIONS #1.

## Defects / risks

1. Config-record ambiguity feeding recording-credit flags (above). Decision needed, not a code bug.
2. No duplicate active gate rules exist in PROD today; 042 + lib both fail loudly if introduced.
3. No rollback anomaly found: level regression on stat loss is by design (athlete keeps XP, loses
   gated level until stats recover) — flagged for Mike awareness only because parents may notice.

## Live PROD test (read-only)

Schmidt (61 XP, zero gate stats): Current=Beginner, Next=Rookie Shooter, Gate Rule=Level 2 Gate,
Status=Assigned. Matches offline engine output for identical inputs ("Schmidt live shape" test).
Fabricating XP to force a live level-up was skipped — cleanup of XP events plus recalc cascade is
not safely reversible unattended (documented stop condition).
