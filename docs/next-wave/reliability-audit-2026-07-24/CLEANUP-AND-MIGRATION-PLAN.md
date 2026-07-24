# Cleanup classification + safe migration plan

**Date:** 2026-07-24  
**Rule:** No production deletes, renames, type changes, or primary-field changes in this pass.

| Class | Examples |
|-------|----------|
| Keep | Source Key, Summary Key, weekly email package + Make writeback, Enrollment↔Config, Week keys `2026-2027\|Week N` |
| Legacy | `HOMEWORK_COMPLETION\|` XP keys; Drive URL bridge; 063/111 GitHub scripts |
| Do not use | 112 VF create path; TST inactivity fields |
| Candidate retirement | 043 after 042 soak; operator 008/061/078 without GitHub |
| Unknown | Weekly Threshold XP mint path; Make-only fields |

## Safe migration template

1 snapshot → 2 add new field → 3 dual-write → 4 cut readers → 5 hide old → 6 never delete without Mike auth. Document writers/readers/formulas/scripts/views/Make/rollback/verification for each change.

## Annual Config/Week

Expect 2026–2027 Weeks linked to correct Config; WAS via Enrollment+Week; XP via Enrollment link. Forms default Config: verify in OMNI (unverified here).
