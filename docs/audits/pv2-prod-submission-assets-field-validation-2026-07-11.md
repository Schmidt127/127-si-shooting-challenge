# PROD Submission Assets Field Promotion — Post-Promotion Validation

**Validation date:** 2026-07-11 (re-run after final manual corrections)  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD base:** `appn84sqPw03zEbTT`  
**Table:** Submission Assets (`tblhMLKxQK77agtME`)  
**Validation script:** `tools/airtable/_preview/pv2_sa_field_validation.py`  
**Gap audit:** `tools/airtable/pv2_dev_prod_gap_audit.py`  

## Overall result

**FAIL** — Submission Assets field promotion is **not complete**. Live PROD schema still lacks **`Calculation`** (PROD field count **96** vs DEV **97**). All other promoted fields and configurations validate PASS, including corrected **`Processing Started At`**.

## Field counts

| Metric | DEV | PROD | Target |
|---|---|---|---|
| Total field count | 97 | 96 | 97 |
| Promoted fields present | 17 | 16 | 17 |
| Missing promoted fields | 0 | 1 | 0 |
| Promotion duplicate/copy fields | — | 0 | 0 |

> No unexpected duplicate, copy, or suffixed fields were created by this promotion.

## Promoted field presence (17)

| # | Field | PROD present | Config vs DEV |
|---|---|---|---|
| 1 | Asset Reuse Review Primary Reason | Yes | PASS |
| 2 | Asset Reuse Review Reasons | Yes | PASS |
| 3 | Asset Reuse Review Summary | Yes | PASS |
| 4 | Asset Reuse Reviewed At | Yes | PASS |
| 5 | Asset Reuse Reviewed By | Yes | PASS |
| 6 | Asset Sequence | Yes | PASS |
| 7 | Calculation | **No** | **FAIL — missing** |
| 8 | Duplicate Match Records (All) | Yes | PASS |
| 9 | Exact Hash Match Found? | Yes | PASS |
| 10 | From field: Duplicate Match Records (All) | Yes | PASS |
| 11 | Potential Asset Reuse? | Yes | PASS |
| 12 | Processing Started At | Yes | **PASS** (corrected) |
| 13 | Same Enrollment Match Found? | Yes | PASS |
| 14 | Storage Key | Yes | PASS |
| 15 | Upload Claim Run ID | Yes | PASS |
| 16 | Upload Naming Status | Yes | PASS |
| 17 | Video Feedback Focus | Yes | PASS |

## Special field checks

### Calculation

| Check | Result |
|---|---|
| Exists exactly once on PROD | **FAIL** — field not found in live schema |
| Type Formula | Not verifiable — field absent |
| Formula references RecordId | Not verifiable — field absent |
| Formula result type matches DEV (`singleLineText`) | Not verifiable — field absent |

**DEV reference:** `Calculation` formula is `{RecordId}` (stored as `{fldXz9TNOnGeRXEL8}` referencing the `RecordId` field). PROD already has `RecordId` (`RECORD_ID()`) at the same field ID; creating `Calculation` with `{RecordId}` should resolve equivalently once the field exists.

### Processing Started At

| Check | Result |
|---|---|
| Type matches DEV (`dateTime`) | **PASS** |
| Date format `M/D/YYYY` | **PASS** |
| Time format `h:mma` | **PASS** |
| Time zone `America/Denver` | **PASS** |

### Duplicate Match Records (All)

| Check | Result |
|---|---|
| Self-link to Submission Assets | **PASS** |
| Allows multiple records | **PASS** |
| Inverse field `From field: Duplicate Match Records (All)` | **PASS** |

## Configuration mismatches (17 promoted fields)

**Count: 1** (missing field only)

| Field | Issue |
|---|---|
| Calculation | Missing on PROD |

All 16 present promoted fields match DEV for type, select options (including order), number precision, checkbox settings, date/time settings, link targets, and formula expressions.

## Gap audit dependency checks

Re-run: `python tools/airtable/pv2_dev_prod_gap_audit.py`

| Check | Result |
|---|---|
| `submission_assets_missing_in_prod` | **1** — target **0** |
| Configuration mismatch count (promoted) | **1** |
| Storage Key dependency (070b) | **PASS** |
| Upload Claim Run ID dependency (070b) | **PASS** |
| Automation 116 schema dependencies | **PASS** |
| Automation 070b schema dependencies | **PASS** |

## Automation readiness

| Item | Status |
|---|---|
| Automation 116 schema dependencies | **PASS** |
| Automation 116 enable-ready | **NO** — automation not pasted/enabled on PROD (BLOCKER) |
| Automation 070b schema dependencies | **PASS** |
| Automation 070b enable-ready | **NO** — C-013 PROD infrastructure (Lambda, Make, secrets) not promoted |

**070b is schema-ready, not enable-ready.**

## Remaining gap inventory

| Classification | Count |
|---|---|
| BLOCKER | 1 (Automation 116 — not pasted/enabled on PROD) |
| REQUIRED BEFORE LAUNCH | 1 (C-013 production promotion) |

## Required manual correction

Create **`Calculation`** on PROD Submission Assets:

- Type: **Formula**
- Formula: **`{RecordId}`** (references existing `RecordId` field)
- Expected result type: **singleLineText** (matches DEV)

Then re-run validation scripts until `submission_assets_missing_in_prod = 0`.

## Re-validation command

```powershell
cd tools/airtable
python _preview/pv2_sa_field_validation.py
python pv2_dev_prod_gap_audit.py
```

PASS criteria: PROD field count = 97, missing field count = 0, configuration mismatch count = 0, promotion duplicate count = 0.

---
*Generated 2026-07-11 by read-only live schema validation — no Airtable modifications.*
