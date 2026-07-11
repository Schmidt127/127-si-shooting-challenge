# PROD Submission Assets — Field Promotion Checklist

**Date:** 2026-07-11  
**DEV base:** `appTetnuCZlCZdTCT`  
**PROD base:** `appn84sqPw03zEbTT`  
**Table:** Submission Assets (`tblhMLKxQK77agtME`)  
**Source audit:** `docs/audits/pv2-dev-prod-gap-inventory-2026-07-11.md` (commit `fdf7116420360c74462df4ce786d0dea13c45d50`)  

## 1. Live reconciliation

| Metric | Value |
|--------|-------|
| DEV field count | **97** |
| PROD field count | **80** |
| Missing in PROD | **17** |
| Prior audit count (2026-07-11) | **17** |
| Discrepancy | **None — live matches audit** |
| Target PROD count after promotion | **97** |
| Reconciled at | 2026-07-11T12:45:00Z |

### Missing field list (live verified)

- `Asset Reuse Review Primary Reason` — DEV `fld5RMMPKIIxYoI1L` · `singleSelect` · REQUIRED BEFORE LAUNCH
- `Asset Reuse Review Reasons` — DEV `fldIRI7T1rY5R9mdg` · `multipleSelects` · REQUIRED BEFORE LAUNCH
- `Asset Reuse Review Summary` — DEV `flduuIThdtc5q0a12` · `multilineText` · REQUIRED BEFORE LAUNCH
- `Asset Reuse Reviewed At` — DEV `fld4N90PQqB1wVql1` · `dateTime` · REQUIRED BEFORE LAUNCH
- `Asset Reuse Reviewed By` — DEV `fldYpqMsyo0Dcvg0q` · `singleLineText` · REQUIRED BEFORE LAUNCH
- `Asset Sequence` — DEV `fldYPCnUe1RQSEzu0` · `number` · NOT REQUIRED
- `Calculation` — DEV `fldzFo5To0DXi94OS` · `formula` · NOT REQUIRED
- `Duplicate Match Records (All)` — DEV `fld3mKhVv4RMIPBjc` · `multipleRecordLinks` · REQUIRED BEFORE LAUNCH
- `Exact Hash Match Found?` — DEV `fldVvlCSTDPMYKI2n` · `checkbox` · REQUIRED BEFORE LAUNCH
- `From field: Duplicate Match Records (All)` — DEV `fldhk3rFwECkaTLrD` · `multipleRecordLinks` · REQUIRED BEFORE LAUNCH
- `Potential Asset Reuse?` — DEV `fldNjXKr8jaUXAEKR` · `checkbox` · REQUIRED BEFORE LAUNCH
- `Processing Started At` — DEV `fldSlCe9nuGvymdvQ` · `dateTime` · REQUIRED BEFORE LAUNCH
- `Same Enrollment Match Found?` — DEV `fldoAF3gUaBAzPVRI` · `checkbox` · REQUIRED BEFORE LAUNCH
- `Storage Key` — DEV `fldB4X0dqVUf6lplz` · `singleLineText` · BLOCKER
- `Upload Claim Run ID` — DEV `fldLMzAxwd9AffgbJ` · `singleLineText` · BLOCKER
- `Upload Naming Status` — DEV `fldj98NjKTnwQOIgz` · `singleSelect` · REQUIRED BEFORE LAUNCH
- `Video Feedback Focus` — DEV `fldFCExyojIkXG0t9` · `singleSelect` · REQUIRED BEFORE LAUNCH

## 2. Risk summary

- **BLOCKER:** 2
- **REQUIRED BEFORE LAUNCH:** 13
- **NOT REQUIRED:** 2

## 3. Dependency order

**First field to create:** `Storage Key`  
**Last field to create (manual):** `Calculation`  

