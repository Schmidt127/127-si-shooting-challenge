# Live field inventory (FUT-002)

**Generated (quarantine pass):** 2026-08-30T18:38:17.934095+00:00 — 33 tables / **1355** fields  
**Post–batch-1 verify:** 2026-08-31 — 33 tables / **1350** fields · **0** `ZZZ DELETE —` remaining  
**Post–SA XP stubs delete:** 2026-08-31 — **35** tables / **1363** fields · SA `XP Events` + `XP Events copy` text stubs **absent**  
**Base:** `appn84sqPw03zEbTT`  
**Schema snapshot (batch-1 day):** `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (historical; pre–SA stub delete)

## Integrity

- PASS — HC Drive batch fields absent
- PASS — Batch-1 Review Summary field **deleted** (was quarantined; ID `fldHchlovIaPlGKLk` absent)
- PASS — SA Asset Key present
- PASS — SA Asset Key formula valid
- PASS — All five batch-1 quarantine IDs absent ([`batch1-live-verify.json`](../../testing/evidence/fut-002/batch1-live-verify.json))
- PASS — SA text stubs `XP Events` / `XP Events copy` **deleted** ([`sa-xp-text-stubs-deleted-2026-08-31.json`](../../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json))

## Pack

| File | Purpose |
| --- | --- |
| field-inventory.json / .csv | Full classification (pre–batch-1 snapshot; regenerate for later batches) |
| cleanup-queue.md | Ordered actions |
| empty-fields.md | Populated=0 (historical rows; see header notes for deletes) |
| nearly-empty-fields.md | <5% |
| invalid-formulas.md | Broken formulas |
| safe-delete-candidates.md | Empty + legacy-named + no deps |
| quarantined-for-delete.md | Batch-1 targets — **DELETED** |
| _raw/ | Meta + counts |

## Regenerate

```bash
python tools/airtable/_fut002_live_pass.py
python tools/airtable/fut_002_live_verify_batch1.py --baseline docs/testing/evidence/fut-002/batch1-baseline.json --json-out docs/testing/evidence/fut-002/batch1-live-verify.json
```
