# PROD Schema Export — Foundation Reset Pack

| Field | Value |
|-------|--------|
| Environment | **PROD** |
| Base ID | `appn84sqPw03zEbTT` |
| Base name | 127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026 |
| Export date | **2026-07-23** |
| Snapshot folder (pre Testing Scenarios create) | `airtable/schema/snapshots/prod-foundation-reset-20260723/` |
| Snapshot folder (post Testing Scenarios create) | `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/` (**prefer this**) |
| Completeness | **Complete for tables/fields/formulas/links/views metadata available via Metadata API** |
| Historical snapshots | Preserved (not overwritten), e.g. `prod-20260706/` |

## What this export contains

- Table names + table IDs
- Field names + field IDs + types
- Linked tables, formulas, lookups, rollups (where exposed)
- Single-select options (in raw/enhanced JSON)
- View names + view IDs (filter definitions are **not** available via API)
- Base summary, dependencies, field index, ERD, health report

## Counts (from export)

- Tables: **30**
- See `base_summary_*.json` and `export_health_report_*.json` for details.

## Notes

- **Testing Scenarios** was **absent** at export time and was created afterward (`tblagI7Q5wXQm2XGS`). Re-export after Foundation Reset close-out if a post-create snapshot is needed.
- `airtable/schema/current/` remains stale hand maps — do not treat as current.

## Manifest pointer

Latest manifest in this folder: `manifest_appn84sqPw03zEbTT_latest.json`

```json
{
  "generatedAt": "2026-07-23T15:15:00",
  "scriptVersion": "2.4.0",
  "baseId": "appn84sqPw03zEbTT",
  "baseName": "127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026",
  "selectedTables": [],
  "files": {
    "rawSchema": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\schema_raw_appn84sqPw03zEbTT_20260723_151357.json",
    "enhancedSchema": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\schema_enhanced_appn84sqPw03zEbTT_20260723_151357.json",
    "dependencies": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\dependencies_appn84sqPw03zEbTT_20260723_151357.json",
    "viewsBasicJson": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\views_basic_appn84sqPw03zEbTT_20260723_151357.json",
    "viewsDetailedJson": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\views_detailed_appn84sqPw03zEbTT_20260723_151357.json",
    "viewsMarkdown": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\views_appn84sqPw03zEbTT_20260723_151357.md",
    "baseSummary": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\base_summary_appn84sqPw03zEbTT_20260723_151357.json",
    "healthReport": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\export_health_report_appn84sqPw03zEbTT_20260723_151357.json",
    "fieldIndex": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\field_index_appn84sqPw03zEbTT_20260723_151357.json",
    "invalidFields": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\invalid_fields_appn84sqPw03zEbTT_20260723_151357.json",
    "complexFormulas": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\complex_formulas_appn84sqPw03zEbTT_20260723_151357.json",
    "schemaMarkdown": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\schema_doc_appn84sqPw03zEbTT_20260723_151357.md",
    "mermaidERD": "airtable\\schema\\snapshots\\prod-foundation-reset-20260723\\schema_erd_appn84sqPw03zEbTT_20260723_151357.mmd",
    "workflowCompanio
```
