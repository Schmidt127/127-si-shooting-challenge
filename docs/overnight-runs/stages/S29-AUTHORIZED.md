# Stage S29 — AUTHORIZED (Lead + 2 agents)

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S29 |
| Package ID | `morning-lead-2agent-2026-07-15-s29` |
| Base SHA | `ed9d2f1cdb1c04f63302237b9d918808384472f5` |
| Date | 2026-07-15 |

## Objective

117 DEV activation readiness (repo only — do not enable), 022 rename/verify sheet, one website feature, Phase E analysis-only docs. No PROD / email / Make / AWS / Vercel / Fillout / Folder 07 / 117 ON.

## Capacity baseline

**45 estimated / 5 free** (Phase D COMPLETE).

## Lane assignments

| Role | Branch | Path ownership |
|------|--------|----------------|
| **Lead** | `overnight/lead-integration` | CONTROL, inventory, capacity, matrix, Phase E analysis, handoff, integration |
| **Agent A** | `overnight/v2-run/worker-a-s29-117-activation` | `docs/deploy-checklists/AUTOMATION-117-*`, `tools/airtable/phase_117*`, `tools/airtable/tests/test_c025_117*`, `docs/overnight-runs/results/S29-agent-a*` |
| **Agent B** | `overnight/v2-run/worker-b-s29-022-website` | `docs/deploy-checklists/AUTOMATION-022-*`, `web/**`, `docs/testing/**`, `docs/overnight-runs/results/S29-agent-b*` |

## Not authorized

PROD · real email · production Make/AWS/Vercel · public Fillout · other Folder 07 state · enabling **117** · deleting automations · Phase E Airtable implementation

## Definition of done

- [ ] Agent A: 117 Mike UI sheet + offline matrix + offline 22/22 (+ contracts)
- [ ] Agent B: 022 rename sheet + website feature + web green
- [ ] Lead: Phase E analysis only; integrate; re-verify; CONTROL; push; handoff
