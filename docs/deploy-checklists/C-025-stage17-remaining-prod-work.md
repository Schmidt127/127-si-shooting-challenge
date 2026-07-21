# C-025 Stage 17 — Remaining PROD work (schema + deployment audit)

> **⚠️ SUPERSEDED — HISTORICAL RECORD (resolved 2026-07-20).** The "remaining PROD work" below is **done**. C-025 Stage 17 Zoom recording **credit** is **COMPLETE in PROD** (Airtable Automation **117** v1.1.1 / **057** v1.3 / **042** v3.1 ON; **101** unchanged; schema/formulas/lookups migrated). The § 6 "Approval email" note still shows the old **three-part** send key — the canonical key is the **four-part** `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}` (Airtable Automation **117** → **Make** identifier **117f**), and the current 117f script (**v1.1**) writes **no** Airtable records (Make owns dedupe). Retained for historical evidence only. **Authoritative current state:** [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md) · credit evidence [prod-live](./C-025-stage17-prod-live-2026-07-20.md) · email workflow [PROD 117f](./C-025-117f-prod-zoom-recording-approval-email.md).

**Date written:** 2026-07-18  
**Original readiness docs dated:** 2026-07-18  
**Branch:** `feature/c025-stage17-zoom-attendance` @ `2db98a0`  
**Manifest version:** `1.0.0`  
**Mode:** Read-only audit + documentation — **no PROD Airtable changes** · **no automation enablement** · **115 not installed**

**Companion docs:**

- [C-025-stage17-lookup-map.md](./C-025-stage17-lookup-map.md)
- [C-025-stage17-formula-build-order.md](./C-025-stage17-formula-build-order.md)
- [C-025-stage17-manual-airtable-actions.md](./C-025-stage17-manual-airtable-actions.md)
- [../status/C-025-stage17-current-prod-progress.md](../status/C-025-stage17-current-prod-progress.md)
- Prior: [C-025-stage17-prod-implementation-checklist.md](./C-025-stage17-prod-implementation-checklist.md), [C-025-stage17-prod-smoke-test.md](./C-025-stage17-prod-smoke-test.md), [../status/C-025-stage17-prod-readiness-status.md](../status/C-025-stage17-prod-readiness-status.md)

---

## Executive verdict

PROD Stage 17 schema migration is **in progress**. Mike-stated progress has moved past “Zoom Attendance missing,” but **Effective formulas, ZA lookups, ZA credit formulas, XP Source option, views, Config value verification, and automation paste/smoke** remain.

**Exact first action tomorrow:** verify Zoom Meetings formula prerequisites, then create **`Zoom Meetings.Calculated Recording Quiz Deadline`**, then create **`Zoom Attendance.Calculated Recording Quiz Deadline`** (Lookup through **Zoom Meeting**). Keep **101 / 117 / 057 / 042 OFF**. Do **not** install **115**.

---

## Status legend (used below)

| Status | Meaning |
|--------|---------|
| Confirmed complete | Mike-stated PROD progress; not re-probed live this pass |
| Complete but requires configuration verification | Exists; values/wiring/descriptions/prefersSingle need UI check |
| Requires manual Airtable setup | UI required (lookup/rollup/view/prefersSingle/etc.) |
| Can be created through the Airtable connector | Standard field types only; still Mike-approved |
| Requires formula creation | Formula field paste required |
| Requires automation script installation | Paste body; remain OFF |
| Requires automation trigger/filter setup | UI trigger conditions |
| Requires smoke testing | After schema + paste OFF |
| Do not install | Explicitly forbidden |
| Unknown and needs verification | Manifest gap or no live Meta confirmation |

---

## 1. Ordered inventory by dependency group

### Config

| Item | Type | Status |
|------|------|--------|
| `Recording Path Enabled?` | checkbox | Confirmed complete (field) / Complete but requires configuration verification (value) |
| `Recording Makeup Enabled?` | checkbox | Confirmed complete / value verify |
| `Recording Makeup Enabled YN` | formula | Confirmed complete |
| `Zoom Recording Makeup Window Days` | number | Confirmed complete / value verify (default **7**) |
| `Zoom Recording Deadline Mode` | singleSelect | Confirmed complete / value verify (default **Later of Both**) |
| `Zoom Recording XP Percent of Live` | number | Confirmed complete / value verify (**50**) |
| `Recording Quiz Requires Coach Approval?` + YN | checkbox + formula | Confirmed complete / value verify |
| `Recording Gives Full Zoom Gate Credit?` + YN | checkbox + formula | Confirmed complete / value verify |
| `Recording Makeup Counts for Perfect Week?` + YN | checkbox + formula | Confirmed complete / value verify |
| `Recording Approval Email Enabled?` + YN | checkbox + formula | Confirmed complete / value verify |
| `Recording Approval Email Timing` | singleSelect (`On Satisfactory`) | Confirmed complete / value verify |
| `Recording Approval Email Template Key` | singleLineText (`ZOOM_RECORDING_APPROVED`) | Confirmed complete / value verify |

