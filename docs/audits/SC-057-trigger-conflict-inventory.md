# SC-057 — Automation trigger duplicate/conflict inventory

**Generated:** 2026-08-27 · **Branch:** `agent/config-automation-reliability`  
**Machine-readable:** [`sc-057-trigger-inventory.json`](./sc-057-trigger-inventory.json)  
**Evidence label:** Verified from repository (docblocks + automation-index). Live UI confirmation required for ON/OFF and exact conditions.

## Summary

| Risk | Count | Examples |
|------|-------|----------|
| **Retired — must stay OFF** | 4 | 043, 063, 068, 112 |
| **Duplicate writer — resolved by disposition** | 2 | 112 vs 013 (VF create); 043 vs 042 (level gates) |
| **Same record type, sequential chain (OK)** | 10+ | 010→041; 064→065; 057→058→059 |
| **Email handoff chain (OK)** | 5 | 072→118→119→074; 117→079 |
| **Requires UI attestation** | 40+ | Scripts with `*confirm in Airtable*` headers |

## Retired / do not restore

| # | Name | Repo disposition | Mike UI action |
|---|------|------------------|----------------|
| 043 | Set Level Gate Rule from Next Level | Retire — 042 owns gates | Confirm deleted/disabled |
| 063 | Copy Grade Band to HC | Deleted — 020 partial replace | Confirm deleted |
| 068 | Reconcile Deferred WAS Links | RETIRED — 033 owns | Keep OFF |
| 112 | Create Video Feedback from Asset | OFF — 013 sole VF writer | Confirm OFF |

## Duplicate / conflict analysis

### 112 vs 013 — Video Feedback creation

| | 013 | 112 |
|---|-----|-----|
| Trigger | Submission Assets — video ready | Similar asset path |
| Disposition | **Preferred sole writer** | **OFF — do not restore** |
| Risk if both ON | Duplicate Video Feedback rows | High |
| Repo fix | 013 v3.2 provenance guard | 112 retained for history only |

### 043 vs 042 — Level assignment

| | 042 | 043 |
|---|-----|-----|
| Role | Assign current/next level + gate blocking | Legacy gate helper |
| Disposition | Live | Retired |
| Risk if both ON | Conflicting gate writes | Medium |

### 064 vs 065 — Homework XP

| | 064 | 065 |
|---|-----|-----|
| Role | Prepare award (no XP Event) | Create/reconcile XP Event |
| Chain | Sequential — not duplicate | OK |
| Trigger | Review complete | `Homework XP Reconciliation Needed? = 1` |

### 057 → 058 → 059 — Perfect Week

Sequential chain on WAS / unlock / XP Event. **Not a duplicate** — conditions must remain ordered (057 Ready before 058/059).

### 053 → 054 — Streak XP

Rebuild occurrences then award XP on Ready. **Not a duplicate**.

## Mismatched conditions (documented in script headers)

| Script | Documented anti-pattern |
|--------|-------------------------|
| 010 | Do not trigger on formula-only flips without reconciliation flag |
| 059 | Do not filter on Ready for 059 XP at create time |
| 065 | Do not use HC create trigger — use reconciliation checkbox |
| 020 | Do not trigger on Submission create (asset-driven only) |

## Safe repository corrections (this pass)

- Extracted trigger inventory JSON from all 57 active script docblocks.
- No live automation changes.
- Cross-reference preserved in `docs/automation-index.md`.

## Static validation

- `tools/docs/extract-automation-triggers.mjs` — regenerates JSON inventory
- Future: compare JSON to `airtable/schema/current/automation-trigger-map.md` on doc edits

## Mike actions (Airtable UI only)

1. Confirm **112 OFF**, **043 not deployed**, **063 deleted**, **068 OFF**.
2. UI-attest triggers for scripts still marked *confirm in Airtable* in automation-index.
3. Verify no second automation awards the same Source Key family (run Stage B audit when season starts).
