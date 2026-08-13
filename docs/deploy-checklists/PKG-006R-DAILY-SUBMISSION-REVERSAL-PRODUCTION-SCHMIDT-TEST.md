# PKG-006R — Daily Submission reversal Production Schmidt packet

**Status:** Draft, Production-only operator packet; no Production action was performed.  
**Owner:** Mike performs every Production step.  
**Scope:** Submission XP, milestones, streaks, WAS/lifetime settlement, progression, and standings. Email testing is excluded.

## Hard stops

- Do not access Production through an agent.
- Do not create fields, change formulas, alter triggers, enable/disable automations, or delete records under this draft.
- Do not delete XP Events, unlocks, streak occurrences, or WAS rows.
- Stop on duplicate canonical keys, ambiguous ownership, wrong Enrollment/Week/WAS, formula timeout, or unexpected email activity.
- This packet is not proof that the current positive-only writers can automatically reverse awards.

## Current repository versions and ownership

| Function | Repository owner | Current repository state |
|---|---|---|
| Submission Base XP | 010 | Positive creation/replay; reversal reachability unresolved |
| Streak rebuild / XP | 053 → 054 | Positive rebuild/repair; stale reversal unresolved |
| Shot milestone / XP | 066 → 059 | Positive threshold path; threshold-loss reversal unresolved |
| WAS | 031 (with 101/118 competing creation paths) | Exact candidate validation/requery; concurrency evidence required |
| Progression | 041 → 042 | Downstream recalculation only |
| Read-only audit | `audit-counted-submission-xp-standings-reliability.js` | No writes |

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

This section is currently blocked until Mike approves and installs a reachable transition-based correction trigger in DEV and then Production.

When that prerequisite is approved:

1. Make the Submission uncountable using an approved controlled condition (duplicate review, invalid stats, future date, or removed Week).
2. Require the same canonical Submission XP Event, milestone XP, and streak XP to become inactive where no longer earned; no replacement or deletion.
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
