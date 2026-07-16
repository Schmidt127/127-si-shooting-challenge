# Automation 043 — Retirement Plan (superseded by 042)

**Status:** Plan only — **do not disable or delete** without Mike · live ON/OFF **live-blocked**  
**Base:** Document for DEV soak → Mike-approved maintenance window  
**Inventory:** [DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md](./DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md)  
**Scripts:**  
- Keep: `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` (**v3.0**)  
- Retire: `043-levels-and-progression-set-level-gate-rule-from-next-level.js` (**v2.0**)  
**Authority:** V2-014 / V2-014a · S26 recommendation · Mike Q2 **2026-07-05** (retire approved, not executed)

| Item | Label |
|------|-------|
| 042 writes Level Gate Rule (GitHub v3.0) | **repository-ready** |
| View `042 - Needs Level Assignment` exists | **verified in DEV (snapshot)** |
| Live 042/043 ON/OFF + gate population evidence | **live-blocked** |
| Delete 043 | **requires Mike approval** · **requires PROD promotion** window |

---

## 1. Is 043 superseded by 042?

**Yes — for gate-rule assignment.**

| | **042** v3.0 | **043** v2.0 |
|--|--------------|--------------|
| Role | Assign Current/Next Level + **Level Gate Rule** + status; clear Recalc Needed | Copy Next Level → Level Gate Rule **only if empty** |
| Disposition | **Keep** | **Retire** (Category F) |
| Docblock | After tested, **043 should be turned off** because 042 assigns the correct gate rule | Legacy helper |

042 already writes `Enrollments.Level Gate Rule` for Assigned and Gate Blocked outcomes. 043 is a thinner follow-on safety net, redundant when 042 is healthy.

**Caveat:** 043 can still fill an empty gate if someone clears Level Gate Rule manually or a legacy 042 paste lacked gate write. Soak must prove 042 covers those cases before disable.

---

## 2. Safe retirement procedure

### Phase A — DEV evidence (required)

| # | Check | Pass |
|---|-------|------|
| A1 | DEV pasted script is **042 v3.0** (gate write present) | [ ] |
| A2 | Spot-check ≥3 enrollments after 041→042: Level Gate Rule populated | [ ] |
| A3 | Status is Assigned or Gate Blocked as expected | [ ] |
| A4 | Query: Next Level set + Level Gate Rule empty ≈ **0** | [ ] |
| A5 | Offline: `python -m unittest tools.airtable.tests.test_levels_042_043_contracts -v` (or package contract test) | [ ] |

### Phase B — Soak options (Mike chooses)

| Option | Action | When |
|--------|--------|------|
| **A — Keep both ON** | Default | Until A1–A4 PASS |
| **B — Disable 043 only** | Toggle OFF; keep automation slot | After DEV soak PASS |
| **C — Delete 043** | Remove automation | Approved **maintenance window** only (V2-014a) |

**Lead recommendation:** A → B → C. Never jump to C without B soak.

### Phase C — PROD (Mike only)

1. Repeat A1–A4 on PROD during maintenance window.  
2. Disable 043 (Option B) and monitor level assignment for one week.  
3. Delete 043 (Option C) only with explicit Mike go.  
4. Update `CHANGELOG.md` + automation inventory.

### Rollback

| If | Then |
|----|------|
| Gate Rule empty after 042 | Re-enable 043; investigate 042 paste/version |
| Wrong gate assigned | Restore prior 042; do not delete 043 |
| Need capacity urgently | Prefer other consolidations; 043 delete is optional +1 slot only |

GitHub keeps `043-…js` for re-paste rollback until delete is irreversible in Airtable UI.

---

## 3. Trigger-map correction note

Some index rows incorrectly list 043’s table as **Levels**. Script operates on **Enrollments** (Next Level → Level Gate Rule). Fix inventory when touching docs; do not trust wrong table for retirement checks.

---

## 4. Uncertainties

| Item | Status |
|------|--------|
| Live DEV/PROD ON/OFF for 042/043 | **UNKNOWN** — UI |
| Live pasted 042 includes gate write | **UNKNOWN** — verify |
| Docs “Status=Live” ≠ UI enabled proof | Always re-check UI |

---

## 5. Mike approvals needed

1. Confirm DEV 042 v3.0 soak PASS (A1–A4).  
2. Choose Option A/B/C timing.  
3. Explicit go before PROD disable or delete.  
4. This Worker packet does **not** execute retirement.

---

## 6. Related

- S26: overnight `S26-043-042-recommendation.md`  
- Investigation: overnight `LEVELS-043-042-investigation.md`  
- Offline: `tools/airtable/tests/test_automation_059_043_112_contracts.py` · `test_levels_042_043_contracts.py` (if present on branch)
