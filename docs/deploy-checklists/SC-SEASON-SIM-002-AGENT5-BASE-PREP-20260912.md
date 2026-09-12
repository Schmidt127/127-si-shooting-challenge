# SC-SEASON-SIM-002 — Agent 5 Production base prep (2026-09-12)

| | |
|---|---|
| **Agent** | AGENT 5 — Production base simulation settings / reversible configuration |
| **Base** | Production `appn84sqPw03zEbTT` only |
| **Execute** | **NOT run** (prep / dry verification only) |
| **Preflight evidence** | `tools/season_simulation/reports/preflight-20260912T205824Z.{json,md}` |
| **Verdict** | **PRODUCTION BASE NOT READY** — formula gates ON; PHA graph incomplete |

---

## A. Simulation athlete

| Item | Value |
|---|---|
| Identity (planned) | **Athlete 1** — First=`Athlete`, Last=`1`, Grade **12** |
| Email | `schmidt@fairfieldbasketballclub.com` only |
| Athlete record | **None present** (created at execute; prior T122531Z athlete deleted) |
| Enrollment record | **None present** (created at execute) |
| Leftover SEASON-SIM Submissions | **0** |
| Leftover Athlete 1 search | **0** |

No reset/cleanup required — base is already clean of prior SC-002 disposable rows.

---

## B. Settings changed (this session)

1. Submissions.`Activity Date Is Future?` → temporary Season Sim gated formula
2. Submissions.`Submitted Same Day?` → temporary Season Sim gated formula
3. Submissions.`Perfect Week Grace Eligible?` → temporary Season Sim gated formula

**Not changed:** `Count This Submission?`, `Perfect Week Countable Submission?`, `Submitted At` (`CREATED_TIME()`), Season Sim field schema, native automation enablement, Hub Test Allowlist, Zoom/101/SC-147, dedupe automations.

---

## C. Before / after values

### `Activity Date Is Future?` (`fldyFAjhbfaC4LlPb`)

**Before (Production restore target):**

```airtable
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)
```

**After (temporary, live verified gated):** Season Sim Test Record? + `SEASON-SIM|` in Video Upload Note → compare to Season Sim Clock Now; else NOW() path unchanged for ordinary athletes.

MCP action: `actdRdghTYCSxDcfG`

### `Submitted Same Day?` (`fldE7G8H1O7HPYuIi`)

**Before:** Submitted At vs Activity Date only (ordinary path; no Season Sim branch).

**After (temporary):** Season Sim gate → Season Sim Test Submitted At vs Activity Date; else ordinary Submitted At path.

MCP action: `actRoUzRNVmXIsb7o`

### `Perfect Week Grace Eligible?` (`fldLo2GO5aac6tPX1`)

**Before:** Manual Exception OR (Count=1 + Activity Date ≤ TODAY() + Submitted At within 48h).

**After (temporary):** Manual Exception OR Season Sim branch (Clock Now + Test Submitted At) OR ordinary TODAY()/Submitted At branch.

MCP action: `actUOZOabg5qOQo4h`

---

## D. Formula / field changes

| Field | Field ID | Change |
|---|---|---|
| Activity Date Is Future? | fldyFAjhbfaC4LlPb | Temporary gate applied |
| Submitted Same Day? | fldE7G8H1O7HPYuIi | Temporary gate applied |
| Perfect Week Grace Eligible? | fldLo2GO5aac6tPX1 | Temporary gate applied |
| Season Sim Test Record? | fldx964sodLvnCrWu | Present (checkbox) — no schema change |
| Season Sim Clock Now | fldyxzwotgqRhHIPC | Present (dateTime Denver) — no schema change |
| Season Sim Test Submitted At | fldD5fW93bsK42pPR | Present (dateTime Denver) — no schema change |

Exact temporary + rollback paste packets: `tools/season_simulation/same_day_contracts.py` and `tools/season_simulation/clock_override.py`.

---

## E. Automation state changes

**None.** Readiness check only — no disable/enable/rewrite.

| Code | Automations-table Status | Version in Automation Code | Native deployment | Season Sim helpers |
|---|---|---|---|---|
| **010** | Live | **v10.14** | deployed | `isSeasonSimRecord` present |
| **114** | Live | **v6.3** | deployed | present |
| **073** | Live | **v4.7** | deployed | present |
| **072** | Live | **v4.9.2** | deployed | N/A weekly package |
| **007a** Duplicate Checker | — | — | deployed | **kept active** (dedupe preserved) |
| **118 / 119** | — | — | deployed | Sunday cron — **not** driven by sim clock |
| **101** Zoom XP | — | — | deployed | **not modified** |

Note: versions advanced since 2026-09-05 manifest (010 was v10.13 / 114 v6.2 / 073 v4.6 / 072 v4.9.1). Do not paste older GitHub copies unless Mike authorizes.

---

## F. External communication safeguards

| Control | State |
|---|---|
| Harness default | Email **off** unless `--enable-email-delivery` |
| Harness allowlist | `schmidt@fairfieldbasketballclub.com` only (`SAFE_EMAIL_RECIPIENT`) |
| Hub Test Allowlist | `recLxwQnjM6gpfVc9` Active for `schmidt@fairfieldbasketballclub.com` |
| Other Hub allowlist actives | `mschmidt@127si.com`, `mschmidt@fairfield.k12.mt.us` (Mike test — not real families) |
| Temporarily disabled automations | **None** (prefer allowlist over global disable) |
| SMS | Not armed for sim; Hub SMS reserved inactive |

