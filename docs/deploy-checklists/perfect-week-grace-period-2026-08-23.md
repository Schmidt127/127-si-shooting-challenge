# Deploy — Perfect Week 48-hour submission grace period (Airtable formulas)

**Date:** 2026-08-23  
**Repo contract:** `lib/was-email-contracts/perfect-week-submission-timing.js`  
**Default grace:** 48 hours (configurable via Config table)  
**Production paste:** Mike approval required — do not apply schema or formulas without sign-off.

## Product rule (summary)

Perfect Week qualifying submissions must have:

- `Count This Submission?` = true
- Activity Date inside official Sunday–Saturday week (Denver calendar keys)
- Activity Date not in the future
- `Submitted At` no more than **grace hours** after end of Activity Date (America/Denver)
- All existing Perfect Week Countable gates (shots > 0, Enrollment, Week, Activity Date present)

General shooting days (`Count This Submission?` only) remain unchanged.

## Step 1 — Config field (schema change — Mike approval)

**Table:** Config (`tblRB6sh77NxjS568`)  
**New field:** `Perfect Week Submission Grace Hours`  
- Type: Number (integer, precision 0)  
- Default on active Config row: **48**

**Submissions lookup (optional but recommended):**

**Table:** Submissions  
**New lookup:** `Perfect Week Grace Hours Lookup`  
- Lookup from Enrollment → Program Instance → Config → `Perfect Week Submission Grace Hours`  
- Or rollup from Program Instance if a single global Config link exists per PI

If lookup is blank, formulas fall back to **48**.

## Step 2 — Submissions formula fields

### A. `Perfect Week Submission Timing Status` (single select formula → text)

Auditable categories:

| Status | Meaning |
|--------|---------|
| On-Time | Submitted same Denver calendar day as Activity Date |
| Late Grace | After activity day but within grace deadline |
| Late Ineligible | Beyond grace deadline |
| Manual Approved | Coach override checkbox |
| Future Ineligible | Activity Date after today (Denver) |
| Missing Data | Missing Activity Date or Submitted At |

### B. `Perfect Week Submission Timing Eligible?` (formula number 0/1)

Replaces same-day-only gate inside `Perfect Week Countable Submission?`.

Logic (pseudocode):

```
graceHours = IF(Grace Hours Lookup, Grace Hours Lookup, 48)
activityKey = Activity Date Key (UTC calendar)
submittedAt = Submitted At (CREATED_TIME) OR gated test path for recCyFEPeATOVNlr9

IF Manual Approved → 1
IF activityKey blank OR submittedAt blank → 0
IF activityKey > TODAY Denver → 0
IF DATETIME_DIFF(submittedAt, activityEndDenver + graceHours hours) <= 0 → 1
ELSE → 0
```

Where `activityEndDenver` = start of next Denver calendar day after `activityKey`.

**Airtable formula sketch** (paste after field IDs confirmed):

```
IF(
  {Perfect Week Manual Approval?},
  1,
  IF(
    AND({Activity Date Key}, {Submitted At}),
    IF(
      {Activity Date Key} > DATETIME_FORMAT(TODAY(), "YYYY-MM-DD"),
      0,
      IF(
        DATETIME_DIFF(
          SET_TIMEZONE({Submitted At}, "America/Denver"),
          DATETIME_ADD(
            DATETIME_PARSE({Activity Date Key} & " 23:59", "YYYY-MM-DD HH:mm"),
            IF({Perfect Week Grace Hours Lookup}, {Perfect Week Grace Hours Lookup}, 48),
            "hours"
          ),
          "hours"
        ) <= 0,
        1,
        0
      )
    ),
    0
  )
)
```

> **Note:** Validate `DATETIME_PARSE` / `DATETIME_ADD` against live Airtable formula editor. Adjust to match 005/034 Denver patterns. Gated test path for `recCyFEPeATOVNlr9` must remain for fixture enrollment.

### C. Update `Perfect Week Countable Submission?`

Replace `Submitted Same Day? = 1` with `Perfect Week Submission Timing Eligible? = 1`.

Keep: Count This Submission?, Total Shots Counted > 0, Enrollment, Week, Activity Date.

### D. Optional — retain `Submitted Same Day?`

Keep for reporting; no longer the sole Perfect Week gate.

### E. `Perfect Week Manual Approval?` (checkbox)

Coach-only override for late submissions beyond grace. When checked, timing status = Manual Approved and countable for Perfect Week.

## Step 3 — Downstream (no script logic change expected)

| Layer | Action |
|-------|--------|
| **057** | Already reads `Perfect Week Countable Submission?` — recalculate after formula paste |
| **058 / 059** | No change — eligibility still from WAS `Perfect Week Eligible?` |
| **072** | GitHub v4.6 separates Shooting Days vs Perfect Week Qualifying Days in email |
| **074** | Hub payload includes `shootingDaysLogged` + `perfectWeekDaysLogged` |

## Step 4 — Verification (read-only)

Enrollment `rec93mAfo5jKqP3g5`, week `recT3EXo4Tz7BKFIb` (Aug 16–22, 2026):

After formula paste, expect **4** Perfect Week qualifying dates:

| Activity Date | Qualifying record(s) | Timing |
|---------------|----------------------|--------|
| 2026-08-19 | `rec8Qrt5dn0denguA` | Late grace |
| 2026-08-20 | `recaxgOnpULYSSvXs`, `recv8a0SieH75Zzgu` | Late grace |
| 2026-08-21 | `recRqZKYBsiy9ch1m`, `recfTrpgx3NvO8IRg`, `reciMAjPxI0ip8EeM` | On-time |
| 2026-08-22 | multiple | On-time |

General shooting days remain **7** distinct dates.

Run 057 on WAS `reczxTIpVI8ZJLex0` after formulas settle.

## Rollback

1. Restore `Perfect Week Countable Submission?` to require `Submitted Same Day? = 1`.
2. Remove or ignore new timing fields.
3. Re-run 057 on affected WAS rows.

## Do not

- Send email (074/079) during formula verification unless explicitly testing with Mike.
- Modify queue proof record `recoikFrli3m0xDRa`.
