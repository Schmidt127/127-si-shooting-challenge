# SC-SEASON-SIM-001 — Three-athlete execute (2026-09-06)

| | |
|---|---|
| **Authorization** | Mike: `RUN 3-ATHLETE SEASON SIMULATION` |
| **Run ID** | `SEASON-SIM-2027-20260906T144833Z-threeathlete` |
| **Base** | Production `appn84sqPw03zEbTT` |
| **Tip** | `origin/master` @ `3a785e39` + local ExecuteContext wiring fix |
| **Email** | Off (no `--enable-email-delivery`) |

## Verdict

**WRITER COMPLETE (3/3) → cascade PARTIAL while settling → CLEANUP EXECUTED (598 records) → formulas restored to Production `NOW()` / `TODAY()`.**

Transactional Sim Perfect / Recovery / Edge rows are gone. Season Sim formula gates are **off**.

## Writer results

| Profile | Enrollment | Created (writer) | Countable subs | Shots counted |
|---------|------------|-----------------:|---------------:|--------------:|
| Sim Perfect (12) | `recQ3R8IjUfBNCNqr` | 336 | **61 / 61** | **16630** |
| Sim Recovery (10) | `recvrIIQhDmoxRgSk` | 267 | **53 / 53** | **8274** |
| Sim Edge (8) | `recTkMOjWobk5ZOlq` | 304 (+2 reused) | **62 / 62** | **13200** |

Shot totals matched offline expectation matrices. Clock gate worked (countable = planned submit days).

## Cascade snapshot (before cleanup)

| Profile | Lifetime XP (approx) | Submission Base XP | Notes |
|---------|---------------------:|-------------------:|-------|
| Perfect | ~1995 | climbing (~22 / 61) | Healthiest; 010 still catching up |
| Recovery | ~335 | **0** | HW / Zoom / milestone present |
| Edge | ~325 | **0** | Threshold / Zoom / milestone |

Material open finding for a future re-run: Recovery + Edge lacked Submission Base XP under three-athlete burst writes; Perfect Submission Base lagged planned 61.

## Cleanup

- Pass 1 failed closed (looked for single shared registry file; profiles use `__athleteN-…` registries)
- Pass 2 deleted **598** disposable records (Athletes 3, Enrollments 3, Submissions 176, plus assets/HC/VF/XP/WAS/Zoom/Email Handoff/streaks/unlocks)
- Evidence: `tools/season_simulation/reports/cleanup-SEASON-SIM-2027-20260906T144833Z-threeathlete-20260906T150805Z.json`

## Stage Z formulas

Verified restored:

- `Activity Date Is Future?` → Production `NOW()`-only
- `Submitted Same Day?` → `Submitted At` path
- `Perfect Week Grace Eligible?` → `Submitted At` + `TODAY()` path

## Fixes applied mid-session (repo, may be uncommitted)

First authorized attempt (`…T144510Z`) planned only — `ExecuteContext` missing. Fixed:

- `tools/season_simulation/execute_three.py`
- `tools/season_simulation/three_athlete.py`
- `tools/season_simulation/cli.py`

Offline SC-001 tests: **54 PASS**.

## Follow-ups

> **Superseded diagnosis:** [`SC-SEASON-SIM-001-CASCADE-FAILURE-20260906.md`](./SC-SEASON-SIM-001-CASCADE-FAILURE-20260906.md) — root cause = settlement/ordering + 053 Enrollment clear amplifier; harness fixed; targeted live XP verify passed.

1. Commit the ExecuteContext / per-profile registry wiring when Mike wants it on `master`
2. Harden `cleanup-three` so pass-1 finds `__athlete*-` registries without a manual pass-2
3. Next three-athlete run: allow longer 010 settle (or explicit re-arm) before cleanup; investigate Recovery/Edge Submission Base gap
