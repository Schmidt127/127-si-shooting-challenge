# PKG-033 — Core Reliability Evidence Audit

**Status:** Phase 2 repository evidence; Production proof pending Mike
**Package:** `PKG-033`
**Baseline:** `origin/master` `2f8188bc22b4075fdf24b5d6ed80fc175aa16f72`
**Date:** 2026-08-13
**Environment boundary:** Repository-only. No Airtable, Fillout, Make, Gmail, Vercel deployment, or live traffic was accessed.

## Evidence boundary

Repository source, tests, dated snapshots, and historical packets show intended
contracts and prior observations. They do not prove the current installed
Production automation versions, trigger conditions, schema, views, or formula
settling behavior. Historical documents that identify an environment as PROD
remain dated evidence; they are not new access or current proof for this
package.

The repository contains dated Production snapshots, but this package did not access a
Production or Production base. Any production-only or Production test step below is a Mike
runbook requirement, not a completed test.

## Lane 1 — registration through first participation

### Ownership map

| Stage | Repository owner | Contract |
|---|---|---|
| Registration identity and Enrollment setup | Automation `001` | Reuse linked/exact identity, re-query before create, block same Athlete + School Year duplicate, leave duplicate inactive/unlinked |
| Grade Band | `002`, `003` | Match configured inclusive grade range; do not write computed refresh fields |
| Submission Enrollment ownership | `023` | Require exact context; fail closed on multiple active candidates or cross-Program Instance mismatch |
| Week ownership | `005` | Derive from Activity Date and Enrollment Program Instance; do not invent a Week |
| Initial progression request | `001` | Set `Level Recalc Needed?` only after canonical active Enrollment setup |
| Progression queue | `041` | Queue only; never write four progression outputs |
| Progression outputs | `042` | Sole writer of Current Level, Next Level, Level Gate Rule, Level Status, and queue clear |
| Gate-rule legacy writer | `043` | Retired; must not be recreated |
| Welcome | `075` / Communications Hub boundary | Non-blocking side effect; not part of participation identity |

Primary sources: `001`, `002`, `003`, `023`, `005`, `041`, `042`,
`043`; `tests/enrollment-intake/automation-001-unload-compat.test.js`;
`tests/progression/immediate-initial-level-assignment.test.js`;
`docs/audits/PARTICIPATION-WORKFLOW-AUDIT-2026-08-11.md`.

### Findings

1. The repository has explicit same-year duplicate protection and a
   re-query-before-create contract. The offline test covers existing identity
   reuse, same-year duplicate blocking, different-year return, and immediate
   recalculation request.
2. Program Instance and School Year safety is strongest downstream in `023` and
   `005`; the exact live Fillout hidden values and lookup mapping remain
   unverified.
3. `001` sets the recalculation request after activation, and `042` owns the
   output fields. Current source is `001 v5.4`, `041 v4.0`, and `042 v3.4`.
4. `041 v4.0` uses a signature over Enrollment progression inputs and gate-rule
   inputs, including rollup totals and active/gate configuration. This is a
   scheduled reconciliation design, not proof that Airtable formula changes
   settle before the scan.
5. A registration row can exist while downstream 023/005/031/XP processing is
   delayed or failed. The pipeline is not an atomic transaction. Replay must
   recover downstream state without creating a second canonical Enrollment.
6. Parent-cleaned email is identity/communications data, not a safe
   participation gate. Welcome must remain non-blocking, while exact
   Enrollment, Program Instance, School Year, and Week context must remain
   blocking.
7. The current `001` source blocks and deactivates a new same-Athlete/
   same-School-Year Enrollment rather than linking it to the existing
   canonical Enrollment. Its duplicate identity also omits Program Instance.
   This is a source-level candidate for a separate implementation package,
   subject to Mike’s multi-Program Instance policy and live evidence.

### Severity and evidence gaps

| Severity | Finding | Required evidence |
|---|---|---|
| P0 evidence gap | Current Fillout registration mapping and live Program Instance/year defaults are unknown | Mike UI capture before controlled test |
| P0 evidence gap | Current installed 001/023/005/031 versions and trigger conditions are not proved by source | Mike automation UI attestation |
| P1 design risk | Downstream partial failure is recoverable by replay only if canonical identity and links remain stable | Offline failure/replay harness plus one controlled live replay |
| P1 evidence gap | Formula/rollup settling between Enrollment activation, 041, and 042 is not proved | Controlled timing capture |
| P1 evidence gap | Multiple active Enrollment behavior must be checked against current live records, not only source fixtures | Read-only live export/UI evidence |

