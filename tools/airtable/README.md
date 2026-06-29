# Airtable Schema Exporter

Exports schema metadata and optional record audits from the **127 SI Shooting Challenge** Airtable base.

GitHub holds the script and dated snapshots. Airtable remains the live production base.

## Setup

```bash
cd tools/airtable
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with your Personal Access Token and base ID. The token needs **`schema.bases:read`** on this base (and `data.records:read` only if using `--include-record-audits`).

## Views (not exported — expected)

**Airtable view metadata is not exported** for this base. Do not treat empty `views_*.json` or a views API 404 as a problem to fix.

- Snapshots include **tables, fields, formulas, and links** only.
- View names and filters for the web app live in [`web/docs/airtable-views.md`](../../web/docs/airtable-views.md).
- Use `--skip-views` if you want slightly faster runs (default full export already skips meaningful view data).

See [`airtable/schema/snapshots/README.md`](../../airtable/schema/snapshots/README.md).

## Schema export (default)

Writes timestamped files to `airtable/schema/snapshots/`:

```bash
python export_airtable_schema.py -v
```

### Other programs

JR Referee Clinics, Tournament Brackets, and Dribble Challenge each have their own repo and `tools/airtable/` exporter. See [docs/MULTI-REPO-ARCHITECTURE.md](../../docs/MULTI-REPO-ARCHITECTURE.md).

Subset of tables:

```bash
python export_airtable_schema.py -v --only "Enrollments,Submissions,Weeks"
```

Skip views (optional; views are not exported anyway — see **Views (not exported)** above):

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
