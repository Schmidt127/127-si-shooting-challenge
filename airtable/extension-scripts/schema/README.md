# Extension Schema Export

## Why this folder exists

`export-base-schema-snapshot.js` runs **inside the Airtable Scripting extension** (uses `base.tables`, not the Meta API). It lives here—not under `tools/airtable/`—because it is an extension script like audits and backfills.

Use it when `tools/airtable/export_airtable_schema.py` returns **403** on schema/meta endpoints but you still have editor access to the base.

## Script

| File | Purpose |
|------|---------|
| `export-base-schema-snapshot.js` | Dump table + field definitions to console JSON |

## Workflow

1. Paste script into Airtable Scripting extension.
2. Run (read-only).
3. Copy console JSON to `airtable/schema/snapshots/YYYY-MM-DD/schema_scripting_export.json`.
4. Optionally run Python export later when PAT scopes allow meta API.

## Related

- [tools/airtable/README.md](../../../tools/airtable/README.md) — full schema export pipeline
- [schema/current/](../../schema/current/) — human-readable schema notes
