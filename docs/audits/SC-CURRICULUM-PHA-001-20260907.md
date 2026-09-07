# SC-CURRICULUM-PHA-001 — Structured Curriculum PHA / Week / Grade Band

**Date:** 2026-09-07  
**Status:** COMPLETE / production-verified  
**SC PR:** [#484](https://github.com/Schmidt127/127-si-shooting-challenge/pull/484) (`001167dc`)  
**Hub PRs:** [#16](https://github.com/Schmidt127/127-si-curriculum-hub/pull/16), [#17](https://github.com/Schmidt127/127-si-curriculum-hub/pull/17)

## Audit answers

| Question | Answer |
|----------|--------|
| If Enrollment has Program Instance, does submit resolve PHA? | Yes, when exactly one **Active?** PHA matches Library + PI + Enrollment Grade Band. |
| Exact match requirements | Homework Library link, Program Instance (via RID), Enrollment Grade Band (`phaMatchesEnrollmentGradeBand`), Active? |
| Does resolved PHA provide Week? | Yes — Week is required; missing Week → 422. |
| Grade Band source on HC | **Enrollment-linked Grade Bands record** (SC model K-2/3-4/5-6…). Not Curriculum Hub session string (K-3/4-6…). Attempt still stores Hub band as `Grade Band Snapshot`. |
| Writes PHA / Week / Grade Band when resolved? | Yes. Prior code wrote PHA+Week only when resolved; **never wrote Grade Band**. |
| Missing Program Instance | Was soft-create HC + Notes; **now 422** with diagnostic. |
| Missing PHA | Same — **422**, no guessed Week/Band. |
| Duplicate PHA | **409** ambiguous. |
| Incomplete HC fallback | Removed for new Structured Curriculum submits. Existing incomplete HCs recover and **backfill** scheduling links. |

## Root cause (Crow `recM42xDs8QGf46Ve`)

**Both fixture and code:**

1. At first Crow submit (~12:20Z), Enrollment had no Program Instance → soft path created Enrollment+Homework only.
2. Crow PHA rows were created later (~12:45Z).
3. `buildHomeworkCompletionFields` never wrote **Grade Band** (Automation 063 that used to copy it is deleted).

## Canonical fixture (production)

- Enrollment `recFBfJrtRCctJpuo` — Active, PI `rec5mEM0YPqPqq0hZ`, Grade Band `recv9aWnHanY2sRgk` (5-6)
- Library Crow `recdCjWNaBBjqTp7k` (`AESOP_CROW_PITCHER`)
- Active PHA `rec07GWst0ZXBKz7U` — Week 1 `rec2Rewxt21z7dI9f`
- Duplicate Crow PHA `recb0qvjifBgiGJ8W` — **Inactive**

## Acceptance results (2026-09-07)

| Test | Result |
|------|--------|
| A Valid PHA (recovery + backfill) | PASS — HC has Enrollment + Homework + PHA + Week + Grade Band |
| B Missing Program Instance | PASS — 422 diagnostic |
| C Missing PHA | PASS — 422 diagnostic |
| D Duplicate PHA | PASS — 409 ambiguous |
| E Retry/idempotency | PASS — same HC/Attempt, no duplicates |
| F Needs Revision | PASS — Attempt `recy1uZYS0NHKVNK1` (#2) on same HC; Attempt 1 Superseded; PHA/Week/Band preserved; 5 responses |
| Daily Submissions | **0** (path unchanged) |
