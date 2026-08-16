# PKG-038 — Streak and Shot Milestone XP Production packet

**Status:** Repository-ready draft; Production installation and testing are
blocked until Mike explicitly releases both PKG-006R and PKG-036 and confirms
there is no competing lifetime-XP observation window.

## Scope and ownership

| Stage | Sole owner |
|---|---|
| Submission Base XP | 010 (unchanged) |
| Streak occurrence topology | 053 v5.5 |
| Streak XP Event | 054 v5.8 |
| Shot milestone unlock eligibility | 066 v3.8 |
| Shot milestone XP Event | 059 v3.6 |
| Progression | 041 queues; 042 assigns |

No script in this packet sends email, invokes Make, writes progression fields,
or deletes an unlock, occurrence, or XP Event.

## Canonical identities

| Record | Exact identity |
|---|---|
| Streak occurrence | Enrollment + Achievement + threshold-reaching streak-end date |
| Streak XP Event | `STREAK_XP|<Enrollment ID>|<Achievement ID>|<Streak End Date>` |
| Shot milestone unlock | `SHOT_MILESTONE|<Enrollment ID>|<Shot Milestone ID>` |
| Shot milestone XP Event | same exact `SHOT_MILESTONE` key, linked to that unlock |

Different XP families may share an Enrollment, Submission, Week, or WAS. They
are never duplicates merely because they share those links.

## Read-only preflight

1. Save JSON from `audit-achievement-xp-pipeline-integrity.js`.
2. Record automation version, state, trigger, watched fields, and dynamic
   `recordId` mapping for 053, 054, 059, and 066.
3. Verify the selected Enrollment has exactly one Program Instance and Grade
   Band; selected Submissions have exact Enrollment and non-future dates.
4. Verify one canonical WAS for each positive XP Enrollment + Week.
5. Stop for duplicate canonical identity/source key, wrong-owner backlink,
   missing/multiple Week or WAS, inactive configuration ambiguity, or any
   existing active XP Event with a different source family.

## Required trigger contracts

| Automation | Table / reachability |
|---|---|
| 053 | Submissions, record updated; watched eligibility/identity fields must include Enrollment, Activity Date, `Count This Submission?`, and `Total Shots Counted`. It must run on positive, exclusion, date, and owner changes. |
| 054 | Streak Occurrences, record updated; watched fields include `Active?`, `Source Status`, Enrollment, Achievement, Week, Streak End Date, and XP Events. Do not require only `Source Status = Ready for XP`; inactive withdrawal must reach it. |
| 066 | Enrollments, `Run Shot Milestone Check?` checked; 010/reconciliation or Mike's controlled trigger must re-enter it after eligible shot-total changes. |
| 059 | Athlete Achievement Unlocks, lifecycle-reachable update/create configuration for `Active?`, `XP Award Status`, XP Events, Enrollment, Shot Milestone, Week, and Milestone Source Key. Perfect Week remains supported; never require a Shot Milestone filter. |

Every action input is the dynamic triggering Airtable record ID, never a fixed
`rec...` value.

## Paste and controlled proof order

1. Before pasting, record the installed version, trigger, dynamic mapping, and
   ON/OFF state for 053/054/059/066. Turn **OFF** only these four affected
   automations; do not touch 010, 041, or 042.
2. Paste 053 v5.5, then 054 v5.8, then 066 v3.8, then 059 v3.6 while they
   remain OFF. Save each trigger contract from this packet before enablement.
3. Run read-only preflight again with all four still OFF. Stop for any
   ownership, duplicate, WAS, or source-key finding.
4. Enable in dependency order: 053, then 054, then 066, then 059. After each
   enablement, record the ON state and do not advance if its trigger/mapping
   differs from this packet.
5. Only then begin the controlled fixture proof:
   - On one clean Schmidt fixture, prove a streak create, replay, middle-date
   withdrawal/split, restoration/rejoin, and same XP Event ID restoration.
   - Prove first and multi-threshold milestone creation; reduce current counted
   total below one then several thresholds; confirm exact unlocks/events become
   inactive without deletion; restore and confirm same IDs reactivate.
   - Wait for formula/rollup settlement, then save audit JSON proving WAS XP and
   lifetime XP decrease/restore. Observe 041 queue and 042 downstream result;
   do not manually write levels.
6. Stop immediately for any duplicate/wrong-owner error, missing/wrong WAS,
   stale active award, trigger non-reachability, email/Make activity, or
   unsettled formula that does not converge in the agreed observation window.

## Production closeout — 2026-08-16

**Status: COMPLETE — Production proof passed.** Mike released PKG-006R and PKG-036 with no competing XP observation window. The following automations are installed and ON: 053 v5.5, 054 v5.8, 066 v3.8, and 059 v3.6.

### Evidence completed

- Early Bird remained countable; Charlie’s August 14–16 counted submissions reused one canonical WAS.
- 053 created one active 3-day Streak Occurrence.
- 054 created exactly one 10-point Streak XP Event; replay produced no duplicate.
- 066 created one Shot Milestone unlock for the active 9–12 Starter threshold (3,000 shots / 25%).
- 059 processed the unlock into exactly one 10-point Shot Milestone XP Event.
- Final audit v2.1: 10 unlocks, 5 streak occurrences, 39 XP events, 3 weekly summaries, **issueTotal = 0**.
- Levels smoke test passed: 041 queued one Enrollment and 042 assigned Current Level Beginner / Next Level Rookie Shooter; recalculation cleared.

### Resume point

Do not change Early Bird dates. 118 v2.0 correctly skipped because no regular challenge Week ended on 2026-08-15. Leave 118 and 073 ON; the first real weekly-summary verification resumes after the first regular Week closes (expected May 8, 2027). Next non-time-dependent work is Perfect Week (057/058) readiness review.

## Rollback

Turn OFF only the failing affected automation. Preserve all records, source
keys, event IDs, run output, and audit JSON. Do not delete events or recreate
retired writers. Do not paste an obsolete script as rollback without explicit
approval. Re-run the read-only audit and record final ON/OFF state.