### Zoom Meetings standard fields

| Item | Status |
|------|--------|
| Recording support standards (`Recording Available At`, URLs, quiz fields, etc. per manifest nonformula set) | Confirmed complete |
| Override fields (`*— Meeting Override`) | Confirmed complete |
| Live `Attendees` | Leave unchanged — Confirmed complete as live path |
| `Attendance Method` (ZM) | Unknown and needs verification (referenced by deadline formula; not in manifest create list) |
| `RecordId` | Unknown and needs verification |
| `Recording XP Percentage` (non-override number) | Unknown if created with “recording-support” bundle — verify |

### Zoom Meetings links

| Item | Status |
|------|--------|
| `Config (Global Scope)` | Confirmed complete / prefersSingle verify |
| `Config (Program Scope)` | Complete but requires configuration verification (implied by Program Config lookups) |
| `Zoom Attendance` reciprocal | Confirmed complete |
| `Attendees` | Leave unchanged |

### Zoom Meetings lookups and rollups

| Item | Status |
|------|--------|
| Global Config:\* (10 fields) | Confirmed complete / wiring verify |
| Program Config:\* (10 fields) | Confirmed complete / wiring verify |
| `Week End Date` | Unknown and needs verification |
| `Approved Preconflict Pair Tags` | Requires manual Airtable setup (after ZA `Preconflict Pair Tag`) |

### Zoom Meetings formulas

| Item | Status |
|------|--------|
| All `Effective Recording *` (10) | Requires formula creation |
| `Calculated Recording Quiz Deadline` | Requires formula creation (**blocker for tomorrow’s ZA lookup**) |

### Zoom Attendance standard fields

| Item | Status |
|------|--------|
| Table + primary `Id` autonumber | Confirmed complete |
| Core standards (Method, review, stamps, flags, email keys, etc.) | Confirmed complete / description verify |

### Zoom Attendance links

| Item | Status |
|------|--------|
| `Enrollment` (prefersSingle True) | Confirmed complete / prefersSingle verify |
| `Zoom Meeting` (prefersSingle True) | Confirmed complete / prefersSingle verify |

### Zoom Attendance lookups and rollups

| Count | Status |
|------:|--------|
| **11** lookups | Requires manual Airtable setup (see lookup map) |

### Zoom Attendance formulas

| Count | Status |
|------:|--------|
| **10** formulas | Requires formula creation (see formula build order) |

### Enrollments changes

| Item | Status |
|------|--------|
| `Zoom Attendance` link | Confirmed complete |
| Gate fields (`Total Zoom Attendances`, Level Recalc, etc.) | Verify (manifest verify group) |
| `Record Id` | Verify |

### XP Events changes

| Item | Status |
|------|--------|
| Bucket `Zoom Attendance` | Verify |
| Source option `Zoom Meeting Recording Quiz` | Requires manual Airtable setup / connector if supported (**update** in manifest) |
| Live source `Zoom Meeting Attendance Base` | Verify |
| No ZA link required (missing in DEV too) | Leave unchanged |

### Automation changes

| Item | Status |
|------|--------|
| 101 / 117 / 057 / 042 OFF | Confirmed complete (safety state) |
| Paste 117 v1.1.1 / 057 v1.3 / 042 v3.1 | Requires automation script installation (later) |
| Trigger/filter setup | Requires automation trigger/filter setup |
| 115 | **Do not install** |
| Exact installed versions | Unknown and needs verification (API 403) |

### Views and filters

| Item | Status |
|------|--------|
| ZA `Grid view` | Requires manual Airtable setup |
| ZA `Zoom Recording Quiz - Past Deadline` | Requires manual Airtable setup (exact filter text Unknown) |

### Required Config records and values

See §7. Status: Complete but requires configuration verification.

---

## 2. Reconciliation: manifest vs Mike-stated PROD progress

