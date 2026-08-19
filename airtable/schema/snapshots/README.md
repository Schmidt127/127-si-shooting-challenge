# Schema snapshots

Dated exports from `tools/airtable/export_airtable_schema.py`.

| Base | ID | Latest snapshot |
|------|-----|-----------------|
| **Production** | `appn84sqPw03zEbTT` | **`prod-20260819/`** — `20260819_184903` (32 tables, 126 views). Summary: [`docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md`](../../../docs/deploy-checklists/SCHEMA-REFRESH-2026-08-19.md) |
| **Development** | `appTetnuCZlCZdTCT` | **`dev-20260819/`** — `20260819_185013` (32 tables, 129 views) |

Older snapshots: `prod-20260706/`, `dev-20260706/`, `prod-foundation-reset-20260723-post-ts/`, loose root exports (`20260629_045741`, etc.). Foundation Reset index: [`docs/foundation-reset/README.md`](../../../docs/foundation-reset/README.md).

## Export commands

```bash
cd tools/airtable
# Production (read-only API export — does not change the live base)
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
# Development
python export_airtable_schema.py -v --base-id appTetnuCZlCZdTCT --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
```

## What is exported

| Included | Production (2026-08-19) | DEV (2026-08-19) |
|----------|-------------------------|------------------|
| Tables, fields, types, formulas, links | **32 tables** | **32 tables** |
| `schema_doc_*.md`, ERD, dependencies, health report | Yes | Yes |
| View metadata | **126 views** | **129 views** |
| JSON artifacts | raw, enhanced, field index, manifests | same |

## PROD vs DEV schema delta (2026-08-19)

| Item | PROD | DEV |
|------|------|-----|
| Homework content | `Homework Library` + `Program Homework Assignments` | Legacy `FBC Curriculum - SYNC` |
| Program Instance table | `Program Instance - Sync` | `Program Instance - Synced` |
| Tutorial content | `Tutorials & Assets` (+ app reads legacy `Tutorials` name where still present) | `Tutorials` + `Tutorials & Assets` |
| Email handoff | `Email Handoff Queue` | absent |
| Brackets sync | absent | `SYNC - Brackets` |
| C-020 | `Testing Scenarios` | `Testing Scenarios` |

## Views policy

- Web app view names → [`web/docs/airtable-views.md`](../../../web/docs/airtable-views.md)
- Audit scripts use `filterByFormula` fallbacks when a named view is missing

## Refresh

Commit new snapshot folders + manifests. Note in `CHANGELOG.md` under `### Airtable` when production schema is refreshed.