| Step | Field | Method | Waits for |
|------|-------|--------|-----------|
| 1 | Storage Key | omni | — |
| 2 | Upload Claim Run ID | omni | — |
| 3 | Potential Asset Reuse? | omni | — |
| 4 | Exact Hash Match Found? | omni | — |
| 5 | Same Enrollment Match Found? | omni | — |
| 6 | Processing Started At | omni | — |
| 7 | Asset Reuse Review Summary | omni | — |
| 8 | Asset Reuse Reviewed By | omni | — |
| 9 | Asset Sequence | omni | — |
| 10 | Asset Reuse Reviewed At | omni | — |
| 11 | Upload Naming Status | omni | — |
| 12 | Video Feedback Focus | omni | — |
| 13 | Asset Reuse Review Primary Reason | omni | — |
| 14 | Asset Reuse Review Reasons | omni | — |
| 15 | Duplicate Match Records (All) | manual | — |
| 16 | Calculation | manual | RecordId |

**Independent batch (step 1–5):** Storage Key, Upload Claim Run ID, Potential Asset Reuse?, Exact Hash Match Found?, Same Enrollment Match Found?

**Auto-created:** `From field: Duplicate Match Records (All)` when step 15 self-link is created.

## 4. Field definitions (DEV source of truth)

### Asset Reuse Review Primary Reason
- Type: `singleSelect`
- DEV ID: `fld5RMMPKIIxYoI1L`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Primary contextual reuse classification for operator review.
- Options: Same Assignment Resubmission, Different Assignment Reuse, Different Week Reuse, Different Submission Reuse, Cross-Type Reuse, Homework Used for Video Feedback, Video Feedback Used for Homework, Missing Context, Multiple Prior Uses, Cross-Enrollment Match — Informational

### Asset Reuse Review Reasons
- Type: `multipleSelects`
- DEV ID: `fldIRI7T1rY5R9mdg`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: All contextual reuse reason tags (multi-select).
- Options: Same Assignment Resubmission, Different Assignment Reuse, Different Week Reuse, Different Submission Reuse, Cross-Type Reuse, Homework Used for Video Feedback, Video Feedback Used for Homework, Missing Context, Multiple Prior Uses, Cross-Enrollment Match — Informational

### Asset Reuse Review Summary
- Type: `multilineText`
- DEV ID: `flduuIThdtc5q0a12`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Human-readable reuse review summary from Lambda.

### Asset Reuse Reviewed At
- Type: `dateTime`
- DEV ID: `fld4N90PQqB1wVql1`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: When operator finalized reuse decision (UTC).

### Asset Reuse Reviewed By
- Type: `singleLineText`
- DEV ID: `fldYpqMsyo0Dcvg0q`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Operator identifier for reuse review.

### Asset Sequence
- Type: `number`
- DEV ID: `fldYPCnUe1RQSEzu0`
- Classification: **NOT REQUIRED**
- Purpose: Optional asset ordering integer within submission.

### Calculation
- Type: `formula`
- DEV ID: `fldzFo5To0DXi94OS`
- Classification: **NOT REQUIRED**
- Purpose: Debug formula displaying RecordId — cosmetic on DEV.
- Formula (PROD): `{RecordId}`
- Note: PROD already has RecordId (fldXz9TNOnGeRXEL8). Formula must reference {RecordId}, not a missing field.

### Duplicate Match Records (All)
- Type: `multipleRecordLinks`
- DEV ID: `fld3mKhVv4RMIPBjc`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Self-link to all same-enrollment uploaded hash matches.
- Link: `Submission Assets` (self-link, multiple records)
- Note: Create as self-link to Submission Assets. Airtable auto-creates inverse 'From field: Duplicate Match Records (All)'.

### Exact Hash Match Found?
- Type: `checkbox`
- DEV ID: `fldVvlCSTDPMYKI2n`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Lambda flag: byte-identical hash match detected.

### From field: Duplicate Match Records (All)
- Type: `multipleRecordLinks`
- DEV ID: `fldhk3rFwECkaTLrD`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Inverse self-link — auto-created with Duplicate Match Records (All).
- Note: Do NOT create manually — verify after Duplicate Match Records (All) is created.

