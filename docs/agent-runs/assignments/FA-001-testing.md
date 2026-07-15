# Worker assignment — FA-001 / testing

## Identity

- Backlog ID: FA-001
- Package: FA-001 — Four-agent pilot (docs-only kit gaps)
- Role: testing
- Exact branch: `cursor/fa-001-testing-cfc9`
- Base tip SHA to branch from (Lead provides): `9c3e1d83c671d09418ac9107821107b09c9654c3` (integration tip; package rooted at master `9d293ab368dd42d700e19980bd2a4dd8aecc5412`)
- **Important:** Validate Implementation deliverables **after they are available** (on `origin/cursor/fa-001-implementation-cfc9` and/or after Lead announces they are pushed). Do not invent the Implementation files yourself.
- Integration branch (do not commit here): `cursor/fa-001-four-agent-pilot-cfc9`
- Max wall time: 45 minutes (after Implementation artifacts exist)

## Paths

### Writable (exclusive)

- `docs/agent-runs/results/FA-001-testing-result.md`

### Read-only allowed

- `docs/agent-runs/**` (read Implementation deliverables; do not modify them)
- `docs/agent-runs/CONTROL.json` (read-only)
- `.cursor/permissions.json`
- `.cursor/rules/four-agent-workflow.mdc`
- `AGENTS.md`
- Implementation branch tip (fetch/read only): `origin/cursor/fa-001-implementation-cfc9`

### Prohibited (always includes)

- Writing any path other than `docs/agent-runs/results/FA-001-testing-result.md`
- `docs/agent-runs/CONTROL.json` (no edits)
- Creating or editing `06-HANDOFF-TEMPLATE.md` / `07-PILOT-CHECKLIST.md`
- Application code, secrets, deploy, AWS, live Airtable
- Merges of any kind

## Bounded deliverable

After Implementation deliverables exist, run the required validation commands, review path contracts for worker diffs, and record PASS/FAIL evidence in the single testing result file.

## Acceptance criteria

- [ ] Confirmed Implementation files exist (via fetch/show of Implementation branch or Lead-provided tip)
- [ ] JSON validation of CONTROL + permissions recorded
- [ ] Path-contract review for Research/Implementation (read-only) recorded
- [ ] Exact commands + outcomes in the result file
- [ ] Diff contains **only** the testing result file
- [ ] No merge attempted

## Required test / review commands

```text
python -m json.tool docs/agent-runs/CONTROL.json
python -m json.tool .cursor/permissions.json
# After Implementation is available (adjust remote tip as needed):
git fetch origin cursor/fa-001-implementation-cfc9
git show origin/cursor/fa-001-implementation-cfc9:docs/agent-runs/06-HANDOFF-TEMPLATE.md | head
git show origin/cursor/fa-001-implementation-cfc9:docs/agent-runs/07-PILOT-CHECKLIST.md | head
git diff --name-only
# must list only: docs/agent-runs/results/FA-001-testing-result.md
```

## Expected result artifact

- Path: `docs/agent-runs/results/FA-001-testing-result.md`
- Must include: branch SHA, files touched, exact command results, blockers

## Stop conditions

- Implementation deliverables not yet available → wait / report BLOCKED to Lead (do not create them)
- Need a prohibited path → stop and report to Lead
- Tool failure / stall → report; do not invent alternate scope
- Hard stops: no PROD, no schema, no credentials, no deploy, no destructive git, **no merges**

## Merge preference

- Workers: **do not merge**
- Lead merge order hint: Testing last (after Implementation)

## Out of scope

- CONTROL updates, final handoff, merge to integration/`master`/`main` (Lead / Mike only)
- Fixing Implementation content (report failures; Lead decides rework)
