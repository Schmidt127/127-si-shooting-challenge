# Schema snapshots

Dated read-only exports from `tools/airtable/export_airtable_schema.py`.

| Base | ID | Latest snapshot |
|------|----|-----------------|
| **Production** | `appn84sqPw03zEbTT` | **`prod-20260819/`** — `20260819_184903` (32 tables, 126 views). Summary: [`docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md`](../../../docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md) |

Older production snapshots include `prod-20260706/`, `prod-foundation-reset-20260723-post-ts/`, and loose root exports.

## Export command

```bash
cd tools/airtable
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
```

## What is exported

| Included | Production |
|----------|------------|
| Tables, fields, types, formulas, links | **32 tables** |
| `schema_doc_*.md`, ERD, dependencies, health report | Yes |
| View metadata | **126 views** |
| JSON artifacts | Raw schema, enhanced schema, field index, and manifest |

## Views policy

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing

## Refresh

Commit new production snapshot folders and manifests. Record refreshes in `CHANGELOG.md` under `### Airtable`.
