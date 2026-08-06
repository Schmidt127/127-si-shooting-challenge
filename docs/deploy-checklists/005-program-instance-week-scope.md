# Automation 005 v4.1 — Program Instance Week scope

| Field | Value |
|-------|--------|
| Date | 2026-08-06 |
| Script | `airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js` |
| Version | **v4.1** |
| PROD base | `appn84sqPw03zEbTT` |
| Package | Fix Activity Date fallback so Weeks are scoped to Enrollment → Program Instance |

## Root cause

Automation **005 v4.0** Activity Date fallback scanned **all** Weeks by date range only. With multiple configuration years / Perfect Week fixtures sharing calendar ranges, one Activity Date could match multiple active Weeks (e.g. Early Bird + `PWTEST|…|WEEK` both covering 2026-08-02–08). The script correctly refused to guess and threw:

`Multiple active Weeks matched Activity Date 2026-08-05. Review Week date ranges.`

## Permanent fix (v4.1)

```text
Submission → Enrollment → Program Instance
→ Weeks with the same Program Instance
→ Active Week? (if field exists)
→ Activity Date within Start Date..End Date
```

Homework-first order is unchanged: Homework Name 1 → Homework Name 2 → scoped Activity Date fallback.

## Schema fields verified (PROD snapshot + link map)

| Table | Field | Notes |
|-------|-------|-------|
| Submissions | `Enrollment` | link → Enrollments |
| Submissions | `Week` | writable link |
| Submissions | `Activity Date` | date |
| Submissions | `Homework Name 1` / `Homework Name 2` | curriculum links |
| Submissions | `Week Assignment Status` | formula — do not write |
| Enrollments | `Program Instance` | link → Program Instance - Synced |
| Weeks | `Week Name`, `Start Date`, `End Date` | Denver dateTime on start/end |
| Weeks | `Program Instance` | link → Program Instance - Synced |
| Weeks | `Active Week?` | **may be absent** in PROD; script treats missing as active |

## Paste steps (Mike / Omni)

1. Open PROD automation **005 — Assign Week to Submission — Homework First**.
2. Replace script body with GitHub file **from production docblock through end** (skip GitHub header comment).
3. Confirm input variable still mapped: `recordId`.
4. Confirm new outputs exist or are optional: `enrollmentId`, `programInstanceId` (script uses `setOutputSafe` — missing output mappings are tolerated).
5. Save.

## Controlled PROD tests

Live Submission under test:

| Role | Record |
|------|--------|
| Submission | `recElDBcFvuE6jWwc` |
| Enrollment | `recCyFEPeATOVNlr9` |
| Program Instance | `rec5mEM0YPqPqq0hZ` |
| Expected Week | `recWeVrSabnsYaHc2` (`Early Bird`) |
| Activity Date | `2026-08-05` |

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Live video Submission (clear Week if stuck, Run Test 005) | Week = Early Bird; status Complete; no multi-match error |
| 2 | Homework Name 1 already links a Week | sourceUsed = Homework Name 1; Activity Date fallback unused |
| 3 | Overlapping Week on different Program Instance | Only Enrollment’s PI Week considered |
| 4 | Two overlapping Weeks same Program Instance | Error naming same-PI overlap; Week not guessed |
| 5 | Submission with no Enrollment | Skipped; clear message; no Week write |
| 6 | Enrollment with no Program Instance | Skipped; clear message; no Week write |
| 7 | Re-run same Submission | Idempotent; same Week; no incorrect change |

### Harness commands

```bash
# Offline contracts (no PAT)
node tools/testing/test_005_program_instance_week_scope.mjs

# Live read-only graph + scoped match prediction (needs PAT)
node tools/testing/probe_005_program_instance_week_scope.mjs

# Clear Week so automation can re-assign, then Run Test in Airtable UI
node tools/testing/probe_005_program_instance_week_scope.mjs --clear-week

# After 005 Run Test
node tools/testing/probe_005_program_instance_week_scope.mjs --verify
```

## Rollback

Paste prior **v4.0** body from git history if needed. Prefer fixing Week / Program Instance links over rollback when multi-year Weeks exist.

## Evidence

`docs/testing/evidence/2026-08-06-005-program-instance-week-scope/`
