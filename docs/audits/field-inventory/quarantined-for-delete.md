# Quarantined for Mike UI delete (FUT-002)

**Updated:** 2026-08-30

Airtable Meta API cannot DELETE fields with the current PAT. These fields were renamed + documented for UI trash.

| Table | Field | Field ID | Notes |
| --- | --- | --- | --- |
| Homework Completions | ZZZ DELETE — Submission Asset Review Summary (invalid legacy) | fldHchlovIaPlGKLk | Was invalid Drive formula; set to BLANK() |
| Levels | ZZZ DELETE — Enrollments 3 (accidental empty) | fldTzIGODB2e03rvE | Empty accidental text field |
| Streak Occurrences | ZZZ DELETE — Challenge / Season (empty backfill) | fldltgFPGVXHwRj4X | Empty backfill helper |
| Streak Occurrences | ZZZ DELETE — Backfill Run Label (empty backfill) | fldBFDl629arXFcnp | Empty backfill helper |
| Achievements | ZZZ DELETE — Uses Grade Band Scaling? (unused empty) | fldkIzG5emvUBQ0Tw | Empty unused checkbox |

After UI delete, re-run `python tools/airtable/_fut002_live_pass.py`.
