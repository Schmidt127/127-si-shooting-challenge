# Worker assignment — PKG-006R / testing and review

## Identity

- Backlog ID: PKG-006R
- Package: Daily-submission XP reversal reliability
- Role: testing
- Exact branch: `cursor/pkg-006r-daily-submission-reversal-review`
- Base tip SHA to branch from: `2f8188bc22b4075fdf24b5d6ed80fc175aa16f72`
- Max wall time: 30 minutes

## Paths

### Writable (exclusive)

- `docs/agent-runs/results/PKG-006R-testing-review-result.md`
- `tests/pipeline/PKG-006R-review-notes.md`

### Read-only allowed

- `airtable/extension-scripts/audits/`
- `airtable/automations/shooting-challenge/`
- `tests/pipeline/`
- `docs/investigations/PKG-006R-DAILY-SUBMISSION-REVERSAL-ARCHITECTURE.md`
- `docs/deploy-checklists/PKG-006R-DAILY-SUBMISSION-REVERSAL-PRODUCTION-SCHMIDT-TEST.md`

### Prohibited (always includes)

- `docs/agent-runs/CONTROL.json`
- Product/application paths owned by implementation
- Secrets, Production access, schema changes, deploys, merges, destructive Git

## Bounded deliverable

Independently review the draft implementation package for unreachable correction branches, positive-only filters, duplicate canonical events, ownership theft, wrong Week/WAS, formula-latch settling, linked-record reachability, concurrency, inactive Enrollment, future dates, milestone/streak reversal, same-event restoration, stale versions, unsupported claims, and test/diff failures.

## Acceptance criteria

- [ ] Exact commands and exit results are recorded.
- [ ] Findings are classified as product defect, test gap, environment block, or documentation issue.
- [ ] Recommendation is publish, rework, or blocked with explicit reasons.
- [ ] No live or Production evidence is invented.

## Required test / review commands

```text
node --test tests/pipeline/counted-submission-xp-standings-orchestration.test.mjs
git diff --check
```

## Expected result artifact

- Path: `docs/agent-runs/results/PKG-006R-testing-review-result.md`
- Must include: branch SHA, files touched, test/review summary, blockers

## Stop conditions

- Review requires live Airtable access
- Implementation changes are outside the assigned package
- Any prohibited path or unrelated work is encountered

## Merge preference

- Workers: do not merge
- Lead merge order hint: after implementation and before Lead integration

## Out of scope

- CONTROL updates, final handoff, merge to integration/master/main
- Production operations, email, schema creation, deployment
