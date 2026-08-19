# Schema snapshots

Dated exports from `tools/airtable/export_airtable_schema.py`.

| Base | ID | Latest snapshot |
|------|-----|-----------------|
| **Production** | `appn84sqPw03zEbTT` | **`prod-foundation-reset-20260723-post-ts/`** — `20260723_152229` (includes Testing Scenarios). Pre-create export: `prod-foundation-reset-20260723/`. Older: `prod-20260706/` |

Prior snapshots: `20260629_045741` (prod), `prod-20260705/` (Production). Foundation Reset index: [`docs/foundation-reset/README.md`](../../../docs/foundation-reset/README.md).

## Export commands

```powershell
cd tools/airtable
# Production (read-only API export — does not change the live base)
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
```

## What is exported

| Included | Production |
|----------|------------|
| Tables, fields, types, formulas, links | Yes |
| `schema_doc_*.md`, ERD, dependencies, health report | Yes |
| View metadata | Yes |

## Views policy

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing

## Refresh

Commit new snapshot folders + manifests. Note in `CHANGELOG.md` under `### Airtable` when production schema is refreshed.
