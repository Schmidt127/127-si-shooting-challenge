# REPORT — Online Agent 8 (Tutorials, Curriculum, Content-Migration Readiness)

**Date:** 2026-07-23  
**Branch:** `master`  
**Owned paths:** `docs/online-agents/tutorials-content/`, `tools/tutorials-content/`, `tests/fixtures/tutorials-content/`

## Task Classification

| Field | Value |
|-------|-------|
| Type | Data integrity / content migration readiness |
| Priority | P2 (SC-052 / SC-053) |
| Difficulty | Medium — schema + tooling + docs; no live migration |
| Owner | Online Agent 8 |
| Dependencies | C-026; web Tutorials consumers; Softr unknown |
| Backlog ID | C-026 / SC-052 / SC-053 (support SC-054, SC-127–132 content-only) |
| Estimated Scope | Docs + read-only Node audit tools + fixtures/tests |
| Phase | 3 — Implementation (analysis package) |
| Correct tool | Cursor / GitHub |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Later decisions/actions only; not required during analysis |

## 1. Work completed

Created a full consolidation readiness package:

- Dependency inventory (Package A)
- Schema comparison (Package B)
- Migration map MD + JSON (Package C)
- Duplicate/orphan detector + fixtures/tests (Package D)
- Presentation field spec (Package E)
- Content quality rules + validator + tests (Package F)
- Curriculum/media inventory (Package G)
- Migration runbook with rollback (Package H)
- Mike decisions + actions (Package I)
- REPORT / RESULTS / MASTER-UPDATE-PROPOSAL

## 2. SC items addressed

| SC | Treatment |
|----|-----------|
| SC-052 | Analysis + tooling readiness; proposed **Ready for DEV execution** |
| SC-053 | Spec/runbook only; proposed **Blocked on SC-052 execution** |
| SC-054 | Supporting Presentation content spec only |
| SC-127–SC-132 | Content-only dependency check — no Tutorials merge coupling |

## 3. Dependencies found

- **Critical positive:** Web queries/routes bind exclusively to `Tutorials` + `OK to Publish on Softr` + `Web - Tutorials Catalog`.
- **Critical unknown:** Softr/Interface bindings; live row counts.
- **Negative evidence:** No automation, Make, or extension-script references to either tutorials table; both tables have `link fields: 0`.

## 4. Duplicate risks

- Same URL / attachment IDs with metadata drift → `conflicting` / `probable_duplicate`
- Published orphan vs unpublished canonical draft
- Title-only similarity explicitly **not** sufficient for deletion

## 5. Orphan risks

- `Tutorials & Assets` is a **code orphan** (no repo consumers)
- Unmapped `Assignment Rationale` and `Informational` type
- Incomplete blank-URL rows
- Possible external Softr orphan usage still unproven

## 6. Migration artifacts created

See directory listing under `docs/online-agents/tutorials-content/` and tools under `tools/tutorials-content/`.

## 7. Tests and results

```bash
cd tools/tutorials-content && npm test
```

- **19/19 passed**
- Fixture duplicate summary: 5 pairs, 6 orphans, 1 incomplete (see `RESULTS.json`)
- Quality CLI exits non-zero when published fixtures fail (expected)

## 8. Public-content risks

- Softr-named publish gate still in use
- Primary `Name` still public title
- Private email / internal language must be blocked by quality gate
- Orphan athlete select contains real 2025–26 names

## 9. Mike actions and decisions

See `MIKE-DECISIONS.md` (D1–D5) and `MIKE-ACTIONS.md` (A1–A10).

## 10. Proposed status changes

Do not mark SC-052/SC-053 Complete. See `MASTER-UPDATE-PROPOSAL.md`.

## 11–13. Git

Recorded in final agent response after push: commit SHAs, push status, clean tree.
)
