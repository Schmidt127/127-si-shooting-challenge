# Grade Band Configuration Audit

Overnight Agent 2 · 2026-07-23

## Live Grade Bands (PROD)

| Record | Name | Active | Total Shot Target |
|---|---|---|---|
| `recK7BDVSpHy2ipCS` | K-2 | yes | 2000 |
| `reclWDQZzKbVBtdhG` | 3-4 | yes | 5000 |
| `recv9aWnHanY2sRgk` | 5-6 | yes | 8000 |
| `rec2VQFfGJa1ofA06` | 7-8 | yes | 10000 |
| `rec75ruo3XT5nSvaK` | 9-12 | yes | 12000 |
| `recg6zvMxWsFSn7sf` | "Grades 1–2" (mojibake) | **inactive** | 2000 |
| `recOGisMZRWgk445o` | "Grades 9–10" (mojibake) | **inactive** | 10000 |

Active naming is consistent (`K-2`, `N-M` hyphen format, no alternate spellings among active rows).
The two inactive legacy rows contain encoding-damaged en-dashes and are referenced only by
inactive Shot Milestones (8 each) — no active rules, no active enrollments observed pointing at them.

## Usage by table (link vs string)

| Table | Grade Band mechanism | State |
|---|---|---|
| Enrollments | Link + `Grade Band Label` lookup + `Grade Band Status`/refresh fields | Healthy; Schmidt: K-2 assigned, status "Assigned" |
| Weekly Athlete Summary | Link copied by **030** (linked record IDs) + `Grade Band - Display` lookup | Healthy — every WAS row probed carries a valid link |
| Homework Completions | Link copied by **020** | Healthy pattern (linked IDs) |
| Video Feedback | Link copied by **013** | Healthy pattern (linked IDs) |
| Submission Assets | Band flows via parent enrollment | n/a |
| XP Reward Rules | Link (weekly-threshold rules only) | Healthy — 15 band rules resolve to the 5 active bands |
| Level Gate Rules | **No Grade Band dimension** — gates are band-agnostic in current PROD config | Configuration fact, not defect |
| Shot Milestones | Link | Healthy — every milestone has exactly one band link |
| Perfect Week (057) | Uses WAS weekly goal (band-derived) rather than band directly | OK |

## Script findings

1. **066 (shot milestones) matches bands by display label string**, not link ID. This is the only
   active script found relying on a display name where a linked record comparison is available.
   Risk: a rename or normalization drift silently stops milestone unlocks for that band.
   Recommendation: compare `Grade Band` linked record IDs (Enrollment ↔ Shot Milestone). Safe
   section rewrite + re-paste (MIKE-ACTIONS #6, SC-023).
2. 013/020/030 copy the link itself — correct pattern, no normalization needed.
3. No hidden alternate spellings in active data; the only irregular strings live on the two
   inactive legacy rows.
4. Missing-band behavior: 030 skips with an explicit "Enrollment has no Grade Band" error output
   (fails clearly). 066 skips band-mismatched milestones silently — acceptable for inactive rows,
   but combined with string matching this is where a rename would silently no-op.

## Duplication check

No duplicate active band rules anywhere: weekly-threshold XP rules are one per band per tier;
milestones one ladder per band; gate rules are band-agnostic.

## Actions

- Keep active band names frozen (renames require full dependency review — 066 string match).
- Archive/delete the two mojibake legacy bands after Mike confirms (MIKE-ACTIONS #8).
- Convert 066 to link-ID matching (MIKE-ACTIONS #6).

Tests: `overnight-streak-milestone-dedupe.test.js` ("changed Grade Band swaps the milestone ladder")
pins band-scoped milestone behavior at the shared-helper level.
