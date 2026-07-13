# C-010 — Two-field behavior contract (Stage 4)

**Date:** 2026-07-13  
**Worker:** D — Stage 4  
**Branch:** `overnight/v2-run/worker-d-s4-c010-enrollment`  
**Base SHA:** `9e905ca`  
**Status:** **COMPLETE** (design contract — no schema changes)

---

## 1. Field definitions (approved owner model)

| Field | Controls | Does **not** control |
|-------|----------|----------------------|
| **`Active?`** | Public visibility (web leaderboard); normal parent/athlete **communications** (072, 076, future C-027) | XP, streaks, achievements, homework, video, weekly summaries |
| **`Progress Processing Enabled?`** | XP (**010**, **065**, **059**, **054**, **101**), streaks (**053**, **056**), achievements (**066**, **058**), WAS (**031**), level recalc (**041**, **042**) | Public visibility; comms |

**Reactivation:** Set `Progress Processing Enabled?` = true → backlog catches up via existing automations + safe backfills (**C-024** idempotent keys). Set `Active?` = true when ready for public/comms.

---

## 2. Process → field mapping

| Process category | `Active?` | `Progress Processing Enabled?` |
|------------------|-----------|-------------------------------|
| Web leaderboard | **Yes** | No |
| Weekly/daily parent emails | **Yes** | No |
| Schmidt test comms exclusion | **Yes** (+ enrollment ID guard) | No |
| Submission XP | No | **Yes** |
| Homework / video XP | No | **Yes** |
| Streaks / milestones / perfect week | No | **Yes** |
| Weekly Athlete Summary | No | **Yes** |
| Zoom attendance XP | No | **Yes** |
| Intake (**001**) default both true | Set `Active?` true | Set new field true |
| Catalog tables (Levels, Achievements) | Own `Active?` | N/A |

---

## 3. Athlete state matrix

| State | Active? | Progress Processing Enabled? | Visibility | Comms | Progress |
|-------|---------|------------------------------|------------|-------|----------|
| Normal active | true | true | On | On | On |
| Temporarily hidden | false | true | Off | Off | **On** |
| Withdrawn | false | false | Off | Off | Off |
| Schmidt test | false | true | Off | Off | **On** (pipeline) |

---

## 4. Minimum schema changes (proposal — not executed)

| Change | Type | Risk |
|--------|------|------|
| Add **`Progress Processing Enabled?`** | Checkbox on Enrollments | Low — default true |
| Backfill existing rows | Formula or one-time extension | Set true for all non-withdrawn |
| No rename/delete | — | Required |

---

## 5. Migration safety requirements

1. **DEV first** — field create + formula views before automation edits.
2. **No PROD** until Mike approves promotion checklist.
3. Automations: read new field with fallback (`field missing` → treat as true) during transition.
4. **C-024** Source Key recheck on reactivation — no duplicate XP.
5. Backfills: skip-correct only ([owner #4](../../v2-change-backlog.md)).
6. Schmidt enrollment: keep `Active?` false; never add to real-family email recipient lists.

---

## 6. DEV OMNI implementation order

See [C-010-dev-omni-implementation-stage4.md](./C-010-dev-omni-implementation-stage4.md).

*Worker D · contract · COMPLETE*
