# C-023 — PROD automation 116 runtime validation (Schmidt Testing fixture)

**Audit date:** 2026-07-11  
**PROD base ID:** `appn84sqPw03zEbTT`  
**Automation name:** `116 - Submission Assets - Apply Asset Reuse Decision Consequences`  
**Script path:** `airtable/automations/shooting-challenge/116-submission-assets-apply-asset-reuse-decision-consequences.js`  
**Script version:** 1.0.1  
**Script commit:** `992677d`  
**Schema validation commit:** `2958d8d`  
**Test enrollment:** `recgP9qZYjAhE7NXm` (Schmidt, Testing - 2025-2026)  
**Harness:** `tools/airtable/prod_116_fixture_run.py`

## Overall result

**PASS** — Confirmed Duplicate and Approved Reuse reversal both passed against direct PROD record state. XP Event count remained exactly 1. Automation 116 remains ON; automation 070b remains OFF.

The initial rerun was falsely classified because Airtable REST omits unchecked checkbox fields rather than returning literal `false`. The fixture harness now treats absent `Active?` as unchecked and verifies the complete forward/reversal state.

---

## Phase 1 — Automation configuration verification

| Check | Result | Evidence |
|-------|--------|----------|
| Automation exists and is ON | **PASS (functional evidence)** | Both watched-field changes triggered expected consequences |
| Name matches `116 - Submission Assets - Apply Asset Reuse Decision Consequences` | **Not independently API-verifiable** | Airtable automation UI metadata is unavailable via REST |
| Trigger/table/watched field | **PASS (functional evidence)** | Changes to Submission Assets `Asset Reuse Decision` triggered both paths |
| Action/input `recordId` | **PASS (functional evidence)** | Only the triggering fixture asset was processed |
| Script behavior matches v1.0.1 (`992677d`) | **PASS** | Forward/reversal state and audit markers match repository implementation |
| Automations table documentation record | **FAIL — absent** | PROD Automations table has 48 records; **no row** for 116 (legacy **008** still documented) |
| Runtime forward test | **PASS** | Direct PROD field-state evidence |

### Remaining documentation action

Add/update the PROD Automations table documentation row for 116 and retire the legacy 008 documentation row. This is documentation drift, not a runtime blocker.

---

## Phase 2 — Fixture verification

**PASS** — Existing approved Schmidt Testing fixture retained (created 2026-07-10).

| Record | ID | Label / key |
|--------|-----|-------------|
| Submission | `rec9yoDZ3DMIEhi3I` | Testing Schmidt - 7/10/2026 - Post Challenge |
| Submission Asset | `recWZ4cHNYgbV60mL` | Asset Label: **PROD V2 Test - Duplicate Reuse** |
| Video Feedback | `reccXspFIiNIPMPcm` | Video Feedback Key: **PROD-V2-A116-TEST** |
| XP Event | `recYQ10pOoFlApmjZ` | Source Key: **`VIDEO_SUBMISSION|reccXspFIiNIPMPcm`** |

Verified:

- All four records link only to `recgP9qZYjAhE7NXm`
- Submission Asset → Video Feedback linked
- XP Event → same Video Feedback linked
- No active athlete enrollment in chain
- XP count for test source key = **1**

---

## Phase 3 — Baseline evidence (2026-07-11)

Captured before forward test (`tools/airtable/_preview/prod-116-baseline-2026-07-11.json`).

| Field | Value |
|-------|-------|
| Asset Reuse Decision | Not Reviewed |
| Duplicate Resolution Applied? | null |
| Duplicate Resolution Last Applied Decision | null |
| Duplicate Resolution Error | null |
| Video Feedback Do Not Award XP? | null (unchecked) |
| XP Event Active? | true |
| XP Event Duplicate Status | Unique |
| XP Reason Debug | PROD V2 Test fixture for automation 116 (PROD-V2-A116-TEST). Reference commit 992677d. |
| XP Event count (source key) | **1** |

