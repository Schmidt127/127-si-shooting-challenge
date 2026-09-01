# FUT-002 batch 2 — quarantine five text-stub fields (Mike UI)

**Date opened:** 2026-09-01  
**Status:** **AUDIT READY** — batch 2 candidate queue complete; Mike UI delete **pending**  
**Base:** [127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026](https://airtable.com/appn84sqPw03zEbTT) (`appn84sqPw03zEbTT`)  
**API:** Field DELETE is **not supported** by Airtable Meta API (`DELETE …/fields/{id}` → `404 NOT_FOUND`). **UI delete required** (same as batch 1).

## Hard stops (do not delete)

- Do **not** restore Automation **075**.
- Do **not** delete **Weeks** calendar configuration: Start Date, End Date, Week Name, Week Key, Program Instance, or real **link** fields (`XP Events`, `Homework Completions`, `Submissions`, etc.).
- Do **not** delete **Config** `Root Google Drive Folder ID` / `Root Google Drive Folder Link` (storage cutover not closed).
- Do **not** delete **Email Handoff Queue** fields, Tremendous fields, or Synced School fields.
- Do **not** delete S3-backed fields: `Storage Key`, `Canonical File URL`, `Reviewer File URL`, `Upload Status`, `Writeback Complete?`, `Airtable Attachment`.
- Do **not** delete payment / protected evidence records or S3 objects.
- Do **not** delete real **XP Events** link fields on any table.

## Batch 2 scope (Phase A — text stubs only)

These five fields are unused **singleLineText** stubs. Real XP links and Weeks link fields remain. Submission Assets text stubs `XP Events` / `XP Events copy` were **already deleted 2026-08-31**.

| # | Table | Current name | Field ID | Type | Quarantine rename |
|---|-------|--------------|----------|------|-------------------|
| 1 | Athlete Achievement Unlocks | XP Events copy | `fldWnU9gJCsTmTLpK` | singleLineText | `ZZZ DELETE — XP Events copy (text stub)` |
| 2 | Shot Milestones | XP Events copy | `fldVcHPjvuabirn6E` | singleLineText | `ZZZ DELETE — XP Events copy (text stub)` |
| 3 | Video Feedback | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` | singleLineText | `ZZZ DELETE — DELETE MAYBE XP Events copy (text stub)` |
| 4 | Weeks | Video Feedback | `fld8tdkjgyYmrs4Eq` | singleLineText | `ZZZ DELETE — Video Feedback (Weeks text stub)` |
| 5 | Weeks | Submission Assets | `fldo906P9t7nj9xmn` | singleLineText | `ZZZ DELETE — Submission Assets (Weeks text stub)` |

**Note on Weeks rows #4–5:** Automations reference the **Video Feedback** and **Submission Assets** *tables*, not these Weeks text fields. Repo grep found **zero** hits on field IDs `fld8tdkjgyYmrs4Eq` / `fldo906P9t7nj9xmn`.

**Note:** Weeks table has no `XP Events copy` text stub in the post-batch-1 snapshot (only real `XP Events` link field — **keep**).

## Pre-delete verification (Mike)

```powershell
# Confirm each field ID + name still present before rename/delete
python tools/airtable/fut_002_batch2_candidates.py
# Optional live Meta check when PAT available:
# python tools/airtable/export_airtable_schema.py -v --skip-views --out-dir airtable/schema/snapshots/prod-YYYYMMDD-fut002-batch2
```

| Check | Expected |
|-------|----------|
| Five field IDs present with names above | PASS before quarantine |
| No automation reads these field IDs | PASS (audit 2026-09-01) |
| Real XP Events links on HC/Weeks/XP Events table | **Unchanged** |
| Config Drive roots | **Present — do not delete** |

## Quarantine procedure (mirror batch 1)

1. Rename each field to its **Quarantine rename** name (`ZZZ DELETE — …`).
2. Optional: add field description `FUT-002 batch 2 — unused text stub; safe to trash`.
3. Confirm no interface/view uses the field (OMNI spot-check if unsure).
4. Trash field in Airtable UI (not API).
5. Post-delete: export schema + run live verify (template below).

## Post-delete verification (after Mike UI delete)

```powershell
python tools/airtable/export_airtable_schema.py -v --skip-views --out-dir airtable/schema/snapshots/prod-YYYYMMDD-fut002-batch2
python tools/airtable/fut_002_field_inventory.py --snapshot airtable/schema/snapshots/prod-YYYYMMDD-fut002-batch2/schema_doc_*.md
```

| Check | Expected |
|-------|----------|
| Five batch-2 field IDs absent | PASS |
| Live field count delta | **−5** from pre-delete baseline |
| Protected tables/fields | PASS |
| Automations 020/033/065/071 present; 075 absent | PASS |

## Deferred (not this packet)

| Item | Reason |
|------|--------|
| Config Drive roots | Hard stop — populated legacy Make root |
| 279 `unknown` inventory fields | OMNI interface/view review first |
| Remaining SA/HC/VF Google Drive fields | **Already removed** in batch-1 cleanup session (2026-08-30) except Config roots |

## Evidence / audit artifacts

| Artifact | Path |
|----------|------|
| Candidate queue (human) | [`docs/audits/FUT-002-batch2-candidate-queue.md`](../audits/FUT-002-batch2-candidate-queue.md) |
| Quarantine-ready JSON | [`docs/audits/fut-002-batch2-candidates.json`](../audits/fut-002-batch2-candidates.json) |
| Tool | `tools/airtable/fut_002_batch2_candidates.py` |
| Batch 1 packet (historical) | [`FUT-002-batch1-quarantined-field-delete.md`](./FUT-002-batch1-quarantined-field-delete.md) |

## Status

| Step | Status |
|------|--------|
| Dependency check + candidate queue | **Done** (2026-09-01) |
| Live ID/name confirm | **Pending** Mike |
| Quarantine rename (5 fields) | **Pending** Mike |
| Mike UI delete | **Pending** Mike |
| Post-delete verify + docs | **Pending** Mike |
