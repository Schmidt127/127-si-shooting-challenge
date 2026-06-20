# Airtable Formulas

Reference for **formula fields**, rollups, and lookups used in the shooting challenge base. Complex formulas get a named section; simple ones can stay inline in [field-map.md](../schema/current/field-map.md).

## Guidelines

- Prefer **rollups** from XP Events for totals; formulas for display-only logic.
- Document timezone assumptions for date/streak formulas.
- After changing a formula in Airtable, paste the final expression here and note the deploy date in `CHANGELOG.md`.

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
| | | | |

## Review Process

1. Draft formula in Cursor with sample values.
2. ChatGPT review for edge cases (blank attempts, paused enrollment).
3. Apply in Airtable test field first, then swap production field.
4. Run [audit scripts](../extension-scripts/audits/) if formula affects XP or streak display.
