# FUT-002 batch 2 — candidate queue (audit only)

**SNAPSHOT DATE:** 2026-08-31 (committed inventory + schema snapshot; no live Meta API in agent run)  
**Generated:** 2026-09-01  
**Base:** `appn84sqPw03zEbTT`  
**Status:** Audit ready — **no field deletes** performed  

## Data sources

| Source | Path |
|--------|------|
| Inventory JSON | `docs/audits/fut-002-unused-field-inventory.json` |
| Schema snapshot | `airtable/schema/snapshots/prod-20260831-fut002-batch1/schema_doc_appn84sqPw03zEbTT_20260831_070120.md` |
| Tool | `tools/airtable/fut_002_batch2_candidates.py` |
| Live reference (post SA stubs) | **1363** fields / **35** tables (2026-08-31 evidence) |

## Summary

| Metric | Count |
|--------|------:|
| Batch 2 candidates reviewed | **303** |
| Quarantine-ready (UI delete after rename) | **5** |

## Hard stops (unchanged from batch 1)

- Do **not** restore Automation **075**.
- Do **not** delete **Weeks** configuration fields (dates, Week Key, Program Instance, real link fields).
- Do **not** delete **Config** Drive roots, **Email Handoff** fields, Tremendous, or Synced School fields.
- Do **not** delete S3 objects, payment records, or protected evidence.
- Field hard-delete remains **UI-only** (Meta API DELETE → 404).

## Quarantine-ready — Phase A (text stubs + standalone Drive legacy)

Rename to `ZZZ DELETE — …` then Mike UI delete (mirror batch 1).

| Table | Field | Field ID | Classification | Dependency hits | Recommended action | Risk |
|-------|-------|----------|----------------|-----------------|-------------------|------|
| Athlete Achievement Unlocks | XP Events copy | `fldWnU9gJCsTmTLpK` | text_stub | make_legacy: 3; docs: 10 | **quarantine UI delete** | low |
| Shot Milestones | XP Events copy | `fldVcHPjvuabirn6E` | text_stub | make_legacy: 3; docs: 10 | **quarantine UI delete** | low |
| Video Feedback | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` | text_stub | make_legacy: 2; docs: 5 | **quarantine UI delete** | low |
| Weeks | Submission Assets | `fldo906P9t7nj9xmn` | text_stub | none | **quarantine UI delete** | low |
| Weeks | Video Feedback | `fld8tdkjgyYmrs4Eq` | text_stub | none (field ID not in automations/web) | **quarantine UI delete** | low |

**Weeks text stub note:** Name grep hits refer to the **Video Feedback** / **Submission Assets** tables, not these Weeks field IDs. Zero automation/web hits on `fld8tdkjgyYmrs4Eq` / `fldo906P9t7nj9xmn`.

## Deferred — Drive legacy (formula retarget required)

Per [`google-drive-field-removal-prep-2026-08-17.md`](./google-drive-field-removal-prep-2026-08-17.md). Complete §B retargets before any HC/SA Drive field delete.

| Table | Field | Field ID | Blocker | Recommended action | Risk |
|-------|-------|----------|---------|-------------------|------|
| Config | Root Google Drive Folder ID | `fldvG7kDIreffetRt` | Config Drive root — batch hard stop | defer | low |
| Config | Root Google Drive Folder Link | `fldwRqavjwXbCHzar` | Config Drive root — batch hard stop | defer | low |

## Deferred — unknown / interface review

**279** fields classified `unknown` (no active automation/web/tools hit; may still appear in Airtable interfaces/views). OMNI review before quarantine. See full inventory `flaggedFields` in [`fut-002-unused-field-inventory.json`](./fut-002-unused-field-inventory.json).

### Notable unknown clusters (defer)

| Table | Unknown count | Notes |
|-------|--------------:|-------|
| Zoom Meetings | 29 | No active repo dependency |
| Final Reflection Quiz Submissions | 25 | No active repo dependency |
| Weekly Athlete Summary | 23 | No active repo dependency |
| Award Recipients | 22 | No active repo dependency |
| School - Synced | 22 | No active repo dependency |
| Homework Completions | 21 | No active repo dependency |
| Submissions | 20 | No active repo dependency |
| Enrollments | 18 | No active repo dependency |
| Submission Assets | 16 | No active repo dependency |
| Video Feedback | 14 | No active repo dependency |
| Athlete Achievement Unlocks | 10 | No active repo dependency |
| Zoom Attendance | 10 | No active repo dependency |

## Keep — do not batch-2 delete

| Item | Reason |
|------|--------|
| Weeks real link fields (`XP Events`, `Homework Completions`, etc.) | Live challenge calendar |
| Config `Root Google Drive Folder ID/Link` | Hard stop — legacy Make root only |
| SA `Asset Key`, `Storage Key`, `Canonical File URL`, `Reviewer File URL` | Upload + email path |
| HC blocked Drive chain fields | Formula/lookup dependents — retarget first |
| Submission Assets `XP Events` / `XP Events copy` text | **Already deleted 2026-08-31** |

## Operator packet

Mike UI delete steps: [`docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md`](../deploy-checklists/FUT-002-batch2-quarantined-field-delete.md)

## Machine-readable quarantine subset

[`fut-002-batch2-candidates.json`](./fut-002-batch2-candidates.json) — quarantine-ready rows only.

