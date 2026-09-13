# Zoom Gate Production Prep — Evidence Report

**Date:** 2026-09-13  
**Branch:** `chore/sim-window-apr25-jun30-67day`  
**Authoritative commit (042 v4.1.3 source):** `90ed4b24988459704ec7425c4a1c347e4979565f`  
**Production base:** `appn84sqPw03zEbTT`  
**Preserved failed run (untouched):** `SEASON-SIM-2027-20260913T010724Z-threeathlete`  
**Agent action boundary:** Schema + formula prep only. **No** Automation 042 paste. **No** simulation execute. **No** preserved-run cleanup.

---

## 1. Repository source verification

| Check | Result |
|-------|--------|
| File | `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` |
| Docblock version | **4.1.3** |
| CONFIG `automation.version` | **4.1.3** |
| Writes `Effective Zoom Gate Meetings` | Yes — after `computeEffectiveZoomAttendanceCount()` when field exists and is writable |
| `Total Zoom Attendances` semantics | Unchanged (live-only); not written by 042 |

Canonical formulas source: `tools/season_simulation/FORMULAS-TO-PASTE.txt` §6.

---

## 2. `Effective Zoom Gate Meetings` field

| Property | Value |
|----------|-------|
| Status | **CREATED** (was missing before this prep) |
| Table | Enrollments (`tbl3PFmwbRoabu1YV`) |
| Field ID | **`fldBII3Mnj2OZXfQb`** |
| Type | Number, precision 0 (integer) |
| Writer | Automation 042 v4.1.3 (sole writer when pasted) |

---

## 3. Production formula updates (Enrollments)

All three fields updated using §6 canonical logic. Airtable resolved `{Effective Zoom Gate Meetings}` to field id `fldBII3Mnj2OZXfQb` on save (semantically identical).

### 3.1 Meets Gate: Zoom Meetings — **UPDATED**

- Field ID: `fldlgsGcxW2109SzA`
- Live formula (verified read-back):

```
IF(
  {Gate Enabled Status} = "Disabled",
  1,
  IF(
    IF(
      {Effective Zoom Gate Meetings},
      {Effective Zoom Gate Meetings},
      {Total Zoom Attendances}
    ) >= VALUE(ARRAYJOIN({Gate Minimum: Zoom Meetings})),
    1,
    0
  )
)
```

*(Stored with field ids `fldTAalsTtSVumJF9`, `fldBII3Mnj2OZXfQb`, `fldvEHpfO4ModNQoJ`, `fldkyKW5vYiQ0Sm4b`.)*

### 3.2 Gate Debug Summary — **UPDATED**

- Field ID: `fldIZHMleMFonQn1R`
- Zoom segment now uses effective count fallback (verified):

```
" | Zoom " & IF(
  {Effective Zoom Gate Meetings},
  {Effective Zoom Gate Meetings},
  {Total Zoom Attendances}
) & "/" & {Gate Minimum: Zoom Meetings} &
```

### 3.3 Public Missing Zoom — **UPDATED**

- Field ID: `fldcMl1TtIyCo0Vtn`
- All `{Total Zoom Attendances}` references in the zoom comparison branch replaced with the same effective-count `IF(...)` block (verified read-back).

---

## 4. Production Automation 042 (read-only — not modified)

| Property | Value |
|----------|-------|
| Workflow ID | `wfl3aiiK8vI2tz0HA` |
| Automations table record | `recG5HO86DbCPjr8T` |
| Name | 042 - Levels and Progression - Assign Current and Next Level |
| Status | Live |
| **Deployed version** | **v4.1.2** |
| **Target version** | **v4.1.3** |
| Older than target? | **Yes** |

### Peer automations (unchanged — read-only verify)

| Automation | Deployed version | Expected | Unchanged |
|------------|------------------|----------|-----------|
| 053 | v5.6 | v5.6 | **YES** |
| 076 | v8.15 | v8.15 | **YES** |
| 101 | v6.9 (Automations table: "File too large: It is up to version 6.9") | v6.9 | **YES** |

---

## 5. Safety verification

| Check | Result |
|-------|--------|
| Preserved failed run touched | **NO** — enrollment `recFcH7qLPzzso9s3` (Sim) still present |
| Cleanup executed | **NO** |
| Fresh Production simulation executed | **NO** |
| Transactional athlete/family records modified | **NO** (schema field create + formula field config only) |
| `Total Zoom Attendances` altered | **NO** |
| Season Sim **temporary** submission formula gates installed | **NO** — live Submissions formulas use normal `Submitted At` / `NOW()` / `TODAY()` paths (no `Season Sim Clock Now` or `SEASON-SIM\|` branches) |
| Unauthorized automation edits | **NO** |

---

## 6. Mike checklist — remaining actions only

1. Open Production base `appn84sqPw03zEbTT` → Automation **042** (`wfl3aiiK8vI2tz0HA`).
2. Paste repository script **042 v4.1.3** from:
   - **Path:** `airtable/automations/shooting-challenge/042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js`
   - **Commit:** `90ed4b24988459704ec7425c4a1c347e4979565f`
   - **Paste range:** lines **25–1532** (production docblock through `await main();`) — **skip GitHub-only header lines 1–23**.
3. Confirm docblock `Version: 4.1.3` and `CONFIG.automation.version: "4.1.3"`.
4. **Do not** change trigger, view `viwm9OgwkPKI2bii3`, filters, or dynamic `recordId` mapping.
5. Publish / save Automation 042.
6. Read-only verify: `Effective Zoom Gate Meetings` populated after a level recalc on a test enrollment with recording gate credit; gate formulas show effective count.
7. **Only after verification:** prepare preserved-run cleanup and next clean simulation (`SEASON-SIM-2027-20260913T010724Z-threeathlete`).

---

## 7. Verdict

**READY — ONLY 042 v4.1.3 MANUAL PASTE REMAINS**

Schema field and Enrollments gate formulas are live. Production 042 remains v4.1.2 until Mike pastes v4.1.3.
