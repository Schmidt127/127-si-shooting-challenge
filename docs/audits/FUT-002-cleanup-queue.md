# Cleanup queue (FUT-002)

**Snapshot:** 2026-08-31 live Meta schema after batch-1 UI deletes  
**Base:** `appn84sqPw03zEbTT`  
**Live field count:** **1350** (was 1355 pre-delete) · **33 tables** · **0** `ZZZ DELETE —` fields remaining

## Hard stops

- Do not restore Automation **075**.
- Do not delete Weeks, Config Drive roots, Email Handoff, Tremendous, or Synced School fields.
- Do not delete S3 objects or payment/protected evidence records.
- Field hard-delete remains **UI-only** (Meta API returns 404).

## Batch 1 — COMPLETE (2026-08-31)

Mike deleted all five quarantined fields in Airtable UI. Live verify: all five IDs **absent**; protected tables/fields/automations intact.

| Table | Former quarantine name | Field ID | Status |
|-------|------------------------|----------|--------|
| Homework Completions | `ZZZ DELETE — Submission Asset Review Summary (invalid legacy)` | `fldHchlovIaPlGKLk` | **DELETED** |
| Levels | `ZZZ DELETE — Enrollments 3 (accidental empty)` | `fldTzIGODB2e03rvE` | **DELETED** |
| Streak Occurrences | `ZZZ DELETE — Challenge / Season (empty backfill)` | `fldltgFPGVXHwRj4X` | **DELETED** |
| Streak Occurrences | `ZZZ DELETE — Backfill Run Label (empty backfill)` | `fldBFDl629arXFcnp` | **DELETED** |
| Achievements | `ZZZ DELETE — Uses Grade Band Scaling? (unused empty)` | `fldkIzG5emvUBQ0Tw` | **DELETED** |

Operator packet (historical): [`docs/deploy-checklists/FUT-002-batch1-quarantined-field-delete.md`](../deploy-checklists/FUT-002-batch1-quarantined-field-delete.md)  
Post-delete verify: [`docs/testing/evidence/fut-002/batch1-live-verify.json`](../testing/evidence/fut-002/batch1-live-verify.json)  
Schema snapshot: `airtable/schema/snapshots/prod-20260831-fut002-batch1/`

## Submission Assets XP text stubs — COMPLETE (2026-08-31)

Mike UI-deleted two unused **single-line text** stubs on Submission Assets (not XP link fields):

| Table | Former name | Field ID | Status |
|-------|-------------|----------|--------|
| Submission Assets | XP Events | `fldwOklyDaW3nN2Kz` | **DELETED** |
| Submission Assets | XP Events copy | `fld5Emwipb3UjAMz9` | **DELETED** |

Packet: [`docs/deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md`](../deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md)  
Verify: [`docs/testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json)  
Live after delete: **1363** fields / **35** tables · SA **90** fields

## Keep / do not touch (batch-1 closeout)

| Item | Note |
|------|------|
| Submission Assets | Table intact |
| Homework Completions | Table intact (batch-1 formula field deleted) |
| Reviewer File URL (Submission Assets) | Keep |
| Automations 020, 033, 065, 071 | Keep Live |
| FUT-010 | Separate track — intake attachment cleanup |
| Weeks | Protected configuration |
| Early Bird + 18 PHA | Season policy intact |
| XP / Perfect Week fields | Keep |
| Public Missing* on Enrollments | Keep |
| Automation 075 | Remains retired/absent |

## Batch 2 — AUDIT READY (2026-09-01)

Candidate queue complete; Mike UI delete **pending**. No field deletes performed in this audit pass.

**SNAPSHOT DATE:** 2026-08-31 (`docs/audits/fut-002-unused-field-inventory.json` + `airtable/schema/snapshots/prod-20260831-fut002-batch1/`). Live after SA stubs: **1363** fields / **35** tables.

| Metric | Count |
|--------|------:|
| Batch 2 candidates reviewed | **303** |
| Quarantine-ready (Phase A text stubs) | **5** |
| Deferred (`unknown` / interface review) | **279** |
| Config Drive roots (hard stop) | **2** |

### Quarantine-ready — Phase A (text stubs)

| Table | Field | Field ID |
|-------|-------|----------|
| Athlete Achievement Unlocks | XP Events copy | `fldWnU9gJCsTmTLpK` |
| Shot Milestones | XP Events copy | `fldVcHPjvuabirn6E` |
| Video Feedback | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` |
| Weeks | Video Feedback (text stub) | `fld8tdkjgyYmrs4Eq` |
| Weeks | Submission Assets (text stub) | `fldo906P9t7nj9xmn` |

**Not in snapshot:** Weeks `XP Events copy` text stub (absent post-batch-1; real `XP Events` **link** on Weeks is **keep**).

### Deferred

- **Config** `Root Google Drive Folder ID` / `Root Google Drive Folder Link` — only remaining Google Drive legacy in post-batch-1 snapshot; hard stop until storage cutover closed.
- **279 unknown** fields — OMNI interface/view review before quarantine (see [`FUT-002-batch2-candidate-queue.md`](./FUT-002-batch2-candidate-queue.md)).
- Most SA/HC/VF Google Drive fields were **already removed** during 2026-08-30 cleanup (Asset Key retargeted).

### Artifacts

| Artifact | Path |
|----------|------|
| Candidate queue | [`docs/audits/FUT-002-batch2-candidate-queue.md`](./FUT-002-batch2-candidate-queue.md) |
| Quarantine JSON | [`docs/audits/fut-002-batch2-candidates.json`](./fut-002-batch2-candidates.json) |
| Operator packet | [`docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md`](../deploy-checklists/FUT-002-batch2-quarantined-field-delete.md) |
| Tool | `tools/airtable/fut_002_batch2_candidates.py` |

## Later batches (after batch 2 Phase A delete)

- OMNI review of `unknown` clusters (Zoom Meetings, Final Reflection Quiz, Weekly Athlete Summary, etc.).
- Config Drive root retirement after storage cutover sign-off.
