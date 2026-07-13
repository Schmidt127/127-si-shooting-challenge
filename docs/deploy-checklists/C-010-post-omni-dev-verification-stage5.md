# C-010 — Post-OMNI DEV verification checklist (Stage 5)

**Date:** 2026-07-13  
**Worker:** A — Stage 5  
**Branch:** `overnight/v2-run/worker-a-s5-c010-post-omni-verify`  
**Base SHA:** `38b92cb`  
**Prerequisite:** [C-010-dev-omni-implementation-stage4.md](./C-010-dev-omni-implementation-stage4.md) completed in DEV  
**Status:** **COMPLETE** (repo checklist — run after OMNI paste)

---

## 1. Schema gate

| Check | Pass criteria |
|-------|---------------|
| S5-01 | `Progress Processing Enabled?` exists on Enrollments (checkbox) |
| S5-02 | Default true on new enrollments via **001** |
| S5-03 | Backfill: all non-withdrawn enrollments = true |
| S5-04 | `Active?` unchanged — still visibility/comms only |

---

## 2. Hidden athlete — progress continues, comms off

**Setup:** Test enrollment `Active?` = false, `Progress Processing Enabled?` = true.

| ID | Action | Pass criteria |
|----|--------|---------------|
| S5-10 | Submit daily shooting | **010** creates XP; **031** creates/links WAS |
| S5-11 | Trigger **072** weekly build | `statusOut` = skipped OR no parent email payload |
| S5-12 | Trigger **076** daily email | Skipped — enrollment `Active?` false |
| S5-13 | Web leaderboard query | Enrollment **not** visible |

---

## 3. Withdrawn athlete — progress stops

**Setup:** Both fields false.

| ID | Action | Pass criteria |
|----|--------|---------------|
| S5-20 | New submission | **010** skips — `skipped_progress_disabled` or equivalent |
| S5-21 | **056** daily streak refresh | Enrollment excluded from refresh set |
| S5-22 | No new XP Events for withdrawal period | Audit count stable |

---

## 4. Reactivation — no duplicate XP

| ID | Action | Pass criteria |
|----|--------|---------------|
| S5-30 | Re-enable `Progress Processing Enabled?` | Backlog processes; no duplicate Source Keys |
| S5-31 | Run `audit-dedupe-key-coverage.js` | DK-01 = 0 errors for reactivated enrollment |
| S5-32 | Re-enable `Active?` | Leaderboard visible; **072**/**076** resume |

---

## 5. Schmidt test enrollment

**Enrollment:** `recgP9qZYjAhE7NXm` — `Active?` = false.

| ID | Pass criteria |
|----|---------------|
| S5-40 | Full pipeline runs (submission → XP → assets) |
| S5-41 | **072**/**076** do not send to real-family addresses |
| S5-42 | Leaderboard excludes enrollment |

---

## 6. Automation paste verification order

1. **056**, **066**, **101** — progress gate on new field  
2. **010**, **031**, **053–059**, **065** — progress gate added  
3. **072**, **076** — `Active?` comms gate + Schmidt exclusion  
4. **001** — both fields true on create  

**Do not change 071** (owner C-027 rule).

---

## 7. Repo offline pre-check (before live DEV)

```powershell
python -m unittest tools.airtable.tests.test_c010_enrollment_lifecycle tools.airtable.tests.test_c010_post_omni_scenarios -v
```

Expected: all PASS.

*Worker A · post-OMNI verification · COMPLETE*
