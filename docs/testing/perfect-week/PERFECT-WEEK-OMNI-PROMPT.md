# Omni Prompt — Perfect Week controlled PROD fixtures

**Paste this entire document into Omni (PROD Airtable in-base AI).**  
Do not invent field names. Inspect schema first. Report mismatches before creating records.

**Authoritative method:** [`PERFECT-WEEK-FIXTURE-METHOD.md`](./PERFECT-WEEK-FIXTURE-METHOD.md)  

**Primary method for historical 7-day award fixtures:** `GATED_TEST_TIMESTAMP`  
**Alternate:** `LIVE_SAME_DAY_CALENDAR` (true same-day creates only)

This is a **tightly gated fixture mechanism**, not athlete-facing production behavior.

**Do not** rely on `Perfect Week Test Override?` (it does nothing).  
**Do not** put `Perfect Week Test Record?` or `Perfect Week Test Submitted At` on Fillout or public interfaces.

---

## Mission

Create controlled Perfect Week fixtures in **PROD** for Automation **057 v1.5**.

Batch key prefix: `PWTEST|2026-08-05`  
**Only** Enrollment `rec93mAfo5jKqP3g5` (`Perfect Week Testing`). Do **not** email real parents.

---

## Hard rules

1. Work in **PROD** for controlled Schmidt fixtures only.
2. Inspect current PROD schema before any create. Stop and report mismatches — do not guess.
3. **Gated path (CASE-01 historical week):** For each fixture Submission, set **all** of:
   - Enrollment = `rec93mAfo5jKqP3g5`
   - `Perfect Week Test Record?` = checked
   - `Perfect Week Test Submitted At` = Denver date/time matching that day’s `Activity Date`
4. If any gate condition is missing, Same Day falls back to real `Submitted At` (`CREATED_TIME()`).
5. **`Perfect Week Test Override?`:** Do **not** check it.
6. Write shots via **`Shot Total`**, not `Total Shots Counted`.
7. No parent emails; do not arm Build/Send weekly email checkboxes.
8. Do not manually write formula results, Eligible, Unlock, or XP.

---

## Field IDs (verify in PROD)

| Field | Expected ID |
|-------|-------------|
| Perfect Week Test Record? | `fld0xNqO0ryOe7uEY` |
| Perfect Week Test Submitted At | `fldr2msxUo1kPjROD` |
| Enrollment Record ID Lookup | `fldHH6GDDG9DixHBT` |

---

## CASE-01 (gated — create all seven today)

Week: Sunday `2026-08-02` → Saturday `2026-08-08`  
Goal: link Goal Record with 5000 target; each day ≥ daily min; week total ≥ 5000.

Order:

1. Week + WAS + Goal Record link  
2. Seven Submissions (gated fields as above)  
3. Three Video Feedback rows  
4. No Zoom Meeting  
5. Confirm Same Day=1 and Countable=1 on all seven  
6. Rearm / Run Automation **057** on the WAS (`Perfect Week Automation Status` → Pending after Error/Skipped if needed)  
7. Confirm Ready + Eligible=1 → Unlock **058** → XP **059** (`PERFECT_WEEK|rec93mAfo5jKqP3g5|{weekId}`)

Preserve evidence (do not alter):

| Case | IDs |
|------|-----|
| CASE-07 | Sub `recxbwkZpSJZ5eiqA` — Same Day 0, Countable 0 |
| CASE-02 | Sub `recbr8gduRKmpiDkd`, WAS `recMMeJENu6Pg8l58` — Same Day 1, Countable 1, Eligible 0 |

---

## Batch A still valid without gated fields

| Case | Method | Notes |
|------|--------|-------|
| CASE-07 | Backdated Activity Date, **no** test fields | Same Day 0 |
| CASE-02 | Same-day create today, **no** test fields | One-day dump; Eligible 0 |

---

## Return

IDs for Week, WAS, Submissions, Videos, Unlock, XP Event.  
JSON matching `fixtures/PWTEST-MANIFEST.template.json` with `fixtureMethod: "GATED_TEST_TIMESTAMP"`.

Also confirm:

1. 057 enabled, Version **1.5**  
2. Test Override unchecked  
3. Test fields absent from Fillout/public UI  
4. Rollback doc known: `PERFECT-WEEK-GATED-TEST-TIMESTAMP-ROLLBACK.md`
