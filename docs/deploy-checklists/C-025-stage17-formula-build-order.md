# C-025 Stage 17 — Formula build order

**Date written:** 2026-07-18  
**Branch:** `feature/c025-stage17-zoom-attendance` @ `2db98a0`  
**Authority:** [C-025-stage17-prod-schema-manifest.json](./C-025-stage17-prod-schema-manifest.json)  
**Related:** [C-025-stage17-lookup-map.md](./C-025-stage17-lookup-map.md)  
**Mode:** Documentation only — no Airtable writes from this doc  
**Stage 17 status:** **COMPLETE** (2026-07-20) — **117 / 057 / 042 ON** in PROD; **101** unchanged; do **not** install **115**

Formulas below use **field names** (not DEV field IDs). After creating PROD fields, paste into Airtable so references resolve to **PROD** field IDs automatically.

---

## Circular dependency check

| Risk | Finding |
|------|---------|
| ZA `Preconflict Pair Tag` ↔ ZM `Approved Preconflict Pair Tags` ↔ ZA `Meeting Approved Preconflict Pair Tags` | **Not circular if ordered:** create ZA `Preconflict Pair Tag` first (may be blank until RID lookups exist), then ZM rollup, then ZA lookup, then `Zoom Credit Conflict?`. |
| `Zoom Credit Approved?` ↔ `Zoom Credit Conflict?` | Conflict does **not** read Approved. Approved reads Pre-Approved + Conflict. **Safe.** |
| `Zoom XP Amount` ↔ `Zoom XP Percentage` | Amount reads Percentage; Percentage does **not** read Amount. **Safe.** |
| ZM Effective ↔ Config lookups | Effective formulas read lookups/overrides only — no cycle. |
| ZM `Calculated Recording Quiz Deadline` ↔ ZA deadline lookup | One-way: ZM formula first, then ZA lookup. **Safe.** |

**Formulas that reference fields not yet created:** every ZA credit formula depends on lookups that do not exist yet in PROD (per remaining-work status). Create lookups (and ZM Effective formulas) **before** ZA credit formulas.

---

## Override precedence (verified from DEV Effective formulas)

For Yes/No Effective flags and numeric/text Effective values:

1. **Meeting override** (if set / non-blank)
2. **Program Config** (via `Config (Program Scope)` lookup/rollup)
3. **Global Config** (via `Config (Global Scope)` lookup/rollup)
4. **Blank / default** (formula-specific — see each field)

Checkbox Config values are exposed as **YN text** (`"Yes"` / `"No"`) so an unchecked linked Config row is distinguishable from a missing link (blank lookup).

---

## A. Config YN companions (claimed complete — verify)

Pattern for all five:

```airtable
IF({Recording Makeup Enabled?}, "Yes", "No")
```

| Field name | Parent checkbox | Result type |
|------------|-----------------|-------------|
| `Recording Makeup Enabled YN` | `Recording Makeup Enabled?` | text Yes/No |
| `Recording Quiz Requires Coach Approval YN` | `Recording Quiz Requires Coach Approval?` | text Yes/No |
| `Recording Gives Full Zoom Gate Credit YN` | `Recording Gives Full Zoom Gate Credit?` | text Yes/No |
| `Recording Makeup Counts for Perfect Week YN` | `Recording Makeup Counts for Perfect Week?` | text Yes/No |
| `Recording Approval Email Enabled YN` | `Recording Approval Email Enabled?` | text Yes/No |

**Note:** There is **no** YN companion for `Recording Path Enabled?` in the manifest (Config-only master switch; no ZM Effective in this slice).

---

## B. Zoom Meetings helper prerequisites (verify-or-create; not all in manifest)

### B1. `RecordId` (Zoom Meetings)

| Item | Value |
|------|--------|
| Exact DEV formula | `RECORD_ID()` |
| Field-name version | `RECORD_ID()` |
| Dependencies | none |
| Expected result | Meeting record id string |
| Blank-safe | Always populated on saved records |
| Automation-critical | Yes (via ZA `Zoom Meeting RID`) |
| Status | **Unknown and needs verification** — not a manifest create item |

### B2. `Record Id` (Enrollments)

| Item | Value |
|------|--------|
| Exact DEV formula | `RECORD_ID()` |
| Dependencies | none |
| Status | Expected already present in PROD live path — **verify** |

### B3. `Week End Date` (Zoom Meetings) — Lookup, not formula

