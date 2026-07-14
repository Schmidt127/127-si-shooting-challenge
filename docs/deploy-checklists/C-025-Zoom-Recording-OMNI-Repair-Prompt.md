# OMNI prompt — C-025 Zoom Recording formula repair (DEV only)

Copy everything below the line into OMNI in the **DEV** base.

---

You are repairing an existing DEV Zoom Recording / Zoom Attendance build.

## Absolute constraints

1. **Do not recreate** these fields (edit formula text only):
   - Zoom Credit Approved?
   - Zoom XP Percentage
   - Zoom XP Amount
   - Zoom Gate Credit Earned?
   - Zoom Credit Key
   - Zoom Credit Conflict?
   - Zoom Credit Debug
2. **Do not touch PROD.**
3. **Do not create or edit automations.**
4. **Do not guess field names.** If a referenced field is missing or named differently, **stop that formula**, list the exact UI name found, and continue only with unrelated safe helpers.
5. Follow exact formulas and helper list in repo doc:
   `docs/deploy-checklists/C-025-Zoom-Recording-Formula-Repair.md`

## Inventory first (read-only report)

On table **Zoom Attendance**, list every field name + type.
On **Zoom Meetings**, list fields whose names contain: Effective, Recording, Makeup, Deadline, Available, RecordId.
On **Enrollments**, confirm field `Record Id` exists.
On **Config**, confirm C-025 config fields from the Stage 16 catalog exist.

Report name mismatches before editing.

## Add helpers only if missing

On Zoom Attendance (if missing):
- Lookups: Enrollment Record Id ← Enrollments.`Record Id`
- Lookups: Zoom Meeting Record Id ← Zoom Meetings.`RecordId`
- Lookups for Effective* config fields + Recording Available At + Week End Date from Zoom Meeting
- Verify source fields: Attendance Method, Live Confirmed?, Review Status, Submitted At, Normal Live Zoom XP

Then add conflict helpers only if missing (see repair doc):
- Zoom Credit Pre-Approved?
- Preconflict Pair Tag
- Zoom Meetings rollup Approved Preconflict Pair Tags (ARRAYJOIN of Preconflict Pair Tag)
- Lookup Meeting Approved Preconflict Pair Tags onto Zoom Attendance

## Paste formulas in dependency order

1. Calculated Recording Quiz Deadline  
2. Zoom Credit Pre-Approved?  
3. Preconflict Pair Tag  
4. Finish rollup/lookup  
5. Zoom Credit Key  
6. Zoom Credit Conflict?  
7. Zoom Credit Approved?  
8. Zoom XP Percentage  
9. Zoom XP Amount  
10. Zoom Gate Credit Earned?  
11. Zoom Credit Debug  

Use the **exact formula text** from the repair markdown. Do not simplify away fallbacks.

## View only if missing

Create view on Zoom Attendance:

**Zoom Recording Quiz — Past Deadline**

Filters:
- Attendance Method is Recording Quiz
- Calculated Recording Quiz Deadline is before today
- Zoom Credit Approved? is not checked

## Stop conditions

Stop before any automation, interface submit wiring, or PROD work.

## Final OMNI report required

1. Helpers added (exact names)  
2. Helpers already present  
3. Any field-name mismatch  
4. Which of the seven formulas now calculate without #ERROR!  
5. Whether Past Deadline view was created  
6. One sample Live row and one Recording Satisfactory row Debug string  
