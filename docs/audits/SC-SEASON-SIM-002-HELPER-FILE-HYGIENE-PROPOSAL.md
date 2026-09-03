# SC-SEASON-SIM-002 — Helper file hygiene proposal

| Item | Value |
|------|--------|
| **Backlog** | SC-SEASON-SIM-002 (COMPLETE — T213135Z) |
| **Date** | 2026-09-03 |
| **Branch** | `docs/season-sim-helper-hygiene` |
| **Scope** | Proposal only — **no deletes**, no season sim execute, no Airtable writes |
| **Path** | `tools/season_simulation/` |

## Purpose

Classify leftover season-sim helper artifacts into **keep / archive / remove-after-approval** so operators can clean the tree safely after the Athlete 1 final run (`SEASON-SIM-2027-20260902T213135Z-athlete1`).

## Audit method

1. Inventory every file under `tools/season_simulation/` on `origin/master` (2026-09-03).
2. Search for underscore helpers matching `_audit_*`, `_cleanup_*`, `_probe_*`, `_hub_*` under that directory (committed tree + git history adds).
3. Inspect `reports/` and `run_registries/` gitignore policy.
4. Cross-check docs under `docs/audits/` and `docs/deploy-checklists/` for SC-SEASON-SIM-002.

**Hard rule for this doc:** classify only. Do **not** delete, move, or rewrite helper scripts in this PR.

## Finding: underscore helpers

| Pattern | Under `tools/season_simulation/`? | Notes |
|---------|-----------------------------------|--------|
| `_audit_*` | **Not found** | No committed files; no git history adds on this path |
| `_cleanup_*` | **Not found** | Official cleanup is `cleanup.py` (canonical module — not a disposable `_cleanup_*` script) |
| `_probe_*` | **Not found** | Scenario “probe” days live inside `scenarios.py` / tests — not `_probe_*` files |
| `_hub_*` | **Not found** | Hub allowlist / email phases are in writer/execute — not `_hub_*` files |

Nearby underscore helpers **outside** this package (out of season-sim hygiene scope; do not delete from this proposal):

- `tools/airtable/_audit_49_*.py`, `_probe_c013_*`, `_probe_c019_*`
- `docs/testing/evidence/2026-08-04-package-02-critical-pastes/_probe_*.py`

If Mike later wants a repo-wide underscore-helper pass, open a separate Master Future Work List item — do not fold it into SC-SEASON-SIM-002 cleanup.

## Classification — `tools/season_simulation/`

### KEEP (canonical package)

| Path | Role | Why keep |
|------|------|----------|
| `__init__.py`, `__main__.py`, `cli.py` | Package entry / CLI | Required for `python -m season_simulation` |
| `constants.py`, `confirmation.py` | Gates / tokens | Safety boundaries for execute/cleanup |
| `airtable_client.py`, `memory_client.py` | REST + offline client | Execute/tests |
| `preflight.py`, `reference_data.py`, `scenarios.py` | Readiness + plan | Operator preflight |
| `simulation_clock.py`, `clock_override.py`, `season_policy.py`, `season_sim_date_gate.py`, `same_day_contracts.py` | Clock / formula gates | Documented Production paste dependencies |
| `execute.py`, `writer.py` | Execute orchestration | Final-run path |
| `cleanup.py` | Registry-scoped cleanup | Official cleanup — **not** a disposable `_cleanup_*` |
| `run_registry.py` | Local registry I/O | Resume + cleanup scoping |
| `recipient_safety.py` | Email allowlist | Prevents non-disposable sends |
| `reports.py` | Report writer helpers | Used by cleanup/execute evidence |
| `offline_helpers.py` | Pure CI helpers | Offline tests |
| `FORMULAS-TO-PASTE.txt` | Operator paste aid | Paired with deploy checklists |
| `README.md` | Package docs | Entry point |
| `tests/**` | Offline contracts | CI / regression |
| `reports/.gitignore`, `reports/.gitkeep` | Ignore policy | Keep ignore rules |
| `run_registries/.gitignore` | Ignore policy | Keep ignore rules |

### ARCHIVE (optional — after Mike approval)

| Path / artifact | Current state | Proposal |
|-----------------|---------------|----------|
| `docs/audits/SC-SEASON-SIM-002-streak-pw-weekly-2026-09-02.md` | Committed audit | Keep in `docs/audits/` **or** move to `docs/archive/season-sim/` if Mike wants audits slimmed |
| `docs/deploy-checklists/SC-SEASON-SIM-002-*.md` (paste / cleanup / operator) | Committed ops docs | **KEEP** as historical ops evidence — archive only if superseded by a single “final closeout” doc |
| Local evidence JSON named in Master list (`tools/season_simulation/reports/evidence-final-…json`) | **Gitignored** (not in tree) | If still on an operator machine: copy to `docs/testing/evidence/` then delete local copy |

### REMOVE-AFTER-APPROVAL (local / gitignored only)

| Path | Current state | Proposal after Mike OK |
|------|---------------|------------------------|
| `tools/season_simulation/reports/*` (except `.gitignore` / `.gitkeep` / optional README) | Directory empty in git; contents gitignored (`*`) | Delete **local** report JSON/Markdown leftovers from failed/final runs after confirming evidence copied if needed |
| `tools/season_simulation/run_registries/*` (except `.gitignore`) | Gitignored contents | Delete **local** registries for completed/failed runs after cleanup confirmation tokens already used |
| Ad-hoc session scripts named `_audit_*` / `_cleanup_*` / `_probe_*` / `_hub_*` if created **outside git** during the 2026-09-02 runs | Not in repository | Safe to delete from the operator workstation; do not commit |

**Do not remove** `cleanup.py`, `reports.py`, or the gitignore sentinels.

## Reports directory policy (keep as-is)

```text
tools/season_simulation/reports/
  .gitignore   → ignore all generated reports
  .gitkeep
```

Generated evidence stays local by design. Hygiene = clear local leftovers after archival, not deleting the directory from git.

## Recommended operator sequence (when Mike approves)

1. Confirm Production cleanup for final run already complete (Master list: SC-SEASON-SIM-002 COMPLETE — T213135Z).
2. If any `reports/evidence-final-*.json` still exists locally → copy into `docs/testing/evidence/` (separate docs PR) **or** retain offline.
3. Delete local `reports/*.json` / `reports/*.md` leftovers and local `run_registries/*.json`.
4. Leave the canonical Python package untouched.
5. Do **not** run season sim execute as part of hygiene.

## Explicit non-goals

- No season simulation execute / dry-run against Production
- No Airtable writes or formula restores
- No automation paste (010 / 114 / 073 / 101 / 117 / SC-147 / 121)
- No broad `tools/` underscore cleanup outside `tools/season_simulation/`
- No deletion of committed package modules in this proposal PR

## Sign-off checklist

| Step | Owner | Status |
|------|-------|--------|
| Review classifications | Mike | Pending |
| Approve local reports/registries wipe | Mike | Pending |
| Optional archive move of SC-SEASON-SIM-002 audit docs | Mike | Pending |
| Execute deletes | Operator after approval | **Blocked** until approval |
