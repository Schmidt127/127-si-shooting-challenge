# Schema Refresh — 2026-08-19

Read-only Metadata API export of the **Production** Shooting Challenge base. No live schema or data changes were made.

| Field | Value |
|-------|--------|
| Export date | **2026-08-19** |
| Export script | `tools/airtable/export_airtable_schema.py` v2.4.0 |
| Live base | **Production only** — `appn84sqPw03zEbTT` |

**Mike (2026-08-19):** No separate DEV base is in use. All Shooting Challenge Airtable work is in Production. A `dev-20260819/` folder may exist in the repo from an export mistake — treat it as **non-authoritative**; do not plan against it.

## Snapshot folder (current authority)

| Base | ID | Folder | Stamp | Tables | Views |
|------|-----|--------|-------|--------|-------|
| **Production** | `appn84sqPw03zEbTT` | `airtable/schema/snapshots/prod-20260819/` | `20260819_184903` | **32** | **126** |

Manifest: `manifest_appn84sqPw03zEbTT_latest.json`

Prior dated snapshots remain preserved (not overwritten), including `prod-20260706/` and foundation-reset exports.

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
- Web app (`web/lib/airtable/homework-queries.ts`) reads this split; older docs referencing `FBC Curriculum - SYNC` are historical.

### Email pipeline (PROD)

- **`Email Handoff Queue`** table present (Communications Hub / Resend handoff).

## Health report highlights (PROD snapshot — 2026-08-19 export)

- **51** warnings (mostly high computed-field counts and expected self-links).
- **Invalid fields at export time** (`invalid_fields_*.json`):
  - `Homework Library.Lesson Key` — **deleted in PROD** (Mike 2026-08-19). Per cutover plan; schedule identity is PHA.`Schedule Key`, content identity is Homework Library.`Record Id`.
  - `Submissions.Week Lkp` — **deleted in PROD** (Mike 2026-08-19). Legacy lookup from `Homework Name 1` → library week; submission week is **`Submissions.Week`** (written by 005).

## Operator / doc follow-ups

1. ~~`Homework Library.Lesson Key`~~ — **done** (deleted in PROD, Mike 2026-08-19).
2. ~~`Submissions.Week Lkp`~~ — **done** (deleted in PROD, Mike 2026-08-19).
3. Refresh `airtable/schema/current/table-map.md` and `field-map.md` when a dedicated Agent A pass is scheduled (pointers updated 2026-08-19; full hand inventory still open).
4. Track homework cutover progress: [`HOMEWORK-CUTOVER-OPERATOR-CHECKLIST-2026-08-19.md`](./HOMEWORK-CUTOVER-OPERATOR-CHECKLIST-2026-08-19.md).
5. Optional: re-export PROD snapshot after homework-library field cleanup to clear stale fields from `prod-20260819/`.

## Export command (repeat)

```bash
cd tools/airtable
python export_airtable_schema.py -v --base-id appn84sqPw03zEbTT --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
```
