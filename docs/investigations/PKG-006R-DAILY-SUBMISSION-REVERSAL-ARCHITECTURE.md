# PKG-006R — Daily Submission XP reversal architecture

**Status:** Approved Phase 3 repository contract; schema installation and Production proof remain Mike-owned.
**Baseline:** `master` / `2b43ebcc8d7efe18da2f2c33459ea77f29bbfa66`
**Scope:** Submission Base XP, shot milestones, streak XP, Weekly Athlete Summary, lifetime XP, progression, and standings inputs. Email is out of scope.

## Evidence boundary

This is repository evidence only. No agent accessed Airtable or Production. The supplied Homework evidence proves the analogous Homework lifecycle, but does not prove the daily-submission lifecycle. Existing repository tests and audits are not natural-trigger or Production proof.

## Ownership map

| Stage | Canonical owner | Canonical identity | Current correction state |
|---|---|---|---|
| Countability / Week | formula + 005/007 | Submission ID | Formula changes can make an existing award invalid; no reversal trigger is evidenced |
| Submission Base XP | 010 | `SUBMISSION_XP\|{Submission ID}` | Phase 3 writer now owns positive/correction reconciliation, exact-key recheck, same-event state, latch settlement |
| Weekly Athlete Summary | 031, with competing 101/118 creation paths | Enrollment + Week | Requery/fail-closed behavior exists, but a uniqueness race remains possible |
| Shot milestones | 066 unlock → 059 XP | `SHOT_MILESTONE\|{Enrollment ID}\|{Milestone ID}` | Positive threshold path remains canonical; 066/059 explicitly fail closed because no observable unlock eligibility transition is owned |
| Streaks | 053 occurrence → 054 XP | `STREAK_XP\|{Enrollment ID}\|{Achievement ID}\|{Streak End Date}` | 054 can deactivate an exactly owned inactive occurrence event; 053 has no safe source transition trigger for automatic stale-occurrence discovery |
| Lifetime XP | Airtable rollups | Enrollment-linked active XP | Depends on upstream Active? correction and formula settlement |
| Progression | 041 → 042 | Enrollment recalculation signature | No direct XP writer; can settle only after upstream events are corrected |
| Standings | Airtable view + web query | active Enrollment and view inputs | View membership is not provable from repository code |

Identical display names are not duplicate proof. Duplicate review must use Source Key, canonical source links, Enrollment, Week, Active?, and ownership.

## Approved observable trigger contract

The approved multi-field signature chain is documented in
[`airtable/schema/current/daily-submission-xp-reconciliation-fields.md`](../../airtable/schema/current/daily-submission-xp-reconciliation-fields.md).
Its creation order is Enrollments signature, Weeks signature, XP Events
signature, Submission lookups, Submission current signature, writable latch,
then numeric `Reconciliation Needed?`. Automation 010 owns the dynamic
Submission `recordId` trigger when that formula equals `1`, both positive and
correction branches, exact-key recheck, fail-closed cardinality/ownership,
same-event deactivate/reactivate, bounded formula settlement, and post-write
latch acknowledgement.

This package does not install fields or claim native trigger proof because no
live schema export or controlled Production trigger test is available in the
repository-only environment. The contract is explicit so the canonical writer
can be implemented and tested against the approved field names without
inventing installed IDs.

## Defect list

1. **P0 — Installed trigger/schema status is unverified.** The repository writer now implements the approved contract, but repository text cannot prove that fields and the dynamic trigger are installed.
2. **P1 — Milestone reversal is incomplete.** 066/059 do not fully reconcile a previously earned threshold after counted shots fall.
3. **P1 — Streak reversal remains trigger-blocked.** 054 deactivates an exact owned event when invoked on an inactive occurrence, but 053 does not have an observable source transition that safely discovers every stale occurrence; restoration requires 053 to re-arm 054.
4. **P1 — Trigger/schema installation evidence is missing.** The repository now records the approved signal, but no agent may create fields, enable the trigger, or claim natural-trigger proof.
5. **P1 — Summary concurrency remains possible.** 031, 101, and 118 use check-then-create patterns. They detect conflicts after the fact but cannot provide Airtable uniqueness.
6. **P2 — Formula lag can be mistaken for zero.** 041/042 and rollups need settled rereads before progression conclusions.
7. **P2 — Inactive Enrollment behavior is not globally reconciled.** Downstream correction must deactivate awards when policy says an Enrollment is no longer eligible.

## Safe draft package

This Phase 3 package adds the approved schema contract, the 010 canonical
writer, bounded 054 same-event correction handling, explicit 053/066/059
fail-closed boundaries, read-only audit coverage, offline lifecycle/
concurrency coverage, and a Mike-only Production packet. Offline orchestration
tests are contract evidence only; they are not proof of installed Airtable
triggers.

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

- Mike's field creation and trigger installation using the exact approved order.
- Mike's approved Production-only schema/trigger decision and manually captured natural-trigger evidence for linked/formula transitions; offline tests are not proof of installed Production triggers.
- Installed versions/triggers for 010, 053, 054, 059, 066, 041, and 042.
- Controlled Schmidt evidence for positive create, exclusion withdrawal, milestone/streak reversal, and same-event restoration.
- Current formula/rollup settlement behavior and Production `Web - Leaderboard` membership.
