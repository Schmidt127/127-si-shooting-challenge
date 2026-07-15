# Four-agent pilot checklist (FA-001 / docs-only)

Use for a docs-only controlled four-agent package. Mark PASS / FAIL / N/A.

## Preconditions

| # | Check | Result |
|---|-------|--------|
| P1 | `docs/agent-runs/CONTROL.json` valid JSON | PASS |
| P2 | `.cursor/permissions.json` valid JSON | PASS |
| P3 | Package `run.state` was `active` with exclusive claims | PASS |
| P4 | Assignments exist under `docs/agent-runs/assignments/` with non-overlapping writable paths | PASS |
| P5 | Hard stops documented (DEV only, no schema/secrets/deploy, no worker merges) | PASS |

## Worker execution

| # | Check | Result |
|---|-------|--------|
| W1 | Research result at assigned path only | PASS |
| W2 | Implementation deliverables at assigned paths only | PASS |
| W3 | Testing result at assigned path only | PASS |
| W4 | Each worker branch tip recorded in result files | PASS |
| W5 | No worker edited `CONTROL.json` | PASS |
| W6 | No worker performed a merge | PASS |

## Lead integration

| # | Check | Result |
|---|-------|--------|
| L1 | Merge order matches CONTROL (`research` → `implementation` → `testing` unless documented otherwise) | PASS |
| L2 | Independent re-run of required validation commands on integration tip | PASS |
| L3 | Path-contract review of merged worker diffs | PASS |
| L4 | CONTROL updated (`canonical`, `run`, `queue`, `next_action`) | PASS |
| L5 | Lead handoff filled (from `06-HANDOFF-TEMPLATE.md`) | PASS — `results/FA-001-lead-handoff.md` |
| L6 | Merge to `master`/`main` **not** done without Mike approval | PASS |

## FA-001 deliverable presence

| # | Check | Result |
|---|-------|--------|
| D1 | `docs/agent-runs/06-HANDOFF-TEMPLATE.md` exists | PASS |
| D2 | `docs/agent-runs/07-PILOT-CHECKLIST.md` exists | PASS |
| D3 | `docs/agent-runs/results/FA-001-research-result.md` exists | PASS |
| D4 | `docs/agent-runs/results/FA-001-implementation-result.md` exists | PASS |
| D5 | `docs/agent-runs/results/FA-001-testing-result.md` exists | PASS |

## Overall

- Pilot result: PASS
- Notes: Lead takeover executed all three worker slices on exclusive branches; multi-agent wall-clock concurrency not proven this run.
