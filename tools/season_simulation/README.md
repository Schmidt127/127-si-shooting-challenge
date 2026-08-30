# Season simulation — Athlete 1 (SC-SEASON-SIM-002)

Infrastructure for a future full-season simulation of the Shooting Challenge
application. **Default mode is dry-run / read-only.** This package does not run
the live simulation, delete Airtable data, or send email during development.

| | |
|---|---|
| **Backlog ID** | SC-SEASON-SIM-002 |
| **Athlete** | Athlete 1 · Grade 12 |
| **Window** | 2027-05-01 → 2027-06-30 inclusive (**61** days) |
| **Related** | SC-SEASON-SIM-001 (five-enrollment unattended package — still Planned / Future) |

## Purpose

Exercise as much of the live system as possible once authorized:

- Daily submissions, missed days, streaks, weekly goals
- Homework (incl. multi-asset) satisfactory / unsatisfactory paths
- Video feedback, Zoom attendance
- XP events, achievements, shot milestones
- Weekly summaries, weekly emails, coach digest, inactivity alerts
- Level advancement, level gates, gate-blocked probes
- Same-day and backdated Activity Date behavior
- Email handoff → Hub → Resend (and any Make handoff still in path)

Configuration (homework, Zoom, goals, XP rules, levels, gates, achievements,
weeks) is **always read from Airtable at runtime** — never hardcoded.

## Architecture

```text
tools/season_simulation/
  cli.py / __main__.py   CLI entry (`python -m season_simulation …`)
  preflight.py           Read-only connectivity + config report
  scenarios.py           Deterministic Athlete 1 61-day plan
  simulation_clock.py    Harness clock (Activity Date / day number)
  reference_data.py      Dynamic Grade Band / goal / HW / Zoom / levels
  execute.py             Gated write scaffolding (not run in infra sessions)
  cleanup.py             Gated delete-by-run-id (dry-run default)
  recipient_safety.py    Allowlist: schmidt@fairfieldbasketballclub.com only
  run_registry.py        Local JSON registry of created record IDs
  airtable_client.py     REST client; writes blocked unless allow_writes
  reports/               JSON + Markdown outputs
  run_registries/        Local run registries (gitignored contents)
  tests/test_offline.py  Offline unit tests
```

### Simulation clock

Airtable **cannot** future-date `CREATED_TIME()` / formula `Submitted At`
(= `CREATED_TIME()`). Business dating uses writable **`Activity Date`**.

Critical live formula on Submissions:

```text
Activity Date Is Future? = IF({Activity Date} > NOW(), 1, 0)
```

`Count This Submission?` is **0** when that flag is 1. Therefore May–June 2027
Activity Dates **will not count** if the run is executed before those calendar
dates unless a **temporary** override is applied for an authorized window:

1. **Preferred temporary approach:** add Config `Simulation Clock Now` (dateTime);
   change `Activity Date Is Future?` to compare against that field when set;
   restore the production `NOW()` formula immediately after the run.
2. **Alternate:** temporarily force `Activity Date Is Future?` → `0` for the run;
   restore after.
3. **No permanent weakening** of production future-date protections.

Also required: **Weeks** rows covering every date 2027-05-01 … 2027-06-30.

Harness `SimulationClock` tracks:

- simulation mode enabled/disabled
- current simulated date
- run ID
- day number 1–61
- same-day vs backdated classification relative to the simulated “today”

Code paths that differ only while simulation mode / temporary override is on
are documented in preflight output (`simulation_clock_blockers`,
`schema_requirements`) — not silently patched in production automations.

## Environment

Reuse existing PAT loading (`tools/airtable/.env` or `web/.env.local`):

```text
AIRTABLE_TOKEN=pat…          # or AIRTABLE_API_TOKEN
BASE_ID=appn84sqPw03zEbTT    # or AIRTABLE_BASE_ID
```

Python **3.11+** (repo uses 3.13). Dependencies: `requests`, `python-dotenv`
(already in `tools/airtable/requirements.txt`).

```bash
pip install -r tools/airtable/requirements.txt
```

## Airtable tables

**Reference (never deleted by cleanup):** Grade Bands, Target Goal Shots,
Program Homework Assignments, Homework Library, Zoom Meetings, Weeks, Levels,
Level Gate Rules, Achievements, Shot Milestones, XP Reward Rules, Config,
Program Instance - Sync, School - Synced.