### Potential Asset Reuse?
- Type: `checkbox`
- DEV ID: `fldNjXKr8jaUXAEKR`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Flags same-enrollment contextual duplicate for operator review queue (C-023).

### Processing Started At
- Type: `dateTime`
- DEV ID: `fldSlCe9nuGvymdvQ`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Timestamp when Lambda claims asset for upload (America/Denver).

### Same Enrollment Match Found?
- Type: `checkbox`
- DEV ID: `fldoAF3gUaBAzPVRI`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Lambda flag: same-enrollment duplicate context detected.

### Storage Key
- Type: `singleLineText`
- DEV ID: `fldB4X0dqVUf6lplz`
- Classification: **BLOCKER**
- Purpose: S3 object path written by Lambda/Make; required for canonical storage and 070b route.

### Upload Claim Run ID
- Type: `singleLineText`
- DEV ID: `fldLMzAxwd9AffgbJ`
- Classification: **BLOCKER**
- Purpose: Lambda single-worker upload claim token; prevents concurrent upload collisions.

### Upload Naming Status
- Type: `singleSelect`
- DEV ID: `fldj98NjKTnwQOIgz`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: File naming pipeline readiness for Make upload.
- Options: Pending Metadata, Ready, Blocked, Error

### Video Feedback Focus
- Type: `singleSelect`
- DEV ID: `fldFCExyojIkXG0t9`
- Classification: **REQUIRED BEFORE LAUNCH**
- Purpose: Video skill focus category on video submission assets.
- Options: Shooting, Layups / Finishing, Ball Handling, Free Throws, Footwork / Defense, Strength / Movement, General Basketball, Other

## 5. OMNI-ready prompt

Copy everything below into Airtable OMNI in PROD base:

```
You are working in the PRODUCTION Airtable base only.

Base ID: appn84sqPw03zEbTT
Table: Submission Assets

STRICT RULES:
- Do NOT modify, rename, or delete any existing field.
- Do NOT change any existing field type, formula, option, or link.
- Do NOT enable, disable, or edit any automation.
- Do NOT create, update, or delete any records.
- Do NOT change views, interfaces, or permissions.
- Create ONLY the missing fields listed below, in order.
- Before creating each field, check whether a field with the EXACT same name already exists. If it exists, STOP that field and report it — do not create a duplicate or suffix variant (no '2', 'copy', or '(from DEV)').
- After each creation, report: field name, field type, and confirmation it was newly created.

Create these fields in order:

1. **Storage Key** — type: `singleLineText`
   - Single line text, no default.
2. **Upload Claim Run ID** — type: `singleLineText`
   - Single line text, no default.
3. **Potential Asset Reuse?** — type: `checkbox`
   - Checkbox, icon: thumbsUp, color: greenBright.
4. **Exact Hash Match Found?** — type: `checkbox`
   - Checkbox, icon: thumbsUp, color: greenBright.
5. **Same Enrollment Match Found?** — type: `checkbox`
   - Checkbox, icon: thumbsUp, color: greenBright.
6. **Processing Started At** — type: `dateTime`
   - Date with time. Date format: M/D/YYYY. Time format: h:mma. Time zone: America/Denver.
7. **Asset Reuse Review Summary** — type: `multilineText`
   - Long text, no default.
8. **Asset Reuse Reviewed By** — type: `singleLineText`
   - Single line text, no default.
9. **Asset Sequence** — type: `number`
   - Number, precision 0, no default.
10. **Asset Reuse Reviewed At** — type: `dateTime`
   - Date with time. Date format: M/D/YYYY. Time format: h:mma. Time zone: utc.
11. **Upload Naming Status** — type: `singleSelect`
   - Single select. Options in this exact order:
     - Pending Metadata
     - Ready
     - Blocked
     - Error
12. **Video Feedback Focus** — type: `singleSelect`
   - Single select. Options in this exact order:
     - Shooting
     - Layups / Finishing
     - Ball Handling
     - Free Throws
     - Footwork / Defense
     - Strength / Movement
     - General Basketball
     - Other
13. **Asset Reuse Review Primary Reason** — type: `singleSelect`
   - Single select. Options in this exact order:
     - Same Assignment Resubmission
     - Different Assignment Reuse
     - Different Week Reuse
     - Different Submission Reuse
     - Cross-Type Reuse
     - Homework Used for Video Feedback
     - Video Feedback Used for Homework
     - Missing Context
     - Multiple Prior Uses
     - Cross-Enrollment Match — Informational
14. **Asset Reuse Review Reasons** — type: `multipleSelects`
   - Multiple select. Options in this exact order:
     - Same Assignment Resubmission
     - Different Assignment Reuse
     - Different Week Reuse
     - Different Submission Reuse
     - Cross-Type Reuse
     - Homework Used for Video Feedback
     - Video Feedback Used for Homework
     - Missing Context
     - Multiple Prior Uses
     - Cross-Enrollment Match — Informational
15. SKIP IN OMNI — manual follow-up required: **Duplicate Match Records (All)** (multipleRecordLinks)
16. SKIP IN OMNI — manual follow-up required: **Calculation** (formula)

When finished, report:
- Total fields created
- Any fields skipped because they already existed
- Any fields you could not create
- Confirmation that no existing fields were modified
```

