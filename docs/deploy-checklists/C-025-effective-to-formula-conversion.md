# C-025 — Convert Effective Recording fields to Formula (DEV UI)

**Generated:** 2026-07-14 06:30 MDT  
**Base:** `appTetnuCZlCZdTCT` (DEV only)  
**Table:** `Zoom Meetings` (`tblWcSHEm8vNNIxyB`)  
**Sample meeting:** `rech5YbJNUzBRY6LQ`  
**Machine manifest:** `tools/airtable/_preview/c025_effective_conversion_manifest.json`

## Status

- **Phase 1 (manifest):** COMPLETE
- **Phase 2 (UI convert):** COMPLETE (Mike, 2026-07-14)
- **Phase 3 (verify + commit):** COMPLETE — see `C-025-effective-postconversion-result.md`

**Postconversion note:** Airtable forced checkbox Effectives to formula **number** (1/0). Select Effectives are formula **singleLineText**. Field IDs unchanged; ZA lookups intact.

## Precedence (every formula)

1. Meeting Override
2. Program Config
3. Global Config
4. Safe fallback

## Preconversion checks (Cursor)

| Check | Result |
|---|---|
| All 10 Effectives found | `True` |
| All still editable (not formula yet) | `True` |
| Draft helpers present with paste formulas | `True` |
| Sample draft == sample Effective (truthy) | PASS (10/10) |
| Select/text drafts fixed with LEN/TRIM + ARRAYJOIN | installed on draft helpers only |

---

## Phase 1 — Conversion table

| # | Effective field | Field ID | Current type | Draft helper | Expected output | Fallback | Sample (`rech5YbJNUzBRY6LQ`) |
|---:|---|---|---|---|---|---|---|
| 1 | `Effective Recording XP Percentage` | `fldgBdBIDvjMELY3o` | `number` | `Effective Recording XP Percentage (Config formula draft)` | Number (integer) | `50` | editable=`50` · draft=`50` |
| 2 | `Effective Recording Makeup Window Days` | `fldfDKHOn54ZbH7XL` | `number` | `Effective Recording Makeup Window Days (Config formula draft)` | Number (integer) | `7` | editable=`7` · draft=`7` |
| 3 | `Effective Recording Deadline Mode` | `fldnwzUITHTzEeR5n` | `singleSelect` | `Effective Recording Deadline Mode (Config formula draft)` | Single line text (or Single select if offered with same choices) | `Later of Both` | editable=`Later of Both` · draft=`Later of Both` |
| 4 | `Effective Recording Approval Email Timing` | `fldT2SG7GRc7sT32u` | `singleSelect` | `Effective Recording Approval Email Timing (Config formula draft)` | Single line text (or Single select if offered with same choices) | `On Satisfactory` | editable=`On Satisfactory` · draft=`On Satisfactory` |
| 5 | `Effective Recording Approval Email Template Key` | `fldQtvxkRPGCJ7pq8` | `singleLineText` | `Effective Recording Approval Email Template Key (Config formula draft)` | Single line text | `` | editable=`ZOOM_RECORDING_APPROVED` · draft=`ZOOM_RECORDING_APPROVED` |
| 6 | `Effective Recording Counts for Level Gate?` | `fldswwnnpWpiKSIL4` | `checkbox` | `Effective Recording Counts for Level Gate? (Config formula draft)` | Checkbox (or Number 1/0 — accept either if Airtable offers only number) | `True` | editable=`True` · draft=`1` |
| 7 | `Effective Recording Counts for Perfect Week?` | `fldEfs9Xk4cIm7sqA` | `checkbox` | `Effective Recording Counts for Perfect Week? (Config formula draft)` | Checkbox (or Number 1/0 — accept either if Airtable offers only number) | `True` | editable=`True` · draft=`1` |
| 8 | `Effective Recording Quiz Requires Coach Approval?` | `fldkKRtkzO4AkNyED` | `checkbox` | `Effective Recording Quiz Requires Coach Approval? (Config formula draft)` | Checkbox (or Number 1/0 — accept either if Airtable offers only number) | `True` | editable=`True` · draft=`1` |
| 9 | `Effective Recording Makeup Enabled?` | `fldppA7JHEbYNu3bR` | `checkbox` | `Effective Recording Makeup Enabled? (Config formula draft)` | Checkbox (or Number 1/0 — accept either if Airtable offers only number) | `True` | editable=`True` · draft=`1` |
| 10 | `Effective Recording Approval Email Enabled?` | `fldqPzKXweQISK4ZR` | `checkbox` | `Effective Recording Approval Email Enabled? (Config formula draft)` | Checkbox (or Number 1/0 — accept either if Airtable offers only number) | `False` | editable=`True` · draft=`1` |

