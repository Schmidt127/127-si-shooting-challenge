# SC-168 — Weekly email stage (119 substitute)

**Backlog:** SC-168  
**Purpose:** Authorized Season Sim exercise of WEEKLY Hub handoffs without changing Production Sunday 118/119 schedules.  
**Allowlist only:** `schmidt@fairfieldbasketballclub.com`  
**Hub:** keep Test Mode + Test Allowlist.

---

## When to use

After `execute --enable-email-delivery` has armed Build Weekly and **072** has set `Weekly Email Ready?` on disposable WAS rows.

Do **not** expect WEEKLY Email Handoff Queue rows from execute alone (sim clock does not fire 118/119 cron).

---

## Commands (from `tools/`)

```powershell
cd tools

# Read-only plan from run registry WAS_EMAIL_ARM ids
python -m season_simulation weekly-email-stage `
  --run-id "SEASON-SIM-2027-…" `
  --weekly-email-mode plan

# Verify Ready / handoff state
python -m season_simulation weekly-email-stage `
  --run-id "SEASON-SIM-2027-…" `
  --weekly-email-mode verify

# Arm Send to Make? on ONE Ready allowlisted WAS (074 → Hub)
python -m season_simulation weekly-email-stage `
  --run-id "SEASON-SIM-2027-…" `
  --weekly-email-mode apply `
  --weekly-email-limit 1 `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM"
```

Optional: `--was-id rec…` (repeatable), `--enrollment-id rec…`.

Reports: `tools/season_simulation/reports/weekly-email-stage-{mode}-{run_id}.json`

---

## Acceptance

| Check | Pass |
|---|---|
| Recipients | Mike allowlist only — STOP otherwise |
| Apply default | `limit=1` |
| Handoff | One `WEEKLY_ATHLETE_SUMMARY` Accepted (or Hub-equivalent status) |
| Retry | Re-arm does not create a second Handoff Key row |
| Schedules | 118/119 Sunday cron unchanged |
| Cleanup | Registry-scoped disposable rows only |

---

## Hard stops

- No family emails  
- No full Season Sim rerun just for this checklist  
- No temporary Season Sim formulas for this stage alone  
- No paste 013 / 067 / 122; no 021; no FUT-029  
- Do not disable Hub Test Mode
