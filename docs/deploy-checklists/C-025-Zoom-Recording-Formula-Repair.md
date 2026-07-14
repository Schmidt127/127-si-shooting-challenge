# C-025 — Zoom Recording formula repair (DEV)

**Status:** Live DEV inspected 2026-07-13 — helpers still incomplete; Cursor Meta API **cannot write** schema (`403`, no `schema.bases:write`).  
**Execute paste in Airtable UI via:** [C-025-Zoom-Recording-Manual-Airtable-Repair.md](./C-025-Zoom-Recording-Manual-Airtable-Repair.md)  
**Do not recreate broken fields**; **do not touch PROD**; **no automations**; **OMNI not used**.  
**Canonical Lead:** `overnight/lead-integration`  
**Authority:** Stage 16 config catalog + Mike DEV findings + live Meta inspect (2026-07-13)  
**DEV base:** `appTetnuCZlCZdTCT`

### Live name map (use these — not catalog aliases)

| Role | Live DEV name |
|------|----------------|
| Enrollment record id | `Enrollment RID` |
| Zoom Meeting record id | `Zoom Meeting RID` |
| Live confirmed | `Live Attendance Confirmed?` |
| Quiz review | `Recording Quiz Review Status` |
| Quiz satisfactory | `Recording Quiz Satisfactory?` |
| Recording XP % | `Effective Recording XP Percentage` |
| Gate credit toggle | `Effective Recording Counts for Level Gate?` |
| Coach approval toggle | `Effective Recording Quiz Requires Coach Approval?` |
| Inverse link on Zoom Meetings | `Zoom Attendance` |

**Mike already created (do not recreate):** `Zoom Credit Pre-Approved?`, `Preconflict Pair Tag`.

**Config linkage:** `Effective Recording *` remain **meeting-level editable values**. Do **not** claim Config → Effective is complete.

**Still missing on live DEV:** Zoom Meetings `Approved Preconflict Pair Tags` (rollup); Zoom Attendance `Meeting Approved Preconflict Pair Tags` (lookup).

---

## 0. Hard rules

1. **Do not recreate** the seven broken formula fields — **edit formula text only**.  
2. Add **helper fields only when missing**.  
3. No automation paste. No PROD.  
4. Prefer **lookups of effective values from Zoom Meetings** (Mike: effective config lives there).  
5. Credit identity = **Enrollment RID + Zoom Meeting RID** (method is **not** part of the key).  
6. Never hardcode makeup **7** or XP **50** when effective config fields are present.

---

## 1. Confirmed source fields (Mike DEV findings)

### Table: `Zoom Attendance` (exists in DEV)

| Field | Type | Status |
|-------|------|--------|
| `Enrollment` | Link → Enrollments | **Confirmed** |
| `Zoom Meeting` | Link → Zoom Meetings | **Confirmed** |
| `Normal Live Zoom XP` | Number | **Confirmed** |
| `Zoom Credit Approved?` | Formula | **Broken — repair formula** |
| `Zoom XP Percentage` | Formula | **Broken — repair formula** |
| `Zoom XP Amount` | Formula | **Broken — repair formula** |
| `Zoom Gate Credit Earned?` | Formula | **Broken — repair formula** |
| `Zoom Credit Key` | Formula | **Broken — repair formula** |
| `Zoom Credit Conflict?` | Formula | **Broken — repair formula** |
| `Zoom Credit Debug` | Formula | **Broken — repair formula** |

### Snapshot-confirmed RID/date sources (prod/DEV export Jul 2026)

| Table | Field | Type | Notes |
|-------|-------|------|-------|
| Enrollments | `Record Id` | Formula `RECORD_ID()` | Exact name includes space |
| Zoom Meetings | `RecordId` | Formula `RECORD_ID()` | Exact name has **no** space |
| Zoom Meetings | `Week` | Link → Weeks | Snapshot |
| Weeks | `End Date` | DateTime | Snapshot — official week end |
| Zoom Meetings | `Attendees` | Link → Enrollments | Live path legacy (101) — do not confuse with Zoom Attendance |

### Catalog Config fields (DEV: Mike says populated)

Canonical names (Config table):

- `Zoom Recording XP Percent of Live`  
- `Recording Gives Full Zoom Gate Credit?`  
- `Zoom Recording Makeup Window Days`  
- `Zoom Recording Deadline Mode`  
- `Recording Quiz Requires Coach Approval?`  
- `Recording Makeup Counts for Perfect Week?`  
- `Recording Approval Email Enabled?`  

