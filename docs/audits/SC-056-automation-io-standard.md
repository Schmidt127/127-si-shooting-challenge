# SC-056 — Automation script input/output standard

**Generated:** 2026-08-27 · **Branch:** `agent/config-automation-reliability`  
**Authority:** [`airtable/automations/AUTOMATION_SCRIPT_STANDARD.md`](../../airtable/automations/AUTOMATION_SCRIPT_STANDARD.md) · [`docs/v2/06-automation-standards.md`](../v2/06-automation-standards.md)

## Standard (required for new edits and V2 rewrites)

| Concern | Convention | Notes |
|---------|------------|-------|
| Read inputs | `const inputConfig = input.config();` or `const cfg = input.config();` | Single read at start of `main` |
| Trigger record id | **`recordId`** | Must validate non-empty and `startsWith("rec")` |
| Overall result | **`statusOut`** | `success` \| `skipped` \| `error` (lowercase) |
| What happened | **`actionOut`** | `created`, `updated`, `skipped_*`, `error` |
| Human reason | **`errorOut`** | Empty on success; message on skip/error |
| Debug | **`debugStep`** | Updated before each major step via `setOutputSafe` |
| Write outputs | **`setOutputSafe(key, value)`** | Never bare `output.set` without guard |

## Inventory (active production scripts)

| Pattern | Count (approx.) | Status |
|---------|-----------------|--------|
| Uses `input.config()` | 40+ | Standard |
| Uses `inputConfig` alias | 15+ | Acceptable alias |
| Emits `statusOut` | 25+ V2 scripts | Required on V2 path |
| Legacy without `statusOut` | **058** | Documented exception — migrate on next 058 touch |
| Validates `rec` prefix | All V2 list in test | Enforced by `automation-io-conventions.test.js` |

## Legacy exceptions (do not mechanical-rename)

| Script | Gap | Safe action |
|--------|-----|-------------|
| 053 | Non-empty `recordId` only | Add `startsWith("rec")` on next touch |
| 058 | No `statusOut` / `setOutputSafe` | Add on next substantive edit; do not paste until tested |
| 009, 013, 020, 021, 057, 072, 074, 075, 111, 112 | No `main()` wrapper | Per AUTOMATION_SCRIPT_STANDARD — exempt until touched |

## Tests

- `tests/automation-contracts/automation-io-conventions.test.js` — V2 output + recordId contract
- `tests/automation-contracts/hardcode-forbidden-patterns.test.js` — config selection guards

## Mike actions

- None for repo standardization pass.
- When pasting V2 scripts, map Airtable automation **Input variables** to `recordId` (dynamic trigger record).
