# PROD Submission Assets Field Promotion — Validation

**Validation date:** 2026-07-11 (final classification correction)  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD base:** `appn84sqPw03zEbTT`  
**Table:** Submission Assets (`tblhMLKxQK77agtME`)  
**Validation script:** `tools/airtable/_preview/pv2_sa_field_validation.py`  
**Approved differences:** `tools/airtable/pv2_approved_schema_differences.py`  
**Gap audit:** `tools/airtable/pv2_dev_prod_gap_audit.py`  

## Overall result

**PASS** — All required Production v2 Submission Assets fields exist on PROD with matching configuration. The sole raw DEV-only field difference (`Calculation`) is an **approved intentional environment difference** (NO ACTION).

## Field counts

| Metric | DEV | PROD | Notes |
|---|---|---|---|
| Raw field count | 97 | 96 | Raw count parity not required |
| Raw DEV-only fields | 1 | — | `Calculation` only |
| Required missing fields | 0 | 0 | Target **0** |
| Approved differences | 1 | — | `Submission Assets.Calculation` |
| Promotion duplicate/copy fields | 0 | — | Target **0** |
| Configuration mismatches (required) | 0 | — | Target **0** |

## Approved environment difference

| Field | Classification | Reason |
|---|---|---|
| `Calculation` | **NO ACTION** | Redundant DEV helper formula `{RecordId}`; PROD already contains `RecordId` and no production dependency references `Calculation`. **Do not create on PROD.** |

## Required promoted fields (16)

All 16 required promoted fields present on PROD with configuration matching DEV:

- Asset Reuse Review Primary Reason  
- Asset Reuse Review Reasons  
- Asset Reuse Review Summary  
- Asset Reuse Reviewed At  
- Asset Reuse Reviewed By  
- Asset Sequence  
- Duplicate Match Records (All) — self-link PASS, inverse PASS  
- Exact Hash Match Found?  
- From field: Duplicate Match Records (All)  
- Potential Asset Reuse?  
- Processing Started At — `America/Denver`, `M/D/YYYY`, `h:mma` PASS  
- Same Enrollment Match Found?  
- Storage Key  
- Upload Claim Run ID  
- Upload Naming Status  
- Video Feedback Focus  

## RecordId vs Calculation

| Field | DEV | PROD | Production dependency |
|---|---|---|---|
| `RecordId` | Present — formula `RECORD_ID()` | Present — formula `RECORD_ID()` | **Used** by scripts, backfills, integrations |
| `Calculation` | Present — formula `{RecordId}` (API: `{fldXz9TNOnGeRXEL8}`) | **Absent by design** | **None** — redundant DEV helper |

## Repository dependency search

Searched `airtable/automations`, `lambda`, `make`, `web`, and production tooling for:

- Field name `Calculation` on Submission Assets  
- `{Calculation}`  
- DEV field ID `fldzFo5To0DXi94OS`  

**Result:** No production dependency references Submission Assets `Calculation`. Production code uses `RecordId`, `recordId`, or Airtable record IDs directly. Unrelated matches (e.g. `Summary Calculation Status` on Weekly Athlete Summary) are out of scope.

## Gap audit dependency checks

| Check | Result |
|---|---|
| Required Submission Assets missing fields | **0** |
| Approved differences | **1** |
| Submission Assets field promotion | **PASS** |
| Storage Key dependency (070b) | **PASS** |
| Upload Claim Run ID dependency (070b) | **PASS** |
| Automation 116 schema dependencies | **PASS** |
| Automation 070b schema dependencies | **PASS** |

## Automation readiness

| Item | Status |
|---|---|
| Automation 116 schema dependencies | **PASS** |
| Automation 116 runtime enable-ready | **NO** — paste/enable + controlled fixture test pending (BLOCKER) |
| Automation 070b schema dependencies | **PASS** |
| Automation 070b enable-ready | **NO** — C-013 PROD infrastructure (Lambda, Make, secrets) not promoted |

**070b is schema-ready, not enable-ready.**

## Remaining gap inventory

| Classification | Count |
|---|---|
| BLOCKER | 1 (Automation 116 — not pasted/enabled on PROD) |
| REQUIRED BEFORE LAUNCH | 1 (C-013 production promotion) |
| NO ACTION | 3 (includes `Submission Assets.Calculation`, Testing Scenarios, 066 verify) |

---
*Generated 2026-07-11 by read-only live schema validation — no Airtable modifications.*
