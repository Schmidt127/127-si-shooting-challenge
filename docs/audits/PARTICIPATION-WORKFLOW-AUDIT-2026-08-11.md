# Post-Registration Participation Workflow Audit

**Date:** 2026-08-11
**Backlog package:** `PKG-006`
**Branch:** `agent/participation-workflow-audit`
**Repository baseline:** `origin/master` at `9138b48e4fc129e98220029680b48ae5fe9908fe`
**Scope:** Repository evidence only. No Production Airtable, Fillout, Make, email, Vercel, or live-traffic access was used.

## Evidence boundary

This document describes what the repository records, not what is currently installed or enabled in an external service. The repository itself says that current Airtable, Fillout, Make, Gmail/Lambda, and Vercel state must be verified in those systems. Dated schema snapshots are preferred over the hand-maintained `airtable/schema/current/` maps, which are marked stale.

Automation 001 and registration-test files were intentionally left outside this workstream's writable paths. Enrollment identity details below use the repository's enrollment pipeline documentation, read-only identity helper, fixtures, and downstream consumers; they are not a new audit or change to Automation 001. Automation 001 was not independently audited in PR #151.

## Current workflow

### 1. Participant access and registration

The `/shoot` Next.js app provides public program pages, leaderboard, public display, levels, achievements, homework, and public athlete profile routes. Registration and daily shooting intake are external Fillout forms linked from:

- `web/lib/registration.ts`
- `web/components/home/registration-gateway.tsx`
- `web/docs/production-closeout.md`

The repository documents the registration handoff as:

```text
Enrollment Fillout
  -> Enrollments row
  -> athlete identity link
  -> Grade Band assignment
  -> welcome-email package / handoff
  -> Active? / Program Instance / Weeks eligibility
```

The exact live form IDs, hidden defaults, current Program Instance, redirects, and live mapping are explicitly unknown until Mike verifies the Fillout UI. The daily submission form is documented as OFF in `docs/PROJECT_STATE.md` and `docs/challenge-year/FILLOUT-SEASON-ACTIVATION.md`.

The web participant dashboard is not authenticated or Airtable-backed: `web/lib/data/athlete-dashboard.ts` returns a mock adapter. Public athlete profiles are a separate, allowlisted read path and are not a participant account system.

### 2. Athlete and enrollment identity

PR #151 did not independently audit Automation 001. The current Production-tested duplicate guard from PR #150 applies after the athlete match: a repeat registration for the same Athlete and School Year is blocked, the original Enrollment remains canonical and linked, and the repeat row is left inactive and unlinked. The blocked repeat does not trigger another welcome email. A returning Athlete in a different School Year remains allowed.

For the identity portion of this audit, repository documentation and the read-only helper in `tools/enrollment-season/identity_matching.py` describe this evidence-backed order:

1. Preserve an existing Enrollment → Athlete link.
2. Try an exact normalized athlete match key.
3. Try normalized first name + last name + parent email.
4. Re-query before creation.
5. Treat an unmatched athlete as a create candidate; do not merge or delete automatically.

Parent email is normalized and used for matching; athlete email is not part of the documented match key. Siblings sharing a parent email remain separate when their names differ. The duplicate guard's same-Athlete + School-Year check is distinct from the identity-match order above.

Relevant evidence:

- `docs/online-agents/enrollment-season/CURRENT-ENROLLMENT-PIPELINE.md`
- `docs/online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md`
- `tools/enrollment-season/identity_matching.py`
- `tools/enrollment-season/tests/test_new_returning_and_siblings.py`
- `tests/fixtures/enrollment-season/`

### 3. Grade Band and Program Instance

Automation 002 assigns an Enrollment's Grade Band from active `Grade Bands` records using the inclusive `Min Grade` / `Max Grade` range. Automation 003 repeats the range match when the grade changes and the refresh condition is met. The scripts do not write formula fields such as `Grade Band Refresh Needed`.

Program Instance is the season/program boundary. Enrollment, Week, and downstream records are expected to remain within the same instance. Automation 023 resolves an Enrollment for a Submission using available context, including an existing valid link, explicit/native context where present, Fillout context, Week → Program Instance, and only then a single-active-Enrollment fallback when no Program Instance or School Year context exists.

The repository evidence says:

- multiple active Enrollment candidates fail closed;
- a Week from another Program Instance must not select a current Enrollment;
- multiple Week Program Instances are ambiguous;
- missing context may use the documented single-active fallback;
- the exact live form mapping for Program Instance and season context remains unverified.

Sources:

