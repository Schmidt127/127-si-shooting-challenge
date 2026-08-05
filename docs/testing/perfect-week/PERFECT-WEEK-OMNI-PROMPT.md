# Omni Prompt — Perfect Week controlled PROD fixtures

**Paste this entire document into Omni (PROD Airtable in-base AI).**  
Do not invent field names. Inspect schema first. Report mismatches before creating records.

---

## Mission

Create a deterministic Perfect Week test-fixture package in **PROD** for Automation **057 v1.5** live verification.

Controlling docs (repo):

- `docs/testing/perfect-week/PERFECT-WEEK-FIXTURE-SPEC.md`
- `docs/testing/perfect-week/PERFECT-WEEK-EXPECTED-RESULTS.md`
- Manifest template: `docs/testing/perfect-week/fixtures/PWTEST-MANIFEST.template.json`

Batch key: `PWTEST|2026-08-05`

Athlete: Schmidt testing athlete only. Do **not** use other athletes. Do **not** email real parents.

---

## Hard rules

1. Work in **PROD** only for these controlled fixtures.
2. Inspect current PROD schema (tables + field names + types) **before** any create.
3. If a required field name differs from this prompt, **stop**, list the mismatch, and wait for Mike — do not guess.
4. Create isolated Enrollments / Weeks / Submissions / Video Feedback / Zoom / WAS / (let unlocks/XP come from automations).
5. Every created record must be clearly labeled `PWTEST|2026-08-05|CASE-XX` in Name / Notes / Description (whichever writable fields exist).
6. Avoid real parent emails. Prefer blank/test-safe contact fields; do not arm weekly/parent email sends for these enrollments.
7. Do **not** manually write formula, lookup, rollup, or automation-owned Perfect Week result fields (`Perfect Week Daily Requirement Met?`, video/zoom counts, Eligible, Unlock, XP Events).
8. Create in dependency order: Week → Enrollment → Submissions (+ Video / Zoom) → WAS (or let 031 create WAS) → allow 057/058/059 to run.
9. Record **every** created record ID.
10. Return the result table at the end (required columns below).
11. Safe to delete later — tag all records as controlled test data.

---

## Shared constants

| Item | Value |
|------|--------|
| Fixture prefix | `PWTEST\|2026-08-05` |
| Target week Sunday | `2026-08-02` |
| Target week Saturday | `2026-08-08` |
| Weekly goal shots | `70` (daily min = 10) |
| Shots per qualifying day | `10` (or more) |
| Required videos (passing cases) | `3` |
| Timezone | `America/Denver` |

Confirm Schmidt athlete record ID in PROD (expected historical: `recgqVstObQRzgXJF` — verify before linking).

---

## Schema inspection checklist (do first)

Confirm these exist (report type). Stop on missing:

**Weeks:** Start Date (and End Date if present)  
**Enrollments:** Athlete, Program / Program Instance, Active?, Notes/Name  
**Submissions:** Enrollment, Week, Activity Date, Submitted At, Total Shots Counted, Count This Submission?  
**Video Feedback:** Enrollment, Submission  
**Zoom Meetings:** Week, Attendees  
**Zoom Attendance:** Enrollment, Zoom Meeting, Attendance Method (if used)  
**Weekly Athlete Summary:** Enrollment, Week, Submissions, Weekly Goal Shots Target / Goal Shots Target, Homework (leave empty for these cases)

Do **not** write: Perfect Week * Met? helpers, Eligible?, Unlock, XP.

---

## Create procedure (all cases)

For each CASE-XX:

