# Levels 043 → 042 — Investigation

**Stage:** S26 · Workstream 7  
**Date:** 2026-07-14  
**Scope:** Analysis + docs — **do not retire 043**; no Airtable UI; no PROD.

**Recommendation:** [S26-043-042-recommendation.md](../overnight-runs/results/S26-043-042-recommendation.md)

---

## Scripts

| # | File | Version | Trigger (GitHub / docs) |
|---|------|---------|-------------------------|
| **042** | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | **3.0** | Enrollments · enters view `042 - Needs Level Assignment` · **Level Recalc Needed?** checked |
| **043** | `043-levels-and-progression-set-level-gate-rule-from-next-level.js` | **v2.0** | Enrollments · Next Level not empty · Level Gate Rule **empty** · optional Active? |

**Doc bug note:** `airtable/schema/current/automation-trigger-map.md` incorrectly lists 043 trigger table as **Levels**. Script + DEV docs table use **Enrollments**.

---

## Fields written

| Enrollment field | 042 v3.0 | 043 v2.0 |
|------------------|----------|----------|
| Current Level | **Write** | — |
| Next Level | **Write** | read |
| **Level Gate Rule** | **Write** (blocked gate **or** next-level gate) | **Write** (only if empty) |
| Level Status | Assigned / Gate Blocked / Error | — |
| Level Recalc Needed? | Uncheck after process | — |

042 also **reads** Level Gate Rules (Version Active?, Gate Enabled?, minima) and Enrollment rollups (XP, submissions, homework, videos, Zoom, streak) to decide gate blocking.

043 only maps Next Level → matching Level Gate Rules row (prefers Version Active?).

---

## Supersession evidence (GitHub)

042 docblock (v3.0):

> After this script is tested successfully, Automation **043** should be turned off because this script **directly assigns the correct Level Gate Rule**.

Also referenced by V2-014a (approved retirement of 043 pending maintenance window) and capacity ledger Path H — **replacement evidence**, never “because OFF”.

---

## Timing / race

```text
041 marks Level Recalc Needed?
  → 042 assigns Current/Next + Level Gate Rule + clears recalc flag
  → 043 fires only if Level Gate Rule still empty AND Next Level set
```

| Scenario | 043 needed? |
|----------|-------------|
| 042 v3.0 ran successfully (Assigned or Gate Blocked) | **Usually no** — gate rule already written |
| Legacy / older 042 that did not write gate rule | **Yes** — gap filler |
| Level Gate Rule cleared manually while Next Level remains | **Yes** — re-fill |
| Race: 042 sets Next Level before gate write completes | Unlikely in single script; 043 as safety net |

**Gate Blocked path:** 042 sets Next Level = blocked level and Level Gate Rule = **that** blocked level’s gate rule (not necessarily “next higher unblocked”). 043 uses Next Level only — if both run out of order with empty gate, they should still agree on Next Level’s rule.

---

## Live docs-table status (DEV slim export)

| # | Status in docs table | Conditions |
|---|----------------------|------------|
| 042 | Live | Level Recalc Needed? checked |
| 043 | Live | Next Level not empty · Level Gate Rule empty · Active? checked |

ON/OFF in Automations UI still requires Mike attestation (docs Status=Live ≠ UI slot proof).

---

## Migration package (optional — **not** to execute tonight)

### Prerequisites

1. Mike confirms DEV 042 v3.0 is the live pasted script (gate rule write present).
2. Spot-check ≥3 enrollments after XP → 041 → 042: Level Gate Rule populated; Level Status Assigned or Gate Blocked.
3. Confirm no enrollments relying on 043-only fills after 042 (query Level Gate Rule empty + Next Level not empty).

### DEV steps (future approved window)

1. Leave 043 **ON** as safety net during soak **or** turn OFF after soak — Mike choice; **do not delete**.
2. Document soak results in deploy checklist / CHANGELOG when PROD contemplated.
3. Retire/delete 043 only with explicit Mike UI approval (V2-014a maintenance window).

### Rollback

Re-enable / re-paste 043 from GitHub `043-...js` if Level Gate Rule gaps reappear.

### PROD

Always stop — separate promotion package required.

---

## Offline contracts

`tools/airtable/tests/test_levels_042_043_contracts.py`

- 042 owns gate rule on assign and gate-block paths.
- 043 only writes when gate empty.
- After successful 042-shaped result, 043 predicate is false.

---

## Hard rules for S26

- **Do not** retire, delete, or disable 043 tonight.
- Prefer recommendation + optional migration **docs** only.
