# PKG-039 — Weekly Athlete Summary and Weekly Goal Integrity

**Status:** Mike-only DEV-first and Production packet — not executed by this package
**Repository baseline:** `b10c93432a7e7bc0a04ada2c39aeca7e8f49e8db` plus the PKG-039 PR head
**Production boundary:** No record, schema, automation, trigger, email, or lock change was made while preparing this packet.

## Exact target scripts, OFF/ON sequence, and schema change

This is a Mike-operated Production packet only after the same committed files
pass the listed DEV proofs. Repository tests do not constitute Production proof.

| Paste order | Automation | Target version | Required trigger/input |
|---:|---|---|---|
| 1 | 031 | v4.1 | Counted `Submissions`; dynamic `recordId` |
| 2 | 032 | v3.4 | Eligible `Weekly Athlete Summary`; dynamic `recordId` |
| 3 | 057 | v1.7 | Perfect Week recalculation; dynamic `recordId` |
| 4 | 058 | v1.1 | Perfect Week Eligible + Ready; dynamic `recordId` |
| 5 | 076 | v8.6 | `Build Daily Email Now?` checked; dynamic `recordId` |
| 6 | 101 | v6.3 | `Zoom XP Reconciliation Needed? = 1`; dynamic `recordId` |
| 7 | 118 | v1.9 | Scheduled Sunday 05:00 America/Denver; inputs `dryRun`, `sendMode`, `excludedEnrollmentIds`, `includeSchmidt`, `emptyWeekPolicy` |

1. Capture the current ON/OFF state and trigger/input screenshots. Turn **OFF**
   031, 032, 057, 058, 076, 101, and 118 before pasting; leave 068 OFF.
2. For isolated DEV proof, also turn OFF 072, 079, 119, 074, and the relevant
   Make scenarios. Do not clear readiness checkboxes as cleanup.
3. Paste each committed script in the listed order (from docblock through end;
   omit its GitHub header), confirm the exact trigger/input, then leave it OFF
   until its preceding proof passes.
4. Enable only 031 then 032 for canonical WAS/goal proof; enable 057 then 058
   for Perfect Week proof; enable 076 and 101 only for their isolated fixtures;
   enable 118 last, first with `dryRun=true`. Restore the captured ON/OFF state
   only after all stop conditions remain clear. Production activation is
   Mike-only after DEV evidence and approval.

### Required `Target Goal Shots.Program Instance` field

In DEV first, create **`Program Instance`** on table **`Target Goal Shots`
(`tbleCfuAt3rY8unU3`)** as a **linked-record** field to **`Program Instance -
Sync` (`tblMfALZa4YYUy70P`)**. Allow multiple links at the Airtable field level
only if the UI requires it; the contract requires exactly one link for every
active usable goal. Do not alter the two formula fields until their existing
formula text has been exported. Update the canonical `Goal Key` formula so its
identity includes the linked Program Instance record identity and Grade Band
record identity; it must not depend solely on display names. Re-read the
formula/lookup fields after settling before enabling a consumer.

### Exact Production-safe goal linking plan

After the read-only audit confirms the field type and the target Program
Instance, link **only** these active goal records to
`rec5mEM0YPqPqq0hZ` (`Shooting Challenge | 2026-2027`):

- `reczG19bSB6Aa3VbV` (K-2 / 2,000)
- `recQJRxpaBgwN42Un` (3-4 / 5,000)
- `rec8PrnFaiKaCKtAb` (5-6 / 8,000)
- `rechFso6HRLhqalFa` (7-8 / 10,000)
- `recHE7FhreD1jqfXm` (9-12 / 12,000)

Keep `recm56DTvRRfDuZUN` and `recFTY07yug9AC1YM` inactive. Do not link,
reactivate, or otherwise alter either historical variant without a separately
approved change.

## Evidence boundary and known warnings

Repository source and dated packets do not prove the current Production cause of
`weekly_goal_missing_goal_record`, WAS `receNfggQO9HtWCkr`, or WAS
`reccjwScvAODZnRpM`. `receNfggQO9HtWCkr` appears only as a historical
Homework XP packet reference. The other ID has no repository evidence. Before
changing either row, run the read-only audit and capture the source links,
Program Instance, School Year, Week, Grade Band, Goal Record, and calculated
fields. Classify the result as one of: missing configuration, wrong owner,
missing backlink, formula/lookup lag, wrong Program Instance, wrong Week,
missing grade-band goal, multiple configurations, or expected test data.

Blank/malformed lookup/formula values are **formula unsettled/invalid**, not
configured zero. Zero is valid only when exactly one applicable active goal has
an explicit numeric `Total Shot Target = 0`. Wrong Program Instance, school
year, week, grade band, inactive goals, and multiple candidates are ineligible.

## Canonical ownership map

| Function | Owner | Contract |
|---|---|---|
| Submission Week | `005` | Exact Enrollment Program Instance and date-derived Week. |
| Canonical WAS create/link/Submission backlink | `031` | Exact one Submission Enrollment + Week; exact Program Instance; formula Summary Key; post-create recheck. |
| Grade Band | `030` | Supporting WAS context writer; does not create WAS. |
| Goal link | `032` | Exactly one active, explicit numeric Target Goal Shots record for the WAS Enrollment Program Instance + Grade Band. No Week match. |
| Homework and Homework Completion backlink | `033` | Exact WAS Enrollment + Week + Program Instance; absorbs retired `068`. |
| Submission Base XP / its WAS link | `010` | Source key `SUBMISSION_XP|{Submission}`; not repaired by `031`. |
| Non-Submission-Base XP/WAS backlink repair | `031` | Exact Enrollment + Week; blank or precisely proven stale link only. |
| Threshold XP / goal consumer | `035` | Consumes settled WAS goal state; does not configure a goal. |
| Perfect Week eligibility/unlock | `057` / `058` | Consumers only; no WAS create. |
| Zoom XP | `101` | Resolves/links one existing canonical WAS for Zoom; never creates a WAS. |
| Video XP | `114` | XP owner; requires exact Video Feedback identity; no WAS create. |
| Weekly email schedule | `118` | Filters excluded/inactive rows, then resolves/arms one existing canonical WAS; never creates a WAS. |
| Weekly email builder | `072` | Consumer only. Does not create WAS or send Make webhook. |
| Daily email readiness | `031` → `076` | `031` only arms after final WAS validation; `076` consumes/clears. |

