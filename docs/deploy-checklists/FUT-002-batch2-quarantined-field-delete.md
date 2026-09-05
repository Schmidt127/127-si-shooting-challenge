# FUT-002 batch 2 — quarantine five text-stub fields (Mike UI)

**Date opened:** 2026-09-01  
**Status:** **COMPLETE** — Mike UI delete + post-delete verify **2026-09-05**  
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

These five fields were unused **singleLineText** stubs. Real XP links and Weeks link fields remain. Submission Assets text stubs `XP Events` / `XP Events copy` were **already deleted 2026-08-31**.

| # | Table | Historical name | Field ID | Type | Quarantine rename | Post-delete |
|---|-------|-----------------|----------|------|-------------------|-------------|
| 1 | Athlete Achievement Unlocks | XP Events copy | `fldWnU9gJCsTmTLpK` | singleLineText | `ZZZ DELETE — XP Events copy (text stub)` | **ABSENT** (UI 2026-09-05) |
| 2 | Shot Milestones | XP Events copy | `fldVcHPjvuabirn6E` | singleLineText | `ZZZ DELETE — XP Events copy (text stub)` | **ABSENT** (UI 2026-09-05) |
| 3 | Video Feedback | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` | singleLineText | `ZZZ DELETE — DELETE MAYBE XP Events copy (text stub)` | **ABSENT** (prior to Batch 2 session) |
| 4 | Weeks | Video Feedback | `fld8tdkjgyYmrs4Eq` | singleLineText | `ZZZ DELETE — Video Feedback (Weeks text stub)` | **ABSENT** (UI 2026-09-05) |
| 5 | Weeks | Submission Assets | `fldo906P9t7nj9xmn` | singleLineText | `ZZZ DELETE — Submission Assets (Weeks text stub)` | **ABSENT** (UI 2026-09-05) |

**Note on Weeks rows #4–5:** Automations reference the **Video Feedback** and **Submission Assets** *tables*, not these Weeks text fields. Repo grep found **zero** hits on field IDs `fld8tdkjgyYmrs4Eq` / `fldo906P9t7nj9xmn`.

**Note:** Weeks table has no `XP Events copy` text stub in the post-batch-1 snapshot (only real `XP Events` link field — **kept**).

## Post-delete verification (2026-09-05) — PASS

| Check | Result |
|-------|--------|
| Five batch-2 field IDs absent | **PASS** |
| Live field count | **1375** / **35** tables (quarantine baseline 1378; observed **−3**; see closeout note on +1 concurrent drift) |
| Protected tables/fields (links + Config Drive roots) | **PASS** |
| Automations 020/033/065/071 present; 075 absent | **PASS** |
| Meta invalid fields | **0** |
| Interfaces (Homework / VF grading) | **PASS** (XP Events links intact; no stub IDs) |

Evidence: [`../testing/evidence/fut-002/batch2-live-verify-20260905.json`](../testing/evidence/fut-002/batch2-live-verify-20260905.json) · closeout [`../audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md`](../audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md) · schema `airtable/schema/snapshots/prod-20260905-fut002-batch2/`

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
| Post-delete closeout | [`../audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md`](../audits/FUT-002-BATCH2-POST-DELETE-CLOSEOUT-20260905.md) |

## Status

| Step | Status |
|------|--------|
| Dependency check + candidate queue | **Done** (2026-09-01) |
| Live ID/name confirm | **Done** |
| Quarantine rename (4 remaining fields) | **Done** (2026-09-04 MCP) |
| Mike UI delete (4 fields) | **Done** (2026-09-05) |
| Post-delete verify + docs | **Done** (2026-09-05) |
