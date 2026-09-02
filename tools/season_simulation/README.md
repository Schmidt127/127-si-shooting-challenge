# Season simulation — Athlete 1 (SC-SEASON-SIM-002)

Infrastructure for a controlled **Production** full-season simulation of the
Shooting Challenge application. **Default mode is dry-run / read-only.**

| | |
|---|---|
| **Backlog ID** | SC-SEASON-SIM-002 |
| **Athlete** | Athlete 1 · Grade 12 |
| **Window** | 2027-05-01 → 2027-06-30 inclusive (**61** days) |
| **Airtable** | Production only `appn84sqPw03zEbTT` — **no DEV base** |
| **Email** | Off by default; optional phase allowlists `schmidt@fairfieldbasketballclub.com` only |
| **Related** | SC-SEASON-SIM-001 (five-enrollment package — still Planned / Future) |

Operator checklist (formulas, automations, rollback, commands):
[`docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md`](../../docs/deploy-checklists/SC-SEASON-SIM-002-operator-checklist.md)

## Purpose

Exercise as much of the **live** system as possible once authorized:

- Daily submissions, missed days, streaks, weekly goals
- Homework (18 existing PHAs; Weeks 1–8 of the sim window; Week 9 = zero HW)
- Early Bird is **out of window** (Week 0 is before May 2027)
- Video feedback, Zoom live + recorded attendance (SC-147 half-XP via **101 v6.8**)
- XP, achievements, levels — via **existing Production automations** (not duplicated here)
- Weekly summaries / emails only through live Hub paths when email phase enabled

**Creating records is not a pass.** Final success requires automations processed,
XP awarded, Perfect Week verified, and (if enabled) allowlisted email only.

## Architecture

```text
tools/season_simulation/
  cli.py / __main__.py
  preflight.py           Read-only connectivity + formula gate inspection
  scenarios.py           Deterministic Athlete 1 61-day plan
  simulation_clock.py    Harness clock + Activity Date Is Future? inspect
  same_day_contracts.py  Submitted Same Day? / Perfect Week Grace paste packets
  writer.py              Full execute orchestration (idempotent)
  execute.py / cleanup.py
  recipient_safety.py    Allowlist only
  memory_client.py       Offline execute tests
  reports/ / run_registries/
  tests/
```

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

```powershell
pip install -r tools/airtable/requirements.txt
```

## Commands

```powershell
cd tools
python -m unittest discover -s season_simulation/tests -v
python -m season_simulation preflight
python -m season_simulation dry-run
```

Execute (authorized only; email off):

```powershell
cd tools
python -m season_simulation execute --execute --confirm "SEASON-SIMULATION-2027"
```

Execute with email phase flag (allowlist only; send-arming still separate):

```powershell
cd tools
python -m season_simulation execute --execute --confirm "SEASON-SIMULATION-2027" --enable-email-delivery
```

Cleanup (dry-run default; never Weeks / schema / foreign run IDs):

```powershell
cd tools
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…"
python -m season_simulation cleanup --run-id "SEASON-SIM-2027-…" --execute --confirm "SEASON-SIMULATION-2027"
```

## Safety

- Dry-run default; writes blocked unless `--execute` + confirm token.
- Email off by default; never send to parent/athlete fields outside allowlist.
- Cleanup registry-scoped only.
- Harness does not implement XP / Perfect Week / email send logic.
- Restore temporary formulas after every authorized run.
