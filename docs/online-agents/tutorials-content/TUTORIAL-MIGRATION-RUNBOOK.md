# Tutorial Migration Runbook (Future Execution)

**Agent:** Online Agent 8  
**Date:** 2026-07-23  
**Status:** Procedure only — **do not execute migration in this package**  
**Canonical keep table:** `Tutorials` (`tbldfoVGdhqATi4MS`)  
**Source/orphan candidate:** `Tutorials & Assets` (`tblDOTgsWfqPm18bw`)

## Preconditions

- [ ] Work in **DEV** first unless Mike authorizes a named PROD check.
- [ ] No field renames during merge.
- [ ] No table deletion until step 14 decision.
- [ ] Website must keep reading `Tutorials` only.
- [ ] Tools available: `tools/tutorials-content/` + fixtures pattern.
- [ ] Mapping docs current: `TUTORIAL-MIGRATION-MAP.md` / `tutorial-migration-map.json`.

## Exact procedure

### 1. Fresh schema / export

1. Export current schema snapshot for the target base (DEV, then PROD when authorized).  
2. Export **all rows + fields + attachments metadata** for:
   - `Tutorials`
   - `Tutorials & Assets`
3. Store exports outside git secrets paths; sanitized fixtures may be added under `tests/fixtures/tutorials-content/` if non-sensitive.

**Exit criteria:** Field shapes still match `TABLE-COMPARISON.md` or comparison doc is updated.

### 2. Dependency check

1. Re-run repository search for `Tutorials & Assets` / table IDs.  
2. Confirm web still binds to `Tutorials` (`web/lib/airtable/queries.ts`).  
3. Confirm automations/Make/extensions still have **zero** references.  
4. In Airtable UI / Softr: list views, interfaces, and Softr pages bound to either table (**required human check**).

**Exit criteria:** Dependency inventory updated; no unknown critical writers.

### 3. Source-record export

1. Normalize JSON to `{ id, fields }` records.  
2. Strip BOM from orphan primary field values.  
3. Preserve sidecar of unmapped fields (`Assignment Rationale`, `Informational` types).

### 4. Dry-run mapping

1. Apply `tutorial-migration-map.json` transforms in a script or spreadsheet.  
2. Emit proposed target payloads **without writing**.  
3. Default publish = `false` unless source mapped publish is true **and** quality errors = 0 **and** no conflict.

### 5. Duplicate report

```bash
cd tools/tutorials-content
node bin/audit-duplicates.js --source /path/source.json --target /path/target.json --out /tmp/tutorial-dupes.json
```

Review classifications: exact / probable / related / conflicting.

### 6. Orphan report

From the same audit output, list `orphans[]` and `incomplete[]`.

Flag any orphan with `has_linked_homework` or `has_linked_learning_activity` (should be rare; schema shows no links — treat fixture/export extensions seriously if present).

### 7. Manual collision decisions

Resolve using `MIKE-DECISIONS.md`:

- Conflicting metadata
- Published vs unpublished pairs
- `Informational` type rows
- Incomplete unpublished rows keep/skip
- Obsolete shout-outs with hardcoded athlete names

**No title-only automatic deletion.**

### 8. Target-record creation / update

In DEV:

1. For exact/probable approved matches → **update gaps** on existing `Tutorials` rows (preserve `rec` IDs).  
2. For true orphans approved to keep → **create** new `Tutorials` rows.  
3. Leave publish false until step 12.  
4. Do not write computed fields (none today on these tables).

### 9. Link migration

1. Because both tables have `link fields: 0`, Airtable inverse-link rewrites are not expected.  
2. Still re-point any Softr/Interface/external bookmarks from orphan table → `Tutorials`.  
3. If any non-repo integration stored orphan `rec` IDs, map old→new IDs in a spreadsheet and update those systems.

### 10. Website query verification

1. Hit `/shoot/tutorials`, `/shoot/shoutouts`, `/shoot/articles` against DEV data (or mocked).  
2. Confirm view `Web - Tutorials Catalog` or filter fallback still returns expected rows.  
3. Confirm detail pages resolve by Tutorials `rec` IDs.  
4. Confirm no code points at `Tutorials & Assets`.

### 11. Softr verification

1. Open every known Softr page using tutorial content.  
2. Confirm none require the orphan table.  
3. If any still do, stop — do not delete orphan table.

### 12. Publish-state verification

```bash
node bin/validate-content-quality.js --input /path/mapped-or-live-export.json
```

1. Only promote publish on rows with zero error-severity failures.  
2. Re-check published vs unpublished conflicts.  
3. Spot-check public pages after publish flags flip.

### 13. Rollback validation

Before PROD publish flips / deletion:

1. Keep full pre-migration export of both tables.  
2. Keep old→new ID map.  
3. Verify restore path:
   - Recreate deleted Tutorials rows from export if needed.
   - Restore publish flags from pre-migration snapshot.
   - Re-import orphan table from export if it was deleted prematurely (should not happen before step 14).
4. Run website smoke after rollback drill in DEV.

### 14. Orphan-table deletion decision

Delete `Tutorials & Assets` **only if all are true**:

1. Dependency check clear (repo + Softr/Interfaces + Make).  
2. All unique valuable rows migrated or explicitly discarded.  
3. Website verification passed.  
4. Publish-state verification passed.  
5. Mike confirms deletion (`MIKE-DECISIONS.md` / `MIKE-ACTIONS.md`).  
6. Rollback export retained.

If any check fails → **archive/hide table** instead of delete.

## Rollback steps (condensed)

1. Stop publish changes.  
2. Restore `Tutorials` rows/fields from pre-migration export.  
3. Restore publish flags.  
4. If orphan table deleted, recreate from export (name + fields + rows).  
5. Re-verify website + Softr.  
6. Record incident notes in session handoff (not completion master).

## Out of scope for this runbook

- Live execution by Online Agent 8  
- Field renames (`OK to Publish on Softr` → `Published?`)  
- Presentation field creation  
- Website code edits  
- Historical data preservation guarantees for discarded orphan rows
