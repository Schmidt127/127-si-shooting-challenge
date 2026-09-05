# SC-163 — Goal Met Date (schema + Automation 066 + backfill)

**Status:** Ready for Mike review — **not live-complete** until steps below are done  
**Backlog:** SC-163  
**Production base:** `appn84sqPw03zEbTT`  
**Do not execute until Mike approves**

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## Pre-conversion safety (2026-09-05 — complete, read-only)

| Category | Count |
|---|---:|
| blank and not met | 3 |
| blank but met / provable | 1 |
| nonblank and equal to crossing | 0 |
| nonblank and different | 0 |
| met but unprovable | 0 |
| **Nonblank Goal Met Date lookups** | **0** |

Provable blank to stamp after conversion: **Athlete1 Schmidt** → `2026-08-30` (Award Recipient Date Awarded exists as `2026-09-03` — different; must never become Goal Met Date).

Evidence:
- [`../audits/SC-163-preconversion-snapshot-20260905.json`](../audits/SC-163-preconversion-snapshot-20260905.json)
- [`../audits/SC-163-preconversion-rollback-evidence-20260905.md`](../audits/SC-163-preconversion-rollback-evidence-20260905.md)

**Conversion expectation:** lookup → date **clears** computed lookup values (high confidence). Verify blanks immediately after convert.

---

## What this fixes

`Goal Met Date` is currently a **lookup** from Award Recipients → Date Awarded. Product rule: first **Activity Date** the athlete’s counted shots crossed the target. Convert field + paste **066 v4.0** + migration backfill.

**Capacity:** Do **not** create Automation 122. Goal Met Date is owned by **066**.

---

## Ownership rule (final)

| Field | Meaning |
|---|---|
| **Goal Met?** | Formula: live `Total Shots Counted >= Target Goal Shots` — **do not change** |
| **Goal Met Date** | Writable date: first counted-submission Activity Date that crossed the target. Blank until met. Never overwrite once correct. |
| **Award Recipients.Date Awarded** | Conquered Goal gift-card fulfillment — keep separate |

| Automation | Role |
|---|---|
| **010** | After successful submission reconciliation, sets `Run Shot Milestone Check?` |
| **066 v4.0+** | Milestone unlocks **and** Goal Met Date stamp (isolated) |
| **122** | **SUPERSEDED** — do not install |

---

## Mike exact UI and execution sequence

Execute **in this order**. Do not skip the post-convert blank check.

### Step A — Schema convert (UI-only)

| # | Action | Exact spec | Done |
|---|--------|------------|------|
| A1 | Open **Enrollments** → **Goal Met Date** (`fldohCsXsrU4hYqrJ`) | Currently lookup Award Recipients → Date Awarded | [ ] |
| A2 | Convert field type to **Date** | Date only; **Local** / US `M/D/YYYY`. Preserve field ID if Airtable permits. Description: `SC-163: first Activity Date counted shots crossed Target Goal Shots. Blank until met. Never overwrite.` | [ ] |
| A3 | **Stop and verify** | Every Enrollment Goal Met Date cell is **blank**. If any date remains, do **not** paste 066 yet — run migration backfill dry-run first and treat remaining values as untrusted until they equal a provable crossing. | [ ] |

**Warn:** Existing lookup values are expected to **clear**. Do not change `Goal Met?`. Do not delete Weeks / awards / payment fields.

### Step B — Paste Automation 066 v4.0

| # | Action | Exact | Done |
|---|--------|-------|------|
| B1 | Open **066** (`wflSMXHrUoFZEBLqf`) | Trigger unchanged: `Run Shot Milestone Check?` checked | [ ] |
| B2 | Paste script | `066-achievements-and-milestones-create-shot-milestone-unlocks.js` — skip GitHub header | [ ] |
| B3 | Confirm version | `v4.0` | [ ] |
| B4 | Map outputs | `goalMetDateActionOut`, `goalMetDateOut` (+ existing outputs) | [ ] |
| B5 | Do **not** install Automation 122 | | [ ] |

### Step C — Migration backfill (after A3 blanks verified)

| # | Action | Done |
|---|--------|------|
| C1 | Extension `backfill-goal-met-date.js` with `MIGRATION_MODE = true`, `DRY_RUN = true` | [ ] |
| C2 | Confirm planned stamp for Athlete1 Schmidt = `2026-08-30`; any mismatched legacy → replace; unprovable → clear/report (never invent) | [ ] |
| C3 | `CONFIRM_WRITE = true`, `DRY_RUN = false`; re-run until remaining = 0 | [ ] |
| C4 | Optional: set `MIGRATION_MODE = false` for later steady-state blank-only passes | [ ] |
| C5 | Probe: `python tools/airtable/sc163_goal_met_date_probe.py` | [ ] |

### Step D — Disposable live test (Schmidt)

| # | Test | Expected | Done |
|---|------|----------|------|
| D1 | Athlete1 Schmidt Goal Met Date | `2026-08-30` (not award `2026-09-03`) | [ ] |
| D2 | Re-check `Run Shot Milestone Check?` | `skipped_already_set`; no duplicate milestones | [ ] |
| D3 | Not-met athletes | Goal Met Date blank | [ ] |

---

## Rollback

1. Keep pre-conversion snapshot JSON as authority for pre-convert lookup/award state.  
2. Re-paste prior **066 v3.9** if automation must roll back (Goal Met Date writes stop).  
3. Do **not** convert Goal Met Date back to award lookup.  
4. If a stored date equals a legacy award date and differs from the computed crossing, clear or replace via migration backfill — never leave award dates as Goal Met Date.  
5. Never install Automation 122.

---

## Evidence

- Pre-conversion snapshot / rollback: links above  
- Reliability audit: [`../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md`](../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md)  
- Inventory tool: `python tools/airtable/sc163_preconversion_inventory.py`
