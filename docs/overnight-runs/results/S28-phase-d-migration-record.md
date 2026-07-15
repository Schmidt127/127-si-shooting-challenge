# Phase D migration record — 072 ∪ 074 (2026-07-15)

| Field | Value |
|-------|--------|
| Base | DEV `appTetnuCZlCZdTCT` |
| Survive | **072** v4.0.0 Build (+ optional Send) Weekly Summary Email Package |
| Absorb / retire | **074** → GitHub library stub; **deleted** from DEV UI after live PASS |
| Decision | `docs/overnight-runs/results/S26-phase-d-decision.md` |
| Rollback | `airtable/automations/shooting-challenge/_rollback/phase-d-072-074-2026-07-14/` |

## Replacement evidence

| Gate | Evidence |
|------|----------|
| Combined SoT | `072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js` v4.0.0 |
| Offline contracts | `tools/airtable/tests/test_phase_d_072_074_combined.py` — 20/20 |
| Live no-send smoke | `docs/audits/phase-d-072-live-smoke-2026-07-15.json` — critical PASS |
| Mike retire signal | **Phase D UI complete** |

## Explicit non-changes

117 · other Folder 07 automations · PROD · real family email · production Make webhook

## Capacity delta

**+1 free** → **45 estimated occupied / 5 free**
