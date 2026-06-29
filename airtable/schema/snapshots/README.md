# Schema snapshots

Dated exports from `tools/airtable/export_airtable_schema.py` for base `appn84sqPw03zEbTT`.

**Latest:** `20260629_045741` — see `manifest_appn84sqPw03zEbTT_latest.json`.

## What is exported

| Included | Not included |
|----------|----------------|
| Tables, fields, types, formulas, links | **Airtable views** (filters, sorts, visible columns) |
| `schema_doc_*.md`, `schema_enhanced_*.json`, ERD, dependencies | View metadata API — **not available on this base/plan** |

## Views policy (expected)

**View definitions are not exported from Airtable** for this project. That is intentional infrastructure policy, not a failed export.

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing
- Snapshot runs still write empty `views_*.md` / `views_*.json` stubs for exporter compatibility — ignore view counts of zero

## Refresh

```bash
cd tools/airtable
python export_airtable_schema.py -v
```

Commit new `*_YYYYMMDD_HHMMSS*` files + updated manifest. Note in `CHANGELOG.md` under `### Airtable`.
