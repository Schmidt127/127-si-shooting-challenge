# C-025 Stage 17 — Zoom Attendance lookup map

**Date written:** 2026-07-18  
**Branch:** `feature/c025-stage17-zoom-attendance` @ `2db98a0`  
**Authority:** [C-025-stage17-prod-schema-manifest.json](./C-025-stage17-prod-schema-manifest.json)  
**DEV base:** `appTetnuCZlCZdTCT` · **PROD base:** `appn84sqPw03zEbTT`  
**Mode:** Documentation only — no Airtable writes

---

## How to read this map

| Column | Meaning |
|--------|---------|
| Linked-record field | Field on **Zoom Attendance** used by the lookup |
| Source field | Field on the linked table that is looked up |
| Order | Manifest `dependencyOrder` |
| Automation-critical | Manifest `automationCritical` |
| Later formulas that depend on it | ZA formulas that reference this lookup (field-name form) |

**PROD progress note (Mike-stated, not live Meta re-probe):** Zoom Attendance links `Enrollment` and `Zoom Meeting` already exist. All **11** ZA lookups below are still **remaining** unless a later live audit proves otherwise. Tomorrow’s intended first ZA field is **`Calculated Recording Quiz Deadline`**.

**Blocker:** That ZA lookup requires **`Zoom Meetings.Calculated Recording Quiz Deadline`** (formula) to exist first. See [C-025-stage17-formula-build-order.md](./C-025-stage17-formula-build-order.md).

---

## Remaining Zoom Attendance lookups (complete set)

### 1. `Calculated Recording Quiz Deadline`

| Item | Value |
|------|--------|
| Field type | Lookup (`multipleLookupValues`) |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Calculated Recording Quiz Deadline` |
| Required creation order | After ZA `Zoom Meeting` link **and** after ZM formula `Calculated Recording Quiz Deadline` |
| Manifest order | `9001` |
| Automation-critical | **No** |
| Later formulas that depend on it | `Zoom Credit Debug`; `Zoom Recording Quiz — Past Deadline (view marker)` |
| Notes | Tomorrow’s Mike starting point **once ZM formula exists** |

### 2. `Effective Recording Counts for Level Gate?`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording Counts for Level Gate?` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9002` |
| Automation-critical | **No** (but feeds gate formula used by 042 path) |
| Later formulas that depend on it | `Zoom Gate Credit Earned?`; `Zoom Credit Debug` |

### 3. `Effective Recording Counts for Perfect Week?`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording Counts for Perfect Week?` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9003` |
| Automation-critical | **Yes** |
| Later formulas that depend on it | *(read by Automation 057 / 117e — not a ZA formula dependency)* |

### 4. `Effective Recording Deadline Mode`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording Deadline Mode` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9004` |
| Automation-critical | **No** |
| Later formulas that depend on it | *(none directly — deadline uses ZM formula via lookup #1)* |

### 5. `Effective Recording Makeup Enabled?`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording Makeup Enabled?` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9005` |
| Automation-critical | **No** |
| Later formulas that depend on it | `Zoom Credit Pre-Approved?` |

### 6. `Effective Recording Makeup Window Days`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording Makeup Window Days` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9006` |
| Automation-critical | **No** |
| Later formulas that depend on it | *(none on ZA — used inside ZM deadline formula)* |

### 7. `Effective Recording Quiz Requires Coach Approval?`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording Quiz Requires Coach Approval?` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9007` |
| Automation-critical | **No** |
| Later formulas that depend on it | `Zoom Credit Pre-Approved?`; `Zoom Credit Debug` |

### 8. `Effective Recording XP Percentage`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Effective Recording XP Percentage` |
| Required creation order | After ZM Effective formula of the same name |
| Manifest order | `9008` |
| Automation-critical | **No** |
| Later formulas that depend on it | `Zoom XP Percentage`; `Zoom Credit Debug` |

### 9. `Enrollment RID`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Enrollment` |
| Source field | Enrollments → `Record Id` |
| Required creation order | After ZA `Enrollment` link; Enrollments.`Record Id` must exist (`RECORD_ID()`) |
| Manifest order | `9010` |
| Automation-critical | **Yes** |
| Later formulas that depend on it | `Zoom Credit Key`; `Preconflict Pair Tag`; `Zoom Credit Conflict?`; `Zoom Credit Debug` |
| Notes | Source field name is **`Record Id`** (space). Confirm present in PROD. |

### 10. `Meeting Approved Preconflict Pair Tags`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `Approved Preconflict Pair Tags` |
| Required creation order | After ZM rollup `Approved Preconflict Pair Tags` (which itself requires ZA formula `Preconflict Pair Tag`) |
| Manifest order | `9014` |
| Automation-critical | **No** (feeds conflict formula which **is** critical) |
| Later formulas that depend on it | `Zoom Credit Conflict?` |
| Description (manifest) | `C-025 meeting-level preconflict tags` |

### 11. `Zoom Meeting RID`

| Item | Value |
|------|--------|
| Field type | Lookup |
| Linked-record field | `Zoom Meeting` |
| Source field | Zoom Meetings → `RecordId` |
| Required creation order | After ZA `Zoom Meeting` link; Zoom Meetings.`RecordId` must exist (`RECORD_ID()`) |
| Manifest order | `9036` |
| Automation-critical | **Yes** |
| Later formulas that depend on it | `Zoom Credit Key`; `Preconflict Pair Tag`; `Zoom Credit Debug` |
| Notes | Source field name is **`RecordId`** (no space). **Not listed as a create item in the Stage 17 manifest** — treat as prerequisite / verify-or-create. |

