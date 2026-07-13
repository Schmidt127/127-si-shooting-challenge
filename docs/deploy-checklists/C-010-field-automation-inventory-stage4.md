# C-010 — Field and automation dependency inventory (Stage 4)

**Date:** 2026-07-13  
**Worker:** A — Stage 4  
**Branch:** `overnight/v2-run/worker-a-s4-c010-enrollment`  
**Base SHA:** `9e905ca`  
**Owner rule:** [v2-change-backlog.md § Owner #6](../../v2-change-backlog.md#owner-business-decisions--approved-2026-07-13)  
**Status:** **COMPLETE** (repo audit — no schema changes)

---

## 1. Current enrollment control fields

| Field | Table | Exists today | Used for |
|-------|-------|--------------|----------|
| **`Active?`** | Enrollments | **Yes** | Web leaderboard (`Web - Leaderboard`); some automations skip inactive; Schmidt test = **false** |
| **`Registration Status`** | — | **No field in repo** | Not referenced in GitHub automations, web, or tests |
| **`Progress Processing Enabled?`** | Enrollments | **No** | Approved design only — implementation queued |

---

## 2. Automations referencing Enrollments.`Active?`

| Script | Behavior today | Target field(s) |
|--------|----------------|-----------------|
| **001** | Sets `Active?` = true on new enrollment | Intake only |
| **023** | Reads `Active?`; writes submission linkage | **Gap** — does not gate XP |
| **043** | Requires field exists | Levels |
| **056** | Daily streak refresh **filters** `{Active?}` enrollments only | **Progress** — conflates visibility + progress |
| **066** | `skipped_inactive` when enrollment unchecked | **Progress** |
| **101** | Skips inactive attendee enrollments | **Progress** |

---

## 3. Documented gaps — no enrollment `Active?` gate (C-010 backlog)

| Script | Domain | Risk if athlete hidden |
|--------|--------|------------------------|
| **010** | Submission base XP | XP still created |
| **031** | Weekly Athlete Summary | WAS still created/linked |
| **053** / **054** | Streak occurrences + XP | Streaks still rebuild |
| **058** / **059** | Perfect week + achievement XP | Unlocks/XP still flow |
| **065** | Homework XP | XP on satisfactory review |
| **072** | Weekly parent email package | Email may build (no enrollment Active? check) |
| **076** | Daily submission email | Email may send to inactive enrollment |
| **114** | Video XP | Gates on **Video Feedback** `Active?`, not enrollment |

---

## 4. Other `Active?` usages (not Enrollments)

| Table / script | Purpose |
|----------------|---------|
| XP Events `Active?` | Soft-delete duplicate XP (**116**) |
| XP Reward Rules `Active?` | Rule selection (**010**, **065**, **072**) |
| Levels / Level Gate Rules `Active?` | Catalog gating (**042**, **043**) |
| Video Feedback `Active?` | Video XP gate (**113**, **114**) |
| Target Goal Shots `Active?` | Weekly summary goal link (**032**) |
| Achievements catalog `Active?` | Web achievements page |

---

## 5. Schmidt test enrollment (C-019)

| Item | Value |
|------|-------|
| Enrollment | `recgP9qZYjAhE7NXm` — Schmidt, Testing |
| **`Active?`** | **false** (standings excluded) |
| Pipeline | **Full run** — no `Is Test Record` on pipeline tables |
| Isolation | **Testing** views filter by Enrollment link — [C-019 checklist](./C-019-testing-views-verification-checklist.md) |

---

## 6. Minimum schema proposal (documentation only)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| **`Progress Processing Enabled?`** | Checkbox | `true` on create (**001**) | New field — **not created in Stage 4** |

No rename/delete of existing fields. `Active?` meaning unchanged per owner approval.

---

## 7. Automation rewrite priority (DEV implementation wave)

1. **056**, **066**, **101** — move progress gate from `Active?` → `Progress Processing Enabled?`
2. **010**, **031**, **053–059**, **065** — add progress gate; allow hidden athletes to accrue XP
3. **072**, **076**, **071**, **074** — add `Active?` comms gate + Schmidt exclusion
4. **Web** — keep `Active?` on leaderboard; no change until OMNI confirms views

*Worker A · inventory · COMPLETE*