`068` is retired and must remain OFF. **031 is the only create-capable WAS
writer.** The canonical identity is exactly one `Weekly Athlete Summary`
per **Enrollment record ID + Week record ID**; both records must resolve to the
same Program Instance and the Enrollment must be in its correct School Year.
`Summary Key` is a formula verification signal, never a writable substitute for
those links.

## Required schema and trigger attestation

Before paste, Mike confirms field existence/type from Airtable UI: exact linked
`Enrollment` and `Week` on Submissions/WAS/XP Events; `Summary Key`,
`Enrollment Key`, and `Week Key` formulas; writable WAS `Submissions`,
`Goal Record`, and `Homework`; `Enrollments.Active?`; Program Instance links;
WAS Grade Band; Target Goal Shots Grade Band, Active?, and numeric Total Shot
Target; all formula/rollup fields used by 035/057/072. Do not create or rename
fields.

Confirm live installed version/trigger/inputs for `005`, `010`, `030`, `031`,
`032`, `033`, `035`, `057`, `068`, `072`, `076`, `101`, `114`, and `118`.
Dynamic input is `recordId` for record-triggered automations. Keep 068 OFF.
Keep email handoffs disabled for controlled integrity tests; do not write
progression fields. PKG-006R and PKG-036 correction/observation locks remain
in force until Mike releases them.

## Read-only preflight and exact order

1. Save current automation-version/trigger screenshots and run
   `audit-counted-submission-xp-standings-reliability.js`; retain unredacted
   output with the evidence worksheet.
2. Run the PKG-039 WAS audit/reconciliation checks against every record. Do not
   use a sample limit to stop counts; rerun after formulas settle.
3. Resolve any duplicate canonical identity, wrong-owner link, multiple goal,
   or cross-Program/year result manually before enabling a writer. Stop rather
   than selecting a first row.
4. In DEV, paste in this order: 031, 032, then 118. Paste docblock through
   end (not the GitHub header). Verify the exact triggers before enabling:
   031 counted Submissions; 032 WAS needing goal; 118 Sunday 05:00
   America/Denver. `033` is not part of PKG-039 deployment; use its separately
   approved packet and evidence.
5. Before any non-dry-run 118 proof, turn OFF (and capture the prior state of)
   072, 119, 074, and the Make weekly-email scenario. This is mandatory:
   118 arms `Build Weekly Email Now?`, which 072 would otherwise consume. Keep
   010, 035, 057, 076, 101, and 114 unchanged and leave 068 OFF.
6. Enable one writer at a time: 031 → 032. Run fixture proofs. Enable 118 only
   for the isolated empty-week/concurrency proof, with the email path disabled,
   then restore 072, 119, 074, and Make to the captured state. Do not enable an
   email sender during this package.
7. Only after DEV evidence is accepted and Mike approves Production, repeat the
   exact paste/enable order in Production. Do not merge, deploy, or paste from
   this packet itself.

## Required DEV/Production evidence worksheet

For each controlled fixture, record Enrollment, School Year, Program Instance,
Week, WAS ID, Summary Key, source record, action/status/debug outputs, before/
after links, and screenshots:

1. First create, replay, and two concurrent starts: exactly one canonical WAS;
   the loser fails closed and no daily/weekly email is sent.
2. Duplicate canonical WAS, wrong existing WAS owner, zero/multiple Submission
   Enrollment/Week links, wrong Program Instance, wrong school year, and a same
   Week name in another Program: fail closed.
3. Missing Submission and non-Submission-Base XP backlinks repair only where
   exact ownership is proven; wrong/ambiguous XP links remain visible and
   retryable. Confirm Homework, Video, and Zoom links only when derivable.
4. Inactive Enrollment: no new WAS, backlink repair, or email readiness.
5. Goal: prove missing goal (not zero), one explicit zero, one positive goal,
   inactive goal, wrong grade band, and multiple active candidates.
6. Wait for formula/rollup settlement and reread: capture weekly goal,
   percentage, shots, XP, 035 eligibility, and 057 Perfect Week boundary before
   and after settlement. A blank value is not a missing goal.
7. Withdraw and restore counted Submission, Homework, Video, and Zoom support;
   verify canonical same-event/backlink behavior, weekly shots/XP decrease and
   restore, no unintended Perfect Week unlock, daily-email readiness only after
   settlement, no email/progression side effects.
8. Record partial-write failure and retry. Preserve partial state; do not delete
   it as cleanup.

## Stop conditions, rollback, and next action

Stop immediately on more than one canonical WAS, a Summary Key/identity
mismatch, any cross-Program/year link, multiple eligible goals, wrong-owner
backlink, unsettled formula presented as zero, unexpected 068 execution,
email/Make invocation, or progression-field write. Roll back by turning OFF
only the just-enabled DEV automation and restoring the prior script from the
version capture; do not delete records or clear links blindly.

After Mike releases PKG-006R and PKG-036 locks, the first action is a fresh
read-only preflight followed by one controlled DEV first-create/replay fixture,
with all email and progression side effects disabled.