- `airtable/automations/shooting-challenge/002-enrollment-intake-and-setup-assign-grade-band-initial.js`
- `airtable/automations/shooting-challenge/003-enrollment-intake-and-setup-assign-grade-band-if-grade-changes.js`
- `airtable/automations/shooting-challenge/023-submission-intake-and-asset-creation-assign-enrollment-to-submission.js`
- `docs/online-agents/enrollment-season/CURRENT-ENROLLMENT-PIPELINE.md`
- `airtable/schema/snapshots/prod-20260706/`

### 4. Shooting submission intake

The repository's trigger map records this intended chain:

```text
Submission
  -> 023 assign Enrollment
  -> 005 assign Week from Activity Date
  -> 007 classify duplicate
  -> 006 derive video count
  -> 021 classify attachment state
  -> 009 create Submission Assets
  -> 010 create/repair shooting XP
  -> 031 find/create Weekly Athlete Summary
  -> 030/032/033/034 complete weekly-summary context
  -> 041 queues recalculation
  -> 042 exclusively assigns Current Level, Next Level, Level Gate Rule, and Level Status
  -> 053/054/055/056 rebuild or award streak participation
  -> 066/058/059 create milestone or Perfect Week achievement XP
```

The authoritative trigger/dependency inventory is `airtable/schema/current/automation-trigger-map.md`; the current schema snapshot identifies `Enrollments`, `Weeks`, `Submissions`, `XP Events`, `Weekly Athlete Summary`, `Grade Bands`, `Submission Assets`, and `Athlete Achievement Unlocks` as central tables.

#### Week assignment

Automation 005 derives the Week from the Submission `Activity Date`, using the Enrollment's Program Instance and Denver-local date handling. It does not invent a Week. With no match and no selected homework, it leaves the Week link empty and records a no-match result. A selected homework assignment makes the missing-Week case an error because the schedule cannot be validated.

#### Duplicate submissions

Automation 007 reads the computed `Duplicate Key` and writes the duplicate review status. The documented unique path sets `Count It`; a duplicate goes to review rather than being silently counted. The key is stat-based and does not by itself establish that two separately intended submissions are duplicates.

Automation 115 is a special engineering test orchestrator, not the normal submission processor. Repository evidence explicitly says that each checked run intentionally creates a new Submission and that its presets can bypass ordinary duplicate-review behavior. Its success does not prove downstream 005, 009, 010, 031, XP, Make, or email behavior.

#### Assets and corrections

Automation 009 creates Submission Assets only when the required Enrollment and Week/provenance context is present and dedupes by source attachment ID. Automation 013 creates or links Video Feedback only for a valid video asset and ownership chain. Automation 022 writes upload results back to existing child records; it does not create those child records.

The repository documents asset-reuse correction behavior in Automation 116: a reviewed reuse decision can suppress or restore award state and deactivate/reactivate the existing XP Event. This is a correction path for asset reuse, not proof of a general shooting-submission edit/correction workflow.

### 5. Progress totals and completion

Automation 010 requires a counted Submission with positive eligible shots, derives the canonical Enrollment + Week + Program Instance context, and uses `SUBMISSION_XP|{submissionRecordId}` as the submission XP key. It repairs an existing XP Event when appropriate and fails closed when the canonical Weekly Athlete Summary is missing, ambiguous, stale, or from the wrong Enrollment, Week, or Program Instance.

Automation 031 links counted Submissions to one canonical Weekly Athlete Summary using Enrollment + Week/Summary Key semantics. It fails closed on multiple valid summaries and can repair related XP summary links. Automations 030, 032, 033, and 034 supply grade-band copy, goal, homework, and previous-week context.

Progression is then consumed through:

- Enrollment rollups/formulas for Lifetime XP, shots, makes, percentages, streaks, and level state;
- Weekly Athlete Summary fields for weekly shots, days logged, XP, goal percentage, homework, and Perfect Week;
- Automation 041 queues recalculation, and Automation 042 exclusively assigns `Current Level`, `Next Level`, `Level Gate Rule`, and `Level Status`;
- Automation 043 is retired and not deployed. It must not be recreated; Automation 042 owns the `Level Gate Rule` assignment;
- 053–059 and 066 for streak, Perfect Week, and shot-milestone participation;
- homework/video/Zoom XP paths where their independent eligibility and review rules are satisfied.

The repository does not establish one atomic transaction across these automations. A Submission can therefore exist while a downstream automation is OFF, delayed, or failed.

### 6. Public rankings, profiles, and awards

