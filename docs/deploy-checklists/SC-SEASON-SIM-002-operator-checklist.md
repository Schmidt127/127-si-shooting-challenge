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

**Completed 2026-09-02:** Final run `SEASON-SIM-2027-20260902T213135Z-athlete1` — formulas restored; registry + XP/email extras cleaned; evidence at `tools/season_simulation/reports/evidence-final-SEASON-SIM-2027-20260902T213135Z-athlete1.json`.

**Future-run code gate:** That successful execute used **local** writer fixes (053 streak arm after formula settle; 057 PW Skipped→Pending requeue with REST plain strings; weekly Build arm after day loop; never-write computed fields). Do **not** run another Production execute until those changes are merged to `master`. Do not force Perfect Week Eligible.

## Confirmation: normal Production unaffected

When `Season Sim Test Record?` is unchecked **or** `Video Upload Note` lacks `SEASON-SIM|`, formulas evaluate exactly as today’s Production `NOW()` / `CREATED_TIME()` paths.

---

## Same-day / Perfect Week temporary formulas (PR #343 readiness)

Source of truth for paste packets: 	ools/season_simulation/same_day_contracts.py.

### Required before same-day / Perfect Week accuracy

Live Production (2026-09-02) still has:

| Field | Problem for May–June 2027 sim before 2027 |
|---|---|
| `Submitted At` | `CREATED_TIME()` — **cannot** be backdated |
| `Submitted Same Day?` | Uses `Submitted At` / Perfect Week test path — **ignores** Season Sim Test Submitted At |
| `Perfect Week Grace Eligible?` | Uses `Submitted At` + `TODAY()` — future Activity Dates fail closed |
| `Perfect Week Countable Submission?` | Needs Grace Eligible = 1 |

**Paste temporary formulas below via OMNI / Airtable.** Do **not** weaken gates for ordinary athletes (Season Sim checkbox + `SEASON-SIM|` required).

#### A — `Submitted Same Day?` (temporary)

See exact formula in repo: `tools/season_simulation/same_day_contracts.py` → `SUBMITTED_SAME_DAY_TEMPORARY`

Gate: `Season Sim Test Record?` + `FIND("SEASON-SIM|", {Video Upload Note})` → compare `Season Sim Test Submitted At` to `Activity Date`. Else preserve Perfect Week test enrollment path, else `Submitted At` vs Activity Date.

#### B — `Perfect Week Grace Eligible?` (temporary)

See `PERFECT_WEEK_GRACE_TEMPORARY` in the same module.

Gate: same Season Sim markers → use `Season Sim Test Submitted At` + `Season Sim Clock Now` as “today”. Else preserve Manual Exception + `Submitted At` + `TODAY()` path.

#### C — Do **not** set `Perfect Week Manual Exception?` on sim rows as a substitute

That bypasses timing rules and does not prove same-day / grace math.

---

## 2. Rollback formulas (after the run — mandatory)

### `Activity Date Is Future?` → production NOW()-only

```
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)
```

### `Submitted Same Day?` → `SUBMITTED_SAME_DAY_ROLLBACK`

### `Perfect Week Grace Eligible?` → `PERFECT_WEEK_GRACE_ROLLBACK`

Leave Season Sim **fields** on the table (unchecked / unused for normal athletes).

---

## 3. Commands (from `tools/`)

```powershell
cd tools
python -m unittest discover -s season_simulation/tests -v
python -m season_simulation preflight
python -m season_simulation dry-run
```

### Future execute — email **disabled** (default)

```powershell
cd tools
python -m season_simulation execute --execute --confirm "SEASON-SIMULATION-2027"
```

### Future execute — email phase **enabled** (allowlist only; still does not arm Hub send by itself)

```powershell
cd tools
python -m season_simulation execute --execute --confirm "SEASON-SIMULATION-2027" --enable-email-delivery
```

Resolved recipient must print as `schmidt@fairfieldbasketballclub.com`. Stop if allowlist missing/wrong.

### Evidence / reports

```powershell
cd tools
# Latest reports under season_simulation/reports/
dir season_simulation\reports\preflight-*.json
dir season_simulation\reports\dry-run-*.json
dir season_simulation\reports\execute-*.json
```

### Cleanup (registry-scoped only; never Weeks / schema / real athletes)

```powershell
cd tools
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…"
# authorized delete:
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…" --execute --confirm "SEASON-SIMULATION-2027"
```

### Resume after pause

Re-run the same `execute` command with the **same** `--run-id` (registry dedupe keys). Do not invent a second athlete.

---

## 4. What execute creates (harness)

Disposable graph tagged `SEASON-SIM|<run_id>`:

