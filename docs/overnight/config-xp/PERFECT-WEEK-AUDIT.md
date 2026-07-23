# Perfect Week Audit

Overnight Agent 2 · 2026-07-23 · scripts: 057 (eligibility calc), 058 (unlock), 059 (XP).

## Rule wiring (confirmed against schema + scripts)

| Intended rule | Implementation | Status |
|---|---|---|
| Sunday–Saturday window | Weeks Start/End (Denver dateTime) + `requiredDailyCount: 7` in 057 | OK |
| Same-day submissions only | `Submitted Same Day?` formula compares `SET_TIMEZONE(Submitted At, "America/Denver")` date to Activity Date | OK — Denver-correct |
| Seven distinct qualifying dates | 057 distinct-date check over countable submissions | OK |
| Daily minimum = weekly goal / 7 | 057 L380 `Math.ceil(weeklyGoal / 7)`; goal from WAS `Weekly Goal Shots Target` (falls back) | OK; note fractional goals below |
| ≥ 3 qualifying videos | 057 `requiredVideoCount: 3` (hardcoded — config candidate) | OK functionally |
| Zoom required only when a meeting exists | 057 counts week's Zoom Meetings; requirement 0 when none | OK |
| XP = 100 from active rule | `PERFECT_WEEK` rule = 100, consumed via 058→059 | OK |
| Unlock once / XP once | Unlock Key + `PERFECT_WEEK|{enrollment}|{week}` source key | OK |

`Perfect Week Countable Submission?` (Submissions formula) additionally requires
`Count This Submission? = 1`, shots > 0, and Enrollment/Week/Activity Date present — correct gate
for the "countable" population.

## Live state

All Weekly Athlete Summary rows probed show `Perfect Week Eligible? = 0`, `Daily Check Status =
"Fail"` — consistent with historical data (no seven-day athletes) and the current single-week
season reset. No unlocks exist; nothing to reconcile.

## Defects / observations

1. **Weekly Goal Shots Target is fractional** (e.g. 888.888… = band target / 9 weeks), so the daily
   minimum is `ceil(888.89/7)=128`. Functionally fine; cosmetically odd in parent-facing detail
   strings ("Daily minimum: 128" is fine, but the weekly goal renders as 888.8888888888889 in raw
   fields). Display-side rounding decision only.
2. **057 UTC-slice date helper** — latent timezone inconsistency (details in
   XP-DATE-SOURCE-AUDIT #3; MIKE-ACTIONS #2). Safe today given date-only Activity Date and
   midnight-seeded Weeks.
3. `requiredVideoCount: 3` hardcode — config candidate (CONFIG-HARDCODE-AUDIT #1).
4. `XP Date Resolved` formula maps Perfect Week to `Date - Weekly Summary End` — matches "Week
   Saturday". OK.

## Test coverage added (`overnight-perfect-week.test.js`, 14 passing)

1500-shots-one-day dump fails · six of seven days fails · seven valid days passes · below-daily-
minimum day (excluded upstream) fails the week · two videos fail / three pass · no Zoom meeting →
met by default · meeting with no attendance fails · meeting with attendance passes · duplicate
rerun deterministic + source-key dedupe (`create` then `skip_existing`) · backdated qualifying
submission completes on recalc · out-of-week dates don't help · homework requirement respected ·
Sunday–Saturday window shape pinned.

Tests exercise the shared production helper `evaluatePerfectWeekEligibility` with
`requiredDailyCount: 7` (the lib default of 5 exists for the legacy Mon–Fri harness; 057 itself
uses 7 — noted so nobody mistakes the default for the product rule).

## Live construction

Building a live Perfect Week (7 consecutive same-day submissions with videos) is a week-long
real-time operation by definition — impossible overnight. The faithful fixture + offline suite
above is the substitute, per assignment §PACKAGE L.5.
