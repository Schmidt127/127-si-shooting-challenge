# JR Ref — extension scripts

In-base Airtable Scripting extension scripts for **127SI - JR REF**.

## Folders

| Folder | Purpose |
|--------|---------|
| `audits/` | Read-only integrity reports (dry-run) |
| `schema/` | In-base schema export when Meta API returns 403 |

## Audits

Add scripts as the statewide base grows (roster parity, duplicate Fillout rows, assignment gaps).

Start with copies of Shooting Challenge audit patterns only where the same pipeline exists — JR Ref will have its own checks.

## Schema export (in-base)

If `tools/airtable/jr-ref/export_schema.py` fails with 403 on schema endpoints, paste `schema/export-base-schema-snapshot.js` into the Scripting extension (adapt from `extension-scripts/schema/export-base-schema-snapshot.js`).

Save console JSON to `airtable/schema/jr-ref/snapshots/YYYY-MM-DD/schema_scripting_export.json`.
