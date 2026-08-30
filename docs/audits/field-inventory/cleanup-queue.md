# Cleanup queue (FUT-002)

**Snapshot:** 2026-08-30T18:38:17Z (inventory) + quarantine batch after inventory

## Hard stops

- Do not restore Automation 075.
- Do not restore the six deleted welcome-email fields.
- Do not delete Weeks / Early Bird / 18 homework assignments / assignment identity / XP / Perfect Week / Streaks / Levels core / Email handoff / Public Missing* / FUT-010 fields.
- Airtable Meta API cannot DELETE fields with current PAT (DELETE returns 404). Quarantine via rename + BLANK() + description, then Mike UI trash.

## Integrity checks

- PASS — HC Drive batch fields absent (`fldFZLzDjiEbENCGl`, `fld71v6s6wYaJ2Umk`, `fldgGoh56Ck4fTQIE`)
- PASS — HC Review Summary quarantined (`fldHchlovIaPlGKLk` → BLANK(), valid)
- PASS — SA Asset Key valid (`fldy8UuxWmHT7WFFJ` → `ARRAYJOIN({Submission - Linked}) & "|" & RECORD_ID()`)
- PASS — Invalid formulas remaining: 0
- PASS — Public Missing Homework / Public Missing Zoom still present on Enrollments

## Completed this session

| Action | Field | ID | Notes |
| --- | --- | --- | --- |
| Quarantined | Homework Completions / `ZZZ DELETE — Submission Asset Review Summary (invalid legacy)` | `fldHchlovIaPlGKLk` | Broken Drive formula; no active use |
| Formula retarget | Submission Assets / Asset Key | `fldy8UuxWmHT7WFFJ` | Fixed after Drive File ID deletion |
| Quarantined | Levels / `ZZZ DELETE — Enrollments 3 (accidental empty)` | `fldTzIGODB2e03rvE` | Empty accidental field |
| Quarantined | Streak Occurrences / `ZZZ DELETE — Challenge / Season (empty backfill)` | `fldltgFPGVXHwRj4X` | Empty backfill helper |
| Quarantined | Streak Occurrences / `ZZZ DELETE — Backfill Run Label (empty backfill)` | `fldBFDl629arXFcnp` | Empty backfill helper |
| Quarantined | Achievements / `ZZZ DELETE — Uses Grade Band Scaling? (unused empty)` | `fldkIzG5emvUBQ0Tw` | Empty unused checkbox |
| Prior Mike UI deletes | HC Submitted File Review Summary + Submitted Asset File Links/IDs | `fldFZLzDjiEbENCGl`, `fld71v6s6wYaJ2Umk`, `fldgGoh56Ck4fTQIE` | Confirmed absent |

## Mike UI delete now (exact)

Delete every field whose name starts with `ZZZ DELETE —` (5 total):

1. Homework Completions → `fldHchlovIaPlGKLk`
2. Levels → `fldTzIGODB2e03rvE`
3. Streak Occurrences → `fldltgFPGVXHwRj4X`
4. Streak Occurrences → `fldBFDl629arXFcnp`
5. Achievements → `fldkIzG5emvUBQ0Tw`

Then re-run `python tools/airtable/_fut002_live_pass.py`.

## Left alone (intentional)

- School - Synced empty/nearly-empty fields (synced source risk)
- Email Handoff Queue empty ops fields (retry/hub plumbing)
- Award Recipients Tremendous Delivered At (future Tremendous)
- Homework Library Extension Activities (content slot)
- Final Reflection Quiz empty question fields (zero-record form structure)
- Config Drive root fields (still populated)
- Any field with formula dependents, automation refs, or web/Make/Fillout refs

## Safe delete candidates (0 beyond quarantines)

None remaining that meet empty + legacy-named + no-deps without product confirmation.

## Needs review

See `empty-fields.md` / `nearly-empty-fields.md`. Prefer quarantine-only for clear accidents; leave synced/ops/future-integration fields.
