# C-024 — audit-dedupe-key-coverage DEV runbook (Stage 3)

**Date:** 2026-07-13  
**Worker:** D — Overnight V2 Stage 3  
**Script:** `airtable/extension-scripts/audits/audit-dedupe-key-coverage.js`  
**Base:** DEV `appTetnuCZlCZdTCT` first  
**Mode:** Dry-run only — **no writes**

---

## 1. Prerequisites

| Item | Requirement |
|------|-------------|
| Stage 2 contract | [C-024-dedupe-key-contract-stage2.md](./C-024-dedupe-key-contract-stage2.md) |
| Check catalog | [C-024-audit-dedupe-key-coverage-requirements-stage2.md](./C-024-audit-dedupe-key-coverage-requirements-stage2.md) |
| Owner rules | [v2-change-backlog.md § Owner business decisions](../v2-change-backlog.md#owner-business-decisions--approved-2026-07-13) |

---

## 2. DEV run steps (Mike / OMNI)

1. Open **DEV** base → **Extensions** → **Scripting**.
2. Paste `audit-dedupe-key-coverage.js` (skip GitHub header if any).
3. Run — expect JSON with `mode: "dry-run"` and `summary` counts.
4. Save output JSON to `docs/audits/` with date stamp.
5. **Do not** run on PROD without explicit Mike approval.

---

## 3. Check interpretation

| ID | Action if non-zero |
|----|-------------------|
| DK-01 | Investigate duplicate active XP — use **116** / manual deactivate |
| DK-02 | Repair homework XP link mismatch |
| DK-03 | Consolidate HC rows — resubmission link model (owner #2) |
| DK-04 | Owner review — **do not auto-delete** (owner #3) |
| DK-05 | Keep earliest unlock; flag later (owner #5) |
| DK-06 | Document writer path; backfill Source Key |
| DK-07 | Populate C-023 review fields |
| DK-08 | Deactivate conflicting Zoom XP — live vs recording exclusive |

---

## 4. Blocked / out of scope

- PROD paste or automation enable
- Schema field creation (`Progress Processing Enabled?`, Learning Activities)
- Tutorials table changes (C-026 blocked)
- Any write backfill without `CONFIRM_WRITE`

---

*Worker D · Stage 3 runbook · v0.1*
