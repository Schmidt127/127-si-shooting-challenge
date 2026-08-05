# Perfect Week gated test timestamp — Rollback

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| PROD base | `appn84sqPw03zEbTT` |
| Field updated | `Submissions.Submitted Same Day?` (`fldE7G8H1O7HPYuIi`) |

## Original formula (restore exactly)

Named form:

```airtable
IF(
  AND(
    {Submitted At},
    {Activity Date}
  ),
  IF(
    DATETIME_FORMAT(SET_TIMEZONE({Submitted At}, "America/Denver"), "YYYY-MM-DD") =
    DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD"),
    1,
    0
  ),
  0
)
```

Field-ID form (Meta API):

```airtable
IF(
  AND(
    {fld7JJ7neI0YYmB7i},
    {fldpkkSBsx8kQRZos}
  ),
  IF(
    DATETIME_FORMAT(SET_TIMEZONE({fld7JJ7neI0YYmB7i}, "America/Denver"), "YYYY-MM-DD") =
    DATETIME_FORMAT({fldpkkSBsx8kQRZos}, "YYYY-MM-DD"),
    1,
    0
  ),
  0
)
```

Evidence: `docs/testing/perfect-week/fixtures/_pw-test-path-formula.json` → `originalFormulaNamed`.

## New formula (current PROD — gated fixture path)

```airtable
IF(
  AND(
    {Perfect Week Test Record?},
    {Perfect Week Test Submitted At},
    FIND("recCyFEPeATOVNlr9", ARRAYJOIN({Enrollment Record ID Lookup})) > 0
  ),
  IF(
    AND(
      {Perfect Week Test Submitted At},
      {Activity Date}
    ),
    IF(
      DATETIME_FORMAT(SET_TIMEZONE({Perfect Week Test Submitted At}, "America/Denver"), "YYYY-MM-DD") =
      DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD"),
      1,
      0
    ),
    0
  ),
  IF(
    AND(
      {Submitted At},
      {Activity Date}
    ),
    IF(
      DATETIME_FORMAT(SET_TIMEZONE({Submitted At}, "America/Denver"), "YYYY-MM-DD") =
      DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD"),
      1,
      0
    ),
    0
  )
)
```

Supporting fields (test-only):

| Field | ID |
|-------|-----|
| Perfect Week Test Record? | `fld0xNqO0ryOe7uEY` |
| Perfect Week Test Submitted At | `fldr2msxUo1kPjROD` |
| Enrollment Record ID Lookup | `fldHH6GDDG9DixHBT` |

## Rollback steps

1. **Restore** `Submitted Same Day?` to the original formula above (Meta API or Airtable UI).
2. **Clear** both test fields on all fixture Submissions (CASE-01 and any other gated fixtures):
   - Uncheck `Perfect Week Test Record?`
   - Clear `Perfect Week Test Submitted At`
3. **Re-check controls:**
   - CASE-07 `recxbwkZpSJZ5eiqA` → Same Day 0, Countable 0
   - CASE-02 `recbr8gduRKmpiDkd` → Same Day 1, Countable 1; WAS Eligible 0
4. Confirm no normal athlete record changed Same Day / Countable / Eligible solely due to the formula restore.
5. **Optional (after all Perfect Week verification is finished):** delete the two test-only fields and the Enrollment RID lookup if unused elsewhere.
6. Do **not** change Automation 057 as part of this rollback.

## Script helper

```bash
# Re-apply gated formula (if needed after accidental restore)
node tools/testing/apply_pw_test_path_formula.mjs --apply-formula
```

Restoring the original formula is a Meta API PATCH of `fldE7G8H1O7HPYuIi` with `originalFormulaFieldIds` from `_pw-test-path-formula.json`.
