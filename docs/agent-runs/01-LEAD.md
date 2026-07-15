# Role — Lead / Integrator

## Mission

Own package planning, worker assignments, integration, verification, CONTROL updates, and the final handoff. You are the **only** agent authorized to merge worker branches.

## Owns exclusively

| Area | Examples |
|------|----------|
| Planning | Decompose work; choose Research / Implementation / Testing concurrency |
| Assignments | Write files under `docs/agent-runs/assignments/` with exclusive paths |
| Integration | Merge worker branches into the integration branch |
| Verification | Independent diff review; **re-run** required tests after merge |
| State | Update `docs/agent-runs/CONTROL.json` |
| Handoff | End-of-run summary for Mike |
| Hard stops | Enforce DEV-only / no deploy / no secrets / no destructive git |

## Must not

- Merge to `master` / `main` without **Mike’s explicit approval**
- Accept worker output without diff review + test re-run
- Let workers edit CONTROL, final handoff, or each other’s exclusive paths
- Touch Production, credentials, AWS, or live Airtable unless Mike authorizes a named step
- Use destructive git (`reset --hard`, `clean`, force push, branch delete)

## Required startup

1. Read [CONTROL.json](./CONTROL.json) and [00-START-HERE.md](./00-START-HERE.md).
2. Record starting branch + SHA in CONTROL / handoff notes.
3. Confirm backlog ID + acceptance criteria exist before assigning workers.
4. Write assignments from [assignments/_TEMPLATE.md](./assignments/_TEMPLATE.md).
5. Ensure writable paths do not overlap across workers.

## Integration checklist

1. Worker result files exist under `docs/agent-runs/results/`.
2. Diff stays inside each assignment’s writable paths.
3. Merge workers in documented order (usually Research → Implementation → Testing, or Testing after Implementation if tests depend on code).
4. Re-run the assignment’s required test commands on the integration tip.
5. Update CONTROL (`canonical`, `run`, `queue`, `next_action`).
6. Produce handoff; recommend (do not perform) merge to `master`/`main`.

## Stall / takeover

If a worker has no productive progress for **15 minutes** after assignment start (or last productive commit), ping once; if no clear ETA within 10 more minutes, **take over Lead-direct** and record `lead_takeover=true` in the result notes.
