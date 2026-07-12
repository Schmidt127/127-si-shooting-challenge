# Worker D — T9: C-023 Stage 6 Readiness Checklist

## Task Classification

Project: 127 SI Shooting Challenge V2  
Area: File hash deduplication readiness  
Wave: Wave 7 — C-023 preparation  
Task Type: Cursor Task — architecture documentation  
Owner: Mike  
Backlog ID: C-023, C-024  
Safe to Proceed: Repo-only; planning, not implementation

## Branch

`overnight/2026-07-12/worker-d-T9`

## Purpose

Define what must be decided and proven before content-hash deduplication is implemented.

## Required work

Document:

1. Where SHA-256 should be computed.
2. Which Airtable fields are authoritative.
3. Duplicate scope options:
   - same enrollment
   - same week
   - same assignment
   - whole program
4. Duplicate behavior options:
   - block
   - needs review
   - reuse existing object
5. Interaction with retries and partial multi-file uploads.
6. Required audits and tests.
7. Required DEV evidence.
8. Rollback plan.
9. Explicit prerequisites from C-013 and C-024.

## Non-goal

Do not implement hash deduplication tonight.

## Required result

`docs/overnight-runs/results/T9-worker-d-result.md`