The public leaderboard reads active Enrollment data, preferring the `Web - Leaderboard` view and falling back to an Active?/XP filter. Application sorting is level sort order, Lifetime XP, total shots, then deterministic name/record ordering. An optional `AIRTABLE_ACTIVE_SCHOOL_YEAR` filter protects against prior-year leakage when configured.

The public athlete profile path:

- requires a valid non-record-ID slug;
- requires `Public Profile Enabled` and `Active?`;
- fails closed on duplicate enabled slugs;
- reads an explicit allowlist of public Enrollment fields;
- follows Enrollment links to recent counted Submissions, Weekly Athlete Summaries, visible Achievement Unlocks, XP Events, and the next Level;
- does not serialize private contact data or Airtable IDs.

Sources:

- `web/lib/airtable/queries.ts`
- `web/lib/data/public-athlete-profile.ts`
- `web/lib/data/leaderboard.ts`
- `web/tests/athlete-profile.spec.ts`
- `web/lib/data/leaderboard.test.ts`

The schema snapshot proves Award Recipients links to Awards, Enrollments, and Weeks, but this audit did not find a complete repository-evidenced award-generation chain tied to a shooting submission. Award eligibility and completion behavior therefore remain an unanswered operational question rather than an inferred rule.

## Dependencies

| Dependency | Repository role | Evidence boundary |
|---|---|---|
| Fillout enrollment form | Creates Enrollment intake row | External UI mapping is not proven |
| Fillout daily form | Creates Submission intake row | Currently documented OFF; exact lookup/defaults unknown |
| Enrollments / Athletes | Identity, season, Active?, Grade Band, Program Instance | Dated schema snapshot is repository evidence, not live state |
| Weeks | Activity-date calendar and Program Instance boundary | Missing or overlapping Weeks are safety-critical |
| Grade Bands | Grade range configuration and milestone eligibility metadata | Current live options require verification |
| Submissions | Counted shooting activity and duplicate key | 007 review path and 115 test path differ |
| Submission Assets / Video Feedback | Attachment/video follow-on processing | Provenance and upload state required |
| XP Events | Append-only progress awards and dedupe keys | Multiple writers must remain reconciled |
| Weekly Athlete Summary | Weekly totals, goals, homework, Perfect Week | One canonical summary per Enrollment + Week is expected |
| Levels / Level Gate Rules | Completion/progression state | Duplicate/missing applicable rules must fail closed |
| Achievement Unlocks / Awards | Milestone and completion presentation | Award generation is not fully mapped |
| Next.js `/shoot` | Public presentation | Dashboard remains mock/no-auth |
| Make / Communications Hub / email | Upload and participant communications | Not validated in this audit |

## Known safeguards

1. **Identity matching:** normalized key hierarchy, re-query before create, no automatic destructive merge.
2. **Enrollment assignment:** 023 rejects ambiguous or cross-Program-Instance matches instead of guessing.
3. **Week assignment:** 005 scopes by Enrollment Program Instance, uses Activity Date, and does not create Weeks.
4. **Duplicate review:** 007 separates duplicate detection from the `Count It` decision.
5. **XP idempotency:** 010, 054, 059, 065, and 114 use source/dedupe keys; 010 rechecks existing XP and canonical summary state.
6. **Weekly summary integrity:** 031 and 010 require one valid Enrollment + Week + Program Instance summary.
7. **Achievement idempotency:** 058/059 and 066 use source-key patterns; inactive enrollments are skipped in the documented achievement paths.
8. **Public privacy:** profile queries use an allowlist, active/public gates, slug validation, and duplicate-slug fail-closed behavior.
9. **Offline safety:** the repository provides mocked Airtable harnesses and read-only expected-vs-actual verification; no production writes are needed for the tests run in this audit.

## Risks and unanswered questions

### Highest-risk gaps

- No isolated offline test proves the complete 023 → 005 → 007 → 010 → 031 chain, including downstream partial failure and recovery.
- SCN-009 (missing Week), SCN-013 (partial downstream failure), SCN-014 (retry after failure), and SCN-019 (already-running scenario) remain marked `not_tested` in the scenario catalog.
- A no-Week Submission can be left as an orphan until a Week is seeded or an approved cleanup occurs.
- 115 deliberately creates a fresh Submission per checked run and is not evidence of normal idempotency.
- Same-day multiple submissions and stat-identical submissions with different participant intent are not resolved by the stat duplicate key alone.
- The Active?/Progress Processing Enabled? contract is documented as incomplete for several downstream consumers, including 010, 031, 053, 065, and 076.
- The public dashboard is a mock adapter, so authenticated participant access and participant-owned submission history are not implemented.
- The repository does not prove a complete correction path for an already-counted shooting Submission.
- Award generation and the handoff from completion/achievement state to Award Recipients are not fully traced.