---

## Phase 4 — Confirmed Duplicate forward test

**Action:** Set `Asset Reuse Decision = Confirmed Duplicate` on `recWZ4cHNYgbV60mL`  
**Observed audit timestamp:** `2026-07-11T13:54:55.869Z`  
**Automation run IDs / timestamps:** Not accessible via REST API

| Expected | Observed |
|----------|----------|
| Run succeeded | **PASS** by direct field-state evidence; output variables are not REST-readable |
| `actionOut = applied_confirmed_duplicate` | Behavior matches action; output variable not REST-readable |
| VF Do Not Award XP? checked | **true** |
| XP Active? false | **unchecked** (REST omits field) |
| XP Duplicate Status = Duplicate - Remove | **Duplicate - Remove** |
| XP Reason Debug contains `[C-023-S5] Confirmed duplicate — XP deactivated` | **PASS** |
| Duplicate Resolution Applied? checked | **true** |
| Duplicate Resolution Last Applied Decision = Confirmed Duplicate | **Confirmed Duplicate** |
| Duplicate Resolution Applied At populated | **PASS** |
| Duplicate Resolution Error blank | **PASS** |
| XP Event count remains 1 | **1 → 1** PASS |

**Result:** **PASS**

---

## Phase 5 — Approved Reuse reversal test

**Action:** Set `Asset Reuse Decision = Approved Reuse` on the same asset  
**Observed audit timestamp:** `2026-07-11T13:55:11.935Z`

| Expected | Observed |
|----------|----------|
| Run succeeded | **PASS** by direct field-state evidence |
| `actionOut = restored_approved_reuse` | Behavior matches action; output variable not REST-readable |
| VF Do Not Award XP? unchecked | **PASS** |
| Same XP Event active | **true**, same ID `recYQ10pOoFlApmjZ` |
| XP Duplicate Status = Unique | **Unique** |
| XP Reason Debug contains `[C-023-S5] Restored — decision reversed` | **PASS** |
| Last Applied Decision = Approved Reuse | **Approved Reuse** |
| Applied At populated | `2026-07-11T13:55:11.680Z` |
| Resolution Error blank | **PASS** |
| XP Event count remains 1 | **1 → 1** PASS |

**Result:** **PASS**

> Repository v1.0.1 intentionally clears `Duplicate Resolution Applied?` during reversal (`restorePatch` writes `false`). The final unchecked value is correct for “no duplicate resolution currently applied.”

---

## Phase 6 — Final state (post-failure recovery)

| Item | State |
|------|--------|
| Automation 116 | **ON** |
| Asset Reuse Decision | **Approved Reuse** |
| XP Event `recYQ10pOoFlApmjZ` | Active · Unique · 1 row |
| Video Feedback Do Not Award XP? | unchecked |
| Duplicate Resolution Applied? | unchecked (cleared by reversal) |
| Duplicate Resolution Last Applied Decision | Approved Reuse |
| Duplicate Resolution Applied At | populated |
| Duplicate Resolution Error | blank |
| Fixture records | **Retained** — do not delete |

---

## Artifacts

| Artifact | Path |
|----------|------|
| Fixture audit JSON | `tools/airtable/_preview/prod-116-fixture-audit.json` |
| Baseline JSON | `tools/airtable/_preview/prod-116-baseline-2026-07-11.json` |
| Final-state JSON | `tools/airtable/_preview/prod-116-final-2026-07-11.json` |
| Fixture runner | `tools/airtable/prod_116_fixture_run.py` |
| Prior validation | `docs/deploy-checklists/C-023-prod-automation-116-validation-2026-07-10.md` |

## Remaining manual action

Automation 116 has no remaining runtime blocker. Proceed to a read-only C-013 PROD infrastructure readiness audit. Do **not** enable automation **070b** until C-013 PROD infrastructure smoke PASS.
