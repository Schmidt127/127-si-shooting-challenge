# Lead Agent Assignment

## Task Classification

Project: 127 SI Shooting Challenge V2  
Area: Overnight integration and agent workflow  
Wave: Wave 7 — C-013 asset storage  
Task Type: Cursor Task — integration review  
Owner: Mike  
Backlog ID: C-013, C-023, C-024  
Safe to Proceed: Yes, repo-only unless Mike explicitly approves a DEV check

## Branch

`overnight/lead-integration`

## Mission

Coordinate Workers A–D, prevent overlap, review their result files, run the unified test suite, and produce one morning handoff.

## Required work

1. Record starting commit SHA.
2. Inventory PRs #5, #12, #13, #18, and #19:
   - open/closed/merged
   - overlapping files
   - whether included in lead branch
   - whether still needed
3. Do not merge merely because a PR exists.
4. Review all worker result files.
5. Run the unified offline suite after integrating approved worker branches.
6. Produce:
   - `docs/overnight-runs/results/2026-07-12-lead-result.md`
   - update `docs/overnight-runs/_live-status-update.md`
7. Recommend, but do not perform, the final merge to master unless Mike explicitly approves.

## Forbidden

- No PROD changes.
- No protected evidence reset.
- No unrelated refactors.
- No silent takeover of a blocked worker task.
- No merge to master without Mike approval.

## Morning handoff format

1. Starting and ending SHA
2. Worker status table
3. PR disposition table
4. Tests and exact counts
5. Live DEV actions, if any
6. Systems left ON/OFF
7. Decisions needed from Mike
8. Recommended next-night tasks
