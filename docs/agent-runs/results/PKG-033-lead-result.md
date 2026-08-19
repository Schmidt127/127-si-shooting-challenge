# Worker result — PKG-033 / Lead

## Identity

- Role: Lead / Integrator
- Branch: `cursor/pkg-033-core-reliability-cc64`
- Branch tip: recorded by `git rev-parse HEAD` at final handoff
- Started: 2026-08-13
- Assignment: PKG-033 approved plan

## Deliverable status

- [x] Complete within bounded scope
- [ ] Partial
- [ ] Blocked
- [ ] Failed

This result records repository evidence and readiness preparation only. No
Production or Production Airtable system was accessed.

## Files touched

| Path | Action |
|---|---|
| `docs/agent-runs/CONTROL.json` | register approved PKG-033 workflow |
| `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` | add PKG-033 traceability row |
| `docs/investigations/PKG-033-CORE-RELIABILITY-EVIDENCE-AUDIT.md` | add five-lane evidence report |
| `docs/deploy-checklists/PKG-033-SCHMIDT-PRODUCTION-TEST.md` | add Mike-only controlled test packet |
| `airtable/automations/shooting-challenge/lib/c025-stage17-etf-downstream.test.js` | correct stale committed-source version assertion |
| `airtable/schema/current/automation-trigger-map.md` | mark retired 043 as historical-only; preserve 042 ownership |
| `tests/weekly-athlete-summary/pkg-033-was-integrity.test.js` | add offline WAS ambiguity, formula-lag, repair, and replay harness |

## Lane summaries

### Registration

Current source and tests support same-year duplicate blocking, identity reuse,
Program Instance/Week fail-closed boundaries, immediate initial recalculation,
and non-blocking welcome side effects. Exact Fillout mappings, live trigger
versions, and formula timing remain unverified. Independent review identified
a separate source-level candidate: 001 blocks/deactivates a new duplicate row
instead of linking it to the canonical Enrollment, and its dedupe identity
omits Program Instance. This requires a separate approved package.

### Weekly Athlete Summary

`031` is the primary counted-Submission creator/linker, but `101` and `118`
also have create-capable WAS paths. Airtable has no atomic uniqueness. The new
offline harness covers duplicate ambiguity, wrong ownership, formula lag,
backlink repair, owner-specific XP repair, and replay stability. A shared
resolver or link-only architecture is a separate candidate; no creator rewrite
is included.

### Zoom

Current C-025 suites cover live/recording key distinction, conflict handling,
idempotency, no Attendees write, approval lifecycle, gate/Perfect Week
consumption, and downstream waits. `117` is an email handoff, not the
canonical recording XP writer. Existing downstream test drift expected 115
v1.9 while source is v2.1; the assertion and test label were corrected.

### Progression and standings

`041 v4.0` is queue-only and signature-driven; `042 v3.4` is the sole
progression-output writer with active/school-year/rule-set safeguards; `043`
remains retired. Leaderboard sorting is deterministic after level, XP, shots,
name, and record ID. Live schema/trigger/view settlement and test-record
exclusion remain unverified. Independent review found that 041’s signature does
not include `Levels` XP thresholds/activation and that 042 retry behavior after
an error needs proof; these are separate follow-up candidates.

### End-to-end specification

`PKG-033-SCHMIDT-PRODUCTION-TEST.md` defines one controlled journey, expected
automation/version evidence, exact record/key readbacks, stop conditions,
rollback, email-disabled boundaries, withdrawal/restoration, and final audits.
It is not a pass claim.

## Tests / review

| Command | Result |
|---|---|
| `node -e "JSON.parse(require('fs').readFileSync('docs/agent-runs/CONTROL.json','utf8'))"` | PASS |
| `git diff --check` | PASS |
| `node --check airtable/automations/shooting-challenge/001-enrollment-intake-and-setup-find-or-create-athlete-and-link-enrollment.js && node --check airtable/automations/shooting-challenge/041-levels-and-progression-mark-enrollment-for-level-recalculation.js && node --check airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js && node --check airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.js && node --check airtable/automations/shooting-challenge/117-zoom-send-recording-approval-email-to-make.js && node --check airtable/extension-scripts/audits/audit-counted-submission-xp-standings-reliability.js` | PASS |
| `node tests/enrollment-intake/automation-001-unload-compat.test.js` | PASS — 17 |
| `node tests/progression/immediate-initial-level-assignment.test.js` | PASS — 7 |
| `node airtable/automations/shooting-challenge/lib/c025-stage17-zoom-attendance.test.js` | PASS |
| `node airtable/automations/shooting-challenge/lib/c025-stage17-combined-zoom-credit.test.js` | PASS |
| `node airtable/automations/shooting-challenge/lib/c025-stage17-etf-downstream.test.js` | PASS after source-version assertion correction |
| `node airtable/automations/shooting-challenge/lib/c025-zoom-recording-credit.test.js` | PASS |
| `node tests/weekly-athlete-summary/pkg-033-was-integrity.test.js` | PASS — 9 |
| `cd web && npm test -- --run lib/data/leaderboard.test.ts` | BLOCKED — `vitest` unavailable because `web/node_modules` is not installed; no package files changed |

## Review findings and blockers

1. `airtable/schema/current/automation-trigger-map.md` had listed `043` in
   the Levels table although current ownership says it is retired. The package
   now marks it historical-only and preserves 042 ownership; this does not
   recreate or enable 043.
2. Historical live packets identify earlier 041/042/043 and WAS defects. They
   are dated evidence only; they do not prove current Production state.
3. Current live automation versions, trigger conditions, fields, views, and
   formula settling require Mike’s evidence.
4. No code change to 001, 031, 041, 042, 101, or 117 is supported without
   live configuration evidence and a narrower approved implementation package.
5. Web unit-test execution is environment-blocked because dependencies are not
   installed; this package did not alter web code.
6. Independent lane review identified Zoom source-key terminology drift,
   missing 101 Program Instance validation/withdrawal lifecycle, and no
   deployed recording-XP writer. Recording stages remain conditional on PKG-010.

## Recommended next step

Publish the audit/test-packet artifacts as a draft package, obtain Mike’s
live-version/schema/record evidence, then open separate serialized
implementation PRs only for confirmed defects. Keep all Production actions,
schema changes, deployments, and merges Mike-owned.