## 6. Manual follow-up checklist

### 6.1 Duplicate Match Records (All) — self-link

OMNI cannot reliably create self-referential link pairs. Mike must:

1. Open PROD → Submission Assets → add field **Duplicate Match Records (All)**.
2. Type: **Link to another record** → table **Submission Assets**.
3. Allow linking to **multiple records**.
4. Save. Verify Airtable auto-creates **From field: Duplicate Match Records (All)**.
5. Do NOT create the inverse field manually.

**Verify:** Both link fields exist; link targets Submission Assets only.

### 6.2 Calculation — formula

1. Add field **Calculation** → type **Formula**.
2. Description: `Displays the record id for this record.`
3. Formula (exact): `{RecordId}`
4. Result type: Single line text.

**Verify:** Formula references existing PROD field `RecordId` (not RECORD_ID() unless preferred).

## 7. Post-creation validation

```powershell
cd tools/airtable
python pv2_dev_prod_gap_audit.py
```

**PASS criteria:**

1. `submission_assets_missing_in_prod` = **0** (or only NOT REQUIRED fields if intentionally deferred).
2. PROD Submission Assets field count = **97**.
3. Each missing field name exists **exactly once** on PROD.
4. Field types match DEV for all 17 fields.
5. Single/multiple select options match DEV lists above.
6. Self-link pair exists: Duplicate Match Records (All) ↔ From field: Duplicate Match Records (All).
7. Script 116 PROD dependency check = PASS (already PASS before this promotion).
8. Script 070b PROD dependency check = PASS (requires Storage Key).
9. No existing PROD field renamed or type-changed (spot-check RecordId, Canonical File URL, Asset Reuse Decision).

## 8. Known limitations

- Airtable field IDs will differ on PROD — scripts use field **names**, not IDs.
- Select option internal IDs will differ; option **names** must match.
- OMNI may not set checkbox icon/color — verify after creation.
- `Video Feedback Focus` is also missing on PROD Submissions and Video Feedback tables — separate promotion if needed.

## 9. Recommended next Cursor prompt

Mike completed PROD Submission Assets field promotion. Re-run pv2_dev_prod_gap_audit.py, confirm submission_assets_missing_in_prod=0 and 070b PROD PASS, then generate OMNI checklist for Homework Completions and Video Feedback missing fields (Linked Asset Reuse Decision, Video Feedback Focus).

---
*Generated 2026-07-11T12:30:38Z*