**Transactional (cleanup-eligible when tagged by run registry):** Athletes,
Enrollments, Submissions, Submission Assets, Homework Completions, XP Events,
Athlete Achievement Unlocks, Streak Occurrences, Video Feedback, Weekly Athlete
Summary, Zoom Attendance, Email Handoff Queue.

Run marker stamped where writable: `SEASON-SIM|<run_id>` (e.g. Submission
`Video Upload Note`, HC `Notes`, XP `XP Reason Debug`). Primary cleanup
targeting uses the **local run registry**.

## Dynamic reference resolution

At runtime the package:

1. Finds the active **Grade Band** covering grade **12** (typically `9-12`).
2. Selects the **highest** `Total Shot Target` among that band’s Target Goal
   Shots (does **not** assume 12,000).
3. Lists **active** Program Homework Assignments for that band (IDs/dates/counts
   not hardcoded).
4. Lists non-cancelled **Zoom Meetings** and uses up to two in the scenario.
5. Checks **Weeks** coverage for the simulation window.
6. Counts Levels, Level Gate Rules, Achievements, Shot Milestones, XP Reward Rules.
7. Reports ambiguity (duplicate bands/goals) without inventing config.

## Commands

From repo root (PowerShell):

### Offline tests (safe)

```powershell
python -m unittest tools.season_simulation.tests.test_offline -v
```

Or:

```powershell
cd tools
python -m unittest season_simulation.tests.test_offline -v
```

### Preflight (read-only)

```powershell
cd tools
python -m season_simulation preflight
```

### Dry-run (default planning; no writes / no email)

```powershell
cd tools
python -m season_simulation dry-run
```

Offline planner only (synthetic IDs — never execute):

```powershell
cd tools
python -m season_simulation dry-run --offline-fixture
```

### Execute (gated — do not run until authorized)

```powershell
cd tools
python -m season_simulation execute --execute --confirm "SEASON-SIMULATION-2027" --enable-email-delivery
```

Infrastructure sessions **abort execute before any write**. Full writer waits on
Weeks coverage + simulation-clock override sign-off.

### Cleanup (dry-run default)

```powershell
cd tools
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…"
```

Delete (authorized only; same confirm token):

```powershell
cd tools
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…" --execute --confirm "SEASON-SIMULATION-2027"
```

Infrastructure sessions force cleanup to **dry-run plan only**.

## Reports

Written under `tools/season_simulation/reports/`:

| Report | Contents |
|---|---|
| `preflight-*.json` / `.md` | Connectivity, tables, Grade 12 band, highest goal, HW/Zoom counts, clock blockers |
| `dry-run-*.json` / `.md` | Full 61-day plan, intended writes, email events, cleanup scope |
| `cleanup-*.json` | Targeted record IDs by table (dry-run or deleted) |

## Safety controls

- Dry-run is default; `AirtableClient(allow_writes=False)` raises on create/update/delete.
- Execute/cleanup require **both** `--execute` and `--confirm SEASON-SIMULATION-2027`.
- Email recipient allowlist: **`schmidt@fairfieldbasketballclub.com` only**.
- No `[TEST]` / `[SIMULATION]` labels on subjects/bodies for authorized live-looking mail.
- Cleanup never targets reference/config tables; registry-only allowlist of `rec…` IDs.
- Stop on integrity / unsafe-recipient / destructive-safety errors.

## Before the final authorized run

1. Finish editing **Program Homework Assignments** and **Zoom Meetings**.
2. Ensure **Weeks** cover May 1 – June 30, 2027.
3. Apply **temporary** simulation-clock formula/Config override; document restore steps.
4. Verify Resend **sender domain/address** already used by the live Hub pipeline.
5. Confirm enrollment Parent Email is the allowlist address.
6. Run `preflight` until `sufficient_for_final_run` is true (or knowingly accept warnings).
7. Run `dry-run` and review reports.
8. Only then run execute with confirm token + `--enable-email-delivery`.

## Email delivery enablement

During development: **no sends**. Dry-run reports intended
`DAILY_SUBMISSION` / `WEEKLY_ATHLETE_SUMMARY` / `COACH_DIGEST` /
`INACTIVITY_ALERT` events with `send: false`.

Authorized run: leave subjects/bodies unmodified (live-looking); force recipient
to `schmidt@fairfieldbasketballclub.com`; prefer existing Email Handoff Queue →
079 → Hub → Resend path. Do not invent a sender address.