### Modification decision

The Enrollment reuse and Program Instance-aware dedupe behavior is a justified
follow-up candidate, but not a Production-ready fix. `001`, `041`, and `042`
require live trigger/version/schema attestation and a focused approved
implementation package before any change. Read-only audits and offline
recovery fixtures are justified now.

## Lane 2 — Weekly Athlete Summary integrity

### Ownership map and identity contract

`031` is the primary counted-Submission WAS creator/linker. `101` can create a
WAS as a Zoom XP side effect, and `118` can create an empty-week WAS for the
scheduled weekly path. The logical identity is the exact Enrollment + Week
relationship, represented through Enrollment Key + Week Key and the
formula-driven Summary Key. Airtable has no unique constraint, so the three
create-capable paths can race.

`031` links the Submission to the WAS and links the WAS back to the
Submission. `010` owns Submission Base XP Event creation and does not
surrender that ownership to `031`; `031` may repair eligible
non-Submission-Base XP summary links.

`032`, `033`, `030`, and `034` are supporting WAS context writers. `057` and
`058` consume WAS state for Perfect Week eligibility/unlock. `072` is an email
consumer and is outside this package's correctness boundary. Public reads use
the WAS allowlist in `web/lib/data/public-athlete-profile.ts`.

Primary sources: `031`, `010`, `030`, `032`, `033`, `034`, `057`, `058`,
`airtable/extension-scripts/audits/audit-counted-submission-xp-standings-reliability.js`,
`airtable/extension-scripts/audits/audit-xp-linkage-coverage.js`, and
`docs/prod-completion/2026-08-06/WEEKLY-SUMMARY-KEY-REPAIR-AND-043-DEFECT.md`.

### Findings

1. `031` explicitly treats Summary Key, Enrollment Key, and Week Key as
   formula-driven and read-only. Scripts must not claim Airtable atomic
   uniqueness for a formula key.
2. Current `031 v4.0` fails closed on zero or multiple fully valid canonical
   candidates and includes post-create concurrency revalidation.
3. Existing stale Submission links and eligible XP links can be repaired when
   exact Enrollment + Week + Program Instance ownership is proven. Ambiguous
   duplicate summaries must be reported, not silently preferred.
4. Historical repair evidence found duplicate/mis-scoped summaries. That
   evidence confirms the failure class and the need for a duplicate audit; it
   does not prove current Production is clean.
5. Formula lag remains an operational risk: a newly created or relinked record
   may not immediately expose the expected calculated Summary Key, rollups, or
   weekly totals. The safe behavior is fail closed or bounded retry, never
   fallback to display names or first linked record.
6. Weekly goal and derived totals are downstream of Week, Enrollment,
   Challenge Goal, Submission, and XP links. A summary record existing is not
   sufficient proof that totals have settled.
7. `101` and `118` are additional create-capable writers. Existing
   documentation must say “intended logical uniqueness with fail-closed
   duplicate detection,” not atomic uniqueness or sole-creator guarantees.

### Failure matrix

| Case | Safe behavior | Proof status |
|---|---|---|
| First counted Submission, one canonical target | Link/reuse one WAS; no replacement on replay | Offline source/test evidence; live proof pending |
| Second Submission same Enrollment + Week | Reuse same WAS and append/link evidence | Offline/source evidence; live proof pending |
| Zero canonical candidates | Fail closed; do not create an unscoped replacement | Source contract; targeted harness required |
| Multiple canonical candidates | Report ambiguity; do not choose first | Source contract; duplicate audit required |
| Wrong Enrollment/Week/Program Instance | Reject or repair only exact owner | Source contract; controlled evidence pending |
| Missing backlink | Repair exact owner if cardinality is singular | Source contract; audit coverage must be verified |
| Wrong XP Event WAS link | Repair only eligible non-Submission-Base owner | Source contract; owner-specific test required |
| Formula lag | Bounded safe retry or skipped state; never false success | Timing harness/live evidence pending |
| Concurrent create | Re-read candidates after create; ambiguity fails closed | Source contract; concurrency test required |

### Modification decision

