# PROD Submission Assets Field Promotion — Post-Promotion Validation

**Validation date:** 2026-07-11  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD base:** `appn84sqPw03zEbTT`  
**Table:** Submission Assets (`tblhMLKxQK77agtME`)  
**Validation script:** `tools/airtable/_preview/pv2_sa_field_validation.py`  
**Gap audit:** `tools/airtable/pv2_dev_prod_gap_audit.py` (re-run same session)  

## Overall result

**FAIL** — 16 of 17 promoted fields present on PROD. **`Calculation`** is still absent from live PROD schema.

## Field counts

| Metric | DEV | PROD |
|---|---|---|
| Total field count | 97 | 96 |
| Promoted fields present | 17 | 16 |
| Promoted fields missing | 0 | 1 |
| Exact duplicate promoted names | — | 0 |
| Copy/suffixed fields from promotion | — | 0 |

> Pre-existing PROD fields with copy/suffix naming unrelated to this promotion: `XP Events copy`, `Homework Name 2`, `HW Sub 2` (3 fields — not counted as promotion duplicates).

## Promoted field presence (17)

| # | Field | PROD present | Notes |
|---|---|---|---|
| 1 | Asset Reuse Review Primary Reason | Yes | type match |
| 2 | Asset Reuse Review Reasons | Yes | type match |
| 3 | Asset Reuse Review Summary | Yes | type match |
| 4 | Asset Reuse Reviewed At | Yes | type match |
| 5 | Asset Reuse Reviewed By | Yes | type match |
| 6 | Asset Sequence | Yes | type match |
| 7 | Calculation | **No** | **MISSING** — manual formula `{RecordId}` not found |
| 8 | Duplicate Match Records (All) | Yes | self-link PASS |
| 9 | Exact Hash Match Found? | Yes | type match |
| 10 | From field: Duplicate Match Records (All) | Yes | auto-inverse PASS |
| 11 | Potential Asset Reuse? | Yes | type match |
| 12 | Processing Started At | Yes | **config mismatch** — timezone |
| 13 | Same Enrollment Match Found? | Yes | type match |
| 14 | Storage Key | Yes | type match |
| 15 | Upload Claim Run ID | Yes | type match |
| 16 | Upload Naming Status | Yes | type match |
| 17 | Video Feedback Focus | Yes | type match |

## Special field checks

### Duplicate Match Records (All)

| Check | Result |
|---|---|
| Links to Submission Assets | **PASS** — `linkedTableId` = `tblhMLKxQK77agtME` (self-link) |
| Allows multiple records | **PASS** — `multipleRecordLinks` |
| Inverse field exists | **PASS** — `From field: Duplicate Match Records (All)` |
| Inverse field ID | `fldNeyuvotRnbcR9a` |

### Calculation

| Check | Result |
|---|---|
| Field exists on PROD | **FAIL** |
| Formula `{RecordId}` | **Not verifiable** — field absent |

## Configuration mismatches (promoted fields)

**Count: 1**

| Field | Issue |
|---|---|
| Processing Started At | `dateTime.timeZone` — DEV `America/Denver`, PROD `utc` |

All other present promoted fields match DEV type and configuration (select options, link targets, checkbox, text).

## Gap audit dependency checks

Re-run: `python tools/airtable/pv2_dev_prod_gap_audit.py`

| Check | Result |
|---|---|
| `submission_assets_missing_in_prod` | **1** (Calculation) — target **0** |
| Storage Key dependency (070b) | **PASS** |
| Upload Claim Run ID dependency (070b) | **PASS** |
| Automation 116 schema dependencies | **PASS** |
| Automation 070b schema dependencies | **PASS** |

## Automation 070b readiness

| Dimension | Status |
|---|---|
| Schema dependencies | **PASS** — Storage Key, Upload Claim Run ID, and related 070b fields present |
| Safe to enable on PROD | **NO** — C-013 production promotion (Lambda, Make, secrets) not started; enabling 070b without infra would send payloads with no canonical writeback path |

**070b is schema-ready, not enable-ready.**

## Remaining gap inventory (post-promotion)

From updated `pv2-dev-prod-gap-inventory-2026-07-11.json`:

| Classification | Count |
|---|---|
| BLOCKER | 1 (Automation 116 — not pasted/enabled on PROD) |
| REQUIRED BEFORE LAUNCH | 1 (C-013 production promotion) |

## Required manual correction

1. **Create `Calculation` on PROD** — formula field, formula exactly `{RecordId}` (manual step per promotion checklist step 17).
2. **Optional:** Align `Processing Started At` timezone to `America/Denver` to match DEV (non-blocking for script deps; consistency fix).

## Re-validation command

After creating `Calculation`:

```powershell
cd tools/airtable
python _preview/pv2_sa_field_validation.py
python pv2_dev_prod_gap_audit.py
```

PASS criteria: `submission_assets_missing_in_prod = 0`, promoted config mismatches = 0 (or accepted), overall validation **PASS**.

---
*Generated 2026-07-11 by read-only live schema validation — no Airtable modifications.*
