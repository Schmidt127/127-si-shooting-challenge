# FUT-002 session log — 2026-08-30 (cleanup phase)

**Base:** Production `appn84sqPw03zEbTT`  
**Owner:** Cursor (authorized independent cleanup)  
**Live inventory pack:** [`docs/audits/field-inventory/`](./field-inventory/)  
**Batch-1 closeout:** **COMPLETE 2026-08-31** — Mike UI-deleted all five `ZZZ DELETE —` fields; live verify [`../testing/evidence/fut-002/batch1-live-verify.json`](../testing/evidence/fut-002/batch1-live-verify.json); schema `airtable/schema/snapshots/prod-20260831-fut002-batch1/` (**1350** fields, **0** ZZZ remaining).

## Hard constraints honored

- Did **not** restore Automation 075.
- Did **not** restore the six deleted welcome-email fields.
- Did **not** delete Weeks / Early Bird / 18 homework assignments / assignment identity / XP / Perfect Week / Streaks / Levels core / Email handoff / Public Missing* / FUT-010 fields.
- Airtable Meta API **cannot DELETE fields** with current PAT (`DELETE` → 404). Fields were quarantined (`ZZZ DELETE — …` + description); Mike completed UI trash on 2026-08-31.

## Live findings — `Submission Asset Review Summary (formula)`

| Item | Value |
| --- | --- |
| Field ID | `fldHchlovIaPlGKLk` |
| Table | Homework Completions (`tblv58ppTFDBXb3nv`) |
| Prior state | **Invalid** formula referencing deleted Drive lookup `column_value_fld6NBbAwicqJ1nhf` / `fld6NBbAwicqJ1nhf` (absent) |
| Population | 0 / 15 |
| Formula dependents | **None** |
| Automations / web / Make / Fillout / Softr | **No active refs** (docs/historical only) |
| Views / interfaces (meta blob) | **No hits** |

**Decision:** Obsolete broken display field — quarantine for UI delete (do not retarget; no active consumer).

## Actions completed

| Action | Field | ID | Result |
| --- | --- | --- | --- |
| Quarantine + `BLANK()` then UI delete | Homework Completions / `ZZZ DELETE — Submission Asset Review Summary (invalid legacy)` | `fldHchlovIaPlGKLk` | **DELETED 2026-08-31** (Mike UI) |
| Formula retarget | Submission Assets / Asset Key | `fldy8UuxWmHT7WFFJ` | Was invalid after Drive File ID deletion; now `ARRAYJOIN({Submission - Linked}) & "|" & RECORD_ID()` (**valid**) |
| Quarantine then UI delete | Levels / `ZZZ DELETE — Enrollments 3 (accidental empty)` | `fldTzIGODB2e03rvE` | **DELETED 2026-08-31** |
| Quarantine then UI delete | Streak Occurrences / `ZZZ DELETE — Challenge / Season (empty backfill)` | `fldltgFPGVXHwRj4X` | **DELETED 2026-08-31** |
| Quarantine then UI delete | Streak Occurrences / `ZZZ DELETE — Backfill Run Label (empty backfill)` | `fldBFDl629arXFcnp` | **DELETED 2026-08-31** |
| Quarantine then UI delete | Achievements / `ZZZ DELETE — Uses Grade Band Scaling? (unused empty)` | `fldkIzG5emvUBQ0Tw` | **DELETED 2026-08-31** |
| Prior Mike UI deletes (earlier same day) | HC Submitted File Review Summary + Submitted Asset File Links/IDs | `fldFZLzDjiEbENCGl`, `fld71v6s6wYaJ2Umk`, `fldgGoh56Ck4fTQIE` | Reconfirmed **absent** |

## Inventory refresh

- Tool: `tools/airtable/_fut002_live_pass.py`
- Snapshot (quarantine day): **33 tables / 1355 fields** (2026-08-30T18:38Z)
- Post–batch-1 delete (2026-08-31): **33 tables / 1350 fields** — `airtable/schema/snapshots/prod-20260831-fut002-batch1/`
- **SA XP text stubs deleted (2026-08-31):** `XP Events` (`fldwOklyDaW3nN2Kz`) + `XP Events copy` (`fld5Emwipb3UjAMz9`) — live Meta **1363 fields / 35 tables** — [`../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json`](../testing/evidence/fut-002/sa-xp-text-stubs-deleted-2026-08-31.json)
- Invalid formulas remaining after Asset Key fix: **0**
- Quarantined pending UI delete: **0** (batch 1 complete)
- Empty / nearly-empty review queue: see `field-inventory/cleanup-queue.md` (later batches)

## Left alone (intentional)

- School - Synced empty/nearly-empty fields (synced source risk)
- Email Handoff Queue empty ops fields (retry/hub plumbing)
- Award Recipients `Tremendous Delivered At` (future Tremendous)
- Homework Library `Extension Activities` (content slot)
- Final Reflection Quiz empty question fields (zero-record form structure)
- Config Drive root fields (populated; storage cutover not closed)
- Any field with formula dependents, automation refs, or web/Make/Fillout refs

## Mike UI actions — batch 1

1. ~~Delete all fields whose names start with `ZZZ DELETE —` (5 fields).~~ **DONE 2026-08-31**
2. Post-delete verify + schema export + inventory refresh — **DONE** (this closeout; no new `--apply`, no new test records).

## Genuine blocker (for future batches)

**Airtable Meta API cannot delete fields** with the current token (PATCH works; DELETE → 404). Physical deletion of any future quarantined fields still requires Mike UI.