| Manifest assumption (audit @ readiness) | Mike-stated progress 2026-07-18 evening | Audit classification |
|-----------------------------------------|------------------------------------------|----------------------|
| Zoom Attendance table missing | Table exists; primary `Id` autonumber | Progress **supersedes** readiness “missing table” |
| Config Stage 17 fields missing | Fields + YN formulas exist | Superseded |
| ZM overrides / recording standards missing | Exist | Superseded |
| Global/Program Config lookups missing | Exist | Superseded |
| Reciprocal ZA links missing | Exist | Superseded |
| ZA lookups / formulas missing | Still remaining (tomorrow starts ZA deadline lookup) | **Still open** |
| ZM Effective + Calculated Deadline missing | Not claimed complete | **Still open** |
| Automations ready to paste/enable | Explicitly OFF; 115 not installed | Correct safety posture |
| First action = create ZA table | First action = ZA `Calculated Recording Quiz Deadline` lookup | Updated — but **ZM formula first** |

**Uncertainty:** This pass did **not** live Meta-probe PROD. Treat “Confirmed complete” as Mike-reported unless re-audited.

---

## 3. Remaining counts (best estimate)

| Remaining work | Count | Notes |
|----------------|------:|-------|
| Manual ZA lookup fields | **11** | All ZA lookups |
| Manual ZA formula fields | **10** | All ZA formulas |
| ZM Effective + deadline formulas | **11** | 10 Effective + Calculated Deadline |
| Prerequisite verify-or-create (ZM helpers) | **up to 4** | `RecordId`, `Week End Date`, `Attendance Method`, `Approved Preconflict Pair Tags` |
| Select option updates | **1** | XP Source Recording Quiz |
| Views | **2** | Grid + Past Deadline |
| Automation script installs | **3** | 117 / 057 / 042 (OFF) |
| Automation 115 | **0** | Do not install |
| Smoke scenarios | **9** | S0–S8 |

**Remaining manual field-ish actions (lookups + formulas + helpers + XP option):** ≈ **11 + 10 + 11 + ≤4 + 1 ≈ 37** UI field actions before views/automations.

---

## 4. Description mismatches (manifest vs intended architecture)

| Field | Manifest / DEV description issue | Correct intent |
|-------|----------------------------------|----------------|
| Zoom Attendance.`Gate Credit Applied?` | “Enrollment added to Zoom Meeting **Attendees** for gate” | Flag-only stamp; recording path **must never** write Attendees |
| Zoom Attendance.`Perfect Week Credit Applied?` | “counted for Perfect Week **via Attendees**” | Flag-only; 057 v1.3 should count recording without Attendees write |
| Zoom Attendance table create item | “primary field = **Name**” | DEV primary is **`Id` autonumber** (matches Mike progress) |
| XP Events.`XP Source` update item | Description `Achivement Unlock` (typo / wrong) | Add option **`Zoom Meeting Recording Quiz`** |
| Config.`Recording Path Enabled?` | “no ZM Effective this slice” | Accurate — path switch is Config-only |
| Reciprocal links | Generic “Stage 17…” on ZA side | Acceptable; Attendees description correctly says LIVE ONLY |

Fix descriptions in Airtable UI when convenient; do not let outdated Attendees wording drive automation behavior.

---

## 5. Double-credit / Attendees rules (verified)

| Rule | Source |
|------|--------|
| Recording path **never** writes `Zoom Meetings.Attendees` | Manifest `doubleCreditGate` + install packets |
| Live attendance **does** use `Attendees` for Automation **101** | Same |
| Live key | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` |
| Recording key | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| Conflict | Prefer live; soft-void recording `Active? = false` |
| No historical live XP rewrite | Manifest + smoke doc |

---

## 6. Perfect Week / level gate / approval email (intended behavior)

### Perfect Week

- Live attendance continues via Attendees / existing 057 inputs.
- Recording makeup counts only when `Effective Recording Counts for Perfect Week?` is true (override → Program → Global → default TRUE).
- Stamp `Perfect Week Credit Applied?` when counted; prevent duplicate via Applied flag + WAS logic in 057 v1.3.
- Meeting override can force Yes/No.

### Level gate

- Recording earns gate only when `Zoom Gate Credit Earned?` true (requires Approved + Effective full gate credit).
- Stamp `Gate Credit Applied?`; no duplicate credit.
- Enrollment `Total Zoom Attendances` remains **live Attendees count** semantics — recording must not inflate via Attendees.

### Approval email

- Send only after Satisfactory approval path.
- Respect `Effective Recording Approval Email Enabled?` (default FALSE if all blank).
- Respect timing (default `On Satisfactory`).
- Set `Recording Approval Email Send Key` = `ZOOM_REC_EMAIL|{EnrollmentRID}|{ZoomMeetingRID}|{ZoomAttendanceRID}` (canonical **four-part**; earlier three-part form superseded). Note: in the current PROD design the Airtable sender (Automation **117**, script v1.1) does **not** stamp this field — Make identifier **117f** owns dedupe via its Data Store.
- Stamp `Recording Approval Email Sent At` **only after successful webhook**.
- Prevent duplicate sends via send key / sent-at checks in 117f / orchestrator.

---

## 7. Required Config values (Stage 17 defaults)

| Field | Expected Stage 17 default / DEV enabled sample |
|-------|-----------------------------------------------|
| Recording Path Enabled? | **true** |
| Recording Makeup Enabled? | true on enabled sample |
| Zoom Recording Makeup Window Days | **7** |
| Zoom Recording Deadline Mode | **Later of Both** |
| Zoom Recording XP Percent of Live | **50** |
| Recording Quiz Requires Coach Approval? | true on enabled sample |
| Recording Gives Full Zoom Gate Credit? | true on enabled sample |
| Recording Makeup Counts for Perfect Week? | true on enabled sample |
| Recording Approval Email Enabled? | true on enabled sample |
| Recording Approval Email Timing | **On Satisfactory** |
| Recording Approval Email Template Key | **ZOOM_RECORDING_APPROVED** |
| Expected recording XP | **30** when live base **60** × **50%** |

**Which Config row is global vs program in PROD:** Unknown — confirm in OMNI before bulk-link.

---

## 8. XP Events requirements

| Requirement | Value |
|-------------|--------|
| XP Bucket | `Zoom Attendance` (verify present) |
| XP Source (recording) | `Zoom Meeting Recording Quiz` (**add**) |
| XP Source (live) | `Zoom Meeting Attendance Base` |
| Source key recording | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| Source key live | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` |
| Dedupe | Same Source Key → skip / no second event |
| Enrollment link | Required on XP Event |
| Zoom Meeting link | Required on XP Event |
| Activity date | Set on create (canonical activity date) |
| Historical rewrite | **Forbidden** for live `ZOOM_ATTEND_BASE` |