### Dependencies + formulas (paste exactly)

#### 1. `Effective Recording XP Percentage`

- **Field ID (must stay):** `fldgBdBIDvjMELY3o`
- **Draft helper:** `Effective Recording XP Percentage (Config formula draft)` (`fldF4dtlJuULJg8zE`)
- **Depends on:** `Recording XP Percentage — Meeting Override`, `Program Config: Recording XP %`, `Global Config: Recording XP %`
- **Fallback:** `50`
- **Formatting: Integer / 0 decimal places. Leave as Number output.**

```airtable
IF(
  {Recording XP Percentage — Meeting Override} != BLANK(),
  {Recording XP Percentage — Meeting Override},
  IF(
    {Program Config: Recording XP %} != BLANK(),
    {Program Config: Recording XP %},
    IF(
      {Global Config: Recording XP %} != BLANK(),
      {Global Config: Recording XP %},
      50
    )
  )
)
```

#### 2. `Effective Recording Makeup Window Days`

- **Field ID (must stay):** `fldfDKHOn54ZbH7XL`
- **Draft helper:** `Effective Recording Makeup Window Days (Config formula draft)` (`fldLdje6wgwiPvZOv`)
- **Depends on:** `Makeup Window Days — Meeting Override`, `Program Config: Makeup Window Days`, `Global Config: Makeup Window Days`
- **Fallback:** `7`
- **Formatting: Integer / 0 decimal places. Leave as Number output.**

```airtable
IF(
  {Makeup Window Days — Meeting Override} != BLANK(),
  {Makeup Window Days — Meeting Override},
  IF(
    {Program Config: Makeup Window Days} != BLANK(),
    {Program Config: Makeup Window Days},
    IF(
      {Global Config: Makeup Window Days} != BLANK(),
      {Global Config: Makeup Window Days},
      7
    )
  )
)
```

#### 3. `Effective Recording Deadline Mode`

- **Field ID (must stay):** `fldnwzUITHTzEeR5n`
- **Draft helper:** `Effective Recording Deadline Mode (Config formula draft)` (`fldoda1RP46OrL5M2`)
- **Depends on:** `Deadline Mode — Meeting Override`, `Program Config: Deadline Mode`, `Global Config: Deadline Mode`
- **Fallback:** `Later of Both`
- **Formatting: leave as **Single line text** (formula cannot stay Single select). Choices remain enforceable via Override field.**

```airtable
IF(
  LEN(TRIM({Deadline Mode — Meeting Override} & "")) > 0,
  {Deadline Mode — Meeting Override} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({Program Config: Deadline Mode}) & "")) > 0,
    ARRAYJOIN({Program Config: Deadline Mode}),
    IF(
      LEN(TRIM(ARRAYJOIN({Global Config: Deadline Mode}) & "")) > 0,
      ARRAYJOIN({Global Config: Deadline Mode}),
      "Later of Both"
    )
  )
)
```

#### 4. `Effective Recording Approval Email Timing`

- **Field ID (must stay):** `fldT2SG7GRc7sT32u`
- **Draft helper:** `Effective Recording Approval Email Timing (Config formula draft)` (`fldaQ6UUYpfYJTyhV`)
- **Depends on:** `Approval Email Timing — Meeting Override`, `Program Config: Approval Email Timing`, `Global Config: Approval Email Timing`
- **Fallback:** `On Satisfactory`
- **Formatting: leave as **Single line text** (formula cannot stay Single select). Choices remain enforceable via Override field.**

```airtable
IF(
  LEN(TRIM({Approval Email Timing — Meeting Override} & "")) > 0,
  {Approval Email Timing — Meeting Override} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({Program Config: Approval Email Timing}) & "")) > 0,
    ARRAYJOIN({Program Config: Approval Email Timing}),
    IF(
      LEN(TRIM(ARRAYJOIN({Global Config: Approval Email Timing}) & "")) > 0,
      ARRAYJOIN({Global Config: Approval Email Timing}),
      "On Satisfactory"
    )
  )
)
```

#### 5. `Effective Recording Approval Email Template Key`

- **Field ID (must stay):** `fldQtvxkRPGCJ7pq8`
- **Draft helper:** `Effective Recording Approval Email Template Key (Config formula draft)` (`fldeQAQg531QgEsXf`)
- **Depends on:** `Approval Email Template Key — Meeting Override`, `Program Config: Approval Email Template Key`, `Global Config: Approval Email Template Key`
- **Fallback:** ``
- **Formatting: Single line text.**

