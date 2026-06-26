# JR Ref schema exporter

Exports schema metadata from **127SI - JR REF** into `airtable/schema/jr-ref/snapshots/`.

Uses the same engine as Shooting Challenge: `../export_airtable_schema.py`.

## Setup

```powershell
cd tools\airtable\jr-ref
pip install -r ..\requirements.txt
copy .env.example .env
```

Edit `.env`:

- `AIRTABLE_TOKEN` — PAT with `schema.bases:read` on the JR REF base
- `JR_REF_AIRTABLE_BASE_ID` — from Airtable → Help → API documentation

## Export

```powershell
python export_schema.py -v
```

Subset of tables:

```powershell
python export_schema.py -v --only "JR Ref Participants,Mentor Montana Officials,Teams"
```

Faster (skip views):

```powershell
python export_schema.py -v --skip-views
```

## After export

1. Open `airtable/schema/jr-ref/snapshots/<date>/schema_doc_*.md`
2. Update `airtable/schema/jr-ref/current/table-map.md` and `field-map.md`
3. Update `web/docs/jr-ref/airtable-data-map.md`
4. Commit snapshot folder + doc updates
5. Note in `CHANGELOG.md` under `### JR Ref / Airtable`

## Verify PAT

```powershell
cd ..\..
python verify_airtable_pat.py
```

(Uses `tools/airtable/.env` for Shooting base — or point env at JR REF base temporarily.)

## Related

- [docs/jr-ref/getting-started.md](../../../docs/jr-ref/getting-started.md)
- [extension-scripts/jr-ref/README.md](../../../airtable/extension-scripts/jr-ref/README.md)