Zoom Meetings should expose **effective** values used by Zoom Attendance formulas (meeting override → Config → fallback). Expected names on Zoom Meetings (verify; do not invent if present under slightly different label — **report mismatch**):

| Expected on Zoom Meetings | Role |
|---------------------------|------|
| `Recording Available At` | Deadline start |
| `Effective Zoom Recording XP Percent of Live` | Recording % |
| `Effective Recording Gives Full Zoom Gate Credit?` | Gate toggle |
| `Effective Recording Quiz Requires Coach Approval?` | Approval toggle |
| `Effective Zoom Recording Makeup Window Days` | Makeup days |
| `Effective Zoom Recording Deadline Mode` | Deadline mode |
| `Effective Recording Path Enabled?` | Optional master enable (if missing, treat as enabled) |

---

## 2. Helper fields — add only if missing

### 2.1 On Enrollments / Zoom Meetings (usually already present)

| Location | Field | Type | Formula / setup |
|----------|-------|------|-----------------|
| Enrollments | `Record Id` | Formula | `RECORD_ID()` — **already in snapshot** |
| Zoom Meetings | `RecordId` | Formula | `RECORD_ID()` — **already in snapshot** |
| Zoom Meetings → Weeks | Week End lookup | Lookup | From `Week` → Weeks.`End Date` as `Week End Date` (create if missing) |

### 2.2 On `Zoom Attendance` — VERIFY (quiz structure should already have these)

Do **not** recreate if present. If absent, add:

| Field | Type | Allowed / notes |
|-------|------|-----------------|
| `Attendance Method` | Single select | `Live` · `Recording Quiz` |
| `Live Confirmed?` | Checkbox | Live attendance confirmed by coach/ops |
| `Review Status` | Single select | `Needs Review` · `Satisfactory` · `Resubmit` · `Rejected` |
| `Submitted At` | DateTime | Quiz submit time |
| `Enrollment Record Id` | Lookup | From `Enrollment` → Enrollments.`Record Id` |
| `Zoom Meeting Record Id` | Lookup | From `Zoom Meeting` → Zoom Meetings.`RecordId` |
| `Recording Available At` | Lookup | From Zoom Meeting |
| `Week End Date` | Lookup | From Zoom Meeting `Week End Date` |
| `Effective Zoom Recording XP Percent of Live` | Lookup | From Zoom Meeting |
| `Effective Recording Gives Full Zoom Gate Credit?` | Lookup | From Zoom Meeting |
| `Effective Recording Quiz Requires Coach Approval?` | Lookup | From Zoom Meeting |
| `Effective Zoom Recording Makeup Window Days` | Lookup | From Zoom Meeting |
| `Effective Zoom Recording Deadline Mode` | Lookup | From Zoom Meeting |
| `Effective Recording Path Enabled?` | Lookup | From Zoom Meeting (optional) |

### 2.3 Deadline helper on `Zoom Attendance` (create if missing; may also be broken)

| Field | Type |
|-------|------|
| `Calculated Recording Quiz Deadline` | Formula (date) |

### 2.4 Conflict helpers (create if missing — required for conflict formula)

These avoid reconstructing sibling scans incorrectly.

| Location | Field | Type | Definition |
|----------|-------|------|------------|
| Zoom Attendance | `Zoom Credit Pre-Approved?` | Formula (checkbox) | Same approval rules as Approved **without** conflict (paste below) |
| Zoom Attendance | `Preconflict Pair Tag` | Formula (text) | Tag when pre-approved (paste below) |
| Zoom Meetings | `Zoom Attendance` | Link (inverse) | Must exist as inverse of Zoom Attendance.`Zoom Meeting` |
| Zoom Meetings | `Approved Preconflict Pair Tags` | Rollup | From linked Zoom Attendance → `Preconflict Pair Tag`, aggregation **ARRAYJOIN**, optional conditional filter `Zoom Credit Pre-Approved?` is checked |
| Zoom Attendance | `Meeting Approved Preconflict Pair Tags` | Lookup | From Zoom Meeting → `Approved Preconflict Pair Tags` |

---

## 3. Formula dependency order (must paste in this order)

