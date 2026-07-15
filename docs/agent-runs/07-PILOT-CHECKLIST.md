# Four-agent pilot checklist (FA-001 / docs-only)

Use for a docs-only controlled four-agent package. Mark PASS / FAIL / N/A.

## Preconditions

| # | Check | Result |
|---|-------|--------|
| P1 | `docs/agent-runs/CONTROL.json` valid JSON | |
| P2 | `.cursor/permissions.json` valid JSON | |
| P3 | Package `run.state` was `active` with exclusive claims | |
| P4 | Assignments exist under `docs/agent-runs/assignments/` with non-overlapping writable paths | |
| P5 | Hard stops documented (DEV only, no schema/secrets/deploy, no worker merges) | |

## Worker execution

| # | Check | Result |
|---|-------|--------|
| W1 | Research result at assigned path only | |
| W2 | Implementation deliverables at assigned paths only | |
| W3 | Testing result at assigned path only | |
| W4 | Each worker branch tip recorded in result files | |
| W5 | No worker edited `CONTROL.json` | |
| W6 | No worker performed a merge | |

## Lead integration

| # | Check | Result |
|---|-------|--------|
| L1 | Merge order matches CONTROL (`research` → `implementation` → `testing` unless documented otherwise) | |
| L2 | Independent re-run of required validation commands on integration tip | |
| L3 | Path-contract review of merged worker diffs | |
| L4 | CONTROL updated (`canonical`, `run`, `queue`, `next_action`) | |
| L5 | Lead handoff filled (from `06-HANDOFF-TEMPLATE.md`) | |
| L6 | Merge to `master`/`main` **not** done without Mike approval | |

## FA-001 deliverable presence

| # | Check | Result |
|---|-------|--------|
| D1 | `docs/agent-runs/06-HANDOFF-TEMPLATE.md` exists | |
| D2 | `docs/agent-runs/07-PILOT-CHECKLIST.md` exists | |
| D3 | `docs/agent-runs/results/FA-001-research-result.md` exists | |
| D4 | `docs/agent-runs/results/FA-001-implementation-result.md` exists | |
| D5 | `docs/agent-runs/results/FA-001-testing-result.md` exists | |

## Overall

- Pilot result: PASS / FAIL
- Notes:
