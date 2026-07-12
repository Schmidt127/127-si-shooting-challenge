# Worker B — T6: Offline Make Blueprint Validator

## Task Classification

Project: 127 SI Shooting Challenge V2  
Area: Make/Lambda upload integration  
Wave: Wave 7 — C-013  
Task Type: Cursor Task — repo-only validator and fixtures  
Owner: Mike  
Backlog ID: C-013  
Safe to Proceed: Repo-only; no live Make or AWS

## Branch

`overnight/2026-07-12/worker-b-T6`

## Purpose

Create an offline validator and payload matrix so Make/Lambda contract problems are found before live testing.

## Required work

1. Validate the DEV blueprint structure offline.
2. Validate required payload fields:
   - routeKey
   - uploadDestination
   - source table
   - source record ID
   - target table
   - attachment/file metadata
3. Add fixtures for:
   - Lambda JSON success
   - plain-text `Accepted`
   - malformed JSON
   - HTTP error
   - missing required field
   - large/truncated response handling
4. Add clear validator output and failure messages.
5. Run all validator tests.

## Forbidden

- No live Make edits.
- No AWS calls.
- No webhook secrets in commits.
- No PROD work.

## Required result

`docs/overnight-runs/results/T6-worker-b-result.md`
