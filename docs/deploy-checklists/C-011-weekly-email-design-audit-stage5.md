# C-011 — Weekly parent email design audit (Stage 5)

**Date:** 2026-07-13  
**Worker:** D — Stage 5  
**Branch:** `overnight/v2-run/worker-d-s5-c011-weekly-email`  
**Base SHA:** `38b92cb`  
**Backlog:** C-011 — fully automatic weekly parent emails  
**Depends on:** C-010 (two-field enrollment gates)  
**Status:** **COMPLETE** (repo audit — no automation changes)

---

## 1. Current state (**072** → **074**)

| Component | Today | Gap |
|-----------|-------|-----|
| Trigger | Manual `Build Weekly Email Now?` / `Send to Make?` | No scheduled automation |
| Builder | **072** builds JSON package | No enrollment `Active?` gate |
| Sender | **074** POST to Make webhook | Inherits **072** payload |
| Schmidt test | No explicit exclusion | Real-family risk |
| Hidden athlete | No `Active?` check | May email while hidden |

---

## 2. Target behavior (C-011 + C-010)

| Athlete state | Weekly email |
|---------------|--------------|
| Active, progress on | **Send** on schedule |
| Hidden (`Active?` false), progress on | **Suppress** |
| Withdrawn (both false) | **Suppress** |
| Schmidt test | **Suppress** (enrollment ID guard) |

**Do not alter 071** homework feedback or **073** video feedback paths.

---

## 3. Failure modes to design for

| ID | Failure | Detection | Safe behavior |
|----|---------|-----------|---------------|
| F-01 | **072** runs twice same week | Idempotent send key per enrollment+week | Second run skips send |
| F-02 | Make webhook timeout | **074** retains trigger on failure | Retry without duplicate |
| F-03 | Empty parent email | **072** validation | Skip with logged reason |
| F-04 | Partial XP data | Package build continues | Mark section missing; do not fail silently |
| F-05 | Hidden athlete manual trigger | Operator checks `Build Weekly Email Now?` | **072** skips when `Active?` false |

---

## 4. Scheduling design (repo recommendation — not implemented)

1. Airtable scheduled automation or Make scenario on weekly cadence (America/Denver).  
2. View: enrollments where `Active?` = true AND parent email present.  
3. Chain: find/create WAS → **072** per enrollment-week → **074** batch or per-row.  
4. Idempotent key: `WEEKLY_EMAIL|{enrollmentId}|{weekId}` (align C-024).  

---

## 5. Prerequisites before C-011 implementation

- [ ] C-010 DEV paste complete — **072**/**076** comms gates live  
- [ ] C-022 presentation fields for web/email copy  
- [ ] Owner approves send schedule (day/time)  
- [ ] Make scenario capacity reviewed  

---

## 6. Test plan (post-implementation)

| Test | Method |
|------|--------|
| Active enrollment receives package | **115** or manual **072** dry-run |
| Hidden enrollment skipped | Toggle `Active?` false; verify skip output |
| Schmidt excluded | Run against `recgP9qZYjAhE7NXm` |
| Double-run idempotent | Two **072** invocations same WAS → one send key |

*Worker D · C-011 design audit · COMPLETE*
