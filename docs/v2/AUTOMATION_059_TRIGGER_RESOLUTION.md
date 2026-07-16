# Automation 059 — Trigger Conflict Resolution (DEV)

**Status:** Design authority locked · formula **verified in DEV (snapshot)** · live trigger type/filters **live-blocked**  
**Base:** DEV `appTetnuCZlCZdTCT` first  
**Inventory:** [DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md](./DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md)  
**Script:** `059-achievements-and-milestones-create-xp-event-from-achievement-unlock.js` (**v3.5**)  
**Hard stops:** No PROD changes · Confirm UI before relying on inventory rows

| Item | Label |
|------|-------|
| `Ready for 059 XP?` formula exists | **verified in DEV (snapshot)** |
| Authoritative trigger = record created, no Ready filter | **repository-ready** |
| Live Airtable trigger/filters/ON | **live-blocked** — **requires Mike approval** (UI attest) |

---

## 1. The conflict

Three repo statements disagree:

| Source | Claim |
|--------|--------|
| `automation-index.md` / short headers | Athlete Achievement Unlocks when XP Award Status **Pending** and **Ready for 059 XP** |
| Script **RECOMMENDED TRIGGER** (2026-06-24) | When record is **created** · Shot Milestone not empty · Pending · **Do NOT** filter Ready or XP Events empty |
| Stage J note | Trigger “fixed” to matches-conditions **without** Ready formula |

---

## 2. Authoritative design

**GitHub script RECOMMENDED TRIGGER (2026-06-24) wins.**

| Item | Expectation |
|------|-------------|
| Trigger type | **When a record is created** (preferred) |
| Conditions | `XP Award Status` = Pending; for shot path: `Shot Milestone` is not empty |
| **Do not use** | `Ready for 059 XP?` = 1 · `XP Events` is empty |
| Input | `recordId` |
| Script version | **v3.5** |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep` |

### Why Ready-filter is wrong

`Ready for 059 XP?` (formula) requires Pending **and** empty `XP Events`. When 059 creates an XP Event, Airtable reverse-links it onto the unlock → formula flips to **0 mid-run**. If the Awarded writeback then fails, the row is stuck: **Pending + XP linked + Ready=0** and will never re-enter a Ready-filtered trigger.

Repair for stuck rows: `backfill-shot-milestone-unlock-mark-awarded.js` (status only).  
Diagnostic: `audit-pending-shot-milestone-unlocks.js`.

---

## 3. Duplicate risk

| Risk | Mitigation in script |
|------|----------------------|
| Double XP on re-entry | Source Keys `PERFECT_WEEK\|{enrollment}\|{}week}` / `SHOT_MILESTONE\|{enrollment}\|{milestone}` |
| Parallel creates | Link Achievement Unlock; actions `existing_linked_xp_event`, `linked_existing_duplicate_xp_event` |
| Ready-filter re-fire after unlink | Do not use Ready in trigger — eliminates thrash |
| Created-only miss on status repair | Status-only backfill; do not re-create XP |

**Created vs matches-conditions:** Prefer **created**. If DEV must use matches-conditions, still **omit** Ready and XP Events empty — Pending (+ Shot Milestone for shot path) only. Document the choice in UI notes.

---

## 4. Exact DEV trigger and script expectations

### 4.1 Airtable UI

1. Open automation **059**.  
2. Set trigger: **When record created** on **Athlete Achievement Unlocks**.  
3. Conditions:
   - `XP Award Status` is `Pending`
   - `Shot Milestone` is not empty *(shot-milestone path)*  
4. Remove any condition on `Ready for 059 XP?` or `XP Events`.  
5. Paste GitHub v3.5 (skip GitHub header).  
6. Map `recordId` + required outputs.  
7. DEV soak ON after one fixture unlock.

### 4.2 Perfect Week caveat

Recommended trigger is **shot-milestone-scoped**. Perfect Week unlocks from **058** may have empty Shot Milestone.

| Option | When |
|--------|------|
| **P1** | Second automation or broader created-trigger without Shot Milestone filter (Pending only) |
| **P2** | Separate matches-conditions path for Perfect Week achievement type |

**UNKNOWN** whether live UI already covers Perfect Week — confirm with OMNI before PROD.

### 4.3 Post-check

```text
Run audit-pending-shot-milestone-unlocks.js (dry-run)
Expect: no Pending+XP-linked stuck rows for Schmidt / fixtures
```

---

## 5. Test IDs

| ID | Action | Pass |
|----|--------|------|
| 059-T1 | Create unlock with Shot Milestone + Pending | One XP Event; Awarded |
| 059-T2 | Re-run 059 on same unlock | Skip / link existing; no second Source Key |
| 059-T3 | Simulate mid-run XP link | Not dependent on Ready=1 |
| 059-T4 | Perfect Week unlock (if in scope) | XP created once — confirm trigger coverage |

Related: C-019 Testing view on Athlete Achievement Unlocks.

---

## 6. Rollback

1. Turn 059 OFF.  
2. Re-paste prior script if needed.  
3. Do **not** re-add Ready formula to trigger.  
4. Use mark-awarded backfill for stuck Pending+linked rows.

---

## 7. Uncertainties / Mike approvals

| Item | Status |
|------|--------|
| Live DEV/PROD trigger type & conditions | **UNKNOWN** — UI attest |
| Live pasted version vs v3.5 | **UNKNOWN** |
| Perfect Week trigger coverage | **UNKNOWN** |

**Mike:** Confirm DEV UI matches §4; approve Perfect Week option P1 or P2; no PROD until soak.

---

## 8. Related

- Stage J: `docs/airtable/stage-j-legacy-cleanup.md`  
- Audit: `airtable/extension-scripts/audits/audit-pending-shot-milestone-unlocks.js`  
- Offline: `tools/airtable/tests/test_automation_059_043_112_contracts.py`
