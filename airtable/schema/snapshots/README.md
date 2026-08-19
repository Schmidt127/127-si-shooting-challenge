# Schema snapshots

Dated exports from `tools/airtable/export_airtable_schema.py`.

| Base | ID | Latest snapshot |
|------|-----|-----------------|
| **Production** | `appn84sqPw03zEbTT` | **`prod-20260819/`** — `20260819_184903` (32 tables, 126 views). Summary: [`docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md`](../../../docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md) |

**Mike (2026-08-19):** Shooting Challenge uses **Production only**. No separate DEV base is in active use. Historical `dev-*` folders (e.g. `dev-20260706/`, `dev-20260819/`) are preserved for archaeology — do not treat as current authority.

Older snapshots: `prod-20260706/`, `prod-foundation-reset-20260723-post-ts/`, loose root exports (`20260629_045741`, etc.). Foundation Reset index: [`docs/foundation-reset/README.md`](../../../docs/foundation-reset/README.md).

## Export command

```bash
cd tools/airtable
# Production (read-only API export — does not change the live base)
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
```

## What is exported (Production 2026-08-19)

| Included | Count |
|----------|-------|
| Tables, fields, types, formulas, links | **32 tables** |
| `schema_doc_*.md`, ERD, dependencies, health report | Yes |
| View metadata | **126 views** |
| JSON artifacts | raw, enhanced, field index, manifest |

## Views policy

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing

## Refresh

Commit new PROD snapshot folders + manifests. Note in `CHANGELOG.md` under `### Airtable` when production schema is refreshed.