1. Create Week(s) with Start Date = Sunday of that case’s window (usually `2026-08-02`). Label primary/name `PWTEST|2026-08-05|CASE-XX|WEEK`.
2. Create Enrollment(s) linked to Schmidt; label `PWTEST|2026-08-05|CASE-XX|ENR` (and `|ENR-B` for dual-enrollment cases). Prefer inactive email / no parent notify.
3. Create Submissions as specified; set Activity Date + Submitted At to satisfy same-day Denver calendar day (except CASE-07). Link Enrollment + correct Week unless the case requires mismatch.
4. Create Video Feedback / Zoom only when the case needs them.
5. Ensure WAS exists for Enrollment+Week (create manually with links **or** trigger 031). Set weekly goal **70**. Leave Homework empty.
6. Link WAS.Submissions to the intended submission set for that case (if not auto-linked).
7. Do not force Eligible / Unlock / XP.
8. Append IDs to the result inventory.

After all creates: ask Mike to wait for Automations **057 → 058 → 059** (or re-run 057 on each WAS). Then Mike runs the repo verifier.

---

## Case instructions (exact)

### CASE-01 — Clean pass
7 same-day submissions Sun–Sat; 3 videos on those submissions; no Zoom. Expect award.

### CASE-02 — All shots one day
All shots on `2026-08-02` only (may use multiple submissions same day). Expect fail.

### CASE-03 — Six days
Qualifying days on six dates only (omit one official day). Expect fail.

### CASE-04 — Cross-week
Six in-week days + submission on `2026-08-09` + submission on `2026-08-01`. Label contamination rows. Do not let them satisfy the seventh day. Expect fail.

### CASE-05 — Cross-program
Enrollment A (target) + Enrollment B (different program). Six days on A; seventh only on B. Expect A fail.

### CASE-06 — Wrong Week link
Submission with Activity Date inside target week but Week link = **other** Week; manually include it on target WAS.Submissions. Document whether 057 counts it. Preferred: no award; if award → flag defect.

### CASE-07 — Backdated
Required-day submission with Submitted At on a later Denver date. Expect not countable / fail.

### CASE-08 — Video fail
7 days + only 2 videos. Expect fail.

### CASE-09 — Cross-week video
7 days + 2 in-week videos + 1 video tied to adjacent-week submission. Expect Video Count 2 / fail.

### CASE-10 — Zoom not required
Same as CASE-01 (no meeting). Expect award.

### CASE-11 — Zoom attended
CASE-01 shooting/video + Zoom Meeting for Week + Attendees includes Enrollment. Expect award.

### CASE-12 — Zoom not attended
Meeting for Week; no attendance. Expect fail.

### CASE-13 — Cross-program Zoom
Meeting for Week; attendance on Enrollment B only. Target Enrollment A expects fail.

### CASE-14 — Duplicate same day
≥2 qualifying submissions on one date + other six dates covered. Expect Days Logged = 7 (not inflated); award OK if all rules met.

### CASE-15 — Idempotency
Reuse CASE-01 WAS (or clone). After first award, ask Mike to re-run 057 twice. Expect still one Unlock and one XP.

### CASE-16 — Timezone boundary
Submission A: Saturday 2026-08-08 23:55 Denver. Submission B: Sunday 2026-08-09 00:05 Denver. Place each on the correct Week/WAS. Expect no UTC week flip.

---

## Required return table

Return markdown:

| Case | Enrollment | Week | WAS | Submissions | Videos | Zoom | Expected |
| ---- | ---------- | ---- | --- | ----------- | ------ | ---- | -------- |

Fill Expected from `PERFECT-WEEK-EXPECTED-RESULTS.md` (award / no-award summary).

Also return a JSON inventory matching `PWTEST-MANIFEST.template.json` shape so Mike can save it as:

`docs/testing/perfect-week/fixtures/PWTEST-MANIFEST.json`

---

## After creates

Tell Mike:

1. Confirm Automation 057 enabled and header shows **Version 1.5**.
2. Wait for or re-run 057 on each fixture WAS.
3. Allow 058/059 for awarding cases.
4. Run: `node tools/testing/verify_perfect_week_fixtures.mjs`
5. Do not delete fixtures until evidence is saved.
6. Do **not** mark Perfect Week Complete yet.
