# Schema Refresh — 2026-08-19

Read-only Metadata API export of **Production** and **DEV** Shooting Challenge bases. No live schema or data changes were made.

| Field | Value |
|-------|--------|
| Export date | **2026-08-19** |
| Export script | `tools/airtable/export_airtable_schema.py` v2.4.0 |
| Branch | `cursor/schema-refresh-0575` |

## Snapshot folders (current authority)

| Base | ID | Folder | Stamp | Tables | Views |
|------|-----|--------|-------|--------|-------|
| **Production** | `appn84sqPw03zEbTT` | `airtable/schema/snapshots/prod-20260819/` | `20260819_184903` | **32** | **126** |
| **Development** | `appTetnuCZlCZdTCT` | `airtable/schema/snapshots/dev-20260819/` | `20260819_185013` | **32** | **129** |

Manifests: `manifest_appn84sqPw03zEbTT_latest.json`, `manifest_appTetnuCZlCZdTCT_latest.json`

Prior dated snapshots remain preserved (not overwritten), including `prod-20260706/`, `dev-20260706/`, and foundation-reset exports.

## Production changes vs `prod-20260706` (2026-07-06)

| Category | Detail |
|----------|--------|
| Table count | **29 → 32** |
| View count | **118 → 126** |
| **Added** | `Testing Scenarios`, `Homework Library`, `Program Homework Assignments`, `Email Handoff Queue`, `Zoom Attendance` |
| **Removed** | `FBC Curriculum - SYNC`, standalone `Tutorials` |
| **Renamed** | `Program Instance - Synced` → **`Program Instance - Sync`** |
| **Retained** | `Tutorials & Assets` (tutorial media assets) |

### Homework model (PROD)

- Reusable lesson content lives in **`Homework Library`**.
- Season/week scheduling lives in **`Program Homework Assignments`** (links Homework Library + Week + Program Instance).
- Web app (`web/lib/airtable/homework-queries.ts`) already reads this split; older docs referencing `FBC Curriculum - SYNC` are historical.

### Email pipeline (PROD)

- **`Email Handoff Queue`** table present (Make/email handoff support).

## DEV vs Production delta (2026-08-19)

Expected divergence — DEV has not yet received the homework-library migration pack.

| Item | PROD only | DEV only |
|------|-----------|----------|
| Tables | `Homework Library`, `Program Homework Assignments`, `Email Handoff Queue`, `Program Instance - Sync` | `FBC Curriculum - SYNC`, `Program Instance - Synced`, standalone `Tutorials`, `SYNC - Brackets` |
| Naming | `School - Synced` | `School - Synced` (both) |

Both bases now include **`Testing Scenarios`** (C-020).

## Health report highlights (PROD)

- **51** warnings (mostly high computed-field counts and expected self-links).
- **2 invalid fields** in `invalid_fields_*.json`:
  - `Homework Library.Lesson Key` — formula marked invalid (fix in OMNI when homework pack is next touched).
  - `Submissions.Week Lkp` — lookup marked invalid (legacy homework-name link path).

## Operator / doc follow-ups (not done in this refresh)

1. Fix `Homework Library.Lesson Key` formula in PROD when Mike authorizes schema work.
2. Align DEV to PROD homework tables (`Homework Library` + `Program Homework Assignments`) before DEV-first automation testing of homework paths.
3. Refresh `airtable/schema/current/table-map.md` and `field-map.md` when a dedicated Agent A pass is scheduled (hand maps still stale).
4. Update `web/docs/airtable-views.md` homework section if `Web - Homework Catalog` view name moved off the old curriculum table (verify in Airtable UI).

## Export commands (repeat)

```bash
cd tools/airtable
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
python export_airtable_schema.py -v --base-id appTetnuCZlCZdTCT --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
```
