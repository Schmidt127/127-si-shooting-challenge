# Quarantined for Mike UI delete (FUT-002)

**Updated:** 2026-08-31 — **batch 1 COMPLETE**

Airtable Meta API cannot DELETE fields with the current PAT. Batch-1 fields were renamed, then Mike trashed them in the UI.

| Table | Field | Field ID | Status |
| --- | --- | --- | --- |
| Homework Completions | ZZZ DELETE — Submission Asset Review Summary (invalid legacy) | fldHchlovIaPlGKLk | **DELETED** (absent in live schema) |
| Levels | ZZZ DELETE — Enrollments 3 (accidental empty) | fldTzIGODB2e03rvE | **DELETED** |
| Streak Occurrences | ZZZ DELETE — Challenge / Season (empty backfill) | fldltgFPGVXHwRj4X | **DELETED** |
| Streak Occurrences | ZZZ DELETE — Backfill Run Label (empty backfill) | fldBFDl629arXFcnp | **DELETED** |
| Achievements | ZZZ DELETE — Uses Grade Band Scaling? (unused empty) | fldkIzG5emvUBQ0Tw | **DELETED** |

Live verify: [`../testing/evidence/fut-002/batch1-live-verify.json`](../testing/evidence/fut-002/batch1-live-verify.json)  
Live field count after delete: **1350** · remaining `ZZZ DELETE —` fields: **0**
