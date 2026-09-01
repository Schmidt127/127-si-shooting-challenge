# Parallel agent run — season rebuild testing (read-only / dry-run)

| Field | Value |
|-------|--------|
| Date | 2026-09-01 |
| Timestamp (UTC) | 2026-09-01T18:33:30Z |
| Repo | `127-si-shooting-challenge` |
| Mode | Dry-run, offline contracts, live readonly audit only — **no `--apply`**, no cleanup, no Production schema changes |

## Summary

| Suite | Result |
|-------|--------|
| `test_sc_athlete_wf_contract.mjs` | **PASS** (15 checks) |
| `season-calendar.test.js` | **PASS** |
| `sc-athlete-wf.mjs` dry-run (all cases) | **PASS** (6/6) |
| `sc-athlete-wf.mjs --readonly --case full` | **FAIL** — gated enrollment not visible in configured base |
| `sc-core-workflow.mjs` (default audit) | **FAIL** — live Weeks/PHA vs 2026-2027 contract |
| `python -m tools.season_simulation preflight` | **PASS** (warnings; not sufficient_for_final_run) |
| `python -m tools.season_simulation dry-run --offline-fixture` | **PASS** |
| `tools.season_simulation.tests.test_offline` | **PASS** (21 tests) |
| `web`: `npm test -- --run` | **FAIL** (1/545 — FAQ copy assertion) |
| `web`: `npm run build` | **PASS** |

## Commands run

```powershell
cd c:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge

node tools/testing/tests/test_sc_athlete_wf_contract.mjs
node tests/workflow-contracts/season-calendar.test.js

node tools/testing/sc-athlete-wf.mjs --case full
node tools/testing/sc-athlete-wf.mjs --case submissions
node tools/testing/sc-athlete-wf.mjs --case homework-video
node tools/testing/sc-athlete-wf.mjs --case streaks-levels
node tools/testing/sc-athlete-wf.mjs --case was
node tools/testing/sc-athlete-wf.mjs --case negatives
node tools/testing/sc-athlete-wf.mjs --case full --readonly

node tools/testing/sc-core-workflow.mjs
node tools/testing/sc-core-workflow.mjs --help

python -m tools.season_simulation preflight
python -m tools.season_simulation dry-run --offline-fixture
python -m tools.season_simulation.tests.test_offline

cd web
npm test -- --run
npm run build
```

## Harness details

### SC-ATHLETE-WF-001 (dry-run)

All cases returned `ok: true`, `mode: dry-run`, zero defects. Evidence JSON under `docs/testing/evidence/sc-athlete-wf/` (e.g. `dry-run-full-2026-09-01T183242096.json`).

### SC-ATHLETE-WF-001 (readonly)

- Exit 1; blocker: `Record not visible: Enrollments/recNu6fcBpF1GG3u5` (Testing3 Schmidt gated enrollment).
- Evidence: `docs/testing/evidence/sc-athlete-wf/readonly-full-2026-09-01T183247937.json`

### SC-CORE-WF (live audit)

- Exit 1; `live.weeks_calendar` and `live.pha_schedule` **FAIL**.
- Defects (P0/P1): Early Bird dates `2026-08-30..2027-05-01` vs expected `2027-04-25..2027-05-01`; Early Bird 4 active PHA vs expected 2; Week 1 expected 2 active PHA, got 0.
- Evidence: `docs/testing/evidence/sc-core-workflow/audit-2026-09-01T183247816Z.json`
- Interpretation: base reachable via token, but calendar/PHA not yet aligned with confirmed season-rebuild contract (or token points at non-target base).

### SC-SEASON-SIM-002 (preflight + offline dry-run)

- Preflight **PASS** on base `appn84sqPw03zEbTT`; connectivity OK; `sufficient_for_final_run: false` (0 active PHA for Grade 12 band; simulation-clock blockers documented).
- Reports: `tools/season_simulation/reports/preflight-20260901T183326Z.json` (+ `.md`)
- Offline dry-run: 61 days, 13906 planned shots; reports under `tools/season_simulation/reports/dry-run-SEASON-SIM-2027-20260901T183323Z-athlete1-*.json`

### Web

- **Test failure:** `lib/seo/faq-content.test.ts` — expects answer to match `/instant replies/i`; copy uses “not **as** instant replies”.
- **Build:** Next.js 16.3.1 production build succeeded; homework catalog build logged PHA duplicate resolution (Early Bird HW1/HW2 slots), 16 assignments / 8 week groups.

## Not run (by policy)

- `sc-core-workflow.mjs --apply` / `--cleanup`
- `sc-athlete-wf.mjs --apply` / `--cleanup`
- Season simulation `execute` / live dry-run against writable paths
- Automation paste, Production schema edits, email send arms

## Recommended next steps (Mike)

1. **Confirm Airtable base ID** in local env matches DEV (or intended rebuild target) before re-running readonly athlete probe and core audit.
2. **Finish season calendar + PHA rebuild** until `sc-core-workflow.mjs` audit passes (18 active PHA, Early Bird window, Week 1 slots, no Week 9 homework).
3. **Restore Testing3 enrollment visibility** (`recNu6fcBpF1GG3u5`) in that base, then re-run `sc-athlete-wf.mjs --case full --readonly`.
4. **Resolve Early Bird PHA duplicates** (also seen at web build) so public homework shows 18 schedulable rows without duplicate-slot warnings.
5. **Fix or accept FAQ test** — update assertion to match “not as instant replies” or adjust copy.
6. After audit green: authorized disposable **`--apply`** on `sc-core-workflow` then `sc-athlete-wf` (high-autonomy mode); re-run preflight until `sufficient_for_final_run` before any season simulation execute.
