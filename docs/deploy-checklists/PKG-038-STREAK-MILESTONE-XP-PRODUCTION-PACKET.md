# PKG-038 — Streak and Shot Milestone XP Production packet

**Status:** Repository-ready draft; Production installation and testing are
blocked until Mike explicitly releases both PKG-006R and PKG-036 and confirms
there is no competing lifetime-XP observation window.

## Scope and ownership

| Stage | Sole owner |
|---|---|
| Submission Base XP | 010 (unchanged) |
| Streak occurrence topology | 053 v5.4 |
| Streak XP Event | 054 v5.8 |
| Shot milestone unlock eligibility | 066 v3.7 |
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

1. Paste 053 v5.4, then 054 v5.8, then 066 v3.7, then 059 v3.6. Leave
   010/041/042 unchanged.
2. Confirm ON/OFF state only after each matching trigger is recorded.
3. Run read-only preflight again.
4. On one clean Schmidt fixture, prove a streak create, replay, middle-date
   withdrawal/split, restoration/rejoin, and same XP Event ID restoration.
5. Prove first and multi-threshold milestone creation; reduce current counted
   total below one then several thresholds; confirm exact unlocks/events become
   inactive without deletion; restore and confirm same IDs reactivate.
6. Wait for formula/rollup settlement, then save audit JSON proving WAS XP and
   lifetime XP decrease/restore. Observe 041 queue and 042 downstream result;
   do not manually write levels.
7. Stop immediately for any duplicate/wrong-owner error, missing/wrong WAS,
   stale active award, trigger non-reachability, email/Make activity, or
   unsettled formula that does not converge in the agreed observation window.

## Rollback

Turn OFF only the failing affected automation. Preserve all records, source
keys, event IDs, run output, and audit JSON. Do not delete events or recreate
retired writers. Do not paste an obsolete script as rollback without explicit
approval. Re-run the read-only audit and record final ON/OFF state.
