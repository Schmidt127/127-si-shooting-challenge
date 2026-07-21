# C-025 Stage 17 — PROD schema implementation checklist (executable)

> **⚠️ SUPERSEDED — HISTORICAL RECORD (executed 2026-07-20).** This schema-migration checklist has been **executed**: the PROD Stage 17 schema/formulas/select options were created and Stage 17 recording **credit** is **COMPLETE** (Airtable Automation **117** v1.1.1 / **057** v1.3 / **042** v3.1 ON; **101** unchanged). Retained for historical evidence and rollback reference only. **Authoritative current state:** [Stage 17 current PROD progress](../status/C-025-stage17-current-prod-progress.md) · credit evidence [prod-live](./C-025-stage17-prod-live-2026-07-20.md) · email workflow [PROD 117f](./C-025-117f-prod-zoom-recording-approval-email.md).

**Status:** Ready for Mike OMNI execution after approval
**PROD:** `appn84sqPw03zEbTT` · **DEV reference:** `appTetnuCZlCZdTCT`
**Branch tip (repo):** `feature/c025-stage17-zoom-attendance` (115 **v1.8** committed)
**Authority:** [C-025-stage17-prod-schema-manifest.json](./C-025-stage17-prod-schema-manifest.json)
**Smoke:** [C-025-stage17-prod-smoke-test.md](./C-025-stage17-prod-smoke-test.md)
**Downtime:** Allowed (PROD not serving live program)

---

## Hard rules (every step)

1. **Do not enable** 117 / 117a–f / 057-v1.3 / 042-v3.1 until schema re-audit passes.
2. **Never write** `Zoom Meetings → Attendees` from any recording path (Automation **101** protection).
3. **Do not rewrite** historical `ZOOM_ATTEND_BASE|…` XP. Soft-void only for wrong **new** `ZOOM_CREDIT|…` events.
4. Formulas in the manifest contain **DEV field IDs** — after creating PROD fields, rebuild formulas so references point at **PROD field IDs** (or paste then remapped in OMNI).
5. Skip all `ZZZ C025 Archive*` DEV fields — do **not** migrate archives.
6. Prefer **117 orchestrator v1.1.1** over modular 117a–f unless Mike requires slots.

---

## Phase 0 — Freeze and backups (before schema)

| # | Action | Done |
|---|--------|:----:|
| 0.1 | Confirm repo tip has 115 v1.8 + paste bodies | ☐ |
| 0.2 | Screenshot / export PROD Automations list (101 / 057 / 042 versions) | ☐ |
| 0.3 | Copy current PROD **057**, **042**, **101** script text to dated rollback files | ☐ |
| 0.4 | Confirm planned downtime window | ☐ |
| 0.5 | Keep **117-series OFF/absent**; leave **101 ON** | ☐ |

---

## Phase 1 — Create tables

| # | Action | Manifest group | Validation |
|---|--------|----------------|------------|
| 1.1 | **Create table `Zoom Attendance`** (empty) | `Zoom Attendance.table` | Table appears in PROD base |
| 1.2 | Set primary field to match DEV primary | same | Primary editable |

**Exact first PROD schema action:** Step **1.1** (create `Zoom Attendance`).

---

## Phase 2 — Create independent fields (no links / no formulas)

Do one field at a time. Use manifest `items[]` where `group` is:

- `Config.fields`
- `Zoom Attendance.fields_base`
- `Zoom Meetings.fields_nonformula` (exclude Attendees)

| # | Action | Done |
|---|--------|:----:|
| 2.1 | Create all **Config** Stage 17 fields from manifest (`group=Config.fields`) | ☐ |
| 2.2 | Set Config values: **Zoom Recording XP Percent of Live = 50**; path/makeup/gate/PW/email toggles per DEV samples (confirm which Config row is global) | ☐ |
| 2.3 | Create ZA base fields (singleSelect / checkbox / number / dateTime / text) from `Zoom Attendance.fields_base` | ☐ |
| 2.4 | Create ZA selects with **exact choices**: Attendance Method = `Live`, `Recording Quiz`; Review Status per DEV choices | ☐ |
| 2.5 | Create non-formula Zoom Meetings support fields (Recording Available At, overrides, config links as targets after Config exists) | ☐ |
| 2.6 | Add XP Events → XP Source option exactly: **`Zoom Meeting Recording Quiz`** | ☐ |
| 2.7 | Verify XP Bucket includes **`Zoom Attendance`** | ☐ |
| 2.8 | Verify XP Reward Rule **`ZOOM_ATTEND_BASE`** active **60** (leave unchanged) | ☐ |

---

## Phase 3 — Linked-record fields

| # | Action | Done |
|---|--------|:----:|
| 3.1 | ZA → **Enrollment** (link Enrollments; prefer single) | ☐ |
| 3.2 | ZA → **Zoom Meeting** (link Zoom Meetings; prefer single) | ☐ |
| 3.3 | Zoom Meetings → **Zoom Attendance** inverse link | ☐ |
| 3.4 | Enrollments → **Zoom Attendance** inverse link | ☐ |
| 3.5 | Other Config / Zoom Meetings linked fields per manifest `multipleRecordLinks` items | ☐ |

---

## Phase 4 — Lookups / rollups / formulas

