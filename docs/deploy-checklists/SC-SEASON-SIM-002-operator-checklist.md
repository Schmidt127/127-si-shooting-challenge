# SC-SEASON-SIM-002 — Operator checklist (gated clock override)

| | |
|---|---|
| **Backlog** | SC-SEASON-SIM-002 |
| **Window** | 2027-05-01 → 2027-06-30 (61 days) |
| **Base** | Production `appn84sqPw03zEbTT` (no DEV base) |
| **Athlete** | Disposable Athlete 1 / VERIFY only |
| **Email** | `schmidt@fairfieldbasketballclub.com` only |

## Root cause (why 2027 dates fail today)

Live Production (verified 2026-09-02):

```airtable
Activity Date Is Future? =
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)
```

`Count This Submission?` returns **0** when `Activity Date Is Future? = 1`.

Therefore May–June 2027 Activity Dates created in 2026 **do not count** until wall-clock reaches them, or a **gated temporary override** is applied.

Also:

- `Submitted At` = `CREATED_TIME()` — **cannot** be backdated via API
- `Perfect Week Grace Eligible?` requires `Activity Date <= TODAY()` unless `Perfect Week Manual Exception?` is checked

## Safety rules

- Do **not** change formulas globally to weaken NOW()/TODAY() for normal athletes
- Gate requires **both** `Season Sim Test Record?` **and** `Video Upload Note` containing `SEASON-SIM|`
- Do **not** modify SC-147, Automation 101, or Zoom credit logic
- Do **not** delete Weeks / schema / automations
- Cleanup deletes **only** registry-tagged simulation records
- Restore Production formulas immediately after the run

---

## Execute writer behavior (repo — no Production write in this task)

Creates and registers (dedupe-keyed) disposable records only:

1. Athlete 1 + Enrollment (Athlete link, Grade Band, **Program Instance**, School Year, allowlist email)
2. Weekly Athlete Summary per covering Week + Goal Record
3. Daily Submissions (2027 Activity Date, Count It, Week link, sim marker / override stamps)
4. Submission Assets (Homework 1 / Video For Feedback) + Homework Completions + Video Feedback
5. Zoom Attendance: **Live** on day-12 meeting; **Recording Quiz** + Satisfactory on day-40 meeting
6. Live only: patch Enrollment onto `Zoom Meetings.Attendees` (never delete the meeting)

Resume the same `--simulation-id` after pause — registry skips already-created dedupe keys.

## A. Airtable setup (Mike / OMNI) — before early execute

### A1. Create Submissions fields (if missing)

| Field | Type | Purpose |
|---|---|---|
| `Season Sim Test Record?` | checkbox | Gate 1 |
| `Season Sim Clock Now` | dateTime (Denver) | Simulated “now” for future check |
| `Season Sim Test Submitted At` | dateTime (Denver) | Same-day surrogate (CREATED_TIME cannot be faked) |

Hide these from Fillout / parent UI.

### A2. Temporary gated formula — `Activity Date Is Future?`

**Production restore target (current live):**

```airtable
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)
```

**Temporary gated formula (paste only for the sim window):**

```airtable
IF(
  AND(
    {Season Sim Test Record?},
    FIND("SEASON-SIM|", {Video Upload Note} & "") > 0
  ),
  IF(
    {Season Sim Clock Now},
    IF({Activity Date} > {Season Sim Clock Now}, 1, 0),
    0
  ),
  IF(
    {Activity Date},
    IF({Activity Date} > NOW(), 1, 0),
    BLANK()
  )
)
```

Normal athletes never set both gate conditions → they stay on `NOW()`.

### A3. Optional — gated `Submitted Same Day?`

Wrap the **existing** Production formula (including Perfect Week Test path) as the false branch of:

```airtable
IF(
  AND(
    {Season Sim Test Record?},
    FIND("SEASON-SIM|", {Video Upload Note} & "") > 0,
    {Season Sim Test Submitted At},
    {Activity Date}
  ),
  IF(
    DATETIME_FORMAT(SET_TIMEZONE({Season Sim Test Submitted At}, "America/Denver"), "YYYY-MM-DD") =
    DATETIME_FORMAT(SET_TIMEZONE({Activity Date}, "UTC"), "YYYY-MM-DD"),
    1,
    0
  ),
  /* EXISTING Submitted Same Day? FORMULA HERE */
)
```

### A4. Perfect Week on disposable rows

Harness stamps `Perfect Week Manual Exception?` on the same-day probe day so Grace Eligible does not require Activity Date ≤ real TODAY().

### A5. Weeks / PHA / Zoom

- Weeks covering every date 2027-05-01 … 2027-06-30
- **18** active Program Homework Assignments (Early Bird + Weeks 1–8 × 2)
- Week 9: **0** PHA
- Common homework due date: **2027-06-29**
- At least one non-cancelled Zoom Meeting

---

## B. Commands (from `tools/`)

### Offline tests

```powershell
cd tools
python -m unittest season_simulation.tests.test_offline season_simulation.tests.test_writer -v
```

### Preflight (read-only)

```powershell
cd tools
python -m season_simulation preflight
```

### Dry-run (default; no writes)

```powershell
cd tools
python -m season_simulation dry-run
```

Offline planner:

```powershell
cd tools
python -m season_simulation dry-run --offline-fixture
```

### Evidence export

```powershell
cd tools
python -m season_simulation evidence --simulation-id "SEASON-SIM-2027-…"
```

### Execute (authorized only — not run during infrastructure sessions)

```powershell
cd tools
python -m season_simulation execute `
  --execute `
  --simulation-id "SEASON-SIM-2027-<utc>-athlete1" `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" `
  --acknowledge-clock-override
```

Add `--enable-email-delivery` only when intentionally arming allowlisted email.

### Cleanup dry-run

```powershell
cd tools
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…"
```

### Cleanup delete (separate confirm)

```powershell
cd tools
python -m season_simulation cleanup `
  --run-id "SEASON-SIM-2027-…" `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

---

## C. After the run

1. Restore `Activity Date Is Future?` to the Production `NOW()` formula
2. Restore `Submitted Same Day?` if modified
3. Clear / delete disposable Athlete 1 records via cleanup
4. Leave `Season Sim *` fields in place (unused when unchecked) **or** remove after confirming no leftover gated rows
5. Confirm a normal Schmidt control submission still counts with Production NOW() path

## Confirmation: normal Production unaffected

When `Season Sim Test Record?` is unchecked **or** `Video Upload Note` lacks `SEASON-SIM|`, formulas evaluate exactly as today’s Production `NOW()` / `CREATED_TIME()` paths.
