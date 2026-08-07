# Level Recalculation and Gate Rule Audit

Date: 2026-08-06
Environment: PROD Airtable `appn84sqPw03zEbTT`

## Current Schmidt state

Active enrollment `recCyFEPeATOVNlr9`:

- School Year: 2026-2027
- Lifetime XP Total: 728
- Current Level: Rookie Shooter
- Next Level: Developing Shooter
- Level Status: Gate Blocked
- Gate Passes: 0
- Linked gate rule: Level 3 Gate `recrLcVfwPcWGflR2`
- Linked rule-set label: 2025-2026
- Level Recalc Needed?: not checked

Historical enrollment `recgP9qZYjAhE7NXm`:

- School Year: 2025-2026
- Lifetime XP Total: 791
- Current Level: Developing Shooter
- Next Level: Consistent Shooter
- Level Status: Gate Blocked
- Gate Passes: 0
- Linked gate rule: Level 4 Gate `recTxDTM9yEaZnbPS`

## Automation 042 defect

Repository version 3.2 builds a single active gate-rule map keyed only by Level record ID. It does not load or filter `Level Gate Rules.School Year / Rule Set`, nor does it read `Enrollments.School Year` when selecting rules.

Consequences:

1. The active 2026-2027 enrollment is evaluated with a rule labeled 2025-2026.
2. Adding a second active 2026-2027 rule for the same level would cause `Multiple active gate rules found for the same level` instead of selecting the enrollment-year rule.
3. The script cannot support parallel active rule sets by school year.
4. Automation 043 cannot repair this because 042 is the direct writer of Level Gate Rule and its own header says 043 should be turned off after 042 is proven.

Required repair:

- load Enrollment School Year;
- load Gate Rule School Year / Rule Set;
- select exactly one active rule for Level + intended rule set;
- define an explicit shared/default fallback policy;
- fail closed on multiple same-year matches;
- do not silently use a prior-year rule.

## Automation 041 coverage defect

Repository version 3.0 triggers only when an XP Event has Enrollment and positive XP Points.

It does not mark an Enrollment for recalculation when:

- an XP Event is deactivated;
- XP Points are reduced to zero or corrected downward;
- an XP Event Enrollment link changes;
- manual lifetime XP adjustments change;
- total submissions, homework, videos, Zoom attendance, or longest streak change;
- a gate rule threshold or active version changes.

Consequences:

- Current/Next Level and Gate Blocked status can remain stale after evidence is retired or corrected;
- the two Zoom XP fixtures retired on 2026-08-06 did not naturally request a level recalculation because their XP Points stayed positive while Active? changed false;
- gate progression may not refresh when a non-XP prerequisite changes.

Required repair:

- define all authoritative recalculation triggers;
- include XP activation/deactivation and point corrections;
- include manual XP adjustments;
- include gate-stat changes or a deterministic scheduled reconciliation;
- include gate-rule version/config changes;
- preserve a single writer for Current Level, Next Level, Level Gate Rule, Level Status, and Level Recalc Needed?.

## Completion status

No level-progression Completion Master item should advance based on the current scripts. 041 and 042 require repair, merge, actual Airtable editor paste, trigger verification, and controlled Schmidt tests.
