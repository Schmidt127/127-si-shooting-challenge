# SC-163 — Goal Met Date (schema + Automation 066 + backfill)

**Status:** Ready for Mike review — **not live-complete** until steps below are done  
**Backlog:** SC-163  
**Production base:** `appn84sqPw03zEbTT`  
**Do not execute until Mike approves**

**Rule:** Production changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## What this fixes

`Goal Met Date` is currently a **lookup** from Award Recipients → Date Awarded. Product rule: first **Activity Date** the athlete’s counted shots crossed the target. Convert field + paste **066 v4.0** + backfill blanks only.

**Capacity:** Do **not** create Automation 122. Goal Met Date is owned by **066**.

---

## Ownership rule (final)

| Field | Meaning |
|---|---|
| **Goal Met?** | Formula: live `Total Shots Counted >= Target Goal Shots` — **do not change** |
| **Goal Met Date** | Writable date: first counted-submission Activity Date that crossed the target. Blank until met. Never overwrite. |
| **Award Recipients.Date Awarded** | Conquered Goal gift-card fulfillment — keep separate |

| Automation | Role |
|---|---|
| **010** | After successful submission reconciliation, sets `Run Shot Milestone Check?` |
| **066 v4.0+** | Milestone unlocks **and** Goal Met Date stamp (isolated) |
| **122** | **SUPERSEDED** — do not install |

---

## Production promotion steps

Execute **in order**.

### 1. Schema (UI-only — Mike) — exact one action

| # | Action | Exact spec | Done |
|---|--------|------------|------|
| 1 | Open **Enrollments** → field **Goal Met Date** (`fldohCsXsrU4hYqrJ`) | Currently lookup of Award Recipients → Date Awarded | [ ] |
| 2 | Convert field type to **Date** | Date format: **Local** / US `M/D/YYYY` (date only; no time). Preserve field ID if Airtable permits conversion. Description: `SC-163: first Activity Date counted shots crossed Target Goal Shots. Blank until met. Never overwrite.` | [ ] |
| 3 | Confirm field is **writable** (not lookup/formula) | Automations can write the field | [ ] |
| 4 | Expect existing lookup values to **clear** | Normal when converting lookup → date — then backfill | [ ] |

**Warn:** Existing lookup values may clear during conversion. Do not change `Goal Met?`. Do not delete Weeks / awards / payment fields.

After schema change, refresh snapshot when convenient:

```powershell
cd tools/airtable
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD-sc163
```

### 2. Paste Automation 066 v4.0 (no new automation)

| # | Action | Exact | Done |
|---|--------|-------|------|
| 1 | Open live **066 - Achievements and Milestones - Create Shot Milestone Unlocks** (`wflSMXHrUoFZEBLqf`) | Trigger stays: Enrollments when `Run Shot Milestone Check?` is checked | [ ] |
| 2 | Paste script | From `airtable/automations/shooting-challenge/066-achievements-and-milestones-create-shot-milestone-unlocks.js` — **skip GitHub header**; paste from production docblock through end | [ ] |
| 3 | Confirm version | Console / SCRIPT.version = **v4.0** | [ ] |
| 4 | Map new outputs (optional but recommended) | `goalMetDateActionOut`, `goalMetDateOut` | [ ] |
| 5 | Keep existing outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, unlock counters | [ ] |
| 6 | Do **not** create Automation 122 | File is a SUPERSEDED stub only | [ ] |
| 7 | Turn remains **ON** after Schmidt disposable test | | [ ] |

### 3. Extension backfill

| # | Action | Done |
|---|--------|------|
| 1 | Run `airtable/extension-scripts/safe-backfills/backfill-goal-met-date.js` with `DRY_RUN = true` | [ ] |
| 2 | Review planned rows; unprovable rows listed separately | [ ] |
| 3 | Set `CONFIRM_WRITE = true`, `DRY_RUN = false`; re-run until `remainingCount = 0` | [ ] |
| 4 | Re-run probe: `python tools/airtable/sc163_goal_met_date_probe.py` — expect no `met_blank_date` for provable rows | [ ] |

### 4. Disposable live test (Schmidt only)

| # | Test | Expected | Done |
|---|------|----------|------|
| 1 | Athlete1 Schmidt Goal Met Date after 066 run / backfill | First counted crossing Activity Date (probe: `2026-08-30`) | [ ] |
| 2 | Re-check `Run Shot Milestone Check?` on same enrollment | `goalMetDateActionOut=skipped_already_set`; date unchanged; no duplicate milestones | [ ] |
| 3 | Athlete not yet at target | Goal Met Date stays blank | [ ] |

---

## Rollback

1. Re-paste prior **066 v3.9** from GitHub history / prior paste artifact (Goal Met Date writes stop).  
2. Do **not** convert Goal Met Date back to award lookup (that reintroduces pollution).  
3. Clearing a wrongly stamped date is a controlled manual edit only when Mike confirms the date was invented (should not happen with these scripts).  
4. Never install Automation 122.

---

## Evidence (pre-install)

- Audit: [`docs/audits/SC-163-GOAL-MET-DATE-RELIABILITY.md`](../audits/SC-163-GOAL-MET-DATE-RELIABILITY.md)  
- Dry-run JSON: [`docs/audits/SC-163-goal-met-date-dry-run-20260905.json`](../audits/SC-163-goal-met-date-dry-run-20260905.json)
