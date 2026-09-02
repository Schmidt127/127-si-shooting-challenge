# SC-SEASON-SIM-002 — Operator checklist (Production only)

**Backlog:** SC-SEASON-SIM-002  
**Base:** `appn84sqPw03zEbTT` (Production)  
**DEV base:** **None** — all testing uses disposable Production VERIFY / Schmidt records.  
**Do not run live execute until Mike authorizes.** This checklist prepares the run.

Email allowlist (when email phase enabled): **`schmidt@fairfieldbasketballclub.com` only**.

---

## 1. Pre-run gates (formulas — Mike / OMNI)

### Already expected active

Temporary gated **`Activity Date Is Future?`** (Season Sim Test Record? + `SEASON-SIM|` in Video Upload Note + Season Sim Clock Now; else NOW()).

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

Athlete → Enrollment (Program Instance + **2026–2027** School Year + Grade 12 / 9–12) → WAS per window week → **58** Submissions (gates + Count It) → Assets / Homework Completions (**18** existing PHAs) / Video Feedback → disposable Live + Recording Zoom Meetings → Zoom Attendance (live Attendees only; recording never on Meeting.Attendees).

Harness does **not** create XP Events, Unlocks, Streaks, or Levels — those come from live automations.

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
