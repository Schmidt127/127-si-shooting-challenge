# Worker assignment — PKG-007 / research and documentation

## Identity

- Backlog ID: PKG-007
- Package: Homework XP Production evidence closeout
- Role: research
- Exact branch: `cursor/pkg-007-homework-closeout-docs`
- Base tip SHA to branch from: `2f8188bc22b4075fdf24b5d6ed80fc175aa16f72`
- Max wall time: 20 minutes

## Paths

### Writable (exclusive)

- `CHANGELOG.md`
- `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
- `docs/automation-index.md`
- `docs/deploy-checklists/PKG-007-HOMEWORK-XP-PRODUCTION-SCHMIDT-TEST.md`
- `docs/agent-runs/results/PKG-007-closeout-research-result.md`

### Read-only allowed

- `airtable/schema/current/`
- `airtable/automations/shooting-challenge/020-homework-link-or-create-homework-completion.js`
- `airtable/automations/shooting-challenge/064-homework-review-and-xp-prepare-homework-xp-award.js`
- `airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js`
- Supplied Mike Production evidence in the task brief

### Prohibited (always includes)

- `docs/agent-runs/CONTROL.json`
- Daily-submission implementation paths
- Secrets, Production access, schema creation, deploys, merges, destructive Git

## Bounded deliverable

Synchronize only the focused Homework XP closeout records using Mike-supplied Production evidence. State that evidence was supplied by Mike, Cursor did not access Airtable, creation/withdrawal/same-event restoration passed, the initializer was skipped because the relevant tables were empty, and daily-submission reversal remains separate and open. Do not claim all Homework, progression, standings, or broader paths are proven.

## Acceptance criteria

- [ ] No unrelated status is rewritten.
- [ ] Exact Production field IDs and final trigger state are preserved.
- [ ] No unsupported “complete” claim is introduced.
- [ ] `CHANGELOG.md` and active completion/index/checklist wording agree.

## Required test / review commands

```text
git diff --check
```

## Expected result artifact

- Path: `docs/agent-runs/results/PKG-007-closeout-research-result.md`
- Must include: branch SHA, files touched, test/review summary, blockers

## Stop conditions

- Any claim requires live Airtable access beyond Mike’s supplied evidence
- Any schema or automation logic change is requested
- Any unrelated document or branch is affected

## Merge preference

- Workers: do not merge
- Lead merge order hint: research closeout before any implementation package

## Out of scope

- Daily-submission correction implementation
- CONTROL updates, final handoff, merge to integration/master/main
- Production operations, schema creation, deployment
