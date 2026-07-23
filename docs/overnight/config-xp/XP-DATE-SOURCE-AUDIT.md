# XP Event Date and Source Mapping Audit

Overnight Agent 2 · 2026-07-23

## Field architecture (XP Events)

- `XP Activity Date` — writer-supplied explicit date (primary).
- `XP Activity Date Source` — single select naming the provenance (11 choices incl.
  "Submission Activity Date", "Streak End Date", "Weekly Summary Week End Date", "Manual Date",
  "Fallback Created Time").
- `XP Date Resolved` — formula: explicit date if present, else SWITCH on `XP Bucket` walking
  per-source lookup date fields (`Date - Submission Base Activity`, `Date - Streak End`,
  `Date - Zoom Meeting`, `Date - Shot Milestone Activity`, …), else CREATED_TIME().

## Mapping verification

| Source | Intended date | Implementation | Status |
|---|---|---|---|
| Submission Base | Submission Activity Date | 010 writes explicit date; lookup fallback exists | OK — live event `recOodD23MQrP1O9F` = 2026-07-23T06:00Z (Denver midnight) |
| Homework Completion | submission activity date | writer + `Date - Homework Submission Activity` lookup | OK by design |
| Video Feedback | video activity date | lookup `Date - Video Submission Activity` | **Live defect:** event `recYQ10pOoFlApmjZ` has blank `XP Activity Date` and no linked date resolved (probe `date=None`) |
| Streak | Streak End Date | 054 explicit + `Date - Streak End` lookup | OK by design |
| Zoom | Zoom Meeting Date | explicit + `Date - Zoom Meeting` | OK — live quiz event carries 2026-05-24 (meeting date, not approval date) |
| Perfect Week | Week Saturday | `Date - Weekly Summary End` lookup | OK by design |
| Shot Milestone | latest counted submission date | `Milestone Activity Date` on unlock → lookup, falls back to Date Unlocked | OK by design |
| Manual Bonus | explicit date | `XP Activity Date` manual | OK |

## Defects found

1. **`XP Date Resolved` SWITCH case mismatch:** the formula switches on `XP Bucket`
   (choices: Shooting Base, Homework Completion, Video Feedback, Streak, Weekly Threshold,
   Perfect Week, Zoom Attendance, Shot Milestone, Manual Bonus) but one case reads
   `"Submission Base"` — an `XP Source` name, not a bucket. Submission-base events lacking an
   explicit date would fall to CREATED_TIME instead of the submission lookup. Currently masked
   because 010 always writes the explicit date. Fix = one-line UI formula edit (MIKE-ACTIONS #3).
2. **Video Submission event with no date** (above) — writer did not set the explicit date and the
   resolver had nothing to fall back to except created time. Tied to the amount defect
   (MIKE-ACTIONS #4).
3. **057 `getDateKeyFromDateOnly` slices UTC ISO strings.** Safe today (Submissions.Activity Date is
   date-only; Weeks Start/End are Denver dateTimes seeded at midnight, whose UTC date equals the
   Denver date), but any evening-seeded Week would shift the whole Perfect Week window. Latent;
   regression guard added ("naive UTC slicing would disagree with Denver…" test). Repo-side fix
   requires a 057 re-paste (MIKE-ACTIONS #2).

## Scenario tests added (`overnight-xp-date-source.test.js`, 16 passing)

current-date submission · backdated submission · Denver summer/winter boundaries · UTC-slice
regression · delayed homework grading · delayed video grading · Zoom recording approval after the
meeting · streak unlock after recalculation (end-date key) · backdated streak repair shifting end
date (documents the 053 double-award hazard) · milestone-after-backfill latest-date contract ·
Perfect Week Saturday resolution incl. `priorSaturdayKeyDenver` · manual explicit date ·
month/year date arithmetic.

No unsafe repo changes were made; the two Airtable-side fixes are listed as Mike actions.