### 12–14. Approval email Effective lookups (117f) — DEV created 2026-07-20

Required by Automation **117f v1.2.0** (reads these on Zoom Attendance). Not in original Stage 17 “11 lookups” list.

| Zoom Attendance field | Linked-record field | Source (Zoom Meetings) | Automation-critical |
|-----------------------|---------------------|------------------------|---------------------|
| `Effective Recording Approval Email Enabled?` | `Zoom Meeting` | `Effective Recording Approval Email Enabled?` | **Yes** (117f) |
| `Effective Recording Approval Email Timing` | `Zoom Meeting` | `Effective Recording Approval Email Timing` | **Yes** (117f) |
| `Effective Recording Approval Email Template Key` | `Zoom Meeting` | `Effective Recording Approval Email Template Key` | **Yes** (117f) |

**DEV evidence:** created via Meta API on `appTetnuCZlCZdTCT`. **PROD:** do not create until Mike authorizes PROD 117f prep.

---

## Zoom Meetings lookups / rollups that feed ZA (already claimed complete in PROD progress)

Per Mike-stated PROD progress, these exist. Still mark **Complete but requires configuration verification** (link target, source field, rollup aggregation).

| Zoom Meetings field | Type | Link field | Source (Config) |
|---------------------|------|------------|-----------------|
| `Global Config: Approval Email Enabled` | Lookup | `Config (Global Scope)` | `Recording Approval Email Enabled YN` |
| `Global Config: Approval Email Template Key` | Rollup | `Config (Global Scope)` | `Recording Approval Email Template Key` |
| `Global Config: Approval Email Timing` | Rollup | `Config (Global Scope)` | `Recording Approval Email Timing` |
| `Global Config: Coach Approval Required` | Lookup | `Config (Global Scope)` | `Recording Quiz Requires Coach Approval YN` |
| `Global Config: Deadline Mode` | Rollup | `Config (Global Scope)` | `Zoom Recording Deadline Mode` |
| `Global Config: Full Gate Credit` | Lookup | `Config (Global Scope)` | `Recording Gives Full Zoom Gate Credit YN` |
| `Global Config: Makeup Enabled` | Lookup | `Config (Global Scope)` | `Recording Makeup Enabled YN` |
| `Global Config: Makeup Window Days` | Rollup | `Config (Global Scope)` | `Zoom Recording Makeup Window Days` |
| `Global Config: Perfect Week Credit` | Lookup | `Config (Global Scope)` | `Recording Makeup Counts for Perfect Week YN` |
| `Global Config: Recording XP %` | Rollup | `Config (Global Scope)` | `Zoom Recording XP Percent of Live` |
| `Program Config: …` (same 10 names) | Lookup/Rollup | `Config (Program Scope)` | Same Config sources as Global |

YN companions on Config (field-name form):

```airtable
IF({Recording Approval Email Enabled?}, "Yes", "No")
IF({Recording Gives Full Zoom Gate Credit?}, "Yes", "No")
IF({Recording Makeup Counts for Perfect Week?}, "Yes", "No")
IF({Recording Makeup Enabled?}, "Yes", "No")
IF({Recording Quiz Requires Coach Approval?}, "Yes", "No")
```

---

## Prerequisite lookups / rollups **not** listed as manifest create items

These are referenced by Stage 17 formulas/lookups but **absent from `items[]` create list**. Status in PROD is **Unknown and needs verification** unless Mike confirms.

| Field | Table | Type | Wiring (from DEV / repair docs) | Needed by |
|-------|-------|------|----------------------------------|-----------|
| `Week End Date` | Zoom Meetings | Lookup | Link `Week` → Weeks.`End Date` | ZM `Calculated Recording Quiz Deadline` |
| `RecordId` | Zoom Meetings | Formula | `RECORD_ID()` | ZA `Zoom Meeting RID` |
| `Record Id` | Enrollments | Formula | `RECORD_ID()` | ZA `Enrollment RID` |
| `Approved Preconflict Pair Tags` | Zoom Meetings | Rollup | Link `Zoom Attendance` → `Preconflict Pair Tag`; agg **`ARRAYJOIN(ARRAYUNIQUE(values), "\n")`** (PROD verified 2026-07-20; Meta often fails to store formula — set in UI) | ZA `Meeting Approved Preconflict Pair Tags` |
| `Attendance Method` | Zoom Meetings | Single select | Choices include `Recording Quiz` (DEV) | ZM `Calculated Recording Quiz Deadline` |
| `Config (Global Scope)` | Zoom Meetings | Link → Config | Mike: exists | Global Config lookups |
| `Config (Program Scope)` | Zoom Meetings | Link → Config | Implied by Program Config lookups | Program Config lookups |

**Uncertainty:** Config-linkage design notes ZM `Attendance Method` / ZM `Zoom Credit Approved?` as possible **legacy** fields. However the **live DEV formula** for `Calculated Recording Quiz Deadline` **does** reference ZM `Attendance Method`. Do not invent an alternate formula — verify or recreate that field before pasting the DEV deadline formula.

---

## Connector / UI capability

| Setting | Connector / Meta API | Manual Airtable UI |
|---------|----------------------|--------------------|
| Lookup field create + wiring | Unreliable / often incomplete | **Required** |
| Rollup aggregation formula | Meta often **cannot** store formula (DEV lesson) | **Required** |
| `prefersSingleRecordLink` | Often not settable via connector | **Required** |
| Autonumber primary | Limited | **Verify in UI** |

Full manual checklist: [C-025-stage17-manual-airtable-actions.md](./C-025-stage17-manual-airtable-actions.md).
