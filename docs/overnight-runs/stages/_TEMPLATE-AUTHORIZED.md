# Stage authorization template

Copy to `docs/overnight-runs/stages/S{n}-AUTHORIZED.md` and fill in.

---

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S{n} |
| Package ID | `{from CONTROL.json queue}` |
| Base SHA | `{canonical.sha}` |
| Date | {ISO date} |

## Objective

{One sentence — what this integration unit delivers.}

## Authorized scope

- Repo-safe work only: {docs / tests / audits / runbooks}
- **Not authorized:** {list blocked actions}

## Lane assignments

| Lane | Branch | Deliverables |
|------|--------|--------------|
| worker-a | `overnight/v2-run/worker-a-s{n}-{scope}` | {files} |

Use one lane by default. Add lanes only for disjoint file paths.

## Required deliverables

- [ ] {primary file}
- [ ] `docs/overnight-runs/results/S{n}-worker-{x}-result.md` (if worker branch merged)

## Required tests

- [ ] Lambda: 66/66
- [ ] Offline: 97/97
- [ ] Targeted: {package-specific}

## Merge order

1. {worker-d / single branch / none for Lead-only}

## Blocked actions

PROD, credentials, Airtable schema, destructive git, Tutorials, Learning Activities implementation.

## Definition of done

- [ ] All deliverables exist on worker branch(es)
- [ ] `assert_git_lane.py` passed before each commit
- [ ] Merged to `overnight/lead-integration`
- [ ] Regression tests PASS
- [ ] CONTROL.json updated (`canonical.sha`, package COMPLETE)
- [ ] Lead pushed; local SHA = remote SHA
