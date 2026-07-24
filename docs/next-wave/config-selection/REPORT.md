# REPORT — Agent 10 Year-Aware Config Selection

**Date:** 2026-07-24  
**Branch:** `agent10/config-selection`  
**Scope:** Deterministic year-aware Config resolver + consumer audit  
**Config records modified:** **0** (none deleted, none edited)

## Verdict

Four Config rows are an intentional year registry (Max Videos 4/6/5/4). The defect is ambiguous selection (`records[0]`, sparse-field heuristics), not multi-row existence. A pure resolver, tests, inventory, 042 audit, and phased rollout are in repo. No PROD paste.

## Deliverables

| Artifact | Path |
|---|---|
| Consumer inventory | `docs/next-wave/config-selection/CONFIG-CONSUMER-INVENTORY.md` |
| Selection contract | `docs/next-wave/config-selection/CONFIG-SELECTION-CONTRACT.md` |
| Resolver | `lib/config-selection/index.js` |
| Tests | `tests/config-selection/resolve-config.test.js` |
| 042 audit | `docs/next-wave/config-selection/AUTOMATION-042-CONFIG-AUDIT.md` |
| 042 proposed guard | `docs/next-wave/config-selection/proposals/042-year-aware-zoom-gate-guard.PROPOSED.js` |
| Rollout runbook | `docs/next-wave/config-selection/CONFIG-ROLLOUT-RUNBOOK.md` |
| Mike actions | `docs/next-wave/config-selection/MIKE-ACTIONS.md` |
| Master update proposal | `docs/next-wave/config-selection/MASTER-UPDATE-PROPOSAL.md` |
| Results | `docs/next-wave/config-selection/RESULTS.json` |

## Consumers audited

Direct first-record / heuristic readers, Stage 17 Effective Config path, 117 family (indirect), 042 (indirect), 057 Perfect Week hardcode, 010 XP rules (non-Config), final-email tools, web (no Config table), formulas (`>= 3` video requirement).

## Ambiguous readers

- Superseded 117a/117b `records[0]`
- `repair-final-090g` `records[0]`
- `preview_final_email.py` / `generate_final_summary_preview.py` `[0]`
- Stage 17 deploy Config heuristics (linked / default / percent-set)
- Zoom Global/Program Config links without year validation

## Resolver behavior

Hierarchy: explicit Config id → Program Instance school year → Enrollment School Year → explicit test-season override only. Normalize dashes/whitespace; reject blank/malformed; fail on duplicate/missing year and PI/Enrollment mismatch; never calendar year; never first-record fallback.

## Tests run

`node tests/config-selection/resolve-config.test.js` — 15 assertions, all pass.  
Proposed 042 guard smoke — mismatch blocks when mode=`error`.

## Scripts needing later paste

None in this wave. Future paste candidates after DEV dry-run: 042 (proposed guard), any revived Config-reading automation. Tools adopt without Airtable paste.

## Mike actions

See `MIKE-ACTIONS.md` — keep four Config rows; do not follow collapse advice; validate year spellings; OMNI-check Zoom Config links; authorize phased dry-run before any paste.
