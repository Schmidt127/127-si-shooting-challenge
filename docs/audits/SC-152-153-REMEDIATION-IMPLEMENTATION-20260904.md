# SC-152 / SC-153 — Remediation implementation (2026-09-04)

**Branch:** `fix/sc-152-153-pw-lifecycle-a2`  
**Gate:** A1 `COORDINATOR_IMPLEMENTATION_GATE: READY` (`03481f5a` / merged PR #402)

## Root causes addressed

| ID | Root cause | Fix |
|----|------------|-----|
| **SC-152 / SF-01** | 057 `recordMatchesConditions` on formula Queue that stayed 1 while Status=Ready → no re-entry | Live Queue formula now `Pending` **OR** writable `Perfect Week Recalc Needed?`; 057 **v2.4** clears Recalc on every writeback |
| **SC-153 / SF-02** | 058 positive-only trigger (Eligible=1 ∧ Unlock empty ∧ Ready) blocked withdraw/restore | 058 **v1.6** + lifecycle `recordUpdated` trigger (UI paste); script no-op safe deactivate/restore |

## Before → after state model

### Before

```
Queue?=1 while Pending|Ready (sticky) → 057 once
Eligible=1 ∧ Unlock∅ ∧ Ready → 058 create only
```

### After

```
Queue?=1 when Pending OR Recalc Needed?
  → 057 v2.4 → Ready + clear Recalc
Eligible / Status / helpers update
  → 058 v1.6 lifecycle → create | restore | deactivate
```

## Live Airtable changes this wave

| Change | Method | Status |
|--------|--------|--------|
| Queue formula (drop Ready sticky; use Recalc) | Schema (already live at remediation time) | **Live** |
| Recalc checkbox `fldH46SynZ19EosiG` | Present + description refreshed | **Live** |
| 057 script v2.4 | UI paste required (`customScript` API read-only) | **GitHub ready / Paste pending** |
| 058 script v1.6 + lifecycle trigger | UI paste required | **GitHub ready / Paste pending** |

Rollback snapshots: `airtable/rollbacks/20260904-pre-sc152-153/` + `airtable/rollbacks/20260904-sc152-153/`.

## Repository files

- `airtable/automations/shooting-challenge/057-…eligibility.js` → **v2.4**
- `airtable/automations/shooting-challenge/058-…unlock.js` → **v1.6**
- Tests: `test_058_perfect_week_lifecycle_runtime.mjs` (9/9), attestation contract script
- Checklist: [`docs/deploy-checklists/SC-152-153-perfect-week-lifecycle-057-058.md`](../deploy-checklists/SC-152-153-perfect-week-lifecycle-057-058.md)

## Test results (offline)

- 058 lifecycle runtime: **9/9 pass**
- Reliability attestation script: assertions passed (vitest wrapper reports “no suite” — run via `node`)

## GitHub ↔ Airtable agreement

| Automation | GitHub | Live script (until paste) | Live trigger |
|------------|--------|---------------------------|--------------|
| 057 | **2.4** | 2.3 until paste | Queue?=1 (formula updated) |
| 058 | **1.6** | 1.5 until paste | Still positive-only until paste |

## Holds observed

No Season Simulation. No field deletion. No broad email. Record IDs redacted in public docs.
