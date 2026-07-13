# C-010 — Email, public output, and visibility audit (Stage 4)

**Date:** 2026-07-13  
**Worker:** B — Stage 4  
**Branch:** `overnight/v2-run/worker-b-s4-c010-enrollment`  
**Base SHA:** `9e905ca`  
**Status:** **COMPLETE** (repo audit)

---

## 1. Public / web visibility surfaces

| Surface | Source | Current gate | C-010 target |
|---------|--------|--------------|--------------|
| Leaderboard | `web/lib/airtable/queries.ts` | `AND({Active?}, {Lifetime XP Total} >= 0)` | **`Active?` only** |
| Levels ladder | `web/docs/airtable-views.md` | `{Active?} = 1` on Levels table | Catalog — unchanged |
| Achievements grid | Web queries | `AND({Active?}, {Visible?})` on Achievements | Catalog — unchanged |
| Profile / XP feed | Server reads | XP Events `Active?` | Per-event soft-delete — unchanged |

**Gap:** Hidden athlete (`Active?` = false) with progress enabled may still appear if web adds enrollment-scoped pages without `Active?` filter — audit when new routes ship.

---

## 2. Email and notification workflows

| Script | Trigger | Enrollment `Active?` checked? | Schmidt safe? | C-010 target |
|--------|---------|------------------------------|---------------|--------------|
| **072** | Weekly summary email build | **No** | **No** explicit exclusion | Gate on **`Active?`**; exclude Schmidt enrollment ID |
| **074** | Send weekly package (Make) | Inherits **072** payload | **No** | Same |
| **076** | Daily submission email | **No** | **No** | Gate on **`Active?`** |
| **071** | Homework feedback email | **No** enrollment check | **No** | **Do not change** per C-027 owner rule |
| **073** | Video feedback email | Video path | **No** | Out of C-010 scope tonight |
| **075** | Welcome email | Intake | N/A | Keep — new enrollments `Active?` = true |

---

## 3. Summary and rollup processes

| Process | Script(s) | Enrollment `Active?` | Notes |
|---------|-----------|---------------------|-------|
| Weekly Athlete Summary | **031**, **030**, **034** chain | **No** | Hidden athlete should still get WAS when progress enabled |
| Weekly email content | **072** | **No** | Should **suppress** when `Active?` false |
| Daily submission totals in email | **076** | **No** | Should **suppress** when `Active?` false |
| Streak display in **076** | Reads enrollment streak fields | **No** comms gate | Progress fields may update while hidden |

---

## 4. Behavior matrix — visibility & communications

| Athlete type | `Active?` | `Progress Processing Enabled?` (proposed) | Public web | Parent emails (072/076) | Progress calcs |
|--------------|-----------|-------------------------------------------|------------|---------------------------|----------------|
| Normal active | true | true | Visible | Send | Run |
| Temporarily hidden | **false** | **true** | Hidden | **Suppress** | **Continue** |
| Permanently withdrawn | false | **false** | Hidden | Suppress | **Stop** |
| Schmidt test | **false** | true (typical) | Hidden | **Suppress** (real-family) | **Continue** (full pipeline) |

---

## 5. Schmidt test exceptions

- Standings: excluded via `Active?` = false + leaderboard filter ✓
- Communications: **not** reliably excluded today — **072**/**076** lack enrollment gate
- Pipeline: intentional full run — do not add `Active?` blocks to **010**/**031** progress path
- Isolation: **Testing** views on 8 pipeline tables — manual OMNI ([C-019](./C-019-testing-views-verification-checklist.md))

---

## 6. Recommended comms implementation (DEV OMNI — not Stage 4 code)

1. **072** / **076**: early skip when `Enrollments.Active?` is false.
2. Add Schmidt enrollment ID denylist constant (or lookup Testing enrollment) until generic test flag exists.
3. **C-027** major-event notifications (future): parent-first + `Active?` + idempotent send key.

*Worker B · visibility audit · COMPLETE*
