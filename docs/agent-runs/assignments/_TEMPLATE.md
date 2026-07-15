# Worker assignment — {PACKAGE_ID} / {ROLE}

## Identity

- Backlog ID:
- Package:
- Role: lead | implementation | testing | research
- Exact branch:
- Base tip SHA to branch from (Lead provides):
- Max wall time:

## Paths

### Writable (exclusive)

- …

### Read-only allowed

- …

### Prohibited (always includes)

- `docs/agent-runs/CONTROL.json` (workers)
- Paths owned by another worker or by Lead’s concurrent write set
- Secrets (`.env`, tokens, webhook URLs with credentials)
- Production configs / deploy scripts unless Lead explicitly lists them (default: never)

## Bounded deliverable

{One paragraph — what exists when done}

## Acceptance criteria

- [ ] …
- [ ] …

## Required test / review commands

```text
{exact commands, or "none — docs only"}
```

## Expected result artifact

- Path: `docs/agent-runs/results/{PACKAGE_ID}-{ROLE}-result.md`
- Must include: branch SHA, files touched, test/review summary, blockers

## Stop conditions

- Need a prohibited path → stop and report to Lead
- Product decision required → stop and report to Lead
- Tool failure / stall → report; do not invent alternate scope
- Hard stops: no PROD, no schema, no credentials, no deploy, no destructive git, **no merges**

## Merge preference

- Workers: **do not merge**
- Lead merge order hint:

## Out of scope

- CONTROL updates, final handoff, merge to integration/`master`/`main` (Lead / Mike only)
