# Cleanup queue (FUT-002)

**Snapshot:** 2026-08-30T18:38:17Z (inventory) + quarantine batch  
**Batch-1 closeout:** **COMPLETE 2026-08-31** — see also [`../FUT-002-cleanup-queue.md`](../FUT-002-cleanup-queue.md)

## Hard stops

- Do not restore Automation 075.
- Do not restore the six deleted welcome-email fields.
- Do not delete Weeks / Early Bird / 18 homework assignments / assignment identity / XP / Perfect Week / Streaks / Levels core / Email handoff / Public Missing* / FUT-010 fields.
- Airtable Meta API cannot DELETE fields with current PAT (DELETE returns 404). Quarantine via rename + BLANK() + description, then Mike UI trash.

## Integrity checks (post–batch-1)

- PASS — HC Drive batch fields absent (`fldFZLzDjiEbENCGl`, `fld71v6s6wYaJ2Umk`, `fldgGoh56Ck4fTQIE`)
- PASS — Batch-1 Review Summary field **deleted** (`fldHchlovIaPlGKLk` absent)
- PASS — SA Asset Key valid (`fldy8UuxWmHT7WFFJ`)
- PASS — Invalid formulas remaining: 0
- PASS — Public Missing Homework / Public Missing Zoom still present on Enrollments
- PASS — Live **1350** fields / **0** `ZZZ DELETE —` remaining

## Completed

| Action | Field | ID | Notes |
| --- | --- | --- | --- |
| Quarantined then **UI deleted** | Homework Completions / Review Summary (invalid legacy) | `fldHchlovIaPlGKLk` | **DELETED 2026-08-31** |
| Formula retarget | Submission Assets / Asset Key | `fldy8UuxWmHT7WFFJ` | Fixed after Drive File ID deletion |
| Quarantined then **UI deleted** | Levels / Enrollments 3 | `fldTzIGODB2e03rvE` | **DELETED 2026-08-31** |
| Quarantined then **UI deleted** | Streak Occurrences / Challenge / Season | `fldltgFPGVXHwRj4X` | **DELETED 2026-08-31** |
| Quarantined then **UI deleted** | Streak Occurrences / Backfill Run Label | `fldBFDl629arXFcnp` | **DELETED 2026-08-31** |
| Quarantined then **UI deleted** | Achievements / Uses Grade Band Scaling? | `fldkIzG5emvUBQ0Tw` | **DELETED 2026-08-31** |
| Prior Mike UI deletes | HC Submitted File Review Summary + Submitted Asset File Links/IDs | `fldFZLzDjiEbENCGl`, `fld71v6s6wYaJ2Umk`, `fldgGoh56Ck4fTQIE` | Confirmed absent |

Evidence: [`../../testing/evidence/fut-002/batch1-live-verify.json`](../../testing/evidence/fut-002/batch1-live-verify.json)

## Completed — SA XP text stubs (2026-08-31)

| Action | Field | ID | Notes |
| --- | --- | --- | --- |
| **UI deleted** | Submission Assets / XP Events (text stub) | `fldwOklyDaW3nN2Kz` | Unused singleLineText; not XP link |
| **UI deleted** | Submission Assets / XP Events copy (text stub) | `fld5Emwipb3UjAMz9` | Unused singleLineText; not XP link |

Evidence: [`../../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](../../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json) · packet [`../../deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md`](../../deploy-checklists/FUT-002-sa-xp-text-stubs-delete.md)  
Live after delete: **1363** fields / **35** tables

## Mike UI delete — batch 1

~~Delete every field whose name starts with `ZZZ DELETE —` (5 total).~~ **COMPLETE 2026-08-31** — no remaining ZZZ fields awaiting delete.

## Left alone (intentional)

- School - Synced empty/nearly-empty fields (synced source risk)
- Email Handoff Queue empty ops fields (retry/hub plumbing)
- Award Recipients Tremendous Delivered At (future Tremendous)
- Homework Library Extension Activities (content slot)
- Final Reflection Quiz empty question fields (zero-record form structure)
- Config Drive root fields (still populated)
- Any field with formula dependents, automation refs, or web/Make/Fillout refs

## Needs review (later batches)

See `empty-fields.md` / `nearly-empty-fields.md` (pre–batch-1 snapshot — regenerate via `_fut002_live_pass.py` before next delete batch). Prefer quarantine-only for clear accidents; leave synced/ops/future-integration fields.