| Item | Value |
|------|--------|
| Type | Lookup |
| Link | `Week` |
| Source | Weeks → `End Date` |
| Needed by | `Calculated Recording Quiz Deadline` |
| Status | **Unknown and needs verification** — not a manifest create item |

### B4. `Attendance Method` (Zoom Meetings) — Single select

| Item | Value |
|------|--------|
| Referenced by | ZM `Calculated Recording Quiz Deadline` (`!= "Recording Quiz"` → blank) |
| Status | **Unknown and needs verification** — legacy per config-linkage notes, but **live DEV deadline formula still references it** |

---

## C. Zoom Meetings Effective formulas (remaining — create after Config lookups/overrides)

Create order: any order among Effective\* except deadline last among this section. Recommended numeric order = manifest `11006`–`11015`, then `11003` deadline.

### C1. `Effective Recording Approval Email Enabled?` (order 11006)

**Result type (manifest):** number (TRUE/FALSE)  
**Automation-critical:** No  
**Override precedence:** Meeting → Program → Global → default **`FALSE()`**

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

### C2. `Effective Recording Approval Email Template Key` (order 11007)

**Result type:** singleLineText  
**Default:** `BLANK()`

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

### C3. `Effective Recording Approval Email Timing` (order 11008)

**Result type:** singleLineText  
**Default:** `"On Satisfactory"`

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

### C4. `Effective Recording Counts for Level Gate?` (order 11009)

**Default:** `TRUE()`  
**Override fields:** `Full Gate Credit — Meeting Override` / Program+Global `Full Gate Credit`

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

### C5. `Effective Recording Counts for Perfect Week?` (order 11010) — **automation-critical**

**Default:** `TRUE()`

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

### C6. `Effective Recording Deadline Mode` (order 11011)

**Default:** `"Later of Both"`

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

### C7. `Effective Recording Makeup Enabled?` (order 11012)

**Default:** `TRUE()`

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

### C8. `Effective Recording Makeup Window Days` (order 11013)

**Default:** `7`

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

### C9. `Effective Recording Quiz Requires Coach Approval?` (order 11014)

**Default:** `TRUE()`

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

### C10. `Effective Recording XP Percentage` (order 11015)

**Default:** `50`  
**Expected with live base 60:** recording XP = `FLOOR(60 * 50 / 100)` = **30** (on ZA amount formula)

**PROD fix (2026-07-20):** Use Program Config XP % **only when** `Config (Program Scope)` is populated; otherwise fall back to Global Config (then 50). Do not prefer Program Config solely because the Program Config rollup cell is non-blank. Evidence: [117 PROD verification](./C-025-stage17-prod-117-verification-2026-07-20.md).

```airtable
IF(
  {Recording XP Percentage — Meeting Override} != BLANK(),
  {Recording XP Percentage — Meeting Override},
  IF(
    AND(
      {Config (Program Scope)} != BLANK(),
      {Program Config: Recording XP %} != BLANK()
    ),
    {Program Config: Recording XP %},
    IF(
      {Global Config: Recording XP %} != BLANK(),
      {Global Config: Recording XP %},
      50
    )
  )
)
```

### C11. `Calculated Recording Quiz Deadline` (order 11003) — **create after C6 + C8 + Week End Date + Recording Available At**

**Result type:** date  
**Automation-critical:** No (feeds ZA lookup + view marker)  
**Blank-safe:** Blank if `Recording Available At` blank **or** ZM `Attendance Method` ≠ `"Recording Quiz"`  
**Dependencies:** `Recording Available At`, `Attendance Method` (ZM), `Effective Recording Deadline Mode`, `Effective Recording Makeup Window Days`, `Week End Date`

```airtable
IF(
  OR(
    {Recording Available At} = BLANK(),
    {Attendance Method} != "Recording Quiz"
  ),
  BLANK(),
  SWITCH(
    IF({Effective Recording Deadline Mode} = BLANK(), "Later of Both", {Effective Recording Deadline Mode}),
    "Days After Recording Available",
      DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
    "End of Program Week",
      IF({Week End Date} = BLANK(), BLANK(), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
    "Earlier of Both",
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') <= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      ),
      IF(
        OR({Week End Date} = BLANK(), {Recording Available At} = BLANK()),
        IF({Week End Date} = BLANK(), DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')),
        IF(
          DATETIME_DIFF(DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'), DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD'), 'seconds') >= 0,
          DATEADD({Recording Available At}, IF({Effective Recording Makeup Window Days} = BLANK(), 7, {Effective Recording Makeup Window Days}), 'days'),
          DATETIME_PARSE(ARRAYJOIN({Week End Date}), 'YYYY-MM-DD')
        )
      )
  )
)
```