```airtable
IF(
  LEN(TRIM({Approval Email Template Key — Meeting Override} & "")) > 0,
  {Approval Email Template Key — Meeting Override} & "",
  IF(
    LEN(TRIM(ARRAYJOIN({Program Config: Approval Email Template Key}) & "")) > 0,
    ARRAYJOIN({Program Config: Approval Email Template Key}),
    IF(
      LEN(TRIM(ARRAYJOIN({Global Config: Approval Email Template Key}) & "")) > 0,
      ARRAYJOIN({Global Config: Approval Email Template Key}),
      BLANK()
    )
  )
)
```

#### 6. `Effective Recording Counts for Level Gate?`

- **Field ID (must stay):** `fldswwnnpWpiKSIL4`
- **Draft helper:** `Effective Recording Counts for Level Gate? (Config formula draft)` (`fldYpVOp0uFm4CtwK`)
- **Depends on:** `Full Gate Credit — Meeting Override`, `Program Config: Full Gate Credit`, `Global Config: Full Gate Credit`
- **Fallback:** `True`
- **Formatting: prefer **Checkbox**. If Airtable only offers Number, accept Number (1/0) — ZA lookups already tolerate this.**

```airtable
IF(
  {Full Gate Credit — Meeting Override} = "Yes", TRUE(),
  IF(
    {Full Gate Credit — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Full Gate Credit} = "Yes", TRUE(),
      IF(
        {Program Config: Full Gate Credit} = "No", FALSE(),
        IF(
          {Global Config: Full Gate Credit} = "Yes", TRUE(),
          IF(
            {Global Config: Full Gate Credit} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)
```

#### 7. `Effective Recording Counts for Perfect Week?`

- **Field ID (must stay):** `fldEfs9Xk4cIm7sqA`
- **Draft helper:** `Effective Recording Counts for Perfect Week? (Config formula draft)` (`fldu0WoqcTKfqO2tt`)
- **Depends on:** `Perfect Week Credit — Meeting Override`, `Program Config: Perfect Week Credit`, `Global Config: Perfect Week Credit`
- **Fallback:** `True`
- **Formatting: prefer **Checkbox**. If Airtable only offers Number, accept Number (1/0) — ZA lookups already tolerate this.**

```airtable
IF(
  {Perfect Week Credit — Meeting Override} = "Yes", TRUE(),
  IF(
    {Perfect Week Credit — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Perfect Week Credit} = "Yes", TRUE(),
      IF(
        {Program Config: Perfect Week Credit} = "No", FALSE(),
        IF(
          {Global Config: Perfect Week Credit} = "Yes", TRUE(),
          IF(
            {Global Config: Perfect Week Credit} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)
```

#### 8. `Effective Recording Quiz Requires Coach Approval?`

- **Field ID (must stay):** `fldkKRtkzO4AkNyED`
- **Draft helper:** `Effective Recording Quiz Requires Coach Approval? (Config formula draft)` (`fldOZ4BveXclH1Io3`)
- **Depends on:** `Coach Approval Required — Meeting Override`, `Program Config: Coach Approval Required`, `Global Config: Coach Approval Required`
- **Fallback:** `True`
- **Formatting: prefer **Checkbox**. If Airtable only offers Number, accept Number (1/0) — ZA lookups already tolerate this.**

```airtable
IF(
  {Coach Approval Required — Meeting Override} = "Yes", TRUE(),
  IF(
    {Coach Approval Required — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Coach Approval Required} = "Yes", TRUE(),
      IF(
        {Program Config: Coach Approval Required} = "No", FALSE(),
        IF(
          {Global Config: Coach Approval Required} = "Yes", TRUE(),
          IF(
            {Global Config: Coach Approval Required} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)
```

#### 9. `Effective Recording Makeup Enabled?`

- **Field ID (must stay):** `fldppA7JHEbYNu3bR`
- **Draft helper:** `Effective Recording Makeup Enabled? (Config formula draft)` (`fldZQSP01wtcKT2EN`)
- **Depends on:** `Makeup Enabled — Meeting Override`, `Program Config: Makeup Enabled`, `Global Config: Makeup Enabled`
- **Fallback:** `True`
- **Formatting: prefer **Checkbox**. If Airtable only offers Number, accept Number (1/0) — ZA lookups already tolerate this.**

