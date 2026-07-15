# S26 — Core workflow regression matrix result (WS4)

**Date:** 2026-07-14  
**Workstream:** 4  
**Stage:** S26  
**Mode:** Docs / design only — **no** Airtable destructive tests, **no** email, **no** PROD, **no** 117 enable

## Deliverables

| File | Role |
|------|------|
| `docs/testing/CORE-WORKFLOW-REGRESSION-MATRIX.md` | Authoritative human matrix |
| `docs/testing/core-workflow-regression-matrix.json` | Machine-readable companion |

## Workflows covered

Enrollment · Submission intake · Weekly summaries · Homework · Video · Levels · Achievements · Zoom

Each row documents: trigger, prerequisites, outputs, dedupe key, retry, adjacent autos, live fixture, expected result, rollback/restore, evidence status.

## Evidence honesty (summary)

| Workflow | Status |
|----------|--------|
| Enrollment | **UNKNOWN** |
| Submission intake | **PASS** (021 Phase A); full 010/115 chain **PLANNED** |
| Weekly summaries | **PASS** (030 Phase B); weekly email **PLANNED** |
| Homework | **PASS** (020 Phase C1; 070a historical); XP/email **UNKNOWN**/**PLANNED** |
| Video | **PASS** (013 Phase C2; 070b/070c PROD; 116); full 114 path **UNKNOWN** |
| Levels | **UNKNOWN** |
| Achievements | **UNKNOWN** / **PLANNED** (066 historical deploy ≠ full E2E) |
| Zoom | **UNKNOWN** (101); **PLANNED** (117 OFF) |

## Key findings

1. Phase A/B/C consolidation smokes are the strongest current evidence for intake, WAS, homework link, and video link paths.
2. Enrollment (001–003) and Levels (041–043) lack recent live matrix evidence — treat as first-class gaps before pre-season dry-run.
3. Zoom recording credit (**117**) is documented as **PLANNED** and must stay OFF.
4. Canonical fixture remains Schmidt Enrollment `recgP9qZYjAhE7NXm`.

## Next (not done here)

- Live matrix passes only when Mike authorizes; update JSON `evidence_status` after each pass.
- After Phase C2 UI (**111** delete), refresh video adjacent-auto notes.
