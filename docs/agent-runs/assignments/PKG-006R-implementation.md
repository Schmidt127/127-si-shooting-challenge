# Worker assignment — PKG-006R / implementation

## Identity

- Backlog ID: PKG-006R
- Package: Daily-submission XP reversal reliability
- Role: implementation
- Exact branch: `cursor/pkg-006r-daily-submission-reversal-draft`
- Base tip SHA to branch from: `2f8188bc22b4075fdf24b5d6ed80fc175aa16f72`
- Max wall time: 30 minutes

## Paths

### Writable (exclusive)

- `airtable/extension-scripts/audits/`
- `tests/pipeline/`
- `docs/investigations/PKG-006R-DAILY-SUBMISSION-REVERSAL-ARCHITECTURE.md`
- `docs/deploy-checklists/PKG-006R-DAILY-SUBMISSION-REVERSAL-PRODUCTION-SCHMIDT-TEST.md`
- `docs/agent-runs/results/PKG-006R-implementation-result.md`

### Read-only allowed

- `airtable/automations/shooting-challenge/010-submission-intake-create-xp-event.js`
- `airtable/automations/shooting-challenge/053-achievements-and-milestones-streak-occurrences-rebuild-and-upsert-from-submissions.js`
- `airtable/automations/shooting-challenge/054-achievements-and-milestones-streak-occurrences-create-or-repair-streak-xp-event.js`
- `airtable/automations/shooting-challenge/059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js`
- `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js`
- `docs/deploy-checklists/PKG-006-COUNTED-SUBMISSION-XP-STANDINGS-PRODUCTION-SCHMIDT-TEST.md`
- `docs/agent-runs/CONTROL.json`

### Prohibited (always includes)

- `docs/agent-runs/CONTROL.json`
- Canonical production writer changes unless the Lead explicitly reassigns them after schema/trigger approval
- Secrets, Production access, schema changes, deploys, merges, destructive Git

## Bounded deliverable

Prepare an honest draft correction package: authoritative read-only audit, actual offline lifecycle/concurrency coverage, architecture map, and Production-only Schmidt test/rollback packet. If automatic correction cannot be safely wired without an approved observable trigger/schema field, document that blocker explicitly rather than inventing a field or presenting a manual audit as automatic correctness.

## Acceptance criteria

- [ ] Existing positive creation behavior is not changed.
- [ ] Canonical source keys and same-event deactivation/reactivation policy are explicit.
- [ ] Offline tests exercise lifecycle, duplicate, ownership, wrong Week/WAS, future-date, inactive Enrollment, formula-lag, retry, and concurrency cases where feasible.
- [ ] Production steps are Mike-only and do not require email testing.
- [ ] No claim exceeds repository or supplied Production evidence.

## Required test / review commands

```text
node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
git diff --check
```

## Expected result artifact

- Path: `docs/agent-runs/results/PKG-006R-implementation-result.md`
- Must include: branch SHA, files touched, test/review summary, blockers

## Stop conditions

- Need a new Airtable field/trigger without Mike authorization
- Need a canonical writer change without a reachable trigger design
- Need Production or live Airtable evidence
- Any unrelated path modification

## Merge preference

- Workers: do not merge
- Lead merge order hint: implementation package only after independent review

## Out of scope

- CONTROL updates, final handoff, merge to integration/master/main
- Production paste, deployment, email, schema creation
