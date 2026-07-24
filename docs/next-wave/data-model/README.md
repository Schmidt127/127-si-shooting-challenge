# Agent 2 — Airtable Data Model & Field Cleanup

**Role:** Schema structure, field contracts, keys, formulas, yearly separation, safe cleanup planning  
**Date:** 2026-07-24  
**Base:** PROD `appn84sqPw03zEbTT`  
**Repo checkpoint at start:** `a8f3b00` (includes `adfabc5` weekly-email architecture + `074` Live writeback rule)  
**Scope:** Shooting Challenge only — **not** Team Shot Tracker; no inactivity-alert systems

---

## Authority order (do not invert)

| Rank | Source | Use for |
|------|--------|---------|
| 1 | PROD schema snapshot `airtable/schema/snapshots/prod-foundation-reset-20260723-post-ts/` | Table/field/type/formula/link facts |
| 2 | Verified production run docs (`docs/next-wave/was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`, user-verified sendMode Live) | Live email/status ownership |
| 3 | Agent 9 ownership + XP registry (`docs/next-wave/automation-ownership/`) | Script writers / Source Keys |
| 4 | Automation script CONFIG + version headers | Field names scripts expect |
| 5 | Hand maps in `airtable/schema/current/` | **Stale until refreshed** — treat as pointers only after this pack |
| 6 | Older planning docs | Historical intent only |

**Evidence labels used in this pack:** `verified-prod` · `schema-snapshot` · `repo-script` · `inferred` · `unverified`

---

## Deliverables in this folder

| File | Contents |
|------|----------|
| [CANONICAL-TABLE-MAP.md](./CANONICAL-TABLE-MAP.md) | All major SC tables: purpose, PK, key/link/computed fields |
| [FIELD-OWNERSHIP-MATRIX.md](./FIELD-OWNERSHIP-MATRIX.md) | Writers/readers by ownership class |
| [RELATIONSHIP-MAP.md](./RELATIONSHIP-MAP.md) | Link integrity + orphan risks |
| [UNIQUE-KEY-AUDIT.md](./UNIQUE-KEY-AUDIT.md) | Dedupe / identity keys |
| [FORMULA-ROLLUP-AUDIT.md](./FORMULA-ROLLUP-AUDIT.md) | Formula/rollup hazards |
| [ANNUAL-CONFIG-WEEK-AUDIT.md](./ANNUAL-CONFIG-WEEK-AUDIT.md) | Year separation Config/Weeks/Enrollment |
| [CLEANUP-CLASSIFICATION.md](./CLEANUP-CLASSIFICATION.md) | Keep / Hide / Legacy / Do not use / Unknown |
| [SAFE-MIGRATION-PLAN.md](./SAFE-MIGRATION-PLAN.md) | Rename/merge/retire plans (no prod execution) |
| [MIKE-ACTIONS.md](./MIKE-ACTIONS.md) | Exact Airtable/OMNI actions only |
| [REPORT.md](./REPORT.md) | Agent 2 final report |
| [RESULTS.json](./RESULTS.json) | Machine-readable summary |

## Related canonical (reuse, do not fork)

- XP Source Keys → `docs/next-wave/automation-ownership/xp-source-key-registry.json`
- WAS uniqueness → `docs/next-wave/automation-ownership/WAS-UNIQUENESS-CONTRACT.md`
- Writer ownership → `docs/next-wave/automation-ownership/SINGLE-WRITER-OWNERSHIP-MATRIX.md`
- Critical-path ownership (foundation) → `docs/foundation-reset/CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md`
- Schema export index → `docs/foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md`

## Tests

```text
node tests/data-model/field-contracts.test.js
```

## Hard restrictions (Agent 2)

- No field deletes, renames, type changes, or primary-field changes in production
- No new replacement fields without a documented migration requirement
- No live Airtable / Make / Fillout / Softr / Gmail / Drive changes unless Mike authorizes that exact action
- No Team Shot Tracker inactivity alerts
