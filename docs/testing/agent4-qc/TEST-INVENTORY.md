# Agent 4 — Test Inventory

**Last updated:** 2026-07-24  
**Evidence class:** repository scan + prior RESULTS docs (not live PROD unless noted)

## 1. Suite catalog

| Suite | Path | Style | Behaviors covered | Architecture match |
|-------|------|-------|-------------------|--------------------|
| WAS email contracts | `tests/was-email-contracts/` | Contract + static | Uniqueness, empty-week policy, handoff ownership, **Live/Test sendMode regression** | Matches verified 2026-07-24 architecture |
| Homework contracts | `tests/homework-contracts/` | Contract | Uniqueness, LA routing, quiz | Aligns with 020/067 |
| Config selection | `tests/config-selection/` | Unit | Year-specific Config resolve | Aligns with multi-Config decision |
| V2 engine contracts | `lib/v2-engine-contracts.test.js` | Unit/contract | Source keys, gates, streaks, Perfect Week, WAS gates | Canonical pure logic |
| Overnight Perfect Week | `overnight-perfect-week.test.js` | Unit | Sun–Sat, bulk-day fail, Zoom optional | Matches PW rules |
| Agent 4 PW edges | `agent4-perfect-week-edges.test.js` | Unit | Blank requireds, historical keys, override isolation | Supplement |
| Overnight streak/milestone | `overnight-streak-milestone-dedupe.test.js` | Unit | Blocks, unlocks, Source Keys | Matches 053/054/066 |
| Overnight level gates | `overnight-level-gate-boundaries.test.js` | Unit | XP/gate boundaries (PROD-shaped) | Matches 041/042 |
| Agent 4 XP dedupe matrix | `agent4-xp-dedupe-matrix.test.js` | Unit/static | All major XP families + weekly-threshold gap | Source Key SoT |
| 072/074 helpers | `072-074-email-helpers.test.js` | Extract-from-source | Formatting, normalizeSendMode | Matches scripts |
| 118/119 + C-011 | `118-119-week-key`, `c011-*` | Contract | Denver week key, schedule | C-011 |
| 115/117 offline | `tools/testing/tests/` | Mocked integration | Real scripts under mocks | Live evidence separate |
| Web vitest | `web/` `npm test` | Unit | Mappers/security/levels | Frontend |
| Scenario catalog | `docs/testing/scenarios/` | Fixture JSON | SCN-001…020 | Manual / C-020 |
| Audits A–J / 090 | extension audits | Live dry-run | Integrity | Primary prod trust |
| Release validator | `tools/validate-v2-release-readiness.js` | Static | Docs/automation consistency | Offline |

## 2. Stale / superseded claims

| Item | Issue | Status |
|------|-------|--------|
| Fixed PROD `sendMode=Test` | Forced Test branch; no Sent? writeback | Agent 4 regression + architecture |
| 074 marks Sent? | False — Make Live owns writeback | Guarded in regression |
| 118 builds HTML | False — 072 builds | Handoff ownership tests |
| Team Shot Tracker inactivity alerts | Out of scope | Must not appear |

## 3. Evidence categories

Repository test pass · verified user statement (Live writeback) · canonical architecture doc · script version headers · selective live PROD citations (115, empty-week email, Live writeback).
