# Mike actions — Automation + data model audit (2026-07-24)

No agent production changes. Confirm in Airtable / Make UI.

## P0 — before any Live weekly email schedule

1. **074** inputs: `sendMode` / `sendModeInput` = **Live** (or blank with WAS `sendMode=Live`). **Never leave fixed Test.**
2. Keep **118** and **119** schedules **OFF** until [`C-011-weekly-email-schedule-activation-checklist.md`](../../deploy-checklists/C-011-weekly-email-schedule-activation-checklist.md).
3. Confirm Make **`Weekly Athlete Summary - Bulk Email - May 18`** is **ON** (not `Weekly Athlete Summary Updated`).

## P1 — reliability attestation

| # | Expected repo version | Confirm |
|---|----------------------|---------|
| 020 | **v3.0.0** | Grade Band create/repair; no full 063 |
| 054 | **v5.6** | Streak XP |
| 066 | **v3.3** | Shot milestones |
| 072 | **v4.0** | emptyWeekPolicy |
| 074 | **v2.1** | never clears Sent? |
| 118 / 119 | **v1.4** | schedules OFF; dryRun true |

4. **112 OFF**. 5. **063/111** deleted or OFF. 6. Exactly one of **117** or **117c** creates `ZOOM_CREDIT|`. 7. **117** never writes Attendees. 8. **059** uses Created + Pending (not Ready formula alone).

## P2 / P3

9. Weekly Threshold XP: implement writer or document unused.  
10. Re-export Automations table including 115–119/070c/116.  
11. Refresh `airtable/schema/current/` after next schema export.

## Explicit non-actions

Do not delete fields/tables, rename primaries, send parent emails, or enable 118/119 Live without checklist.
