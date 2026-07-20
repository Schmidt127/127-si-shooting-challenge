# C-025 Stage 17 — Current PROD progress

**Date written:** 2026-07-18  
**Preserves prior readiness date:** 2026-07-18 ([C-025-stage17-prod-readiness-status.md](./C-025-stage17-prod-readiness-status.md))  
**Branch:** `feature/c025-stage17-zoom-attendance`  
**Commit reference:** `2db98a0970fc55af9a111878a66cecea89f6ad64`  
**Manifest version:** `1.0.0`  
**PROD:** `appn84sqPw03zEbTT` · **DEV:** `appTetnuCZlCZdTCT`  
**Mode:** Progress reconcile + documentation (no Airtable writes this pass)

---

## Relationship to prior readiness status

| Document | Role |
|----------|------|
| [C-025-stage17-prod-readiness-status.md](./C-025-stage17-prod-readiness-status.md) | Original **BLOCKED — SCHEMA MIGRATION REQUIRED** snapshot when Zoom Attendance was **absent** in PROD |
| **This file** | Superseding **progress** snapshot after Mike’s partial PROD schema work |
| [C-025-stage17-remaining-prod-work.md](../deploy-checklists/C-025-stage17-remaining-prod-work.md) | Executable remaining inventory + statuses |

Do **not** delete the readiness status file — it records the pre-migration audit. Use **this** file as the current operational progress view.

---

## Current verdict

# IN PROGRESS — SCHEMA MIGRATION PARTIALLY COMPLETE

Zoom Attendance **exists** in PROD (Mike-stated). Recording credit is **not** ready for automation enablement until Effective formulas, ZA lookups/formulas, XP Source option, Config values, paste-OFF, and smoke Pass complete.

**Automation safety (current):**

| Automation | State |
|------------|--------|
| 101 | **OFF** (per Mike progress — confirm before live go-live) |
| 117 | **OFF** |
| 057 | **OFF** |
| 042 | **OFF** |
| 115 | **Not installed** — **Do not install** |

---

## Confirmed complete (Mike-stated PROD progress)

These items were reported complete. This agent pass did **not** re-probe live Meta.

1. Zoom Attendance table exists  
2. Primary field is **Id**, type **autonumber** (matches DEV primary)  
3. Core Zoom Attendance standard fields created  
4. Zoom Attendance **Enrollment** and **Zoom Meeting** links exist  
5. Zoom Meetings **Global Config** link and initial Global Config fields exist  
6. Config Stage 17 fields and YN companion formulas exist  
7. Zoom Meetings Global Config and Program Config lookup/rollup fields exist  
8. Zoom Meetings recording-support standard fields exist  
9. Zoom Meetings override fields exist  
10. Reciprocal Zoom Attendance links exist on Enrollments and Zoom Meetings  
11. Automations 101, 117, 057, 042 are OFF  
12. Automation 115 is not installed  

---

## Tomorrow’s manual starting point

**Intended:** Zoom Attendance.`Calculated Recording Quiz Deadline`  
**Type:** Lookup  
**Link field:** `Zoom Meeting`  
**Source field:** Zoom Meetings.`Calculated Recording Quiz Deadline`

**Prerequisite (must be done first if missing):**

1. Zoom Meetings Effective formulas (especially Deadline Mode + Makeup Window Days)  
2. Zoom Meetings helpers as needed: `Week End Date`, `Attendance Method`, `Recording Available At`  
3. Zoom Meetings formula **`Calculated Recording Quiz Deadline`**

Keep all Stage 17 automations **OFF**. Do not install **115**.

---

## Still remaining (high level)

| Area | Status |
|------|--------|
| ZM Effective\* formulas (10) | Requires formula creation |
| ZM `Calculated Recording Quiz Deadline` | Requires formula creation |
| ZA lookups (11) | Requires manual Airtable setup |
| ZA formulas (10) | Requires formula creation |
| ZM `Approved Preconflict Pair Tags` rollup | Requires manual Airtable setup (after ZA Preconflict formula) |
| Helpers (`RecordId`, `Week End Date`, ZM `Attendance Method`) | Unknown and needs verification |
| XP Source option `Zoom Meeting Recording Quiz` | Requires setup |
| Config record values (% = 50, path enabled, etc.) | Complete but requires configuration verification |
| prefersSingle on Enrollment / Zoom Meeting / Config links | Complete but requires configuration verification |
| Views | Requires manual Airtable setup |
| Paste 117 v1.1.1 / 057 v1.3 / 042 v3.1 | Requires automation script installation (OFF) |
| Triggers/filters | Requires automation trigger/filter setup |
| Smoke S0–S8 | Requires smoke testing |
| 115 | **Do not install** |

Detailed ordered inventory: [C-025-stage17-remaining-prod-work.md](../deploy-checklists/C-025-stage17-remaining-prod-work.md).

---

## Repository alignment (unchanged from readiness package)

| Automation | Repo version | PROD action |
|------------|--------------|-------------|
| 115 ETF | **v1.8** | DEV-only — do not promote |
| 117 Orchestrator | **v1.1.1** | Paste later OFF |
| 057 Perfect Week | **1.3** | Paste later OFF |
| 042 Level gates | **3.1** | Paste later OFF |
| 101 Live Zoom XP | unchanged | Do not modify script; state currently OFF per progress |

DEV ETF downstream Pass (115 v1.8 → 057 + 042, 117 OFF) remains the proof reference in the readiness status dated 2026-07-18.

---

## Safety reminders

- Never write recording athletes into **`Zoom Meetings.Attendees`**.  
- Never rewrite historical **`ZOOM_ATTEND_BASE|…`** XP.  
- Expected recording XP = **30** when live base **60** and percent **50**.  
- Live key vs recording key families stay disjoint.  

---

## Exact first action Mike should take tomorrow

1. Confirm Automations **101 / 117 / 057 / 042** still **OFF**.  
2. On **Zoom Meetings**, verify/create prerequisites for deadline (`Week End Date`, `Attendance Method`, Effective Deadline Mode, Effective Makeup Window Days, `Recording Available At`).  
3. Create Zoom Meetings formula **`Calculated Recording Quiz Deadline`** (field-name formula in formula-build-order).  
4. On **Zoom Attendance**, create Lookup **`Calculated Recording Quiz Deadline`** through **Zoom Meeting** → source **Calculated Recording Quiz Deadline**.

Checklist: [C-025-stage17-manual-airtable-actions.md](../deploy-checklists/C-025-stage17-manual-airtable-actions.md) (Mike version steps 11–26).