### Questions requiring Mike / live-system verification

1. What are the exact current Fillout form IDs, field mappings, hidden values, defaults, redirects, and confirmation copy?
2. Is the daily form Enrollment lookup scoped by current School Year/Program Instance, or does it rely on a legacy lookup?
3. Which Program Instance and Week records are currently active in Production and Production, and do their date ranges overlap?
4. Are live Grade Band ranges/options aligned with the repository's documented scripts and config?
5. Which versions of 023, 005, 007, 009, 010, and 031 are installed and ON in Production versus Production?
6. Is `Progress Processing Enabled?` present and consistently interpreted by every XP, streak, summary, and communication consumer?
7. What is the approved participant correction policy for a counted or duplicate shooting Submission?
8. Which automation or process creates Award Recipients, and what completion/eligibility source does it use?
9. Is authenticated participant access planned, or will the external Fillout form remain the only submission surface?
10. What is the approved cleanup and rollback procedure for a controlled orphan Submission or downstream partial failure?

## Prioritized end-to-end test plan

### P0 — Offline repository proof (safe to run now)

1. Run identity fixtures and validator tests under `tools/enrollment-season/tests/`.
2. Run `test_023_offline.mjs` for current/historical/cross-Program-Instance/ambiguous enrollment cases.
3. Run `test_005_023_chain_offline.mjs` for Activity Date Week assignment and no-Week behavior.
4. Run `test_010_offline.mjs` and `test_031_offline.mjs` for canonical summary, stale-link repair, ambiguity, Program Instance mismatch, and replay behavior.
5. Run `test_expected_actual.mjs` and the reliability fixture suite for duplicate XP/WAS and prohibited-side-effect checks.
6. Add future fixtures for SCN-013, SCN-014, and SCN-019 only when the harness can model the relevant failure without live Airtable or operational side effects.

### P1 — Production controlled chain (Mike approval required before execution)

Use the Production base and a named test Enrollment. Seed or verify exactly one active Week for the test Activity Date and the intended Program Instance. Observe, in order, Enrollment match, Week assignment, duplicate status, asset state, XP, Weekly Athlete Summary, level/gate state, streak/achievement state, and public/read-model totals. Capture before/after IDs and verify a rerun does not create a second XP Event or Weekly Athlete Summary. Keep outbound email/upload actions disabled or stubbed unless separately approved.

### P2 — Production evidence and one controlled participant path (Mike approval required)

Before any live submission, Mike should attest the live form mapping and current automation/version state, confirm the exact test Enrollment and covered Week, and define the cleanup/rollback procedure. Then run one known-good controlled submission only if the daily form and downstream automation chain are intentionally enabled. Verify the chain and outbound side effects separately; do not treat a 115 success as downstream proof. This audit did not execute this step.

### P3 — Failure and correction matrix

After P1 is stable, test in production-only validation:

- no matching Week;
- duplicate stat key;
- two active enrollments in one Program Instance;
- same athlete across Program Instances;
- downstream XP or WAS failure followed by retry;
- same-day multiple submissions;
- correction/reversal of a counted submission;
- achievement/award replay;
- inactive/PPE-disabled processing.

Each case needs explicit expected writes, prohibited writes, retry behavior, and cleanup before any Production consideration.

## Recommended next Production test — Mike approval required

**Recommendation:** Do not start with an induced failure or a mass form reopen. First perform a Mike-approved, single-record, known-good Production smoke of the post-registration chain using the existing named test Enrollment, one Activity Date covered by exactly one active Week, and the currently installed production versions.

Required preconditions:

1. Mike verifies the live Fillout mapping and confirms the daily form is intentionally enabled for this test.
2. Mike verifies the Enrollment, Athlete, Program Instance, Grade Band, and Week context in the live UI.
3. Mike records the before-state for Submission, XP, Weekly Athlete Summary, level, streak, and achievement links.
4. Mike confirms email/Make behavior and an explicit no-send or controlled-recipient policy.
5. Mike approves the cleanup and rollback procedure.

Pass criteria should be defined from the live UI before execution: one intended Submission, one correct Enrollment and Week, the expected duplicate/count decision, at most one submission XP source key, one canonical Weekly Athlete Summary, no cross-Program-Instance links, and no unapproved outbound communication. A 115 test-run success alone is not a pass for this workflow.