The authoritative read-only WAS audit and offline first-create/replay/
concurrency/repair harness are justified. A shared resolver or link-only
conversion for `031`, `101`, and `118` is a separate implementation candidate;
no creator rewrite is included in PKG-033 without a bounded architecture
decision and live trigger evidence.

## Lane 3 — Zoom attendance and Zoom XP

### Architecture and source-key registry

| Path | Owner/source key | Scope |
|---|---|---|
| Live attendance | `101 v5.5` | Base/baseline Zoom attendance and meeting bonuses from linked Attendees |
| Stage 17 downstream | `057` + C-025 helper libraries | WAS Perfect Week and gate consumption; no Attendees write |
| Recording approval handoff | `117 v1.1` | Make email handoff only; no Airtable XP write |
| Recording XP alternatives | `117a–e` design alternatives / superseded paths | Not canonical; must not be pasted over 117 |
| XP identity | C-025 helpers | Distinct live/recording key families; exact meeting/attendance/enrollment ownership |

`101` must not be confused with `117`: the repository states that `117` is
the recording approval email handoff and does not award recording XP. The
current Stage 17 helper contract forbids writing `Zoom Meetings.Attendees`.

### Findings

1. Offline C-025 attendance, combined-credit, and recording lifecycle tests
   cover source-key distinction, conflict soft-voiding, idempotent rerun,
   no-Attendees-write, gate/Perfect Week separation, and Denver date handling.
2. The exact business rule for whether live and recording participation can
   both award XP for one meeting is represented by the Stage 17 conflict
   policy, but requires Mike confirmation against current product intent.
3. Duplicate reward rules, multiple Enrollment links, inactive Enrollment,
   wrong Week/Program Instance, and missing/multiple WAS must fail closed.
4. Approval withdrawal should deactivate the canonical event and restoration
   should reactivate the same event. The repository has helper-level coverage,
   but no current live proof.
5. A stale existing test expects Automation 115 `SCRIPT.version` `v1.9`,
   while the current 115 source does not contain that string. This is test
   drift and blocks a clean Zoom downstream suite; it is not evidence of a
   Production defect.
6. The trigger map still lists `043` as an active Levels downstream row even
   though current ownership and completion evidence say `043` is retired.
   This is a documentation/trigger-inventory defect requiring a bounded
   registry correction, not a recreation of `043`.
7. The source-key registry describes live Zoom keys with `{meetingId}`, while
   `101` constructs them from `Zoom Meeting Key`; terminology must be
   reconciled before any migration or audit repair.
8. `101` creates/repairs WAS records but does not independently validate that
   attendee Enrollment and meeting Week share a Program Instance. It also has
   no canonical live-attendance withdrawal lifecycle when an attendee is
   removed later.
9. `117` is email-only and there is no deployed recording-XP writer. Any
   withdrawal/restoration or `ZOOM_CREDIT` test must be skipped until PKG-010
   names an owner and version.

### Modification decision

Justified bounded work: repair the stale offline version assertion to match the
current committed 115 contract after review, and add/read-only Zoom integrity
coverage if an uncovered lifecycle is confirmed. Do not modify `101`, `117`,
or the Stage 17 business rules without live configuration evidence and an
explicit product decision.

## Lane 4 — progression, levels, and standings

### Ownership and timing

```text
Active XP Events and gate inputs
  -> Enrollment formula/rollup totals
  -> 041 signature scan and Level Recalc Needed?
  -> 042 processing
  -> Current Level / Next Level / Level Gate Rule / Level Status
  -> leaderboard Enrollment read model
```

`041` is queue-only. `042` is the sole progression output writer. `043` is
retired and must not be recreated. The website leaderboard reads Enrollment
fields and sorts by level sort order descending, Lifetime XP descending, total
shots descending, then name and record ID for deterministic ties.

### Findings

1. Current `041 v4.0` includes XP totals, manual adjustments, submission/
   homework/video totals, Zoom/streak inputs, active state, and gate-rule
   configuration in its signature. It can detect changes on scheduled scans
   after Airtable values settle.
2. The signature does not include the `Levels` table’s XP thresholds or
   `Active?` configuration. A level threshold or level activation change may
   leave Current Level and Next Level stale until another input changes.
3. `042` leaves the recalculation request on its error path; with a “record
   enters view” trigger, retry behavior when the record remains in the view
   requires explicit proof.
