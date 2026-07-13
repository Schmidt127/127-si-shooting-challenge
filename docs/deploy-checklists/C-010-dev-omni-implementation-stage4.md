# C-010 — DEV OMNI implementation instructions (Stage 4)

**Date:** 2026-07-13  
**Worker:** D  
**Environment:** DEV `appTetnuCZlCZdTCT` only  
**PROD:** **Prohibited** until promotion checklist approved

---

## Phase 1 — Schema (OMNI / Mike in base)

1. Add checkbox **`Progress Processing Enabled?`** on **Enrollments**.
2. Default new enrollments: checked (align **001** when pasted from GitHub).
3. Backfill: set **true** for all current enrollments except explicitly withdrawn.
4. Do **not** change **`Active?`** semantics or Tutorials tables.

---

## Phase 2 — Views (UI only)

1. Confirm `Web - Leaderboard` still filters `{Active?}` only.
2. Complete C-019 **Testing** views on 8 pipeline tables (Schmidt enrollment link).
3. Optional admin view: `Enrollments — Progress disabled` → `{Progress Processing Enabled?} = 0`.

---

## Phase 3 — Automation paste order (GitHub → DEV)

| Order | Script | Change |
|------:|--------|--------|
| 1 | **056**, **066**, **101** | Replace enrollment `Active?` progress skip → `Progress Processing Enabled?` |
| 2 | **010**, **031**, **053**, **054**, **058**, **059**, **065** | Add progress gate on new field |
| 3 | **072**, **076** | Add `Active?` comms skip + Schmidt enrollment exclusion |
| 4 | **001** | Set both fields true on create |

**Do not change 071** homework feedback notifications (owner C-027 rule).

---

## Phase 4 — Verification

1. Hidden athlete test: `Active?` false, progress true → XP/WAS continue; no 072/076 send.
2. Withdrawn test: both false → no new XP; comms off.
3. Reactivation test: enable progress → backfill idempotent per **C-024**.
4. Schmidt test: full pipeline; no real-family email.

---

## Phase 5 — Repo closeout

After DEV validation: update promotion doc in `docs/deploy-checklists/`; mark C-010 backlog **in progress** → **DEV complete**.

*Worker D · OMNI runbook · COMPLETE*