Athlete → Enrollment (Program Instance + **2026–2027** School Year + Grade 12 / 9–12) → WAS per window week (**Enrollment + Week + Grade Band + Goal Record** at create) → **58** Submissions (gates + Count It) → Assets / Homework Completions (**18** PHAs + **`Submission Date`**) / Video Feedback (Feedback Posted? arm) → **disposable** Live + Recording Zoom Meetings (2027-aligned; registry-cleaned) → Zoom Attendance (live Attendees only; recording Satisfactory + never on Meeting.Attendees).

Harness does **not** create XP Events, Unlocks, Streaks, or Levels — those come from live automations.

### First-run failure (`…T171918Z`) — why / fixed

| Failure | Cause | Fix |
|---------|--------|-----|
| Submission / Video XP | 010/114 wall-clock `today` rejected 2027 Activity Dates; 010 latched reconcile without XP | Paste **010 v10.13** / **114 v6.2** Season Sim dual gate |
| Homework XP | Writer omitted `Submission Date` | Writer sets date-only from Activity Date |
| Perfect Week Grade Band=0 | WAS created without Grade Band; 030 raced 057 | Writer sets Grade Band at create |
| Zoom XP stuck | Reused VERIFY 2026 meetings | Writer creates disposable 2027 meetings |
| Hub email 422 | `schmidt@fairfieldbasketballclub.com` not on Hub Test Allowlist | Allowlist row added (`recLxwQnjM6gpfVc9`); do not send until next authorized execute |

Cleanup: [`SC-SEASON-SIM-002-failed-run-cleanup-20260902T171918Z.md`](./SC-SEASON-SIM-002-failed-run-cleanup-20260902T171918Z.md) **COMPLETE**.

### Required Airtable paste before next execute

1. Keep temporary Season Sim **formulas** active (Activity Date Is Future? / Submitted Same Day? / Perfect Week Grace as already pasted).
2. Paste automations per [`SC-SEASON-SIM-002-automation-paste-010-114.md`](./SC-SEASON-SIM-002-automation-paste-010-114.md): **010 v10.13**, **114 v6.2**, **073 v4.6** (docblock through EOF; skip GitHub header).
3. Confirm Hub Test Allowlist active for `schmidt@fairfieldbasketballclub.com`.
4. New `--simulation-id` only (do not reuse cleaned run IDs).

### Cascade checkpoints (distinguish statuses)

| Status | Meaning |
|--------|---------|
| Record creation complete | Execute writer `complete`; registry counts match |
| Automation processing complete | Triggers fired; no stuck Pending where Ready=1 for >15–30 min |
| XP processing complete | Submission Base / Homework / Video / Zoom Source Keys present |
| Email processing complete | Handoff → Hub Accepted/Sent (allowlist only) if `--enable-email-delivery` |
| Final validation complete | Streaks/unlocks/levels/WAS/Perfect Week reviewed |

Poll **010 / 064→065 / 113→114 / 101 / 053→054 / 057 / 076→079**. Optional: pause Automation **056** during the run window (wall-clock yesterday refresh can zero 2027 streaks).

---

## 5. Live automation dependencies (after records exist)

Do **not** duplicate this logic in the harness.

| Outcome | Automations (Production) |
|---|---|
| Submission XP | **010** (+ intake/week path **005/009/031** as triggered) |
| WAS create/update | **031**, **032/033/030/034** |
| Homework XP | **064** prepare → **065** create |
| Video XP | **113** → **114** |
| Zoom live XP | **101** |
| Recorded Zoom half-XP (SC-147) | **101 v6.8** (`ZOOM_RECORDING_CREDIT|…`) — **do not create 121; do not modify 117** for XP |
| Streaks | **053** → **054** |
| Perfect Week | **057** → **058** → **059** |
| Shot milestones / levels | **066** + level/gate automations as configured |
| Daily email package | **076** → **079** → Hub → Resend |
| Weekly email | **118** → **072** → **119** → **074** → **079** |
| Homework / video parent email | **078/071**, **073** → **079** |
| Zoom recording approval email | **117** → **079** (email only; not XP) |

### Polling / checkpoints

1. **Records created** (execute report counts) — not success.
2. Wait / poll for **010 / 031 / 065 / 114 / 101** to settle (XP Events present; Source Keys match).
3. Reconcile WAS Perfect Week fields after **057**.
4. Manual review: Count This Submission?, Submitted Same Day? / Grace Eligible?, Perfect Week Countable.
5. Email only if `--enable-email-delivery` and Hub Ready queue inspected; recipient allowlist only.
6. On failure: pause (registry preserved) → fix → resume same run-id → or cleanup that run-id only.

**Success criteria (all required):** records created **and** automations processed **and** XP awarded **and** achievements/levels as expected **and** emails (if enabled) to allowlist only **and** Perfect Week result verified. Creating records alone is **not** a pass.

---

## 6. Safety reminders

- No live simulation in infrastructure-only sessions.
- Cleanup never deletes Weeks, schema, real athletes, or other run IDs.
- Restore all temporary formulas after the run.
- Do not modify SC-147 / 101 / 117 as part of this sim package.
