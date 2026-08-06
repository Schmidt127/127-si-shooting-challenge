# HC field dependency audit — Weekly Athlete Summary vs Link

**Date:** 2026-08-05  
**Table:** Homework Completions (`tblv58ppTFDBXb3nv`)  
**Base:** PROD `appn84sqPw03zEbTT`

## Exact fields

| Name | Field ID | Type | Notes |
|------|----------|------|-------|
| Weekly Athlete Summary | `fldhpGNYnu2l3bpUP` | singleLineText | Empty on CASE-01 HCs |
| Weekly Athlete Summary Link | `fldkoEbVnCugcMCCi` | multipleRecordLinks | → WAS `tbl9520d72adxlAKQ`; prefersSingleRecordLink true; inverse `fld7IEpY1KsacJTM6` |

## Classification

| Field | Status |
|-------|--------|
| Link | **Actively used** |
| Text | **Unused / legacy — eligible for later cleanup** (do not delete/rename/convert in this package) |

## Active Link consumers

- Automation **020** — `CONFIG.homework.weeklySummaryLink = "Weekly Athlete Summary Link"`
- Automation **065** — `CONFIG.homework.weeklySummary = "Weekly Athlete Summary Link"`
- Automation **057** — reads WAS `Homework Completions Link` (inverse), not HC text
- WAS rollups Assigned/Satisfactory via Completions Link
- `backfill-homework-completion-was-links.js`
- `audit-field-coverage-report.js` (Link in coverage list)
- Homework pipeline audits / XP repair scripts (Link field name)

## Text field consumers

- No automation writer found
- No Make blueprint reference found
- No Fillout mapping reference found in repo for this HC text field
- Documented risk only: `docs/next-wave/data-model/RELATIONSHIP-MAP.md` REL-05

## Do not

- Treat empty text as missing WAS relationship
- Delete, rename, convert, or repurpose either field in this package