1. Lookups / RID helpers (section 2)  
2. `Calculated Recording Quiz Deadline`  
3. `Zoom Credit Pre-Approved?`  
4. `Preconflict Pair Tag`  
5. Zoom Meetings rollup `Approved Preconflict Pair Tags` + lookup onto attendance  
6. `Zoom Credit Key`  
7. `Zoom Credit Conflict?`  
8. `Zoom Credit Approved?` *(= Pre-Approved AND NOT Conflict — keeps amount/gate zero on conflict)*  
9. `Zoom XP Percentage`  
10. `Zoom XP Amount`  
11. `Zoom Gate Credit Earned?`  
12. `Zoom Credit Debug`  

---

## 4. Exact formula text

> Paste into **existing** fields. If Airtable rejects a `{Field Name}`, stop and report the exact UI name.

### 4.1 `Calculated Recording Quiz Deadline` (date)

Safe fallbacks: days → `7` only if effective days blank; mode → `Later of Both` if blank.  
**Primary paste (no `LET` — widest Airtable compatibility):**

```airtable
IF(
  OR(
    {Recording Available At} = BLANK(),
    {Attendance Method} != "Recording Quiz"
  ),
  BLANK(),
  IF(
    IF(
      {Effective Zoom Recording Deadline Mode} = BLANK(),
      "Later of Both",
      {Effective Zoom Recording Deadline Mode}
    ) = "Days After Recording Available",
    DATEADD(
      {Recording Available At},
      IF(
        {Effective Zoom Recording Makeup Window Days} = BLANK(),
        7,
        {Effective Zoom Recording Makeup Window Days}
      ),
      'days'
    ),
    IF(
      IF(
        {Effective Zoom Recording Deadline Mode} = BLANK(),
        "Later of Both",
        {Effective Zoom Recording Deadline Mode}
      ) = "End of Program Week",
      {Week End Date},
      IF(
        IF(
          {Effective Zoom Recording Deadline Mode} = BLANK(),
          "Later of Both",
          {Effective Zoom Recording Deadline Mode}
        ) = "Earlier of Both",
        IF(
          OR(
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ) = BLANK(),
            {Week End Date} = BLANK()
          ),
          IF(
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ) = BLANK(),
            {Week End Date},
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            )
          ),
          IF(
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ) < {Week End Date},
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ),
            {Week End Date}
          )
        ),
        /* Later of Both (default) */
        IF(
          OR(
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ) = BLANK(),
            {Week End Date} = BLANK()
          ),
          IF(
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ) = BLANK(),
            {Week End Date},
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            )
          ),
          IF(
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ) > {Week End Date},
            DATEADD(
              {Recording Available At},
              IF(
                {Effective Zoom Recording Makeup Window Days} = BLANK(),
                7,
                {Effective Zoom Recording Makeup Window Days}
              ),
              'days'
            ),
            {Week End Date}
          )
        )
      )
    )
  )
)
```

**Optional:** OMNI may add a temporary number formula `Makeup Days Resolved` = `IF({Effective Zoom Recording Makeup Window Days}=BLANK(),7,{Effective Zoom Recording Makeup Window Days})` and rewrite deadline to reference it for readability — do not hardcode 7 elsewhere.

### 4.2 `Zoom Credit Pre-Approved?` (checkbox formula)

