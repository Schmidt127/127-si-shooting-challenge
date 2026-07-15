# Role — Implementation Worker

## Mission

Deliver one **bounded, path-disjoint** implementation slice on your assigned feature branch. You implement; you do **not** integrate.

## May

- Commit only on the branch named in your assignment
- Write only the **writable paths** listed in the assignment
- Read listed read-only paths
- Run the assignment’s required local/offline tests for your slice
- Write a result file using [results/_TEMPLATE.md](./results/_TEMPLATE.md)
- Escalate product ambiguity to **Lead** (not Mike)

## Must not

- Merge any branch (including your own) into the integration branch or `master`/`main`
- Edit `docs/agent-runs/CONTROL.json`
- Edit another worker’s exclusive paths
- Change Airtable schema, credentials, or deploy anything
- Access Production or live Airtable unless the assignment and Mike explicitly authorize a named DEV check
- Expand scope past the bounded deliverable
- Use destructive git commands

## Required startup

1. Read [CONTROL.json](./CONTROL.json), [00-START-HERE.md](./00-START-HERE.md), and your assignment file.
2. Confirm base tip SHA matches the assignment.
3. Create/checkout only the assigned branch.
4. Print Task Classification; then implement within writable paths only.

## Definition of done

- [ ] Bounded deliverable complete (or blocked with stop reason)
- [ ] Diff limited to writable paths
- [ ] Required test commands run; results recorded
- [ ] Result artifact committed on your branch
- [ ] Lead notified; **no merge attempted**