Reward rule: keep `ZOOM_ATTEND_BASE` = **60** active; do not invent a separate recording rule row.

---

## 9. Full manual deployment sequence (PROD-safe)

Divided phases; **automations remain OFF** through Schema → Lookups → Formulas → Selects → Config values. Paste still OFF. Enable only under smoke.

### Schema prerequisites

1. Verify ZA table/primary/links/reciprocals/Config links (Mike steps 1–8).
2. Verify-or-create `Record Id` / `RecordId` / `Week End Date` / ZM `Attendance Method`.
3. Confirm recording standards + overrides + Global/Program lookups present.

### Lookup creation

4. **After** ZM Effective + Calculated Deadline formulas: create 11 ZA lookups (deadline first among ZA lookups).

### Formula creation

5. Create 10 ZM Effective formulas + Calculated Deadline.
6. Create ZA formulas in build-order D1–D10 with preconflict rollup interleaved.

### Select-option updates

7. Add XP Source `Zoom Meeting Recording Quiz`.

### Record/config values

8. Set Config defaults (§7); bulk-link Config scopes; confirm XP amount 30 on fixture formulas (117 still OFF).

### Automation script installation

9. Backup then paste 117 / 057 / 042 — **OFF**. Never 115.

### Trigger/filter setup

10. Configure 117/057/042 triggers — **OFF**.

### Controlled enablement

11. Only after S0 formula sanity; enable one automation at a time per smoke doc.

### Smoke testing

12. S0–S8 dedicated fixtures.

### Rollback checks

13. Attendees mutation → STOP; soft-void test `ZOOM_CREDIT` only.

---

## 10. Omni / Agent / Manual split

See [C-025-stage17-manual-airtable-actions.md](./C-025-stage17-manual-airtable-actions.md) sections **Omni version**, **Agent version**, **Manual Airtable version**, and **Mike version**.

---

## 11. Blockers

1. **ZM `Calculated Recording Quiz Deadline` must exist** before ZA deadline lookup.
2. **ZM Effective formulas** must exist before ZA Effective\* lookups.
3. **No live Meta re-probe** this pass — field presence beyond Mike’s list is uncertain.
4. **Automations API 403** — versions and paste are UI-only.
5. **Rollup aggregation** may require UI even if connector creates the field shell.
6. Outdated readiness docs still say “ZA missing” — superseded by progress doc; do not restart from create-table.

---

## 12. Report summary

| Metric | Value |
|--------|-------|
| Files created this audit | See final report / git commit |
| Remaining manual lookups | **11** (ZA) + helpers |
| Remaining formulas | **10** (ZA) + **11** (ZM Effective/deadline) |
| Remaining lookup/rollup (ZA) | **11** |
| Remaining automation work | Paste 3 OFF + triggers + smoke; **115 Do not install** |
| First Mike action tomorrow | Prerequisites → ZM Calculated Deadline formula → **ZA Calculated Recording Quiz Deadline lookup** |
