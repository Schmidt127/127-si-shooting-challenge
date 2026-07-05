# Schema snapshots

Dated exports from `tools/airtable/export_airtable_schema.py`.

| Base | ID | Latest snapshot |
|------|-----|-----------------|
| **Production** | `appn84sqPw03zEbTT` | `20260629_045741` — `manifest_appn84sqPw03zEbTT_latest.json` |
| **Development** | `appTetnuCZlCZdTCT` | `dev-20260705/` — `20260705_175034` — `manifest_appTetnuCZlCZdTCT_latest.json` |

DEV export command:

```powershell
cd tools/airtable
python export_airtable_schema.py -v --base-id appTetnuCZlCZdTCT --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
```

## What is exported

| Included | Production notes | DEV notes (2026-07-05) |
|----------|------------------|------------------------|
| Tables, fields, types, formulas, links | Yes | Yes — **29 tables** |
| `schema_doc_*.md`, ERD, dependencies, health report | Yes | Yes |
| View metadata | Often empty stubs on prod | **119 views** exported on DEV clone |

## Views policy

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing
- Production snapshot runs may write empty `views_*.md` stubs — ignore zero view counts on prod exports

## Refresh

```powershell
cd tools/airtable
# Production (default BASE_ID in .env)
python export_airtable_schema.py -v
# Development
python export_airtable_schema.py -v --base-id appTetnuCZlCZdTCT --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
```

Commit new snapshot folders + manifests. Note in `CHANGELOG.md` under `### Airtable` when production schema is refreshed.
