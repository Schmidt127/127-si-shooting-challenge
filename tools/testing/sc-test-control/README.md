# SC Test Control — Shared Test Harness

**Owner:** Agent 2 (runner orchestration)  
**Schema owner:** Agent 0  
**Status:** Wave B — CLI skeleton active

## Commands

```bash
node tools/testing/sc-test-control/cli.js list
node tools/testing/sc-test-control/cli.js identity verify
node tools/testing/sc-test-control/cli.js identity show
node tools/testing/sc-test-control/cli.js scenario A3 --dry-run
node tools/testing/sc-test-control/cli.js domain homework --dry-run
node tools/testing/sc-test-control/cli.js report <runId>
node tools/testing/sc-test-control/cli.js failures list
node tools/testing/sc-test-control/cli.js readonly-scan
```

Default mode: `--dry-run`. Production writes require `--execute --acknowledge-prod` and `IDENTITY_VERIFIED`.

## Tests

```bash
node --test tools/testing/sc-test-control/tests/cli-safety.test.js
node --test tools/testing/tests/test_idempotency_contracts.test.js
```

## Control document

- `docs/testing/IDENTITY-CONTRACT.md`
- `docs/testing/TEST-RELIABILITY-PROGRAM-20260908.md`
