# Omni Install Prompt — SC-003 Testing Views (PROD)

**Paste this entire prompt into Omni inside Airtable base `appn84sqPw03zEbTT`.**

**Do not invent views.** Follow the exact names, filters, sorts, and visible fields below.

**Hard rule:** Do **not** create any view that hides Schmidt (`recgP9qZYjAhE7NXm`) from public standings, leaderboards, or website queries.

---

## Context for Omni

Cursor cannot create Airtable views via API. Meta API on **2026-08-04** shows the named Schmidt Testing views from Package 1 Omni claims are **mostly absent**. Only partial/near-miss views exist (`Athlete Achievement Unlocks` → `Testing`; `Weekly Athlete Summary` → `Grid Testing View` with 0 rows; `Submissions` → `Workflow testing only`).

Create or rename views to match the **canonical names** below. Prefer linked-record “is” filters over fragile display-name text filters.

Stable IDs:

| Entity | Record ID |
|--------|-----------|
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Schmidt Athlete | `recgqVstObQRzgXJF` |
| Foundation Week | `recVDKiYATgzsfpmE` |
| Current Testing Week (WAS-linked) | `recWeVrSabnsYaHc2` |
| Seed Testing Scenario | `recPdyfYRFgDtpzQ8` |
| Known Homework Completion | `recrBnHbLvDpFyIeO` |
| Current Schmidt WAS | `recuxvGq2kY8WKcey` |

Authority: `docs/overnight/testing-integrity/TESTING-VIEWS-MIKE-ACTIONS.md` + `docs/testing/views/TESTING-VIEWS-SPEC.json`.

---

## Create these views (priority order)

For each table:

1. Create a **Grid** view with the exact name.
2. Set the filter exactly as specified.
3. Set sort.
4. Show the listed fields (hide everything else if practical).
5. Open the view and confirm Schmidt rows appear where data exists.
6. Report: view name, table, filter text, approximate row count, whether known record IDs are visible.

### 1. Testing Scenarios → `Testing - Schmidt Scenarios`

- Filter: **Related Enrollment** is `Schmidt, Testing - 2025-2026` / `recgP9qZYjAhE7NXm`
- Sort: **Last Run At** newest first
- Fields: Test Intake Name, Scenario Type, Run Test?, Dry Run?, Test Status, Last Run Status, Last Run At, Submission Date, Shot Total, Related Enrollment, Linked Submission, Actual Result, Pass/Fail Notes, Expected Result
- Expect: seed `recPdyfYRFgDtpzQ8` visible (and other Schmidt-linked scenarios)

### 2. Submissions → `Testing - Schmidt Submissions`

- Filter: **Enrollment** is Schmidt `recgP9qZYjAhE7NXm`
- Sort: Activity Date desc, then Created desc
- Fields: Activity Date, Shot Total, Enrollment, Athlete, Week, Duplicate Review Status, Count This Submission?, Weekly Athlete Summary, XP Events, Submission Assets, Testing Scenarios
- Expect: multiple Schmidt submissions (currently ~9). Optional: keep `Workflow testing only` as a secondary view, but canonical name must exist.

### 3. XP Events → `Testing - Schmidt XP Events`

- Filter: **Enrollment** is Schmidt `recgP9qZYjAhE7NXm`
- Sort: Created desc
- Fields: Source Key, XP Dedupe Key Normalized, XP Points, XP Source, Enrollment, Submission, Week, Weekly Athlete Summary, Awarded By, XP Activity Date
- **Sanity:** row count must be a small number (dozens max), **not** ~2500. If ~2500, filter failed.

### 4. Weekly Athlete Summary → `Testing - Schmidt WAS`

- Filter: **Enrollment** is Schmidt `recgP9qZYjAhE7NXm`
- Sort: Week Start desc (or Week desc)
- Fields: Summary Key, Enrollment, Week, Total Shots This Week, Calculation Status, Submissions, XP Events, Perfect Week Automation Status, Threshold XP Status
- Expect: at least `recuxvGq2kY8WKcey`. Do **not** rely on empty `Grid Testing View`.

### 5. Submission Assets → `Testing - Schmidt Assets`

- Filter: **Enrollment - Linked** is Schmidt `recgP9qZYjAhE7NXm`
- Fields: Asset Slot, Purpose, Upload Status, Canonical URL, Hash, Homework Completions, Video Feedback, Submission - Linked
- **Sanity:** must not return ~280 orphan legacy rows.

### 6. Homework Completions → `Testing - Schmidt Homework Completions`

- Filter: **Enrollment** is Schmidt
- Fields: Enrollment, Homework, Week, Satisfactory?, Submission Assets, XP Events
- Expect: `recrBnHbLvDpFyIeO` visible (plus any other Schmidt HC rows)

### 7. Video Feedback → `Testing - Schmidt Video Feedback`

- Filter: **Enrollment** is Schmidt
- Fields: Enrollment, Submission, Submission Asset, Ready for XP Automation? (or equivalent), XP Events
- Expect: `recBqqe0uGMsqjUrF` if still linked

### 8. Athlete Achievement Unlocks → `Testing - Schmidt Unlocks`

- Prefer rename/upgrade existing `Testing` view to this name **or** create the canonical name with Enrollment = Schmidt
- Fields: Achievement, Source/Unlock Key, Week, XP Award Status, XP Events
- Empty is OK until streak/milestone tests

### 9. Enrollments → `Testing - Schmidt Enrollment`

- Filter: Record ID is `recgP9qZYjAhE7NXm` **or** Athlete is Testing Schmidt
- Expect: **exactly 1** row; **Active?** checked
- Fields: Active?, Athlete, Grade Band, Lifetime XP Total, Current Level, Next Level, Level Gate Rule, Submissions, Weekly Athlete Summary

### 10. Weeks → `Testing - Seeded Weeks`

- Manual filter / include: Foundation Week `recVDKiYATgzsfpmE`, Testing Week `recWeVrSabnsYaHc2`, plus any backdate weeks used in tests
- Sort: Start Date / Week Start Date ascending
- Fields: Week Name, Start Date, End Date, Week Key, Submissions, Weekly Athlete Summary

### 11. Optional — Zoom Attendance → `Testing - Schmidt Zoom Attendance`

- Filter: Enrollment is Schmidt
- Expect: up to 4 existing Schmidt attendance rows

### 12. Optional admin — XP Events → `Admin - Orphan XP Events (no Enrollment)`

- Filter: Enrollment is empty
- Purpose: cleanup only — **not** a Schmidt testing view

---

## Omni response format (required)

Return a markdown table:

| Table | View name created/renamed | Filter summary | Approx rows | Known IDs visible? | Notes |
|-------|---------------------------|----------------|-------------|--------------------|-------|

Also list any views you could not create and why.

**Do not claim screenshots unless you actually attach them.**
