# 03 — Business Rules

**Status:** **Placeholder — next full document to write** (ChatGPT draft → owner review → GitHub).

This file will become the parent- and operator-facing rule book for **how the game works**. Exact XP numbers and per-level thresholds are **tuned in Airtable config tables** before launch (Q1 2027), not frozen in this doc until then.

---

## Locked principles (2026-07-03)

| Rule area | Decision |
|-----------|----------|
| **Progression** | **One ladder** — lifetime XP + **Level Gate Rules**. No separate “shots-only path” for 2026–27. |
| **XP buckets** | Separate reward types (shooting, homework, video, zoom, streaks, milestones) via **XP Reward Rules** and **XP Events** — shooting remains the largest share. |
| **Gates** | **Spread early** — small requirements from low levels (e.g. **1 homework** to advance past an early level). No mid-season cliff like V1 at ~1,000 XP. |
| **Highest levels** | Require **full program** participation (homework, video, zoom, streaks as configured per level). |
| **Educational Athletics** | Basketball is the vehicle; consistency, responsibility, reflection, and discipline are intentional outcomes — not a side app. |
| **Source of truth** | **Levels**, **Level Gate Rules**, **XP Reward Rules**, **Achievements** — automations read tables; see config-vs-code doc. |
| **Communication** | Game manual and website publish from config **before** Day 1 (May 2027). |
| **If friction remains** | Revisit architecture **after** 2026–27 season only — not during this build. |

---

## What this document will contain (outline)

1. **Season calendar** — May 1 – June 30, 2027; week boundaries (America/Denver).
2. **How XP works** — activity types, rule keys, one source → one XP event.
3. **How levels work** — cumulative XP thresholds; gate minimums per level.
4. **Graduated gate table** — illustrative structure (final numbers from **Level Gate Rules** at tuning time).
5. **Streaks and milestones** — where rules live (Achievements + XP Reward Rules); streak economics TBD at tuning.
6. **Homework, video, zoom** — satisfactory / posted / attendance definitions.
7. **Awards and recognition** — catalog vs recipients; end-of-season vs weekly.
8. **What parents should expect** — time commitment; no surprises.
9. **Config change policy** — no mid-season rule changes without migration plan.

---

## Source documents (use when writing the full doc)

| Doc | Use for |
|-----|---------|
| [../shooting-challenge-v2-master-direction.md](../shooting-challenge-v2-master-direction.md) | Philosophy and locked decisions |
| [../shooting-challenge-v2-config-vs-code.md](../shooting-challenge-v2-config-vs-code.md) | Which tables hold which rules |
| [../xp-motivation-analysis-2025-26.md](../xp-motivation-analysis-2025-26.md) | V1 lessons (what not to repeat) |
| [../data-flow/submission-to-xp-flow.md](../data-flow/submission-to-xp-flow.md) | Submission → XP |
| [../data-flow/homework-flow.md](../data-flow/homework-flow.md) | Homework pipeline |
| [../../airtable/schema/current/field-map.md](../../airtable/schema/current/field-map.md) | Field names |

---

## After this doc is finalized

- Publish parent-facing copy on `/shoot` rules page.
- Align **Level Gate Rules** and **XP Reward Rules** in the 2026–27 clone base.
- Include link in Week 0 email and weekly parent emails.