```airtable
IF(
  {Makeup Enabled — Meeting Override} = "Yes", TRUE(),
  IF(
    {Makeup Enabled — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Makeup Enabled} = "Yes", TRUE(),
      IF(
        {Program Config: Makeup Enabled} = "No", FALSE(),
        IF(
          {Global Config: Makeup Enabled} = "Yes", TRUE(),
          IF(
            {Global Config: Makeup Enabled} = "No", FALSE(),
            TRUE()
          )
        )
      )
    )
  )
)
```

#### 10. `Effective Recording Approval Email Enabled?`

- **Field ID (must stay):** `fldqPzKXweQISK4ZR`
- **Draft helper:** `Effective Recording Approval Email Enabled? (Config formula draft)` (`fldo5Xdcjj41CrAPD`)
- **Depends on:** `Approval Email Enabled — Meeting Override`, `Program Config: Approval Email Enabled`, `Global Config: Approval Email Enabled`
- **Fallback:** `False`
- **Formatting: prefer **Checkbox**. If Airtable only offers Number, accept Number (1/0) — ZA lookups already tolerate this.**

```airtable
IF(
  {Approval Email Enabled — Meeting Override} = "Yes", TRUE(),
  IF(
    {Approval Email Enabled — Meeting Override} = "No", FALSE(),
    IF(
      {Program Config: Approval Email Enabled} = "Yes", TRUE(),
      IF(
        {Program Config: Approval Email Enabled} = "No", FALSE(),
        IF(
          {Global Config: Approval Email Enabled} = "Yes", TRUE(),
          IF(
            {Global Config: Approval Email Enabled} = "No", FALSE(),
            FALSE()
          )
        )
      )
    )
  )
)
```

---

## Phase 2 — Mike UI steps (one field at a time)

### Global steps (every field)

1. Open **DEV** base `appTetnuCZlCZdTCT` (not PROD).
2. Open table **Zoom Meetings**.
3. Find the **existing** Effective field (do **not** create a replacement).
4. Click the field header → **Edit field**.
5. Change **Field type** to **Formula**.
6. Paste the exact formula from the matching section above (or copy from the draft helper’s formula editor).
7. Set output formatting per the note under that field.
8. **Save**.
9. On meeting `rech5YbJNUzBRY6LQ`, confirm the value matches the Sample draft column.
10. Spot-check that Zoom Attendance lookups to this field still populate (open any ZA linked to that meeting).
11. Only then proceed to the next field.

### Recommended order

1. `Effective Recording XP Percentage` (`fldgBdBIDvjMELY3o`)
2. `Effective Recording Makeup Window Days` (`fldfDKHOn54ZbH7XL`)
3. `Effective Recording Deadline Mode` (`fldnwzUITHTzEeR5n`)
4. `Effective Recording Approval Email Timing` (`fldT2SG7GRc7sT32u`)
5. `Effective Recording Approval Email Template Key` (`fldQtvxkRPGCJ7pq8`)
6. `Effective Recording Counts for Level Gate?` (`fldswwnnpWpiKSIL4`)
7. `Effective Recording Counts for Perfect Week?` (`fldEfs9Xk4cIm7sqA`)
8. `Effective Recording Quiz Requires Coach Approval?` (`fldkKRtkzO4AkNyED`)
9. `Effective Recording Makeup Enabled?` (`fldppA7JHEbYNu3bR`)
10. `Effective Recording Approval Email Enabled?` (`fldqPzKXweQISK4ZR`)

### Stop immediately if

- Airtable warns existing values will be lost **and** Override copies are not verified
- Formula shows `#ERROR!`
- Value is blank unexpectedly vs draft helper
- Field ID changes (only verifiable after Cursor schema scan — tell Cursor before continuing)
- A dependent field / ZA lookup breaks
- Result differs from the draft helper on the same meeting

### After all 10

Reply in Cursor: **Effectives converted** (list any UI formatting choices Airtable forced, e.g. checkbox→number). Then Cursor runs Phase 3 (schema scan, full precedence matrix, Schmidt 4/4, docs, commit, push).

---

## Temporary / legacy fields (do **not** delete yet)

- All `Effective * (Config formula draft)` helpers
- `* — legacy rollup` / `* — pre-YN` renamed Program/Global fields
- `C025 Checkbox Rollup Probe`
- Diagnostic probes created during select/text draft repair: `C025 Select Probe *`

## Out of scope this step

PROD · 117a–f · C-027 · XP Events · email · Make · Vercel · AWS · cleanup