**Default branch of SWITCH** (when mode is `"Later of Both"` or unrecognized): the final `IF(...)` block (later-of-both logic).

---

## D. Zoom Attendance formulas (remaining)

Create **after** required lookups exist. Recommended executable order:

| Step | Field | Why this position |
|------|-------|-------------------|
| 1 | `Zoom Credit Pre-Approved?` | Needs Effective makeup/coach lookups + base fields |
| 2 | `Preconflict Pair Tag` | Needs Pre-Approved + RID lookups |
| 3 | *(ZM rollup `Approved Preconflict Pair Tags`)* | Needs step 2 |
| 4 | *(ZA lookup `Meeting Approved Preconflict Pair Tags`)* | Needs step 3 |
| 5 | `Zoom Credit Conflict?` | Needs Meeting Approved tags + Enrollment RID |
| 6 | `Zoom Credit Approved?` | Needs Pre-Approved + Conflict |
| 7 | `Zoom XP Percentage` | Needs Pre-Approved + Conflict + Effective XP % |
| 8 | `Zoom XP Amount` | Needs Approved + Percentage + `Normal Live Zoom XP` |
| 9 | `Zoom Gate Credit Earned?` | Needs Approved + Conflict + Effective gate |
| 10 | `Zoom Credit Key` | Needs RID lookups only (can be earlier; safe here) |
| 11 | `Zoom Credit Debug` | Needs nearly everything |
| 12 | `Zoom Recording Quiz — Past Deadline (view marker)` | Needs deadline lookup + Approved |

### D1. `Zoom Credit Pre-Approved?` (order 10033) — result number · not automation-critical alone

```airtable
IF(
  {Attendance Method} = "Live",
  IF({Live Attendance Confirmed?} = 1, 1, 0),
  IF(
    {Attendance Method} = "Recording Quiz",
    IF(
      AND(
        OR(
          {Effective Recording Makeup Enabled?} = BLANK(),
          {Effective Recording Makeup Enabled?} = 1
        ),
        IF(
          OR(
            {Effective Recording Quiz Requires Coach Approval?} = BLANK(),
            {Effective Recording Quiz Requires Coach Approval?} = 1
          ),
          AND(
            {Recording Quiz Review Status} = "Satisfactory",
            {Recording Quiz Satisfactory?} = 1
          ),
          OR(
            {Recording Quiz Review Status} = "Satisfactory",
            {Recording Quiz Review Status} = "Needs Review"
          )
        )
      ),
      1,
      0
    ),
    0
  )
)
```

### D2. `Preconflict Pair Tag` (order 10017) — result singleLineText

```airtable
IF(
  {Zoom Credit Pre-Approved?} = 1,
  IF(
    OR(
      {Enrollment RID} = BLANK(),
      {Zoom Meeting RID} = BLANK()
    ),
    BLANK(),
    {Enrollment RID} &
    "|" &
    IF(
      {Attendance Method} = "Live",
      "LIVE",
      "REC"
    )
  ),
  BLANK()
)
```

### D3. `Zoom Credit Conflict?` (order 10030) — **automation-critical** · result number

```airtable
IF(
  OR(
    {Enrollment RID} = BLANK(),
    {Meeting Approved Preconflict Pair Tags} = BLANK()
  ),
  0,
  IF(
    AND(
      FIND(
        {Enrollment RID} & "|LIVE",
        {Meeting Approved Preconflict Pair Tags} & ""
      ) > 0,
      FIND(
        {Enrollment RID} & "|REC",
        {Meeting Approved Preconflict Pair Tags} & ""
      ) > 0
    ),
    1,
    0
  )
)
```

### D4. `Zoom Credit Approved?` (order 10029) — **automation-critical** · result number

```airtable
IF(
  AND(
    {Zoom Credit Pre-Approved?} = 1,
    {Zoom Credit Conflict?} != 1
  ),
  1,
  0
)
```

### D5. `Zoom XP Percentage` (order 10039) · result number · default recording % = 50 when Effective blank

