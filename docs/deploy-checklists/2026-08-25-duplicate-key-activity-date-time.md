# Production paste — Duplicate Key + 115 (Activity Date - Time)

**Date:** 2026-08-25  
**Base:** Production `appn84sqPw03zEbTT`  
**Repo:** `127-si-shooting-challenge`  
**Authority:** Approved duplicate-detection correction (Activity Date date-only; time only for 007)

## Goals

1. Keep `Submissions.Activity Date` date-only.
2. Include `Submissions.Activity Date - Time` in `Duplicate Key` (after the date segment).
3. Leave blank/legacy time as `NO_TIME`.
4. Stop Automation **115** from presetting `Duplicate Review Status = Count It` so **007** can review all eligible submissions.
5. Do **not** change Automation **007** structure (still reads `Duplicate Key` only).

## Preflight (read-only)

- [ ] Confirm Production fields:
  - `Activity Date` type = **date** (no time)
  - `Activity Date - Time` type = **singleSelect** (hourly `12:00 am` … `11:00 pm`)
- [ ] Confirm Fillout daily form maps both fields (Mike UI) before reopening intake.
- [ ] GitHub has **115 v2.2** paste file: [`115-v2.2-PASTE.txt`](./115-v2.2-PASTE.txt) (no Count It write on daily create).

## 1. Paste Duplicate Key formula

**Table:** Submissions → field **Duplicate Key**

Paste exactly (field names):

```
IF(
  AND(
    {Enrollment} & "",
    {Activity Date},
    {Submission Stat Mode} & ""
  ),
  {Enrollment} & "|" &
  DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD") & "|" &
  IF({Activity Date - Time} & "", {Activity Date - Time}, "NO_TIME") & "|" &
  {Submission Stat Mode} & "|" &
  IF(
    {Submission Stat Mode} = "Detailed Shooting",
    {2PT Attempted} & "|" &
    {2PT Made} & "|" &
    {3PT Attempted} & "|" &
    {3PT Made} & "|" &
    {FT Attempted} & "|" &
    {FT Made},
    {Shot Total} & ""
  ),
  BLANK()
)
```

**Expected key shape:**

```text
Enrollment|YYYY-MM-DD|Activity Date - Time|Submission Stat Mode|stats
```

Spot-check:

| Case | Expect |
|------|--------|
| Row with time `3:00 pm` | Segment `3:00 pm` after date |
| Row with blank time | Segment `NO_TIME` |
| Same enrollment + date + stats + **different** times | Different keys |
| Same enrollment + date + stats + **same** time (or both `NO_TIME`) | Same key |

Repo mirror: [`airtable/formulas/README.md`](../../airtable/formulas/README.md).

## 2. Paste Automation 115 (v2.2)

1. Open Production Automations → **115 - Engineering Test Framework - Run Testing Scenario Daily Submission**.
2. Paste the full script from  
   [`docs/deploy-checklists/115-v2.2-PASTE.txt`](./115-v2.2-PASTE.txt)  
   (already production-ready: no GitHub header; starts at the version docblock).
3. Confirm version string in run log / script = **v2.2**.
4. Daily create must **omit** `Duplicate Review Status` (leave empty for 007).
5. Source of truth (with GitHub header):  
   `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js`.

## 3. Confirm Automation 007 (no script change required)

- [ ] Trigger still: `Duplicate Key` not empty **and** `Duplicate Review Status` is empty.
- [ ] Script still reads formula `Duplicate Key` only (GitHub `007-…js` v2.0).

## 4. Controlled Schmidt proof

1. Create two Fillout-shaped / 115 daily Submissions: same Enrollment, same Activity Date, same Shot Total, **different** Activity Date - Time → both should get `Count It` after 007 (different keys).
2. Create a third identical to one of them (same time + same stats) → `Needs Review`.
3. Confirm Week / XP / streak / WAS still key off **Activity Date** calendar day only (no time).

## Rollback

1. Restore prior Duplicate Key formula (date + mode + stats, no time segment) from schema snapshot / prior CHANGELOG note.
2. Optionally re-paste 115 v2.1 if Count It preset must return temporarily.

## Out of scope

- No new duplicate-checker automation.
- No changes to Activity Date type.
- No website / XP / Perfect Week date-key logic changes.
