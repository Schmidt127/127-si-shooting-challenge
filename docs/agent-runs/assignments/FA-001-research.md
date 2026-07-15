# Worker assignment — FA-001 / research

## Identity

- Backlog ID: FA-001
- Package: FA-001 — Four-agent pilot (docs-only kit gaps)
- Role: research
- Exact branch: `cursor/fa-001-research-cfc9`
- Base tip SHA to branch from (Lead provides): `9d293ab368dd42d700e19980bd2a4dd8aecc5412`
- Integration branch (do not commit here): `cursor/fa-001-four-agent-pilot-cfc9`
- Max wall time: 45 minutes

## Paths

### Writable (exclusive)

- `docs/agent-runs/results/FA-001-research-result.md`

### Read-only allowed

- `docs/agent-runs/**` (except do not write anything except the one result file)
- `AGENTS.md`
- `.cursor/rules/four-agent-workflow.mdc`
- `.cursor/permissions.json`
- Remote reference only (do not merge/copy): `origin/overnight/lead-integration` docs if already fetched — optional

### Prohibited (always includes)

- `docs/agent-runs/CONTROL.json`
- Any assignment file under `docs/agent-runs/assignments/`
- Any other documentation (including `00-START-HERE.md`, role docs, handoff/checklist files)
- Application code (`web/`, `airtable/`, `lambda/`, `make/`, `tools/` except read)
- Secrets, deploy configs, AWS, live Airtable
- Merges of any kind

## Bounded deliverable

One research result file that inventories gaps in the minimal four-agent kit versus the historical overnight OS (reference-only), confirms FA-001 scope, and lists recommended Lead follow-ups. No other files may be created or modified.

## Acceptance criteria

- [ ] Result file exists at the exact writable path
- [ ] Includes sources consulted (paths + SHAs)
- [ ] Findings, options, and recommended next step for Lead
- [ ] Diff contains **only** the result file
- [ ] No merge attempted

## Required test / review commands

```text
git diff --name-only
# must list only: docs/agent-runs/results/FA-001-research-result.md
```

## Expected result artifact

- Path: `docs/agent-runs/results/FA-001-research-result.md`
- Must include: branch SHA, files touched, findings, blockers

## Stop conditions

- Need a prohibited path → stop and report to Lead
- Product decision required → stop and report to Lead
- Tool failure / stall → report; do not invent alternate scope
- Hard stops: no PROD, no schema, no credentials, no deploy, no destructive git, **no merges**

## Merge preference

- Workers: **do not merge**
- Lead merge order hint: Research first

## Out of scope

- CONTROL updates, final handoff, merge to integration/`master`/`main` (Lead / Mike only)
- Creating `06-HANDOFF-TEMPLATE.md` or `07-PILOT-CHECKLIST.md` (Implementation only)
