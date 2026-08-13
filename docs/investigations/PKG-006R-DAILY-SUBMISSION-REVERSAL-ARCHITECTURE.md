# PKG-006R — Daily Submission XP reversal architecture

**Status:** Draft implementation package; automatic correction is blocked pending an approved observable trigger/schema design.  
**Baseline:** `master` / `2f8188bc22b4075fdf24b5d6ed80fc175aa16f72`  
**Scope:** Submission Base XP, shot milestones, streak XP, Weekly Athlete Summary, lifetime XP, progression, and standings inputs. Email is out of scope.

## Evidence boundary

This is repository evidence only. No agent accessed Airtable or Production. The supplied Homework evidence proves the analogous Homework lifecycle, but does not prove the daily-submission lifecycle. Existing repository tests and audits are not natural-trigger or Production proof.

## Ownership map

| Stage | Canonical owner | Canonical identity | Current correction state |
|---|---|---|---|
| Countability / Week | formula + 005/007 | Submission ID | Formula changes can make an existing award invalid; no reversal trigger is evidenced |
| Submission Base XP | 010 | `SUBMISSION_XP\|{Submission ID}` | Positive create/replay only; existing event is not deactivated when countability becomes false |
| Weekly Athlete Summary | 031, with competing 101/118 creation paths | Enrollment + Week | Requery/fail-closed behavior exists, but a uniqueness race remains possible |
| Shot milestones | 066 unlock → 059 XP | `SHOT_MILESTONE\|{Enrollment ID}\|{Milestone ID}` | Rebuild/positive threshold path exists; later threshold loss has no complete event lifecycle |
| Streaks | 053 occurrence → 054 XP | `STREAK_XP\|{Enrollment ID}\|{Achievement ID}\|{Streak End Date}` | Positive rebuild/repair exists; stale occurrences and backdated key changes remain open |
| Lifetime XP | Airtable rollups | Enrollment-linked active XP | Depends on upstream Active? correction and formula settlement |
| Progression | 041 → 042 | Enrollment recalculation signature | No direct XP writer; can settle only after upstream events are corrected |
| Standings | Airtable view + web query | active Enrollment and view inputs | View membership is not provable from repository code |

Identical display names are not duplicate proof. Duplicate review must use Source Key, canonical source links, Enrollment, Week, Active?, and ownership.

## Defect list

1. **P0 — Submission reversal is unreachable.** Automation 010 is positively filtered on `Count This Submission?`; it cannot reliably run when a counted Submission later becomes excluded, invalid, future-dated, or loses its Week.
2. **P1 — Milestone reversal is incomplete.** 066/059 do not fully reconcile a previously earned threshold after counted shots fall.
3. **P1 — Streak reversal is incomplete.** 053/054 do not fully deactivate stale occurrence XP, and backdated repairs can change the end-date key.
4. **P1 — Trigger/schema evidence is missing.** Unlike PKG-007, no Mike-approved writable reconciliation signal exists for Submissions. Existing formula/lookups are not safe command fields.
5. **P1 — Summary concurrency remains possible.** 031, 101, and 118 use check-then-create patterns. They detect conflicts after the fact but cannot provide Airtable uniqueness.
6. **P2 — Formula lag can be mistaken for zero.** 041/042 and rollups need settled rereads before progression conclusions.
7. **P2 — Inactive Enrollment behavior is not globally reconciled.** Downstream correction must deactivate awards when policy says an Enrollment is no longer eligible.

## Safe draft package

The current draft adds only read-only audit and offline lifecycle coverage plus a Mike-only Production packet. It deliberately leaves 010, 053, 054, 059, and 066 positive writers unchanged. An audit or manual backfill is not presented as automatic app correctness.

The future correction package may be implemented only after Mike approves:

1. A writable, transition-based reconciliation signal on Submissions (or an equivalent existing field proven to observe all relevant linked/formula changes).
2. Trigger semantics that reach both eligible restoration and ineligible withdrawal without positive-only filtering or scheduled polling.
3. Exact ownership and duplicate policy for Submission, milestone, and streak events.
4. DEV schema/test proof before any Production paste.

Conditional writer order after that approval is `010` → `053`/`066` → `054`/`059`, followed by 041/042 settlement. No current Production paste order exists for correction writers.

## Required lifecycle contract

- Preserve canonical XP Event rows.
- On invalidation, set only the exact owned event `Active? = false`; never delete.
- On restoration, reactivate the same event ID and Source Key.
- Fail closed on ambiguous identity, duplicate canonical keys, wrong Enrollment/Week/WAS, inactive Enrollment, future date, or missing/ambiguous canonical WAS.
- Never steal an event owned by another source.
- Recalculate totals and progression through canonical owners; do not make 041/042 direct XP writers.
- Preserve exact Enrollment, Submission, Week, WAS, Program Instance, and source ownership.

## Open decisions / evidence Mike must provide

- Approved Submission reconciliation field/trigger design and exact field creation order.
- DEV schema and natural-trigger proof for linked/formula transitions.
- Installed versions/triggers for 010, 053, 054, 059, 066, 041, and 042.
- Controlled Schmidt evidence for positive create, exclusion withdrawal, milestone/streak reversal, and same-event restoration.
- Current formula/rollup settlement behavior and Production `Web - Leaderboard` membership.
