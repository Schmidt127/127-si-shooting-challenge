# Airtable Formulas

Reference for **formula fields**, rollups, and lookups used in the shooting challenge base. Complex formulas get a named section; simple ones can stay inline in [field-map.md](../schema/current/field-map.md).

## Guidelines

- Prefer **rollups** from XP Events for totals; formulas for display-only logic.
- Document timezone assumptions for date/streak formulas.
- After changing a formula in Airtable, paste the final expression here and note the deploy date in `CHANGELOG.md`.

## Submissions — Activity Date Key (UTC calendar for date-only)

**Table:** Submissions  
**Field:** Activity Date Key  
**Updated:** 2026-08-16 (documented); keep in sync with Automations 005/010 date-key helpers

Date-only Activity Dates are often stored as midnight UTC (`YYYY-MM-DDT00:00:00.000Z`).
Formatting that value in `America/Denver` shifts to the **previous** Mountain calendar day.
Use **UTC** so the entered calendar date is retained.

```
IF(
  {Activity Date},
  DATETIME_FORMAT(SET_TIMEZONE({Activity Date}, "UTC"), "YYYY-MM-DD"),
  BLANK()
)
```

**Submitted Same Day?** compares Denver `Submitted At` to the same UTC Activity Date key.

**Perfect Week grace period (2026-08-23):** `Perfect Week Submission Timing Eligible?` allows
upload up to **N hours** after end of Activity Date (America/Denver). N defaults to 48 from
Config `Perfect Week Submission Grace Hours`. Repository mirror:
`lib/was-email-contracts/perfect-week-submission-timing.js`. Deploy plan:
`docs/deploy-checklists/perfect-week-grace-period-2026-08-23.md`.

## Weekly Athlete Summary — Perfect Week Video Requirement Met?

**Table:** Weekly Athlete Summary  
**Field:** Perfect Week Video Requirement Met?  
**Updated:** 2026-08-27 (SC-034 — Config field verified in Production)

**Config source (verified Production `appn84sqPw03zEbTT`):**

| Item | Value |
|------|-------|
| Config table field | **`Perfect Week Video Minimum`** |
| Field id | `fldqRxjWGXcbUZUg3` |
| Type | number (precision 0) |
| Active rows | value **3** on each school-year Config row |

**WAS lookup (Production):** **`Config: Perfect Week Video Minimum`** from Enrollment → `Config - Lnk` → `Perfect Week Video Minimum`.

**Previous production formula (hardcoded — retired):**

```
IF({Perfect Week Video Count} >= 3, 1, 0)
```

**Current production formula (Config lookup — live 2026-08-27):**

```
IF({Perfect Week Video Count} >= {Config: Perfect Week Video Minimum}, 1, 0)
```

Contract mirror: `lib/config-selection/perfect-week-video-minimum.js`.  
Deploy: `docs/deploy-checklists/057-v2.1-perfect-week-config-video-minimum.md`.

## Submissions — Duplicate Key (date + hour for 007)

**Table:** Submissions  
**Field:** Duplicate Key  
**Updated:** 2026-08-25 (repo); paste Production per
[`docs/deploy-checklists/2026-08-25-duplicate-key-activity-date-time.md`](../../docs/deploy-checklists/2026-08-25-duplicate-key-activity-date-time.md)

**Policy:** `Activity Date` stays **date-only**. `Activity Date - Time` (hourly single-select) is
used **only** for duplicate detection. Automation **007** remains key-driven (reads this formula;
does not hard-code field lists). Downstream XP / weeks / streaks / summaries / Perfect Week /
homework / video / email / website continue to use `Activity Date` as a calendar day.

**Key shape:**

```text
Enrollment|YYYY-MM-DD|Activity Date - Time|Submission Stat Mode|stats
```

Blank or legacy time → stable fallback `NO_TIME` so older rows still participate.

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

Offline mirror: `buildSubmissionDuplicateKey` in
`airtable/automations/shooting-challenge/lib/v2-engine-contracts.js`.

## Streak (Example Template)

```
IF(
  {Last Submission Date},
  IF(
    DATETIME_DIFF(TODAY(), {Last Submission Date}, 'days') <= 1,
    {Current Streak},
    0
  ),
  0
)
```

Adjust field names to match [field-map.md](../schema/current/field-map.md).

## Level from Total XP (Example Template)

Use lookup from Levels table or nested IF by threshold. Document thresholds:

| Level | Min XP |
|-------|--------|
| 1 | 0 |
| 2 | 100 |
| *(add)* | |

## Submission Percentage

```
IF({Attempts}, {Makes} / {Attempts}, BLANK())
```

## Formula Change Log

| Date | Table | Field | Notes |
|------|-------|-------|-------|
| 2026-08-25 | Submissions | Duplicate Key | Include `Activity Date - Time` after date; blank → `NO_TIME`; 007 unchanged |
| 2026-08-16 | Submissions | Activity Date Key | UTC calendar date so midnight-UTC date-only values keep the entered day (not prior Denver day) |
| 2026-08-27 | Weekly Athlete Summary | Perfect Week Video Requirement Met? | Config lookup live — `Config: Perfect Week Video Minimum`; field renamed from typo; **057 repaste pending** |
| 2026-08-16 | Submissions | Submitted Same Day? | Activity Date side uses UTC to match Activity Date Key |

## Review Process

1. Draft formula in Cursor with sample values.
2. ChatGPT review for edge cases (blank attempts, paused enrollment).
3. Apply in Airtable test field first, then swap production field.
4. Run [audit scripts](../extension-scripts/audits/) if formula affects XP or streak display.
