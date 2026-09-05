# SC-163 — Pre-conversion rollback evidence

**Generated:** 2026-09-05T14:51:28.547408+00:00  
**Base:** `appn84sqPw03zEbTT`  
**Production writes:** none  

## Snapshot files

- `docs/audits/SC-163-preconversion-snapshot-20260905.json`

## Counts

| Category | Count |
|---|---:|
| blank_and_not_met | 3 |
| blank_but_met_provable | 1 |
| nonblank_equal_to_crossing | 0 |
| nonblank_and_different | 0 |
| met_but_unprovable | 0 |
| nonblank_not_met | 0 |
| other | 0 |

**Nonblank Goal Met Date lookups:** 0

## Conversion expectation

- Expected behavior: **cleared**
- Confidence: high
- Rationale:
  - Lookup values are computed arrays from linked Award Recipients; they are not stored writable cell values.
  - Converting the field to a writable date type replaces the computed lookup with an empty writable date field.
  - Airtable does not materialize lookup arrays into stored date cells during this conversion.
  - Conversion is not expected to be blocked for lookup → date in the field-type UI.
  - This assessment is read-only / not live-proven; Mike should verify the field is blank immediately after conversion before paste/backfill.

## Rollback

1. Keep this snapshot JSON as the pre-conversion authority for lookup/award dates.
2. After conversion, if a stored Goal Met Date equals a snapshot `lookup_goal_met_date` / award date and differs from `computed_first_date`, treat it as **legacy pollution** — clear or replace only with a provable crossing (backfill migration mode).
3. Do **not** convert Goal Met Date back to Award Recipients lookup (reintroduces pollution).
4. If 066 v4.0 was pasted and must roll back automation only, re-paste prior 066 v3.9; leave the writable date field.

## Provable writes planned after conversion (blanks)

| Athlete | Enrollment | Computed crossing | Shots/Target |
|---|---|---|---|
| Athlete1 Schmidt | `recZEwkkXTJanDlG6` | 2026-08-30 | 6331/2000 |
