# Airtable Formulas

Reference for **formula fields**, rollups, and lookups used in the shooting challenge base. Complex formulas get a named section; simple ones can stay inline in [field-map.md](../schema/current/field-map.md).

## Guidelines

- Prefer **rollups** from XP Events for totals; formulas for display-only logic.
- Document timezone assumptions for date/streak formulas.
- After changing a formula in Airtable, paste the final expression here and note the deploy date in `CHANGELOG.md`.

## Submissions — Activity Date Key (UTC calendar for date-only)

**Table:** Submissions  
**Field:** Activity Date Key (`fldLBZHH23uSm9qDs`)  
**Updated:** 2026-08-16 (PROD + DEV)

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
| 2026-08-16 | Submissions | Activity Date Key | UTC calendar date so midnight-UTC date-only values keep the entered day (not prior Denver day) |
| 2026-08-16 | Submissions | Submitted Same Day? | Activity Date side uses UTC to match Activity Date Key |

## Review Process

1. Draft formula in Cursor with sample values.
2. ChatGPT review for edge cases (blank attempts, paused enrollment).
3. Apply in Airtable test field first, then swap production field.
4. Run [audit scripts](../extension-scripts/audits/) if formula affects XP or streak display.