| # | Action | Done |
|---|--------|:----:|
| 4.1 | Create ZA lookups (Enrollment RID, Zoom Meeting RID, Effective PW flag, etc.) | ☐ |
| 4.2 | Paste/rebuild ZA formulas (Credit Key, Approved?, Conflict?, XP Amount, Gate Earned?, Debug) using **PROD field IDs** | ☐ |
| 4.3 | Create Zoom Meetings **Effective*** formulas after linked Config fields exist | ☐ |
| 4.4 | Spot-check: recording fixture → `Zoom XP Amount` resolves to **30** when base 60 × 50% | ☐ |

---

## Phase 5 — Config records

| # | Action | Done |
|---|--------|:----:|
| 5.1 | Confirm global/program Config row values match `configRequiredValues` in manifest | ☐ |
| 5.2 | Do **not** invent parallel reward rules for recording | ☐ |

---

## Phase 6 — Select options (re-verify)

| # | Action | Done |
|---|--------|:----:|
| 6.1 | Re-verify XP Source includes `Zoom Meeting Recording Quiz` | ☐ |
| 6.2 | Re-verify ZA Attendance Method / Review Status choices | ☐ |

---

## Phase 7 — Views

| # | Action | Done |
|---|--------|:----:|
| 7.1 | Recreate DEV views on ZA (Grid + `Zoom Recording Quiz - Past Deadline` if listed in manifest) | ☐ |
| 7.2 | Confirm Automation 042 trigger (view `042` / Level Recalc Needed?) still valid | ☐ |
| 7.3 | Confirm 057 trigger still `Perfect Week Calculation Queue? = 1` | ☐ |

---

## Phase 8 — Re-audit schema

| # | Action | Done |
|---|--------|:----:|
| 8.1 | Run read-only `tools/airtable/_c025_stage17_prod_readiness_audit.py` (or equivalent) | ☐ |
| 8.2 | Require curated automation blockers = **0** for ZA critical set | ☐ |
| 8.3 | Confirm `Attendees` unchanged / still Enrollment link | ☐ |

---

## Phase 9 — Paste automations (ALL Stage 17 automations OFF)

Paste order (dependency):

| Order | Automation | Version | Paste file | State after paste |
|------:|------------|---------|-------------|-------------------|
| 1 | **101** | unchanged | — | Leave **ON** |
| 2 | **117** Orchestrator | **v1.1.1** | `C-025-stage17-117-orchestrator-v1.1.1-PASTE.txt` | **OFF** |
| 3 | **057** | **1.3** | `C-025-stage17-057-perfect-week-v1.3-PASTE.txt` | **OFF** |
| 4 | **042** | **3.1** | `C-025-stage17-042-level-gates-v3.1-PASTE.txt` | **OFF** |
| — | **115** | v1.8 | — | **Do not paste to PROD** (needs Testing Scenarios) |
| — | **117a–f** | modular | — | Only if orchestrator not used |

| # | Action | Done |
|---|--------|:----:|
| 9.1 | Paste 117 v1.1.1; `recordId` mapped; webhook blank; **OFF** | ☐ |
| 9.2 | Paste 057 v1.3; preserve Queue?=1 trigger; **OFF** | ☐ |
| 9.3 | Paste 042 v3.1; preserve view `042` re-entry; **OFF** | ☐ |
| 9.4 | Confirm scripts contain **no Attendees writes** | ☐ |

---

## Phase 10 — Isolated PROD smoke test

Follow [C-025-stage17-prod-smoke-test.md](./C-025-stage17-prod-smoke-test.md) with a **new dedicated** test enrollment + meeting.

| # | Action | Done |
|---|--------|:----:|
| 10.1 | Create dedicated PROD test athlete/enrollment/meeting | ☐ |
| 10.2 | Execute S0–S8; record Pass/Fail | ☐ |

---

## Phase 11 — Fix defects

| # | Action | Done |
|---|--------|:----:|
| 11.1 | Any Attendees write → **STOP**; rollback scripts | ☐ |
| 11.2 | Soft-void bad `ZOOM_CREDIT|…` only (`Active? = false`) | ☐ |
| 11.3 | Re-run failing smoke cases | ☐ |

---

## Phase 12 — Enable in dependency order

| Order | Enable | When |
|------:|--------|------|
| 1 | **057** | After Perfect Week smoke cases Pass |
| 2 | **042** | After gate smoke cases Pass |
| 3 | **117** | After recording XP smoke Pass and monitoring window agreed |
| — | **101** | Remains ON throughout |
| — | **115** | Remains DEV-only |

---

## Double-credit gate (checklist)

| Gate | Requirement | Done |
|------|-------------|:----:|
| G1 | 117 CONFIG / script never references Attendees write | ☐ |
| G2 | Live-only awards use `ZOOM_ATTEND_BASE|…` only | ☐ |
| G3 | Recording-only awards use `ZOOM_CREDIT|…` only | ☐ |
| G4 | Both paths → conflict soft-void recording; live XP untouched | ☐ |
| G5 | Rerun same ZA → no second XP | ☐ |
| G6 | Existing PROD live history untouched | ☐ |

---

## Stop conditions

- Schema re-audit still shows missing ZA critical fields
- Formula amount ≠ 30 for approved recording with % = 50
- Any recording path mutates Attendees
- Historical live XP deleted or bulk-deactivated
- 117 enabled before smoke Pass
