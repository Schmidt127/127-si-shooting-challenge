# Overnight Agent Run — 2026-07-12

## Purpose

Make measurable progress on Shooting Challenge V2 while improving the five-agent operating system.

## Tonight's operating model

- Lead Agent: coordinates, reviews, integrates, and writes the morning handoff.
- Worker A: Airtable automation / 070c readiness.
- Worker B: Make/Lambda offline validator.
- Worker C: contracts and unified tests.
- Worker D: C-023 production-readiness documentation.
- Mike: approves live DEV steps and any merge to master.

## Hard limits

- DEV only.
- PROD Airtable untouched.
- PROD Make untouched.
- PROD Lambda untouched.
- Do not reset protected record `recGQ8EjAMz3bEBiW`.
- Keep DEV 070a and DEV Make OFF when idle.
- Do not merge to master without Mike's approval.
- Do not expand beyond assigned files.
- Every worker must create a result file.

## Starting branch

Use:

`overnight/lead-integration`

Before work begins, the Lead must record the starting commit SHA.

## Required completion evidence

Every worker must provide:

1. Result status: COMPLETE, PARTIAL, BLOCKED, or FAILED.
2. Files changed.
3. Tests run and exact results.
4. Commit hash.
5. Pull request number or a documented no-change result.
6. Remaining risks.
7. Recommended next step.

## Tonight's priority

1. T8 — 070c homework-capable trigger and async `Accepted` path readiness.
2. T7 — align contracts and tests with 070a v4.4.
3. T6 — offline Make blueprint validator and payload matrix.
4. T9 — C-023 Stage 6 production-readiness checklist.
5. T5 — deferred; no C-023 implementation tonight.

## Live DEV checks Mike/OMNI must confirm

- Automation 009 is ON only when preparing/running a test.
- 070c trigger/filter supports Homework Completions as well as Video Feedback.
- Operating views show Pending, Processing, Uploaded, and Failed rows.
- DEV 070a and DEV Make are OFF before and after live testing.

## Success for tonight

- Four worker result files exist.
- Lead produces a clean integration recommendation.
- Unified offline tests pass.
- 070c requirements are explicit.
- No PROD changes occur.
