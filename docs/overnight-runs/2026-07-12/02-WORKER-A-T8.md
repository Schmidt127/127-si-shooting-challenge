# Worker A — T8: 070c Homework Trigger Checklist

## Task Classification

Project: 127 SI Shooting Challenge V2  
Area: Airtable upload completion handoff  
Wave: Wave 7 — C-013  
Task Type: Cursor Task — documentation and contract review  
Owner: Mike  
Backlog ID: C-013  
Safe to Proceed: Repo-only

## Branch

`overnight/2026-07-12/worker-a-T8`

## Purpose

Define exactly what 070c must do so the asynchronous Make response `Accepted` works for homework and video assets.

## Required work

1. Inspect existing 070c code/docs and current trigger assumptions.
2. Document:
   - supported upload destinations
   - Homework Completions path
   - Video Feedback path
   - required trigger fields and filter conditions
   - pending/success/failure state transitions
   - when `Send to Make Trigger` is cleared
   - retry/idempotency behavior
3. Create or update a checklist document.
4. Do not change Airtable production.
5. If a code change is clearly required, describe it in the result file; do not implement outside approved files.

## Acceptance criteria

- Homework assets are explicitly covered.
- Video assets remain covered.
- `Accepted` is treated as pending, not failure.
- Completion verification and trigger clearing are explicit.
- Stop conditions and error states are documented.

## Required result

`docs/overnight-runs/results/T8-worker-a-result.md`
