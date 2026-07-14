# C-025 — Manual Airtable repair (DEV Zoom credit formulas)

**Environment:** DEV only — `127SI - SHOOTING CHALLENGE - DEV` (`appTetnuCZlCZdTCT`)  
**Date applied:** 2026-07-13 (Cursor Meta API)  
**Authority:** Mike C-025 apply request  
**Status:** **APPLIED in DEV** via Cursor (`schema.bases:write` on `tools/airtable/.env` PAT). OMNI not used. PROD not touched.

| Step | Result |
|------|--------|
| A — Zoom Meetings rollup `Approved Preconflict Pair Tags` | **Created** `fldcM3v5VOjjW002p` (ARRAYJOIN of `Preconflict Pair Tag` via linked `Zoom Attendance`) |
| B — Zoom Attendance lookup `Meeting Approved Preconflict Pair Tags` | **Created** `fld08lAdEm1TQElUC` |
| C — Seven credit formulas | **Patched** (all `isValid: true`) |
| Mike helpers | Left unchanged: `Zoom Credit Pre-Approved?`, `Preconflict Pair Tag` |
| D — View `Zoom Recording Quiz — Past Deadline` | **Not created via API** (Meta views POST 422) — Mike create in UI if missing |
| E — Schmidt live tests | **4/4 pass** (see § Applied verification) |

**Config linkage:** still **not** complete — Effective\* remain meeting-level.

**Do not use OMNI.** Do not touch PROD. Do not create automations, XP Events, email, or interface changes.

---

## Live DEV inventory (inspected 2026-07-13)

### Zoom Attendance — already present (do not recreate)

| Field | Type | Notes |
|-------|------|-------|
| `Enrollment` | Link → Enrollments | |
| `Zoom Meeting` | Link → Zoom Meetings | Inverse on Zoom Meetings = **`Zoom Attendance`** (`fldELpIe5BwPhXaTA`) |
| `Enrollment RID` | Lookup | **1 field only** (no duplicate) |
| `Zoom Meeting RID` | Lookup | **1 field only** (no duplicate) |
| `Attendance Method` | Single select | `Live` / `Recording Quiz` |
| `Live Attendance Confirmed?` | Checkbox | |
| `Recording Quiz Review Status` | Single select | |
| `Recording Quiz Satisfactory?` | Checkbox | |
| `Normal Live Zoom XP` | Number | |
| `Effective Recording XP Percentage` | Lookup from Zoom Meeting | Meeting-level; Config linkage **not** complete |
| `Effective Recording Counts for Level Gate?` | Lookup | Meeting-level |
| `Effective Recording Counts for Perfect Week?` | Lookup | Meeting-level |
| `Effective Recording Quiz Requires Coach Approval?` | Lookup | Meeting-level |
| `Effective Recording Makeup Enabled?` | Lookup | Meeting-level |
| `Effective Recording Makeup Window Days` | Lookup | Meeting-level |
| `Effective Recording Deadline Mode` | Lookup | Meeting-level |
| `Calculated Recording Quiz Deadline` | Lookup/formula | Present |
| **`Zoom Credit Pre-Approved?`** | Formula | **Mike created** — leave as-is |
| **`Preconflict Pair Tag`** | Formula | **Mike created** — leave as-is |
| `Zoom Credit Approved?` | Formula | **Broken** (`"Unable to generate formula"`) — repair |
| `Zoom Credit Key` | Formula | **Broken** — repair |
| `Zoom Credit Debug` | Formula | **Broken** — repair |
| `Zoom Credit Conflict?` | Formula | Present but **wrong logic** — replace |
| `Zoom XP Percentage` | Formula | Present but **wrong logic** — replace |
| `Zoom XP Amount` | Formula | Present but **wrong logic** — replace |
| `Zoom Gate Credit Earned?` | Formula | Present but **wrong logic** — replace |

### Zoom Meetings

| Field | Status |
|-------|--------|
| `Zoom Attendance` | **Exists** — inverse link to Zoom Attendance (use this for the rollup) |
| `Approved Preconflict Pair Tags` | **Created 2026-07-13** `fldcM3v5VOjjW002p` |
| `Meeting Approved Preconflict Pair Tags` on Zoom Attendance | **Created 2026-07-13** `fld08lAdEm1TQElUC` |