Real-athlete recipients are not used by the harness. Hub Test Mode + allowlist remain the send gate for any opt-in email phase.

---

## G. Future-date behavior

- Wall clock (2026-09-12) is before May–June 2027 window → Production NOW() alone would mark all sim Activity Dates future → Count=0.
- **Gated override is ACTIVE** and simulation-scoped:
  - Gate: `Season Sim Test Record?` **and** `Video Upload Note` contains `SEASON-SIM|`
  - Sim path: Activity Date vs `Season Sim Clock Now` (empty clock → force not-future)
  - Ordinary athletes: unchanged NOW() path
- Writer stamps gate fields on every disposable Submission (see `clock_override.sim_submission_override_fields`).

---

## H. Perfect Week readiness

- `Perfect Week Grace Eligible?` Season Sim gate **ACTIVE** (sim uses Test Submitted At + Clock Now; ordinary uses TODAY()/Submitted At).
- `Perfect Week Countable Submission?` unchanged — still requires Count=1 + Grace Eligible=1 (+ other Production conditions).
- Writer may stamp `Perfect Week Manual Exception?` on designated probe days.
- SC-SEASON-SIM-002 scenario expects **Perfect Week Eligible = 0** (negative path by design).
- Top-level preflight `sufficient_for_same_day_perfect_week=false` solely because `sufficient_for_final_run=false` (PHA graph); nested same-day inspect reports gates accurate.

---

## I. Base cleanup performed

| Check | Result |
|---|---|
| Athlete 1 (First/Last) | 0 rows |
| Athletes search SEASON-SIM | 0 |
| Submissions Video Upload Note SEASON-SIM | 0 |
| Deletes this session | **None** (nothing to clean) |

---

## J. Remaining blocker

1. **Program Homework Assignments:** only **4** active PHA records total for Grade Band 9–12 (Early Bird HW1/HW2 + Week 1 HW1/HW2). Product / SC-002 expectation is **18** (Early Bird + Weeks 1–8 × 2; Week 9 = 0). Preflight: `sufficient_for_final_run=false`.
2. Until PHA inventory is restored for the 2027 window / Program Instance, do **not** authorize execute.
3. Optional awareness: Config includes multiple active school years (including 2028–2029); writer resolves at runtime — confirm intended School Year at execute.

Formula / clock / same-day / email safety / XP automation readiness for sim-scoped rows are otherwise prepared.

---

## K. Exact rollback manifest (post-sim or cancel)

Restore these three formulas immediately after the run (or if Stage A is cancelled before execute). Source of truth: `same_day_contracts.py` / `clock_override.py`.

### K1. `Activity Date Is Future?` → Production

```airtable
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)
```

### K2. `Submitted Same Day?` → Production ordinary path

```airtable
IF(
  AND(
    {Submitted At},
    {Activity Date}
  ),
  IF(
    DATETIME_FORMAT(
      SET_TIMEZONE({Submitted At}, "America/Denver"),
      "YYYY-MM-DD"
    )
    =
    DATETIME_FORMAT(
      SET_TIMEZONE({Activity Date}, "UTC"),
      "YYYY-MM-DD"
    ),
    1,
    0
  ),
  0
)
```

### K3. `Perfect Week Grace Eligible?` → Production

```airtable
IF(
  OR(
    {Perfect Week Manual Exception?},
    AND(
      {Count This Submission?} = 1,
      {Activity Date},
      {Submitted At},
      DATETIME_FORMAT(
        SET_TIMEZONE({Activity Date}, "America/Denver"),
        "YYYY-MM-DD"
      ) <= DATETIME_FORMAT(TODAY(), "YYYY-MM-DD"),
      DATETIME_DIFF(
        {Submitted At},
        DATETIME_PARSE(
          DATETIME_FORMAT(
            DATEADD(
              DATETIME_PARSE(
                DATETIME_FORMAT(
                  SET_TIMEZONE({Activity Date}, "America/Denver"),
                  "YYYY-MM-DD"
                ),
                "YYYY-MM-DD"
              ),
              1,
              "days"
            ),
            "YYYY-MM-DD"
          ) & " 00:00",
          "YYYY-MM-DD HH\:mm"
        ),
        "hours"
      ) <= 48
    )
  ),
  1,
  0
)
```

### K4. Post-restore verification

1. `get_table_schema` — confirm no `SEASON-SIM|` / Season Sim field refs in the three formulas.
2. `python -m season_simulation preflight` — Activity Date gate should report **inactive** (expected after restore).
3. Cleanup disposable run records via `python -m season_simulation cleanup …` (separate confirm) — **not** part of formula restore.
4. Do **not** leave temporary gates active after the controlled window.

### K5. Automations / email

No automation toggles to reverse. If email phase was used: confirm Hub/Resend only hit allowlist; no global send-mode changes were made by Agent 5.

---

## L. Verdict

**PRODUCTION BASE NOT READY**

Reason: Season Sim formula gates and email/XP readiness are in place, but active PHA count is **4/18**, so the season graph cannot support SC-SEASON-SIM-002 homework coverage. Do not execute until PHA inventory is restored and preflight reports `sufficient_for_final_run=true`.
