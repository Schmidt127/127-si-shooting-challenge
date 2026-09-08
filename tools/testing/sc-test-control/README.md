# SC Test Control — Shared Test Harness

**Owner:** Agent 2 (runner orchestration)  
**Schema owner:** Agent 0  
**Status:** Wave B — skeleton pending

## Planned commands

```bash
node tools/testing/sc-test-control/cli.js list
node tools/testing/sc-test-control/cli.js scenario <id> --dry-run
node tools/testing/sc-test-control/cli.js scenario <id> --execute
node tools/testing/sc-test-control/cli.js domain homework --dry-run
node tools/testing/sc-test-control/cli.js verify-cleanup <runId>
node tools/testing/sc-test-control/cli.js report <runId>
```

Default mode: `--dry-run`. Production writes require `--execute` plus safety gate (see `docs/testing/TEST-RELIABILITY-PROGRAM-20260908.md`).

## Schemas

- `schemas/test-result.schema.json` — shared evidence contract for all agents

## Control document

`docs/testing/TEST-RELIABILITY-PROGRAM-20260908.md`
