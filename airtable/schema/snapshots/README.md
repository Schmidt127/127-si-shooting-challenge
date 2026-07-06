# Schema snapshots

Dated exports from `tools/airtable/export_airtable_schema.py`.

| Base | ID | Latest snapshot |
|------|-----|-----------------|
| **Production** | `appn84sqPw03zEbTT` | `prod-20260706/` — `20260706_161830` — `manifest_appn84sqPw03zEbTT_latest.json` |
| **Development** | `appTetnuCZlCZdTCT` | `dev-20260706/` — `20260706_161606` — `manifest_appTetnuCZlCZdTCT_latest.json` |

Prior snapshots: `20260629_045741` (prod), `dev-20260705/` (DEV).

## Export commands

```powershell
cd tools/airtable
# Production (read-only API export — does not change the live base)
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
# Development
python export_airtable_schema.py -v --base-id appTetnuCZlCZdTCT --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
```

## What is exported

| Included | Production (2026-07-06) | DEV (2026-07-06) |
|----------|-------------------------|------------------|
| Tables, fields, types, formulas, links | **29 tables** | **30 tables** (+ **Testing Scenarios**) |
| `schema_doc_*.md`, ERD, dependencies, health report | Yes | Yes |
| View metadata | **118 views** | **120 views** |

## DEV vs Production schema delta (2026-07-06)

| Item | DEV only |
|------|----------|
| **Testing Scenarios** table | C-020 Engineering Test Framework operator table |
| Inverse links on pipeline tables | Submissions, Enrollments, Homework Completions, Final Reflection Quiz Submissions → Testing Scenarios |

## Views policy

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing

## Refresh

Commit new snapshot folders + manifests. Note in `CHANGELOG.md` under `### Airtable` when production schema is refreshed.