4. Current `042 v3.4` validates active Enrollment, school-year/rule-set gate
   selection, duplicate applicable rules, zero-XP configuration, and maximum
   level behavior in source/tests. It preserves inactive historical fields
   while clearing a stale request.
5. Historical level and gate defects are retained as dated evidence; current
   source remediation is present but its live paste, trigger, required field,
   and controlled Schmidt proof are not confirmed in this package.
6. Rollup/formula delay can allow 042 to process a stale Lifetime XP or gate
   input. A false settled success must be avoided; test packets must capture
   before/after values and timestamps.
7. Leaderboard sort keys are deterministic after the documented level, XP,
   and shot keys, but this is a web/read-model contract. Current Airtable view
   membership, school-year filter, and test-record exclusion remain live
   evidence questions.

### Modification decision

No immediate progression owner rewrite is justified. A focused follow-up
package should cover `Levels` threshold/activation changes and 042 retry
re-entry. Current justified work remains offline threshold increase/decrease/
replay coverage, a read-only configuration audit, and standings contract tests.
Any live field or trigger change is Mike-owned and outside this package.

## Lane 5 — consolidated E2E readiness

The controlled journey is specified in
`docs/deploy-checklists/PKG-033-SCHMIDT-PRODUCTION-TEST.md`. It is a future
Mike-run packet and does not claim that the journey has passed.

It deliberately keeps Homework XP and Video XP as dependency checkpoints
covered by their existing packages rather than modifying their scripts. Email,
Make, and public appearance are disabled or separately observed boundaries.

## Cross-lane blockers and implementation candidates

### Publishable repository work

1. Read-only WAS integrity audit with duplicate/ambiguity reporting.
2. Read-only progression/standings configuration and linkage audit.
3. Read-only registration readiness audit.
4. Read-only Zoom lifecycle/source-key audit.
5. Offline lifecycle/concurrency fixtures where existing harnesses can model
   the behavior without Airtable.
6. Stale 115 downstream test version assertion correction, if independent
   review confirms the committed source version.
7. Trigger-map correction for retired `043`, kept separate from automation
   code and without enabling or recreating it.

### Not justified by repository evidence

- Changes to registration, WAS creation, `101`, `117`, `041`, or `042`
  behavior based only on historical live findings.
- Any schema field creation or rename.
- Any Production trigger, paste, enablement, record repair, XP change, or
  live test.
- Any communications, email appearance, or public website change.

## Follow-up candidates from independent lane review

These are not Production fixes in PKG-033 and require separate bounded
packages after Mike’s decisions:

| Candidate | Reason for separation | Disposition |
|---|---|---|
| `001` canonical Enrollment reuse and Program Instance-aware dedupe | Changes registration identity semantics and multi-program behavior | Candidate; policy and live evidence required |
| Shared WAS resolver for `031`, `101`, and `118` | Changes multiple creators and concurrency behavior | Candidate; Airtable has no atomic uniqueness |
| `041` signature includes active `Levels` configuration | Changes progression queue inputs | Candidate; threshold/activation tests first |
| `042` retry-safe failure re-entry | Changes trigger/retry semantics | Candidate; preserve queue on failure and prove retry |
| `101` Program Instance validation and live-attendance withdrawal | Changes Zoom XP correction lifecycle | Candidate; product policy first |
| Zoom source-key terminology reconciliation | Could affect audit/migration identity | Documentation decision before code |

## Required Mike evidence

1. Current Production automation version and trigger attestation for
   `001`, `005`, `023`, `031`, `041`, `042`, `043`, `057`, `101`, and `117`.
2. Current schema/UI evidence for Enrollment, Week, Program Instance, WAS,
   XP Event, Zoom Attendance, Zoom Meeting, Levels, and Level Gate Rules.
3. Named Schmidt test Enrollment, Athlete, Program Instance, Week, and
   rollback/cleanup decision.
4. Product decision on live/recording Zoom exclusivity and reward-rule
   identity.
5. Before/after readbacks proving formula/rollup settling, XP lifecycle,
   WAS totals, progression, and standings.

## Review disposition

**Phase 2 status:** Evidence package ready for independent review.
**Production status:** Not accessed; no Production proof claimed.
**Implementation status:** Only the bounded candidates above may proceed,
serialized and independently reviewed.
