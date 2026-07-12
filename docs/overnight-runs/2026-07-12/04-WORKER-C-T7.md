# Worker C — T7: Contract Alignment and Unified Tests

## Task Classification

Project: 127 SI Shooting Challenge V2  
Area: Upload contracts and regression testing  
Wave: Wave 7 — C-013  
Task Type: Cursor Task — tests  
Owner: Mike  
Backlog ID: C-013, C-024  
Safe to Proceed: Repo-only

## Branch

`overnight/2026-07-12/worker-c-T7`

## Purpose

Align tests and fixtures with 070a v4.4 and create one reliable offline suite.

## Required work

1. Review 070a v4.4 input/output contract.
2. Align fixtures and assertions with:
   - synchronous JSON success
   - asynchronous `Accepted`
   - pending state
   - uploaded state
   - failure state
3. Preserve the large-response/truncated-JSON regression test.
4. Run the complete offline suite.
5. Report exact test count, passes, failures, and skipped tests.
6. Do not weaken tests merely to make them pass.

## Required result

`docs/overnight-runs/results/T7-worker-c-result.md`
