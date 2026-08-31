# FUT-002 batch-1 — delete five quarantined fields (Mike UI)

**Date opened:** 2026-08-30  
**Date closed:** 2026-08-31  
**Status:** **COMPLETE** — Mike deleted all five fields in Airtable UI; live verify PASS  
**Base:** [127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026](https://airtable.com/appn84sqPw03zEbTT) (`appn84sqPw03zEbTT`)  
**API:** Field DELETE is **not supported** by Airtable Meta API (`DELETE …/fields/{id}` → `404 NOT_FOUND`). MCP has `update_field` only. **UI delete was required and completed.**

## Hard stops (still apply to later batches)

- Delete **only** fields whose **current** name begins with `ZZZ DELETE —`.
- Do **not** delete Config Drive roots, Email Handoff fields, Tremendous fields, Synced School fields, or any non-`ZZZ DELETE —` field.
- Do **not** restore Automation **075**.
- Do **not** delete Weeks, records, or S3 objects.

## Fields deleted (batch 1)

| # | Table | Former live name | Field ID | Status |
|---|-------|------------------|----------|--------|
| 1 | Homework Completions | `ZZZ DELETE — Submission Asset Review Summary (invalid legacy)` | `fldHchlovIaPlGKLk` | **DELETED** |
| 2 | Levels | `ZZZ DELETE — Enrollments 3 (accidental empty)` | `fldTzIGODB2e03rvE` | **DELETED** |
| 3 | Streak Occurrences | `ZZZ DELETE — Challenge / Season (empty backfill)` | `fldltgFPGVXHwRj4X` | **DELETED** |
| 4 | Streak Occurrences | `ZZZ DELETE — Backfill Run Label (empty backfill)` | `fldBFDl629arXFcnp` | **DELETED** |
| 5 | Achievements | `ZZZ DELETE — Uses Grade Band Scaling? (unused empty)` | `fldkIzG5emvUBQ0Tw` | **DELETED** |

## Post-delete verification (2026-08-31)

```powershell
python tools/airtable/fut_002_live_verify_batch1.py --baseline docs/testing/evidence/fut-002/batch1-baseline.json --json-out docs/testing/evidence/fut-002/batch1-live-verify.json
python tools/airtable/export_airtable_schema.py -v --skip-views --out-dir airtable/schema/snapshots/prod-20260831-fut002-batch1
python tools/airtable/fut_002_field_inventory.py --snapshot airtable/schema/snapshots/prod-20260831-fut002-batch1/schema_doc_appn84sqPw03zEbTT_20260831_070120.md --out docs/audits/fut-002-unused-field-inventory.json
```

| Check | Result |
|-------|--------|
| Five field IDs absent | **PASS** |
| Remaining `ZZZ DELETE —` fields | **0** |
| Live field count | **1350** (was 1355) |
| Protected tables/fields | **PASS** |
| Automations 020/033/065/071 present; 075 absent | **PASS** |
| Record-count vs pre-delete baseline | Expected deltas only (+2 SA / +1 HC / +1 XP from multi-asset disposable proof) |

Evidence: [`docs/testing/evidence/fut-002/batch1-live-verify.json`](../testing/evidence/fut-002/batch1-live-verify.json)  
Schema: `airtable/schema/snapshots/prod-20260831-fut002-batch1/`

## Pre-delete evidence (historical)

| Artifact | Path |
|----------|------|
| ID/name verify | `docs/testing/evidence/fut-002/batch1-verify-pre.json` |
| API delete attempt (all 404) | `docs/testing/evidence/fut-002/batch1-delete-attempt.json` |
| Record-count baseline | `docs/testing/evidence/fut-002/batch1-baseline.json` |

## Status

| Step | Status |
|------|--------|
| Dependency check + quarantine rename | **Done** (2026-08-30) |
| Live ID/name confirm | **PASS** (2026-08-30) |
| Meta API delete | **Unavailable** (404) — expected |
| Mike UI delete (5 fields) | **COMPLETE** (2026-08-31) |
| Post-delete verify + docs | **COMPLETE** (2026-08-31) |
