# JR Ref schema snapshots

Dated exports from **127SI - JR REF** via `tools/airtable/jr-ref/export_schema.py`.

## Layout

```
snapshots/
└── YYYY-MM-DD/
    ├── schema_doc_*.md      ← start here (human-readable)
    ├── schema_raw_*.json
    ├── field_index_*.json
    ├── views_*.md
    └── manifest_*_latest.json
```

## When to snapshot

- Before statewide schema changes
- After adding tables/fields for new regions or clinic sessions
- Before wiring a new web page to Airtable

Commit the dated folder to GitHub and note in `CHANGELOG.md` under `### JR Ref / Airtable`.
