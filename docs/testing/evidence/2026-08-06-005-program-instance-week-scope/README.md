# Evidence — Automation 005 v4.1 Program Instance Week scope

| Field | Value |
|-------|--------|
| Date | 2026-08-06 |
| Script version | v4.1 |
| PROD base | `appn84sqPw03zEbTT` |
| Deploy checklist | [`docs/deploy-checklists/005-program-instance-week-scope.md`](../../deploy-checklists/005-program-instance-week-scope.md) |

## Root cause (confirmed)

Activity Date fallback matched Weeks by date range only. Live Submission `recElDBcFvuE6jWwc` (Activity Date 2026-08-05) overlapped both:

- `recWeVrSabnsYaHc2` — Early Bird (correct Program Instance `rec5mEM0YPqPqq0hZ`)
- Perfect Week fixture week covering the same calendar range (different Program Instance)

Automation correctly stopped with a multi-match error rather than guessing.

## Repository deliverables

| Artifact | Status |
|----------|--------|
| Script `005-…js` v4.1 | Done |
| Offline contracts `tools/testing/test_005_program_instance_week_scope.mjs` | **PASS** (8/8) |
| Pure matcher `tools/testing/lib/005_week_match.js` | Done |
| PROD probe `tools/testing/probe_005_program_instance_week_scope.mjs` | Ready (needs PAT) |
| Docs updated (date-only matching language) | Done |

## Offline test coverage mapped to required tests

| Required test | Offline result |
|---------------|----------------|
| 1 Live overlapping dates → Early Bird | PASS |
| 2 Homework-first precedence | PASS |
| 3 Wrong-year / other PI overlap excluded | PASS |
| 4 Same-PI overlap → no guess | PASS |
| 5 Missing Enrollment / missing PI diagnostics | PASS (missing PI status) |
| 6 No Week in PI | PASS |
| 7 Idempotent repeat match | PASS |

## Live PROD Tests 1–7

**Blocked in this cloud agent environment** without `AIRTABLE_API_TOKEN` (see `PROD-PROBE-BLOCKED.json` when probe is run).

After Mike adds a scoped PAT to the Cursor environment **or** pastes v4.1 and runs Automation Test in Airtable UI:

1. Paste 005 v4.1 per deploy checklist.
2. `node tools/testing/probe_005_program_instance_week_scope.mjs` — confirm graph.
3. Optionally `--clear-week`, then Airtable **Test** automation with `recordId=recElDBcFvuE6jWwc`.
4. `--verify` — expect Week `recWeVrSabnsYaHc2`.
5. Attach console outputs showing Enrollment, Program Instance, candidates, final Week.
6. Update this README with PASS/FAIL per Tests 1–7 and mark completion master.

### Expected live resolution (Test 1)

```text
Enrollment = recCyFEPeATOVNlr9
Program Instance = rec5mEM0YPqPqq0hZ
Activity Date = 2026-08-05
Selected Week = recWeVrSabnsYaHc2
Selected Week Name = Early Bird
```

## Field / dependency review

| Dependency | Reviewed |
|------------|----------|
| Submissions.Enrollment / Week / Activity Date / HW1 / HW2 / Week Assignment Status | Yes (PROD schema snapshot 2026-07-23 + link map) |
| Enrollments.Program Instance | Yes |
| Weeks.Program Instance / Start / End / Week Name | Yes |
| Weeks.Active Week? | Confirmed may be absent historically; script tolerates |
| Homework / Submission Asset / XP / Video Feedback writers | Untouched |
| Week record create/modify | Not performed by 005 |
| Input `recordId` | Preserved |
