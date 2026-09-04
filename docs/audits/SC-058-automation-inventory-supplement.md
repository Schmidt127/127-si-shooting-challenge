# SC-058 — Automation version inventory supplement

**Generated:** 2026-08-27 · **Branch:** `agent/config-automation-reliability`  
**Live attestation overlay:** 2026-09-04 — [`SC-057-058-LIVE-ATTESTATION-20260904.md`](./SC-057-058-LIVE-ATTESTATION-20260904.md) (50 live automations; selective `get_automation` Version strings)  
**Primary inventory:** [`docs/AUTOMATION_VERSION_INVENTORY.md`](../AUTOMATION_VERSION_INVENTORY.md)  
**Workflow reliability inventory (authoritative 2026-09-04):** [`WORKFLOW-RELIABILITY-INVENTORY-20260904.md`](./WORKFLOW-RELIABILITY-INVENTORY-20260904.md)  
**Trigger extract:** [`sc-057-trigger-inventory.json`](./sc-057-trigger-inventory.json)

## Repo verification (2026-08-27)

| Metric | Value | Evidence |
|--------|-------|----------|
| Active numbered scripts in `shooting-challenge/` | **57** | `readdir` excluding `_superseded`, `_design-alternatives` |
| Scripts with SCRIPT/docblock version | **50+** | Header parse in inventory |
| Scripts with `*confirm in Airtable*` trigger | **~25** | `extract-automation-triggers.mjs` |
| Production-only by design | **115** | automation-index |
| Retired in repo disposition | **043, 063, 068, 112** | SC-057 inventory |

## Evidence labels used

| Label | Meaning |
|-------|---------|
| `verified_from_repository` | GitHub SCRIPT header / docblock |
| `verified_from_agent_report` | Dated deploy-checklist or Mike overlay in repo |
| `requires_airtable_ui_confirmation` | ON/OFF, trigger conditions, pasted version |
| `historical` | Superseded 117a/b, pre-refresh Automations table |
| `unknown` | Not guessed |

## Scripts with strong repo headers (sample)

| # | Repo version | versionDate in SCRIPT/docblock |
|---|--------------|--------------------------------|
| 010 | v10.12 | 2026-08-22 |
| 020 | v3.7 | 2026-08-20 |
| 057 | v2.0 | 2026-08-23 |
| 065 | v10.3 | 2026-08-24 |
| 066 | v3.9 | 2026-08-24 |
| 101 | v6.7+ | see script header |
| 117 | v2.1 | 2026-08-19 |

Full table remains in `AUTOMATION_VERSION_INVENTORY.md` — this supplement adds **count verification** only.

## Live version sample (2026-09-04 `get_automation`)

| # | Live Version | GitHub | Notes |
|---|--------------|--------|-------|
| 010 | v10.13 | v10.13 | MATCH |
| 041 | v5.1 | v5.1 | MATCH · cron 15m |
| 057 | 2.3 | 2.3 | MATCH |
| 058 | 1.5 | 1.5 | MATCH · trigger risk SF-02 |
| 059 | v3.7 | v3.7 | MATCH |
| 065 | v10.6 | v10.6 | MATCH |
| 101 | v6.8 | v6.7 | Drift — Agent 1 / SC-147 |

Production `Automations` table **Automation Code** column returned empty via MCP this pass — do not use it for version truth until Mike refreshes.

## Required Mike UI confirmations

1. ~~Paste pending: **010 v10.12**.~~ Superseded — live **010 v10.13** attested 2026-09-04.
2. Confirm **070a** intentional ON (live deployed) vs historical OFF launch decision.
3. Optional spot-check remaining rows against live attestation list (50 automations).
4. Leave **101** paste to Agent 1.

## Regenerate

```bash
node tools/docs/extract-automation-triggers.mjs
node tools/docs/audit-automation-hardcodes.mjs
```
