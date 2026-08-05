# Automation 057 — Manual Test (CASE-01 WAS)

| Field | Value |
|-------|--------|
| WAS record | `recKebuZ79QFTwivA` |
| Enrollment | `recCyFEPeATOVNlr9` |
| Week | `reci5GdxEC57vfoS3` |
| Script | Do **not** change unless a verified defect appears |
| Preconditions | CASE-01 homework Link verify **PASS** (2026-08-05) |

## Preconditions checklist (already proven)

- [x] Both HCs use **`Weekly Athlete Summary Link`** → this WAS (not the empty text field)
- [x] HC `recqXxlOpATQI3sD4`, `rechzFmWrUp1tonto` — Satisfactory?
- [x] WAS Homework library IDs = `rechVLOeyEVIqmy2v`, `rec6WmXjpLtIWDERo`
- [x] Rollups Assigned **2** / Satisfactory **2**
- [x] Days Logged **7**; 3 videos on WAS submissions; 0 Zoom meetings for week

## Safe manual steps

1. In Airtable PROD, open **Weekly Athlete Summary** record `recKebuZ79QFTwivA`.
2. Confirm `Perfect Week Automation Status` is `Pending` (or set Error → Pending if stuck) and `Perfect Week Calculation Queue?` = 1.
3. Open automation **057 - Achievements and Milestones - Calculate Perfect Week Eligibility**.
4. Use **Test** / Run with input `recordId` = `recKebuZ79QFTwivA` (prefer Test so you can inspect outputs).
5. After success, on the WAS record confirm:
   - `Perfect Week Automation Status` = **Ready**
   - `Perfect Week Automation Error` blank
   - `Perfect Week Daily Requirement Met?` checked
   - `Perfect Week Homework Requirement Met?` = **1**
   - `Perfect Week Video Count` ≥ **3**
   - `Perfect Week Zoom Meeting Count` = **0** → Zoom Met formula = **1**
   - `Perfect Week Eligible?` = **1**
6. If Status = Error, copy `Perfect Week Automation Error` into the Perfect Week evidence folder — do not edit 057 until the error proves a script bug.

## What 057 does / does not do

- **Does:** write daily/homework/video/zoom helper fields + Status Ready (+ mark Zoom Attendance Applied? when recording credit counted).
- **Does not:** write Eligible (formula); create Perfect Week unlock (058) or XP (059).
