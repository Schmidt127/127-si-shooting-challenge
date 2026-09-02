# Season simulation — Athlete 1 (SC-SEASON-SIM-002)

Infrastructure for a full-season disposable simulation of the Shooting Challenge.
**Default mode is dry-run / read-only.** Do not run execute until the gated clock
override is live and Mike authorizes.

| | |
|---|---|
| **Backlog ID** | SC-SEASON-SIM-002 |
| **Athlete** | Athlete 1 · Grade 12 (disposable VERIFY only) |
| **Window** | 2027-05-01 → 2027-06-30 inclusive (**61** days) |
| **Operator checklist** | [`docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md`](../../docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md) |
| **Related** | SC-SEASON-SIM-001 (five-enrollment unattended — still Planned / Future) |

## Can it run today?

| Mode | Ready? |
|---|---|
| Offline tests / dry-run / preflight | Yes |
| Full execute writer (idempotent) | **Yes in code** — creates Athlete, Enrollment (+ Program Instance), WAS, Submissions, Assets, HC, VF, Zoom Attendance, live `Attendees` patch |
| Complete countable E2E on wall-clock 2026 | **No** until Mike applies gated Airtable formula (see operator checklist). Without it, `Activity Date Is Future?=1` → `Count This Submission?=0` |

`CREATED_TIME()` / `Submitted At` **cannot** be API-backdated. Same-day / Perfect Week timing uses gated `Season Sim Test Submitted At` and/or `Perfect Week Manual Exception?` on disposable rows only.

## Purpose

Exercise as much of the live system as possible once authorized:

- Daily submissions, missed days, streaks, weekly goals
- Homework (incl. multi-asset) satisfactory / unsatisfactory / late paths
- Early Bird (2027-04-25…05-01; May 1 is last Early Bird day)
- Week 9 shooting with **no** homework; **18** active PHA expected
- Video feedback, Zoom attendance (do not change 101 / SC-147)
- XP events, achievements, shot milestones
- Weekly summaries, weekly emails, coach digest, inactivity alerts
- Level advancement, level gates, gate-blocked probes
- Same-day and backdated Activity Date behavior (harness + gated fields)
- Email handoff → Hub → Resend (allowlist only)

Configuration is **always read from Airtable at runtime** — never hardcoded.

## Architecture

```text
tools/season_simulation/
  cli.py / __main__.py   CLI entry (`python -m season_simulation …`)
  preflight.py           Read-only connectivity + clock readiness
  scenarios.py           Deterministic Athlete 1 61-day plan
  simulation_clock.py    Harness clock (Activity Date / day number)
  clock_override.py      Gated Production vs sim future-date / same-day model
  season_policy.py       Early Bird / Week 9 / 18 PHA / late homework
  reference_data.py      Dynamic Grade Band / goal / HW / Zoom / levels
  writer.py              Full idempotent execute writer (resume-safe)
  memory_client.py       In-memory Airtable client for offline writer tests
  execute.py             Gated execute orchestration + intended-write planner
  cleanup.py             Gated delete-by-run-id (dry-run default)
  recipient_safety.py    Allowlist: schmidt@fairfieldbasketballclub.com only
  run_registry.py        Local JSON registry of created record IDs + status
  airtable_client.py     REST client; writes blocked unless allow_writes
  reports/               JSON + Markdown outputs
  run_registries/        Local run registries (gitignored contents)
  tests/                 Offline unit tests (clock + full writer)
```

### Execute writer (what gets created)

Idempotent by `SEASON-SIM|<run_id>|…` dedupe keys in the local run registry:

| Record | Notes |
|---|---|
| Athletes | Athlete 1 / allowlist Parent Email |
| Enrollments | links Athlete, Grade Band, **Program Instance**, School Year |
| Weekly Athlete Summary | one per covering Week + Goal Record |
| Submissions | Activity Date 2027, Count It, Week link, clock-override stamps |
| Submission Assets | Homework 1 / Video For Feedback (metadata; no Make send) |
| Homework Completions | PHA + Satisfactory?/Review Complete + Completion Status |
| Video Feedback | Enrollment + Submission + Pending |
| Zoom Attendance | **Live** vs **Recording Quiz** (+ Satisfactory for recorded) |
| Zoom Meetings.Attendees | **live meeting only** (patch; never delete meeting) |

Resume: re-run same `--simulation-id` reuses registry IDs (no duplicates). Failure sets registry `status=paused` and stops; next run continues.

### Simulation clock (gated, reversible)

Airtable **cannot** future-date `CREATED_TIME()` / formula `Submitted At`.