---

## Step A — Zoom Meetings rollup (create once)

1. Open table **Zoom Meetings**.
2. Add field **`Approved Preconflict Pair Tags`**.
3. Type: **Rollup**.
4. Linked-record field: **`Zoom Attendance`** (the inverse link — not Attendees).
5. Field to roll up: **`Preconflict Pair Tag`**.
6. Aggregation formula: `ARRAYJOIN(values)`
7. Result type: Single line text (or leave Airtable default for ARRAYJOIN).
8. Save.

---

## Step B — Zoom Attendance lookup (create once)

1. Open table **Zoom Attendance**.
2. Add field **`Meeting Approved Preconflict Pair Tags`**.
3. Type: **Lookup**.
4. Linked-record field: **`Zoom Meeting`**.
5. Source field: Zoom Meetings → **`Approved Preconflict Pair Tags`**.
6. Save.

Do **not** recreate `Zoom Credit Pre-Approved?` or `Preconflict Pair Tag`.

---

## Step C — Paste formulas (existing fields only; this order)

Edit each existing formula field and replace the formula text exactly.

### C1. `Zoom Credit Key`

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

### C2. `Zoom Credit Conflict?`

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

### C3. `Zoom Credit Approved?`

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

### C4. `Zoom XP Percentage`

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

### C5. `Zoom XP Amount`

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

### C6. `Zoom Gate Credit Earned?`

Recording gate credit only when **`Effective Recording Counts for Level Gate?` is checked** (blank/unchecked = no gate credit).

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

### C7. `Zoom Credit Debug`

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

---

## Step D — View (create if missing)

Name: **`Zoom Recording Quiz — Past Deadline`**

Filters:

1. `Attendance Method` is `Recording Quiz`
2. `Calculated Recording Quiz Deadline` is before today
3. `Zoom Credit Approved?` is unchecked / empty

---

## Step E — Schmidt DEV tests (read-only credit checks)

Use Schmidt DEV rows only. Do **not** create XP Events or send email.

| # | Scenario | Expect |
|---|----------|--------|
| 1 | Live + confirmed | PreApproved=1, Conflict=0, Approved=1, Pct=100, full XP, Gate=1, Key filled |
| 2 | Recording Quiz Satisfactory | PreApproved=1, Conflict=0, Approved=1, Pct=Effective% (blank→50), Gate follows Effective Level Gate checkbox |
| 3 | Same Enrollment + Meeting with Live **and** Recording Quiz | Both Conflict=1, Approved=0, Pct=0, XP=0, Gate=0 |
| 4 | Missing Enrollment | Key blank |
| 5 | Missing Zoom Meeting | Key blank |

---

## Step F — After paste

**Completed 2026-07-13 by Cursor** (with `schema.bases:write`). No further paste needed unless formulas are reverted.

Optional cleanup in DEV UI:

- Delete leftover text field `C025 Schema Write Probe` on Zoom Meetings (create-permission probe).
- Create view **`Zoom Recording Quiz — Past Deadline`** if still missing (API view create unavailable).

---

## Applied verification (2026-07-13)

Enrollment: Schmidt DEV `recgP9qZYjAhE7NXm`  
Fixture attendance (DEV only; no XP Events / email):

| Scenario | Record | Result |
|----------|--------|--------|
| Live approved | `rec9EEtEf3AS5GYCf` | Pre=1 Conflict=0 Approved=1 Pct=100 XP=40 Gate=1 Key filled |
| Recording Satisfactory | `recHkB9aER3vCvBsL` | Pre=1 Conflict=0 Approved=1 Pct=50 XP=20 Gate=1 |
| Conflict (same meeting) | Live `rec9EEtEf3AS5GYCf` + Rec `rec2GKdH8UURJIy09` | both Conflict=1 Approved=0 Pct=0 XP=0 Gate=0 |
| Blank RIDs | `recqddsE2Okt8gdQP` | Key blank |

Live formula survey previously: blank-key orphan `rec53tl3IIQQljrT1` also Key blank.

**C-025 formula repair in DEV: complete** (Config→Effective linkage still separate).

---

## Config linkage note

Current `Effective Recording *` fields on Zoom Attendance are **meeting-level** values. Do **not** claim Config → Effective linkage is complete. That is a separate C-025 follow-up.
