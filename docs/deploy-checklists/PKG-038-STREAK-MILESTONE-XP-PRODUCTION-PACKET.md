# PKG-038 — Streak and Shot Milestone XP Production packet

**Status:** Repository-ready operator package — Production installation requires Mike approval after [do-not-proceed gate](./PKG-038-DO-NOT-PROCEED-GATE.md).  
**Closeout index:** [PKG-038-CLOSEOUT.md](./PKG-038-CLOSEOUT.md)  
**Last updated:** 2026-08-16

PKG-006R and PKG-036 are **complete** (2026-08-15). This packet no longer cites them as paste blockers — Mike still must explicitly release PKG-038 and confirm no competing lifetime-XP observation window.

## Scope and ownership

| Stage | Sole owner |
|---|---|
| Submission Base XP | 010 (unchanged) |
| Streak occurrence topology | 053 **v5.5** |
| Streak XP Event | 054 **v5.8** |
| Shot milestone unlock eligibility | 066 **v3.8** |
| Shot milestone XP Event | 059 **v3.6** |
| Progression | 041 queues; 042 assigns |

No script in this packet sends email, invokes Make, writes progression fields, or deletes an unlock, occurrence, or XP Event.

## Package documents

| Doc | Use |
|-----|-----|
| [Field dependency sheet](./PKG-038-FIELD-AND-TABLE-DEPENDENCY-SHEET.md) | Tables, fields, types, writers |
| [Version audit](./PKG-038-REPOSITORY-VS-PRODUCTION-VERSION-AUDIT.md) | Repo vs PROD + uncertainty |
| [Do not proceed gate](./PKG-038-DO-NOT-PROCEED-GATE.md) | Stop conditions |
| [Paste 053](./PKG-038-PASTE-053-v5.5.md) | Copy-ready |
| [Paste 054](./PKG-038-PASTE-054-v5.8.md) | Copy-ready |
| [Paste 066](./PKG-038-PASTE-066-v3.8.md) | Copy-ready |
| [Paste 059](./PKG-038-PASTE-059-v3.6.md) | Copy-ready |
| [Schmidt test plan](./PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md) | Controlled proof |
| [Evidence checklist](./PKG-038-EVIDENCE-CHECKLIST.md) | Before/after IDs |
| [Rollback](./PKG-038-ROLLBACK-PLAN.md) | Script-only revert |

## Canonical identities

| Record | Exact identity |
|---|---|
| Streak occurrence | Enrollment + Achievement + threshold-reaching streak-end date |
| Streak XP Event | `STREAK_XP|<Enrollment ID>|<Achievement ID>|<Streak End Date>` |
| Shot milestone unlock | `SHOT_MILESTONE|<Enrollment ID>|<Shot Milestone ID>` |
| Shot milestone XP Event | same exact `SHOT_MILESTONE` key, linked to that unlock |

Different XP families may share an Enrollment, Submission, Week, or WAS. They are never duplicates merely because they share those links.

## Read-only preflight

1. Save JSON from `audit-achievement-xp-pipeline-integrity.js` (v2.1).
2. Record automation version, state, trigger, watched fields, and dynamic `recordId` mapping for 053, 054, 059, and 066.
3. Verify the selected Enrollment has exactly one Program Instance and Grade Band; selected Submissions have exact Enrollment and non-future dates.
4. Verify one canonical WAS for each positive XP Enrollment + Week.
5. Stop for duplicate canonical identity/source key, wrong-owner backlink, missing/multiple Week or WAS, inactive configuration ambiguity, or any existing active XP Event with a different source family.

## Required trigger contracts

| Automation | Table / reachability |
|---|---|
| 053 | Submissions, record updated; watched eligibility/identity fields must include Enrollment, Activity Date, `Count This Submission?`, and `Total Shots Counted`. It must run on positive, exclusion, date, and owner changes. |
| 054 | Streak Occurrences, record updated; watched fields include `Active?`, `Source Status`, Enrollment, Achievement, Week, Streak End Date, and XP Events. Do not require only `Source Status = Ready for XP`; inactive withdrawal must reach it. |
| 066 | Enrollments, `Run Shot Milestone Check?` checked; 010/reconciliation or Mike's controlled trigger must re-enter it after eligible shot-total changes. |
| 059 | Athlete Achievement Unlocks, lifecycle-reachable update/create configuration for `Active?`, `XP Award Status`, XP Events, Enrollment, Shot Milestone, Week, and Milestone Source Key. Perfect Week remains supported; never require a Shot Milestone filter. |

Every action input is the dynamic triggering Airtable record ID, never a fixed `rec...` value.

## Paste and controlled proof order

1. Before pasting, record the installed version, trigger, dynamic mapping, and ON/OFF state for 053/054/059/066. Turn **OFF** only these four affected automations; do not touch 010, 041, or 042.
2. Paste **053 v5.5**, then **054 v5.8**, then **066 v3.8**, then **059 v3.6** while they remain OFF. Use individual paste packets; save each trigger contract before enablement.
3. Run read-only preflight again with all four still OFF. Stop for any ownership, duplicate, WAS, or source-key finding.
4. Enable in dependency order: **053 → 054 → 066 → 059**. After each enablement, record the ON state and do not advance if its trigger/mapping differs from this packet.
5. Execute [PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md](./PKG-038-PRODUCTION-TEST-PLAN-SCHMIDT.md) on Enrollment `recCyFEPeATOVNlr9`.
6. Stop immediately for any duplicate/wrong-owner error, missing/wrong WAS, stale active award, trigger non-reachability, email/Make activity, or unsettled formula that does not converge in the agreed observation window.

## Rollback

See [PKG-038-ROLLBACK-PLAN.md](./PKG-038-ROLLBACK-PLAN.md). Turn OFF only the failing affected automation. Preserve all records, source keys, event IDs, run output, and audit JSON. Do not delete events or recreate retired writers. Do not paste an obsolete script as rollback without explicit approval.
