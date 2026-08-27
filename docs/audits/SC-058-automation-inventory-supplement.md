# SC-058 — Automation version inventory supplement

**Generated:** 2026-08-27 · **Branch:** `agent/config-automation-reliability`  
**Primary inventory:** [`docs/AUTOMATION_VERSION_INVENTORY.md`](../AUTOMATION_VERSION_INVENTORY.md)  
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

## Required Mike UI confirmations

1. Paste pending: **022 v2.2**, **010 v10.12** (if not already live per run history).
2. Confirm **112 OFF**, **077 deleted**, **070a** intentional OFF/ON per launch decision.
3. Complete remaining `*confirm in Airtable*` rows from trigger inventory JSON.

## Regenerate

```bash
node tools/docs/extract-automation-triggers.mjs
node tools/docs/audit-automation-hardcodes.mjs
```
