# SC-SEASON-SIM-001 — Three-Athlete Prep Readiness Audit

**Date:** 2026-09-06  
**Backlog:** SC-SEASON-SIM-001 / MRW-H11  
**Wave:** Agent 1–4 three-athlete preparation (docs truth + wiring)  
**Status:** **READY (preparation completing — NOT executed)**

---

## Scope revision (authoritative)

Per [`OWNER-DECISIONS-20260906.md`](./OWNER-DECISIONS-20260906.md):

- **Supersedes** prior five-enrollment season simulation design.
- **Three-athlete** package: Sim Perfect / Sim Recovery / Sim Edge.
- Reuses **SC-SEASON-SIM-002** infrastructure and safety model.
- **No DEV environment** — Production disposable records only.
- Live execute requires Mike phrase **`RUN 3-ATHLETE SEASON SIMULATION`** plus CLI gates.

**Not in scope / do not confuse:**

| Item | Distinction |
|------|-------------|
| **SC-SEASON-SIM-002** | COMPLETE historical single-athlete run (T122531Z) — do not rerun |
| **SC-112** | Parent multi-child auth — three-athlete **select** path, not season sim |
| **SC-161 / PKG-040** | Leaderboard "3 athletes" production verification — unrelated to SC-001 |

---

## Preparation status (this wave)

| Area | Owner | Status | Evidence |
|------|-------|--------|----------|
| Master List narrative + Section G | Agent 4 | **In progress → READY prep** | [`127-SI-MASTER-FUTURE-WORK-LIST.md`](../127-SI-MASTER-FUTURE-WORK-LIST.md) |
| Scenario builders + expectation matrices | Agent 1 | *Pending Agent 1 sign-off* | `tools/season_simulation/scenarios_sc001.py`, `expectations_matrix.py` |
| Three-athlete orchestration + CLI gates | Agent 2 | *Pending Agent 2 sign-off* | `tools/season_simulation/three_athlete.py`, `cli.py` |
| Offline tests + safety checklist | Agent 3 | *Pending Agent 3 sign-off* | `tools/season_simulation/tests/test_sc001_three_athlete.py` |
| Living docs + CHANGELOG | Agent 4 | **This audit + doc wave** | CURRENT-TRUTH, PROJECT_STATE, MASTER_REMAINING |

**Coordinator:** After Agent 1–3 PRs merge, rebase docs branch and stamp prep **COMPLETE**.

---

## Command reference (prep vs future execute)

| Phase | Command | Writes? |
|-------|---------|---------|
| Offline fixture | `python -m season_simulation dry-run-three --offline-fixture` | No |
| Dry-run (Production read) | `python -m season_simulation dry-run-three` | No |
| Preflight | `python -m season_simulation preflight` | No |
| Future preflight (post formula paste) | `python -m season_simulation preflight --acknowledge-clock-override` | No |
| Future execute-three | `python -m season_simulation execute … --confirm-three-athlete … --authorization-phrase "RUN 3-ATHLETE SEASON SIMULATION"` | Yes (gated) |
| Cleanup preview | `python -m season_simulation cleanup --run-id $RUN` | No |
| Cleanup execute | `python -m season_simulation cleanup --run-id $RUN --execute --confirm … --confirm-cleanup …` | Yes (gated) |
| Restore verification | MCP confirm formulas restored to NOW()/TODAY()-only | N/A |

**No live execution** during this prep wave.

---

## Completion criteria checklist

Agents 1–3 fill technical proof columns when wiring merges.

- [ ] **A1** — `scenarios_sc001.py` builds Perfect / Recovery / Edge day plans deterministically
- [ ] **A1** — `expectations_matrix.py` precomputes shots, PW, milestones, streaks, thresholds per athlete
- [ ] **A2** — `three_athlete.py` dry-run exports JSON + MD reports under `reports/`
- [ ] **A2** — Execute fails closed without `--confirm-three-athlete` + `--authorization-phrase`
- [ ] **A2** — Run ID must include `threeathlete` suffix for SC-001 execute
- [ ] **A3** — `test_sc001_three_athlete.py` PASS offline
- [ ] **A3** — `test_offline` suite PASS (no regression)
- [ ] **A3** — Operator checklist safety gates documented (allowlist-only email, no DEV, no 122)
- [ ] **A4** — Master List + Section G + living docs say **READY (not executed)**; five-enrollment superseded
- [ ] **A4** — Manifest + operator checklist list all commands above
- [ ] **Mike (future)** — Explicit `RUN 3-ATHLETE SEASON SIMULATION` before any live execute
- [ ] **Mike (future)** — Temporary formula paste + restore verified after run

---

## Contradiction resolution

| Stale wording | Resolution |
|---------------|------------|
| "60-day five-enrollment" | **Superseded** — three-athlete package |
| "Planned / Future — do not implement" | **READY (prep)** — implementation completing |
| "Season Sim CLOSED" (whole program) | **SC-002 closed**; **SC-001 READY** for future authorized execute |
| SC-112 "three-athlete" | Parent auth only — not SC-001 season simulation |

---

## Related documents

- Owner decision: [`OWNER-DECISIONS-20260906.md`](./OWNER-DECISIONS-20260906.md)
- Execution manifest: [`deploy-checklists/SC-SEASON-SIM-001-EXECUTION-MANIFEST.md`](../deploy-checklists/SC-SEASON-SIM-001-EXECUTION-MANIFEST.md)
- Operator checklist: [`deploy-checklists/SC-SEASON-SIM-001-operator-checklist.md`](../deploy-checklists/SC-SEASON-SIM-001-operator-checklist.md)
- SC-002 closeout: [`SC-SEASON-SIM-002-T122531Z-CLOSEOUT-20260905.md`](./SC-SEASON-SIM-002-T122531Z-CLOSEOUT-20260905.md)
- Tool README: [`tools/season_simulation/README.md`](../../tools/season_simulation/README.md)