Live formula:

```text
Activity Date Is Future? = IF({Activity Date}, IF({Activity Date} > NOW(), 1, 0), BLANK())
Count This Submission? = 0 when Activity Date Is Future? = 1
```

**Preferred temporary approach (does not weaken normal users):**

1. Add `Season Sim Test Record?`, `Season Sim Clock Now`, `Season Sim Test Submitted At`
2. Temporarily gate `Activity Date Is Future?` so override applies **only** when
   checkbox is checked **and** `Video Upload Note` contains `SEASON-SIM|`
3. Harness stamps those fields on every disposable Submission
4. Restore Production `NOW()` formula immediately after the run

Normal athletes never match the gate → unchanged Production behavior.

## Simulation clock and same-day truth

Airtable **cannot** backdate `CREATED_TIME()` / formula `Submitted At`.

| Concern | Production behavior | Season Sim requirement |
|---|---|---|
| Future Activity Dates | `Activity Date Is Future?` vs `NOW()` → Count=0 | Temporary gate using Season Sim Clock Now |
| Same-day | `Submitted Same Day?` vs `Submitted At` | Temporary gate using Season Sim Test Submitted At |
| Perfect Week | `Perfect Week Grace Eligible?` vs `Submitted At` + `TODAY()` | Temporary gate using sim submitted-at + Clock Now |

Gate conditions (all required for sim branch):

1. `Season Sim Test Record?` checked  
2. `Video Upload Note` contains `SEASON-SIM|`  
3. Sim dateTime fields populated by the writer  

Ordinary athletes stay on NOW() / CREATED_TIME / TODAY() branches.

**Rollback** for `Activity Date Is Future?` after the run:

```text
IF(
  {Activity Date},
  IF({Activity Date} > NOW(), 1, 0),
  BLANK()
)
```

Exact temporary + rollback formulas for Submitted Same Day? and Perfect Week
Grace Eligible? live in `same_day_contracts.py` and the operator checklist.
**Do not paste from agents unless Mike authorizes OMNI.**

## Environment

```text
AIRTABLE_TOKEN=pat…          # or AIRTABLE_API_TOKEN
BASE_ID=appn84sqPw03zEbTT    # or AIRTABLE_BASE_ID
```

```bash
pip install -r tools/airtable/requirements.txt
```

## Commands

From repo `tools/` (PowerShell):

### Offline tests

```powershell
python -m unittest season_simulation.tests.test_offline season_simulation.tests.test_writer -v
```

### Preflight (read-only)

```powershell
python -m season_simulation preflight
```

### Dry-run (default; no writes / no email)

```powershell
python -m season_simulation dry-run
python -m season_simulation dry-run --offline-fixture
```

### Evidence export

```powershell
python -m season_simulation evidence --simulation-id "SEASON-SIM-2027-…"
```

### Execute (multi-gate — authorized only)

Record creation does **not** require `--enable-email-delivery` (email stays off by default).

```powershell
python -m season_simulation execute `
  --execute `
  --simulation-id "SEASON-SIM-2027-<utc>-athlete1" `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" `
  --acknowledge-clock-override
```

Optional email arm (allowlist only):

```powershell
# …same flags… --enable-email-delivery
```

### Cleanup

```powershell
# dry-run (default)
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…"

# delete (separate confirm)
python -m season_simulation cleanup `
  --run-id "SEASON-SIM-2027-…" `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

## Safety controls

- Dry-run is default; `AirtableClient(allow_writes=False)` raises on create/update/delete
- Execute requires `--execute` + `--simulation-id` + `--confirm` + `--confirm-disposable`
- Cleanup deletes require a **separate** `--confirm-cleanup`
- Early execute also requires gated formula readiness (or `--acknowledge-clock-override` after OMNI paste)
- Email recipient allowlist: **`schmidt@fairfieldbasketballclub.com` only**
- Cleanup never targets Weeks / reference tables; registry-only `rec…` IDs
- Every created Submission is stamped `SEASON-SIM|<run_id>` for cleanup targeting

## Before the final authorized run

1. Finish **Program Homework Assignments** (18) and **Zoom Meetings**
2. Ensure **Weeks** cover May 1 – June 30, 2027
3. Apply gated clock override per operator checklist; keep restore formula ready
4. Verify Resend sender already used by live Hub pipeline
5. Confirm enrollment Parent Email is the allowlist address
6. Run `preflight` until `sufficient_for_final_run` (or knowingly accept warnings)
7. Run `dry-run` and review reports
8. Only then run execute with all confirm tokens + `--enable-email-delivery`
