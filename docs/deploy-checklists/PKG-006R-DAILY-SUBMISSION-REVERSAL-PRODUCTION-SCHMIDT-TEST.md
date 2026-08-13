# PKG-006R — Daily Submission reversal Production Schmidt packet

**Status:** Mike-only Production packet; no Production action was performed.
**Unified sequence:** Use [`PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md`](./PKG-006R-PKG-036-PRODUCTION-OPERATOR-PACKET.md) as the single current operator source. This file retains PKG-006R detail only.
**Owner:** Mike performs every Production step.
**Scope:** Submission XP, milestones, streaks, WAS/lifetime settlement, progression, and standings. Email testing is excluded.

## Hard stops

- Do not access Production through an agent.
- Agents do not create fields, change formulas, alter triggers, enable/disable automations, or delete records.
- Do not delete XP Events, unlocks, streak occurrences, or WAS rows.
- Stop on duplicate canonical keys, ambiguous ownership, wrong Enrollment/Week/WAS, formula timeout, or unexpected email activity.
- This packet is not proof that the current positive-only writers can automatically reverse awards.

## Approved schema and trigger prerequisite

Mike has installed and verified the 12 PKG-006R reconciliation fields per
[`airtable/schema/current/daily-submission-xp-reconciliation-fields.md`](../../airtable/schema/current/daily-submission-xp-reconciliation-fields.md).
**Verify** exact field names and types before testing; do not recreate.

Automation **010 v10.7** is installed and **OFF** after HF-001. Paste and
prove **v10.8** before re-enabling the `Reconciliation Needed? = 1` trigger
with dynamic `recordId`. **First action:** inspect 010 run history and the
current reconciliation backlog before modifying records. Lifecycle proof
(replay, withdrawal/restoration, settled totals, natural-trigger evidence)
remains pending. The unified operator packet is authoritative for this state.

## Current repository versions and ownership

| Function | Repository owner | Current repository state |
|---|---|---|
| Submission Base XP | 010 | Canonical positive/correction writer; installation and trigger proof pending |
| Streak rebuild / XP | 053 → 054 | 054 exact-owned inactive-event correction; 053 transition reachability remains blocked |
| Shot milestone / XP | 066 → 059 | Positive threshold path; explicit fail-closed threshold-loss boundary |
| WAS | 031 (with 101/118 competing creation paths) | Exact candidate validation/requery; concurrency evidence required |
| Progression | 041 → 042 | Downstream recalculation only |
| Read-only audit | `audit-counted-submission-xp-standings-reliability.js` | No writes; does not claim trigger proof |

Confirm installed Production versions and triggers in Airtable before testing. Repository text does not prove live configuration.

## Preflight

1. Mike runs the read-only counted-submission audit and saves its JSON.
2. Select one valid counted Schmidt Submission and record Submission, Enrollment, Week, WAS, XP Event, milestone unlock, streak occurrence, and Program Instance IDs.
3. Confirm exactly one canonical WAS for Enrollment + Week and exactly one `SUBMISSION_XP|{Submission ID}` event.
4. Capture installed versions, enablement, trigger conditions, and recent run history for 010, 031, 041, 042, 053, 054, 059, and 066.
5. Prevent email handoff/send paths from dispatching during the test. Do not modify email records as a test shortcut.

## Positive and replay proof

1. Verify countability, positive counted shots, active Enrollment, exact Week, and exact Program Instance.
2. Verify one active Submission XP event with exact key and links.
3. Cross a configured shot-milestone threshold; verify one unlock and one XP Event with canonical ownership.
4. Use consecutive counted dates to create/continue a streak; verify same-day duplicates count once.
5. Allow formulas/rollups to settle; verify WAS weekly XP, Enrollment lifetime XP, 041 queue, 042 settlement, and Production leaderboard view membership.
6. Replay the same Submission and rerun relevant positive paths. Require identical event/unlock/occurrence IDs and no duplicate Source Keys.

## Reversal and restoration proof

This section remains Mike-only and requires the schema/trigger prerequisite
above. Automation 010 now contains the repository canonical writer. Any
validation is controlled Production-only work performed manually by Mike using
existing Schmidt test records; no offline test proves that an installed
Production trigger fires.

When that prerequisite is approved:

1. Make the Submission uncountable using an approved controlled condition (duplicate review, invalid stats, future date, or removed Week).
2. Require the same canonical Submission XP Event to become inactive where no longer earned; no replacement or deletion. For milestone/streak rows, stop if the installed source transition does not reach 053/054 or 066/059; the repository explicitly fails closed rather than choosing a replacement.
3. Confirm weekly/lifetime totals settle downward and 041 → 042 recalculates.
4. Restore the exact Submission identity and require the same event IDs and Source Keys to reactivate.
5. Repeat with an independent later Submission that still supports a milestone or streak; require that independent support to remain active.

## Negative matrix

Stop and preserve evidence for: duplicate Submission XP key, duplicate WAS, wrong owner, wrong Week/WAS, inactive Enrollment, future date, missing/ambiguous WAS, formula lag beyond the approved bound, partial failure, retry duplication, or concurrent creation. Do not select a winner automatically.

## Rollback

1. Stop new test triggers and preserve run history.
2. If an award is wrong, deactivate the exact owned XP Event; never delete or create a replacement.
3. Rerun the read-only audit and wait for rollup settlement.
4. Let 041/042 settle through their canonical ownership.
5. If approved restoration is needed, reactivate the same event ID and rerun the audit.
6. If trigger behavior is unsafe, Mike turns the affected automation OFF and leaves the records intact. No agent performs this action.

## Evidence still required from Mike

- Natural-trigger proof for the installed versions.
- Exact Production IDs and before/after snapshots.
- Formula/rollup settlement timestamps.
- Same-event withdrawal/restoration proof.
- Production `Web - Leaderboard` membership.
- Any approved Submission reconciliation schema and trigger design.
- Evidence that 053 discovers stale streak occurrences and re-arms 054 for
  restoration, or an approved follow-up trigger for that transition.
- Evidence that 066/059 receive an observable milestone eligibility transition;
  absent that evidence, milestone withdrawal remains blocked.
