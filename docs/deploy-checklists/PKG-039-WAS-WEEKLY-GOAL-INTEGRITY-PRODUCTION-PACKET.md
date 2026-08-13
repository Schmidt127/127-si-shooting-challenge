# PKG-039 — Weekly Athlete Summary and Weekly Goal Integrity

**Status:** Mike-only DEV-first and Production packet — not executed by this package  
**Repository baseline:** `b10c93432a7e7bc0a04ada2c39aeca7e8f49e8db` plus the PKG-039 PR head  
**Production boundary:** No record, schema, automation, trigger, email, or lock change was made while preparing this packet.

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
| Goal link | `032` | Exactly one active, explicit numeric Target Goal Shots record for the WAS Grade Band. Challenge-wide: no Week match. |
| Homework and Homework Completion backlink | `033` | Exact WAS Enrollment + Week + Program Instance; absorbs retired `068`. |
| Submission Base XP / its WAS link | `010` | Source key `SUBMISSION_XP|{Submission}`; not repaired by `031`. |
| Non-Submission-Base XP/WAS backlink repair | `031` | Exact Enrollment + Week; blank or precisely proven stale link only. |
| Threshold XP / goal consumer | `035` | Consumes settled WAS goal state; does not configure a goal. |
| Perfect Week eligibility/unlock | `057` / `058` | Consumers only; no WAS create. |
| Zoom XP | `101` | May create/find WAS for Zoom; must use exact identity and fail closed. |
| Video XP | `114` | XP owner; requires exact Video Feedback identity; no WAS create. |
| Weekly email schedule | `118` | Legitimate empty-week WAS creator; exact Enrollment + Week and post-create recheck. |
| Weekly email builder | `072` | Consumer only. Does not create WAS or send Make webhook. |
| Daily email readiness | `031` → `076` | `031` only arms after final WAS validation; `076` consumes/clears. |

`068` is retired and must remain OFF. No other automation may be reactivated as
a WAS writer. The canonical identity is exactly one `Weekly Athlete Summary`
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
4. In DEV, paste in this order: 031, 032, 033, then 118. Paste docblock through
   end (not the GitHub header). Verify the exact triggers before enabling:
   031 counted Submissions; 032 WAS needing goal; 033 WAS homework reconcile;
   118 Sunday 05:00 America/Denver.
5. Leave 010, 035, 057, 072, 076, 101, 114, and all email/Make paths unchanged
   during the first-create identity proof. Leave 068 OFF.
6. Enable one writer at a time: 031 → 032 → 033. Run fixture proofs. Enable
   118 only for the isolated empty-week/concurrency proof, then return the
   schedule to its documented state. Do not enable an email sender.
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