```airtable
IF(
  {Attendance Method} = "Live",
  IF({Live Confirmed?} = 1, 1, 0),
  IF(
    {Attendance Method} = "Recording Quiz",
    IF(
      AND(
        OR(
          {Effective Recording Path Enabled?} = BLANK(),
          {Effective Recording Path Enabled?} = 1
        ),
        IF(
          OR(
            {Effective Recording Quiz Requires Coach Approval?} = BLANK(),
            {Effective Recording Quiz Requires Coach Approval?} = 1
          ),
          {Review Status} = "Satisfactory",
          OR(
            {Review Status} = "Satisfactory",
            {Review Status} = "Needs Review"
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

Notes:
- Live confirmed → approved path.  
- Recording → when coach approval required (default), only `Satisfactory`.  
- If approval config blank → treat as **required** (safe).  
- If `Effective Recording Path Enabled?` missing entirely, OMNI should omit that clause and report.

### 4.3 `Preconflict Pair Tag` (single line text formula)

**Already created by Mike in DEV — do not recreate.** Canonical paste if ever needed:

```airtable
IF(
  {Zoom Credit Pre-Approved?} = 1,
  IF(
    OR(
      {Enrollment RID} = BLANK(),
      {Zoom Meeting RID} = BLANK()
    ),
    BLANK(),
    {Enrollment RID} & "|" &
      IF({Attendance Method} = "Live", "LIVE", "REC")
  ),
  BLANK()
)
```

### 4.4 `Zoom Credit Key` (single line text formula)

Attendance method is **not** part of the key. Live names: `Enrollment RID`, `Zoom Meeting RID`.

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

### 4.5 `Zoom Credit Conflict?` (checkbox formula)

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

### 4.6 `Zoom Credit Approved?` (checkbox formula)

Approved credit usable for XP/gate only when pre-approved and **not** conflicted.

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

### 4.7 `Zoom XP Percentage` (number formula, precision 0)

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

### 4.8 `Zoom XP Amount` (number formula, precision 0)

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

### 4.9 `Zoom Gate Credit Earned?` (checkbox formula)

Live DEV field: `Effective Recording Counts for Level Gate?` (not catalog `Effective Recording Gives Full Zoom Gate Credit?`).  
Recording Quiz earns gate credit **only when that field is checked**.

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

### 4.10 `Zoom Credit Debug` (single line / long text formula)

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

## 5. Safe fallback summary

| Input missing | Behavior |
|---------------|----------|
| Either RID | `Zoom Credit Key` blank |
| Makeup days blank | Deadline uses **7** |
| Deadline mode blank | **Later of Both** |
| Recording XP % blank | **50** |
| Gate credit config blank / unchecked | Gate credit **not** earned on Recording Quiz (must be checked) |
| Coach approval config blank | Approval **required** (Satisfactory) |
| Conflict helpers blank | Conflict = false (OMNI must report helpers incomplete) |
| Conflict true | XP % = 0, XP Amount = 0, Gate = false, Approved = false |

---

## 6. View: `Zoom Recording Quiz — Past Deadline`

**Create if missing** (do not rename other views).

Table: `Zoom Attendance`  
View name: `Zoom Recording Quiz — Past Deadline`

Filters (exact):

1. `Attendance Method` **is** `Recording Quiz`  
2. `Calculated Recording Quiz Deadline` **is before** `TODAY()` (or “is on or before yesterday” if UI lacks “before today” — prefer **is before today**)  
3. `Zoom Credit Approved?` **is not checked** / **is empty** / equals `0`

Sort optional: `Calculated Recording Quiz Deadline` ascending.

---

## 7. Recording Quiz Submission Page — later verification (no automations yet)

Confirm separately after formulas pass:

| Item | Expected |
|------|----------|
| Attendance Method | Auto-set to `Recording Quiz` |
| Review Status | Auto-set to `Needs Review` |
| Submitted At | Populated on submit |
| Enrollment + Zoom Meeting | Linked safely (required) |
| Duplicate prevention | Same Enrollment+Meeting cannot create second open quiz without policy |
| Resubmission | History preserved; credit once per Credit Key |
| Response history | Visible to coach |

**Do not build these automations in this repair.**

---

## 8. Validation checklist (DEV)

- [ ] RID lookups resolve (Enrollment `Record Id`, Meeting `RecordId`)  
- [ ] Live confirmed row: Approved? Y, Pct 100, Amount = Normal Live Zoom XP, Gate Y, Conflict N  
- [ ] Recording Satisfactory only: Pct = effective %, Amount = floor(live×pct/100), Gate follows gate config  
- [ ] Live + Recording Satisfactory same Enrollment+Meeting: Conflict Y, both Amounts 0  
- [ ] Key identical for Live and Recording Quiz of same pair; method not in key  
- [ ] Missing either link → blank key  
- [ ] Change Effective % → Amount changes  
- [ ] Change Effective makeup days → Deadline changes  
- [ ] Past Deadline view shows only unapproved recording quizzes past deadline  
- [ ] No PROD changes  

Email: missing `Recording Approval Email Enabled?` → **no send** (existing offline contract).

---

## 9. Rollback

1. Revert the seven formula fields to prior formula text (Airtable field history / undo) if available.  
2. Leave helper lookups in place (harmless) or hide from views.  
3. Do not delete Zoom Attendance records.  
4. Do not run PROD sync.

---

## 10. After formula repair — next Airtable step

1. Freeze DEV schema snapshot including `Zoom Attendance`.  
2. Submission-page verification list (§7).  
3. Only then design automation award/writeback (still separate package; no paste in this repair).