```airtable
IF(
  {Zoom Credit Conflict?} = 1,
  0,
  IF(
    {Zoom Credit Pre-Approved?} != 1,
    0,
    IF(
      {Attendance Method} = "Live",
      100,
      IF(
        {Attendance Method} = "Recording Quiz",
        IF(
          {Effective Recording XP Percentage} = BLANK(),
          50,
          {Effective Recording XP Percentage}
        ),
        0
      )
    )
  )
)
```

### D6. `Zoom XP Amount` (order 10038) — **automation-critical** · result number

```airtable
IF(
  OR(
    {Zoom Credit Conflict?} = 1,
    {Zoom Credit Approved?} != 1
  ),
  0,
  IF(
    {Normal Live Zoom XP} = BLANK(),
    0,
    FLOOR({Normal Live Zoom XP} * {Zoom XP Percentage} / 100)
  )
)
```

**XP math check:** `Normal Live Zoom XP` = 60 and percentage = 50 → `FLOOR(60 * 50 / 100)` = **30**.

### D7. `Zoom Gate Credit Earned?` (order 10034) — **automation-critical** · result number

```airtable
IF(
  {Zoom Credit Conflict?} = 1,
  0,
  IF(
    {Zoom Credit Approved?} != 1,
    0,
    IF(
      {Attendance Method} = "Live",
      1,
      IF(
        AND(
          {Attendance Method} = "Recording Quiz",
          {Effective Recording Counts for Level Gate?} = 1
        ),
        1,
        0
      )
    )
  )
)
```

### D8. `Zoom Credit Key` (order 10032) — **automation-critical** · result singleLineText

```airtable
IF(
  OR(
    {Enrollment RID} = BLANK(),
    {Zoom Meeting RID} = BLANK()
  ),
  BLANK(),
  "ZOOM_CREDIT|" & {Enrollment RID} & "|" & {Zoom Meeting RID}
)
```

### D9. `Zoom Credit Debug` (order 10031) — **automation-critical** · result singleLineText

```airtable
"Method=" & {Attendance Method} &
" | LiveConfirmed=" &
IF({Live Attendance Confirmed?} = 1, "Y", "N") &
" | Review=" & {Recording Quiz Review Status} &
" | Satisfactory=" &
IF({Recording Quiz Satisfactory?} = 1, "Y", "N") &
" | PreApproved=" &
IF({Zoom Credit Pre-Approved?} = 1, "Y", "N") &
" | Conflict=" &
IF({Zoom Credit Conflict?} = 1, "Y", "N") &
" | Approved=" &
IF({Zoom Credit Approved?} = 1, "Y", "N") &
" | Pct=" & {Zoom XP Percentage} &
" | XP=" & {Zoom XP Amount} &
" | Gate=" &
IF({Zoom Gate Credit Earned?} = 1, "Y", "N") &
" | Key=" & {Zoom Credit Key} &
" | EnrollmentRID=" & {Enrollment RID} &
" | MeetingRID=" & {Zoom Meeting RID} &
" | EffectivePct=" & {Effective Recording XP Percentage} &
" | EffectiveGate=" &
{Effective Recording Counts for Level Gate?} &
" | EffectiveCoachApproval=" &
{Effective Recording Quiz Requires Coach Approval?} &
" | Deadline=" &
{Calculated Recording Quiz Deadline}
```

### D10. `Zoom Recording Quiz — Past Deadline (view marker)` (order 10037) · result number/checkbox-like

```airtable
AND(
  {Attendance Method} = 'Recording Quiz',
  {Calculated Recording Quiz Deadline} < TODAY(),
  NOT({Zoom Credit Approved?})
)
```

---

## E. Key formats (verified)

| Path | Format |
|------|--------|
| Recording XP Source Key | `ZOOM_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |
| Live XP Source Key | `ZOOM_ATTEND_BASE\|{meetingId}\|{enrollmentId}` |
| Approval email send key | `ZOOM_REC_EMAIL\|{Enrollment RID}\|{Zoom Meeting RID}` |

---

## F. Do not invent

- No alternate deadline formula that drops ZM `Attendance Method` unless Mike authorizes a DEV formula change first.
- No ZM `Zoom Credit Approved?` recreate for Stage 17 runtime (legacy on Zoom Meetings per config-linkage design; ZA formula is authoritative).
- Skip all `ZZZ C025 Archive*` fields.
