# S22 Phase A — Migration record (006∪021 → 117)

**Date:** 2026-07-14  
**Authorized:** Mike approved Phase A only  
**Auth doc:** `docs/overnight-runs/stages/S22-AUTHORIZED.md`

## Changes (repo)

| Item | Path |
|------|------|
| Combined SoT | `021-submission-intake-and-asset-creation-set-attachment-status-and-video-count.js` |
| 006 library | throws if pasted; use combined |
| Pre-combine 021 library | redirect / throw |
| Rollback | `_rollback/phase-a-006-021-2026-07-14/` |
| Offline tests | `tools/airtable/tests/test_phase_a_021_combined.py` **13/13** |
| Live API mirror | `docs/audits/phase-a-021-combined-live-dev-2026-07-14.json` **PASS** |
| Live repair path | `docs/audits/phase-a-021-repair-path-2026-07-14.json` **PASS** |

## Ordered steps in combined script

1. Attachment Upload Status (managed: empty / No Files / Processing only)  
2. Video Count from Video Upload length  
3. Atomic write of both fields when needed  

## Trigger union

Watch HW Sub 1 / HW Sub 2 / Video Upload + Match ANY of former 006� union

Watch HW Sub 1 / HW Sub 2 / Video Upload + Match ANY of former 006∪021 conditions.

## Airtable UI (requires Mike)

See `docs/deploy-checklists/PHASE-A-006-021-mike-ui-actions.md`.

| UI step | Status |
|---------|--------|
| Paste combined into 021 | **Pending Mike** |
| Retire 006 (+1 free) | **Pending Mike** |
| Create 117 OFF, blank webhook | **Pending Mike** |

## Untouched

PROD · Phase B+ · Folder 07 OFF automations · real email webhooks
