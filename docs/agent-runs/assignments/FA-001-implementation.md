# Worker assignment — FA-001 / implementation

## Identity

- Backlog ID: FA-001
- Package: FA-001 — Four-agent pilot (docs-only kit gaps)
- Role: implementation
- Exact branch: `cursor/fa-001-implementation-cfc9`
- Base tip SHA to branch from (Lead provides): `9d293ab368dd42d700e19980bd2a4dd8aecc5412`
- Integration branch (do not commit here): `cursor/fa-001-four-agent-pilot-cfc9`
- Max wall time: 60 minutes

## Paths

### Writable (exclusive)

- `docs/agent-runs/06-HANDOFF-TEMPLATE.md`
- `docs/agent-runs/07-PILOT-CHECKLIST.md`
- `docs/agent-runs/results/FA-001-implementation-result.md`

### Read-only allowed

- `docs/agent-runs/00-START-HERE.md`
- `docs/agent-runs/01-LEAD.md`
- `docs/agent-runs/02-IMPLEMENTATION.md`
- `docs/agent-runs/assignments/FA-001-implementation.md`
- `docs/agent-runs/results/_TEMPLATE.md`
- `AGENTS.md`
- `.cursor/rules/four-agent-workflow.mdc`

### Prohibited (always includes)

- `docs/agent-runs/CONTROL.json`
- Other workers’ result files (`FA-001-research-result.md`, `FA-001-testing-result.md`)
- Editing `00-START-HERE.md` or role docs (Lead may link after merge)
- Application code, secrets, deploy, AWS, live Airtable
- Merges of any kind

## Bounded deliverable

Create a Lead end-of-run handoff template and a short FA-001 / four-agent pilot checklist under `docs/agent-runs/`. Commit a result artifact summarizing files touched. Do not modify CONTROL or other docs.

## Acceptance criteria

- [ ] `06-HANDOFF-TEMPLATE.md` exists with sections for SHA, worker table, tests, risks, Mike decisions, next steps
- [ ] `07-PILOT-CHECKLIST.md` exists with a concise pass/fail checklist for a four-agent docs pilot
- [ ] Result file committed at the expected path
- [ ] Diff limited to the three writable paths only
- [ ] No merge attempted

## Required test / review commands

```text
git diff --name-only
# allowed paths only:
# docs/agent-runs/06-HANDOFF-TEMPLATE.md
# docs/agent-runs/07-PILOT-CHECKLIST.md
# docs/agent-runs/results/FA-001-implementation-result.md
test -f docs/agent-runs/06-HANDOFF-TEMPLATE.md
test -f docs/agent-runs/07-PILOT-CHECKLIST.md
```

## Expected result artifact

- Path: `docs/agent-runs/results/FA-001-implementation-result.md`
- Must include: branch SHA, files touched, test/review summary, blockers

## Stop conditions

- Need a prohibited path → stop and report to Lead
- Product decision required → stop and report to Lead
- Tool failure / stall → report; do not invent alternate scope
- Hard stops: no PROD, no schema, no credentials, no deploy, no destructive git, **no merges**

## Merge preference

- Workers: **do not merge**
- Lead merge order hint: after Research, before Testing

## Out of scope

- CONTROL updates, final handoff fill-in, merge to integration/`master`/`main` (Lead / Mike only)
- Testing validation of deliverables (Testing worker)
