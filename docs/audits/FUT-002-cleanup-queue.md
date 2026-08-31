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

## Later batches (not this closeout)

- Remaining Google Drive legacy fields after formula retargets (see inventory).
- Other `unknown` / duplicate classifications from the post-batch-1 inventory.
- Other-table text stubs named `XP Events copy` (e.g. Athlete Achievement Unlocks, Weeks) — **not** the SA stubs deleted above.
