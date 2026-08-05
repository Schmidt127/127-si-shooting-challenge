# Omni Prompt — Perfect Week controlled PROD fixtures

**Paste this entire document into Omni (PROD Airtable in-base AI).**  
Do not invent field names. Inspect schema first. Report mismatches before creating records.

**Authoritative method:** [`PERFECT-WEEK-FIXTURE-METHOD.md`](./PERFECT-WEEK-FIXTURE-METHOD.md)  
**Do not** use historical backfill. **Do not** rely on `Perfect Week Test Override?` (it does nothing).

---

## Mission

Create controlled Perfect Week fixtures in **PROD** for Automation **057 v1.5** using **live same-day calendar** creation only.

Batch key prefix: `PWTEST|2026-08-05`  
Athlete: Schmidt testing athlete only (`recgqVstObQRzgXJF` — verify). Do **not** email real parents.

---

## Hard rules

1. Work in **PROD** for controlled Schmidt fixtures only.
2. Inspect current PROD schema before any create. Stop and report mismatches — do not guess.
3. **Same-day rule (blocking):** `Submitted At` is `CREATED_TIME()`. A submission is Perfect Week countable only when Denver calendar of Activity Date equals Denver calendar of create time.  
   - **Never** set Activity Date to a past day and expect `Perfect Week Countable Submission? = 1`.  
   - Pilot `recxbwkZpSJZ5eiqA` proved past Activity Date → Same Day=0, Countable=0.
4. **`Perfect Week Test Override?`:** Do **not** check it. It is an unused checkbox (no formula / no 057 read). It does **not** bypass same-day or countable.
5. Create isolated Enrollments / Weeks / Submissions / Video Feedback / Zoom / WAS. Let unlocks/XP come from automations 058/059.
6. Label every record `PWTEST|2026-08-05|CASE-XX` in writable Name/Notes fields.
7. Leave Parent Email blank. Do not arm Welcome / Daily / Weekly send checkboxes or Make sends.
8. Do **not** manually write formula, lookup, rollup, or Perfect Week result fields / Unlock / XP.
9. Record every created record ID into the manifest shape.
10. Safe to delete only after verifier evidence is captured.

---

## Writable field adaptations (PROD)

| Need | Write | Do not write |
|------|-------|--------------|
| Shots | `Shot Total` | `Total Shots Counted` (formula) |
| Submit time | (automatic `CREATED_TIME`) | `Submitted At` (formula) |
| Weekly goal | WAS `Goal Record` → row in `Target Goal Shots` | Invent weekly=70 |
| Program | `Program Instance - Synced` | Table `Programs` |
| Shooting PI | `rec5mEM0YPqPqq0hZ` (Shooting Challenge \| 2026-2027) — verify name | |
| Other program (CASE-05/13) | `recOqcyks1wThIArM` (Dribbling Challenge \| 2026-2027) — verify | |

Daily minimum = `ceil((Goal Total Shot Target / 9) / 7)`. Use `Shot Total` ≥ that each countable day.

---

## Staged batches

### Batch A — Immediate (run today)

Create scaffolds + cases that do **not** need seven countable days.

| Case | Create today | Expected |
|------|--------------|----------|
| CASE-07 | One Submission with Activity Date **before** Denver today; Enrollment+Week+WAS | Same Day=0; Countable=0; no award |
| CASE-02 | Week Sun–Sat containing today; Enrollment; WAS+Goal; **only today** countable with high `Shot Total` | Days Logged=1; Daily Met=false; no award |
| Optional shells | Weeks/Enrollments for later Batch B | No email arms |

Return IDs after Batch A. **Stop** and wait for Mike before Batch B if asked.

### Batch B — Calendar (award path; one create per Denver day)

**Target week:** Sunday `2026-08-09` through Saturday `2026-08-15` (next full Sun–Sat).

| Day | Action |
|-----|--------|
| Before/on Sun | Week + Enrollment(s) + WAS + Goal Record; Zoom Meeting shell if case needs it |
| Each day Sun→Sat | Create that day’s Submission with `Activity Date` = **that Denver day** (created that same day) |
| As needed | Video Feedback on submissions (3 for award cases by Sat) |
| After Sat | Allow 057→058→059; run verifier |

Cases on Batch B: **CASE-01, 03–06, 08–16** (and CASE-15 after CASE-01 awards).

CASE-03: create only six of the seven calendar days (omit one day entirely).  
CASE-04: six in-week days + create adjacent-day rows **on** those adjacent Denver days (or accept they are non-countable if created early — prefer create-on-day).  
CASE-06: on a calendar day, create submission with Activity Date=today, Week=**wrong** week, still link to target WAS; do not repair; report whether 057 counts it.

---

## CASE-01 record-creation order (Batch B — live same-day)

**Not** historical. Do this across the week:

1. **Once (before Sunday or Sunday morning):**  
   - Week: `Week Name`=`PWTEST|2026-08-05|CASE-01|WEEK`, `Start Date`=`2026-08-09` (Sunday), `End Date`=`2026-08-15`, Program Instance = Shooting Challenge 2026-2027  
   - Enrollment: Athlete=Schmidt, Program Instance=Shooting, **no Parent Email**, Active? as needed for links, label `…|CASE-01|ENR`  
   - WAS: Enrollment + Week + Goal Record; Homework empty; no email build/send flags; **do not** set Perfect Week helpers; **do not** check Test Override  
2. **Each Denver day Sun–Sat:** Submission: Enrollment, Week, `Activity Date`=that day, `Shot Total`≥ daily min  
3. **Any three of those days:** Video Feedback with Enrollment + that day’s Submission  
4. **No Zoom Meeting** for CASE-01  
5. After Saturday: ensure WAS.Submissions includes the seven; wait for/run 057  

Expected after Saturday: Daily Met true; Video Met 1; Zoom Met 1 (not required); Eligible 1; one Unlock; one XP 100.

---

## Schema inspection checklist (do first)

Confirm types. Stop if missing:

**Weeks:** Week Name, Start Date, End Date, Program Instance  
**Enrollments:** Athlete, Program Instance, Active?, Parent Email (leave blank)  
**Submissions:** Enrollment, Week, Activity Date, Shot Total (writable); Submitted At / Countable / Same Day are formulas  
**Video Feedback:** Enrollment, Submission  
**Zoom Meetings:** Week, Attendees  
**Zoom Attendance:** Enrollment, Zoom Meeting (if present), Attendance Method  
**WAS:** Enrollment, Week, Submissions, Goal Record, Homework (empty)

Do **not** write Perfect Week * Met? / Eligible / Unlock / XP / Test Override.

---

## Required return table

| Case | Batch | Enrollment | Week | WAS | Submissions | Videos | Zoom | Expected |
| ---- | ----- | ---------- | ---- | --- | ----------- | ------ | ---- | -------- |

Also return JSON matching `fixtures/PWTEST-MANIFEST.template.json` (include `fixtureMethod: "LIVE_SAME_DAY_CALENDAR"`).

---

## After creates

1. Confirm 057 enabled, Version **1.5**.  
2. Wait for or re-run 057 on each fixture WAS.  
3. Allow 058/059 for awarding cases.  
4. Run: `node tools/testing/verify_perfect_week_fixtures.mjs`  
5. Do not delete until evidence saved.  
6. Do **not** mark Perfect Week Complete yet.  
7. Pilot `recxbwkZpSJZ5eiqA` may be deleted after this method is documented.
