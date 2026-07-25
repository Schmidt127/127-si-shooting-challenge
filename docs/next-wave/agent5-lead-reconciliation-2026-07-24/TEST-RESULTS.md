# Agent 5 — Test Results

**Date:** 2026-07-24  
**Branch:** `agent5/lead-recon-v2`  
**Defect fixed:** `tests/was-email-contracts/run-all.js` had a UTF-8 BOM from PowerShell write → SyntaxError; rewritten UTF-8 no BOM.

## Suites run

| Suite | Command | Result |
|-------|---------|--------|
| WAS email contracts | `node tests/was-email-contracts/run-all.js` | **PASS** (all nested ok) |
| Data-model contracts | `node tests/data-model/field-contracts.test.js` | **PASS** 14/14 |
| Known reference numbers | `node tests/automation-contracts/known-reference-numbers.test.js` | **PASS** |
| Source key registry | `node tests/automation-contracts/source-key-registry.test.js` | **PASS** |
| Config selection | `node tests/config-selection/resolve-config.test.js` | **PASS** |
| Homework contracts | `node tests/homework-contracts/run-all.js` | **PASS** |
| Agent 4 full suite | `node tools/testing/run-agent4-suite.js` | **PASS** 20/20 |

## Not run (blocked / not required for this docs+contract package)

| Suite | Reason |
|-------|--------|
| `web` vitest / Playwright | Not modified; may need `npm install` in `web/` |
| Live Airtable / Make | Not authorized; agents must not send email |

## Regression coverage added/kept

- Agent 4 `send-mode-live-test-regression.test.js` (074 Test→Live incident)  
- Existing `send-mode-helper` + `sendmode-prod-contract` retained in `run-all.js`  
