# Airtable Schema Exporter

Exports schema metadata and optional record audits from the **127 SI Shooting Challenge** Airtable base.

GitHub holds the script and dated snapshots. Airtable remains the live production base.

## Setup

```bash
cd tools/airtable
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with your Personal Access Token and base ID. The token needs schema (and record) read scopes for the target base.

## Schema export (default)

Writes timestamped files to `airtable/schema/snapshots/`:

```bash
python export_airtable_schema.py -v
```

Subset of tables:

```bash
python export_airtable_schema.py -v --only "Enrollments,Submissions,Weeks"
```

Skip views (faster):

```bash
python export_airtable_schema.py -v --skip-views
```

Custom output folder:

```bash
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/2026-06-20
```

## Record audits (optional)

Requires data record read access. Fetches records and writes operational audit JSON reports:

```bash
python export_airtable_schema.py -v --include-record-audits --out-dir ../../airtable/schema/snapshots/2026-06-20/audits
```

Audit reports include record counts, select usage, blank key fields, duplicate keys, XP Events health, date mismatches, level gate blockers, and homework pipeline checks.

## Outputs

Each run writes files such as:

- `schema_raw_*.json` / `schema_enhanced_*.json`
- `schema_doc_*.md` — human-readable schema snapshot
- `base_summary_*.json`, `export_health_report_*.json`
- `field_index_*.json`, `dependencies_*.json`
- `manifest_*_latest.json` — index of all files from the run

After a meaningful schema change, commit the dated snapshot folder and note it in `CHANGELOG.md`.

## Related docs

- Hand-maintained schema notes: `airtable/schema/current/`
- Airtable extension audits (in-base JS): `airtable/extension-scripts/audits/`
