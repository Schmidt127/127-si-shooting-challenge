# Stage S27 — AUTHORIZED (morning Lead + 2 agents, ~2h)

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S27 |
| Package ID | `morning-lead-2agent-2026-07-15` |
| Base SHA | `8b8f0b2df1969e02f2d0ae91b37dc47e9b77d0f9` |
| Date | 2026-07-15 |

## Objective

Finalize Phase D / 117 / 022 Mike-ready packages (repo only) and ship a bounded website feature set + regression matrix upgrades. No Airtable UI / PROD / email.

## C2 status (confirmed)

Mike deleted **111** — Phase C2 **COMPLETE**. Occupancy **46 estimated / 4 free**.

## Lane assignments

| Role | Path ownership (no overlap) |
|------|-----------------------------|
| **Lead** | `CONTROL.json`, integration, morning report, inventory/ledger |
| **Agent A** | `docs/deploy-checklists/PHASE-D-*`, `AUTOMATION-117-*`, `AUTOMATION-022-*`, related `tools/airtable/tests/test_phase_d*`, `phase_117*`, `docs/overnight-runs/results/S27-agent-a*` |
| **Agent B** | `web/**`, `docs/testing/**`, `docs/overnight-runs/results/S27-agent-b*`, `S27-website-*` |

## Not authorized

PROD Airtable/Make/AWS/Vercel · public Fillout · real email · Folder 07 state changes · enabling 117 · pasting Phase D · deleting automations

## Definition of done

- [ ] Agent A readiness packages reviewed
- [ ] Agent B website feature complete + verified
- [ ] Lead integrated green work; tests PASS
- [ ] CONTROL + morning report; Lead pushed
