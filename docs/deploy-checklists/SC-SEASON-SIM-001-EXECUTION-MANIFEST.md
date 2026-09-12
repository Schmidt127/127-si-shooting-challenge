# SC-SEASON-SIM-001 — Execution Manifest (READY — preparation completing — NOT AUTHORIZED)

| | |
|---|---|
| **Backlog** | SC-SEASON-SIM-001 |
| **Package** | `tools/season_simulation/` (extends SC-SEASON-SIM-002) |
| **Base** | Production `appn84sqPw03zEbTT` only — **no DEV environment** |
| **Athletes** | 3 disposable VERIFY profiles (Perfect / Recovery / Edge) |
| **Window** | 2027-04-25 → 2027-06-30 11:59 PM America/Denver inclusive (67 days) |
| **Authorize command** | Mike says exactly: **`RUN 3-ATHLETE SEASON SIMULATION`** |
| **This document does NOT authorize execute** | Preparation completing in Agent 1–3 wiring wave; coordinator will stamp COMPLETE prep after merges |

---

## 0. Single entrypoint after authorization

From repo `tools/` (after Stage A temporary formula paste — same as SC-SEASON-SIM-002):

```powershell
cd tools

# 1) Read-only preflight (Production-normal formulas expected until paste)
python -m season_simulation preflight

# 2) Three-athlete dry-run (read-only planner + expectation matrices)
python -m season_simulation dry-run-three
python -m season_simulation dry-run-three --offline-fixture

# 3) Future preflight (after temporary formula paste — same as SC-002)
python -m season_simulation preflight --acknowledge-clock-override

# 4) EXECUTE (future — NOT authorized during prep) — NEW run id required
$RUN = "SEASON-SIM-2027-$(Get-Date -Format 'yyyyMMddTHHmmssZ')-threeathlete"
python -m season_simulation execute `
  --execute `
  --simulation-id $RUN `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" `
  --confirm-three-athlete "THREE-ATHLETE-SEASON-SIM-2027" `
  --authorization-phrase "RUN 3-ATHLETE SEASON SIMULATION" `
  --acknowledge-clock-override
```

**Note:** Multi-athlete live writer orchestration is staged per profile using SC-002 writer (three sequential enrollments under one run ID). Execute without all three-athlete gates **must fail closed**.

Optional email (allowlist only): add `--enable-email-delivery`, then SC-168 `weekly-email-stage` per enrollment.

# 5) Cleanup preview (default — no deletes)
python -m season_simulation cleanup --run-id $RUN

# 6) Cleanup execute + formula restore verification (post-run)
python -m season_simulation cleanup `
  --run-id $RUN `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
# Then MCP-verify Activity Date Is Future? restored to NOW()-only (Stage Z)

---

## 1. Three-athlete profiles

| Athlete | Profile key | Path | Grade |
|---------|-------------|------|-------|
| Sim Perfect | `athlete1_perfect` | Maximum compliance / all positive outcomes | 12 |
| Sim Recovery | `athlete2_recovery` | Inconsistent participation + late recovery | 10 |
| Sim Edge | `athlete3_edge` | Timing, idempotency, PW failure modes | 8 |

Historical **SC-SEASON-SIM-002** (`athlete1_sc002` mixed path) remains **COMPLETE** — do not rerun `T122531Z`.

---

## 2. Offline preparation evidence (2026-09-06)

| Command | Result |
|---------|--------|
| `python3 -m unittest season_simulation.tests.test_sc001_three_athlete season_simulation.tests.test_sc001_expectations …` | **PASS** (42 tests) |
| `python3 -m unittest season_simulation.tests.test_offline …` | **PASS** (124 tests) |
| `python3 -m season_simulation dry-run-three --offline-fixture` | **PASS** — matrices written |

Reports: `tools/season_simulation/reports/sc001-dry-run-latest.{json,md}`

---

## 3. Expected outcomes summary (offline fixture @ 12,000 goal)

| Metric | Athlete 1 Perfect | Athlete 2 Recovery | Athlete 3 Edge |
|--------|------------------:|-------------------:|---------------:|
| Submit days | 67 | 59 | 68 |
| Miss days | 0 | 8 | 0 |
| Planned shots | 18,294 | 8,806 | 13,466 |
| Perfect Weeks (expected) | 10 | **1** (Week 7) | 5 |
| Goal Met Date | Runtime (perfect path) | late_if_at_all | Runtime |
| Shot milestones | through 18000 (6) perfect path | lower volume | edge path |
| Streak awards (XP) | 3–60 (9) | recovery path | edge path |
| Weekly threshold awards | 26 (perfect oracle) | recovery path | edge path |

Live numbers may shift slightly when weekly goals resolve from Airtable Goal Record + Weeks.

---

## 4. Safety controls (reuse SC-002 + strengthen)

- Dry-run default; writes blocked without full gate set
- **New** `--confirm-three-athlete` + `--authorization-phrase` required for SC-001 execute
- Run ID must contain `threeathlete` suffix
- Recipient allowlist: `schmidt@fairfieldbasketballclub.com` only
- Cleanup scoped to run registry IDs only
- Stop on first material unexpected failure
- Restore temporary formulas after run (see SC-002 operator checklist)
- **No DEV base** — do not create or instruct DEV testing

---

## 5. Mike-only actions before live execute

1. Say exactly **`RUN 3-ATHLETE SEASON SIMULATION`** in the agent/operator session
2. Paste temporary Season Sim formula gates (OMNI) — see `tools/season_simulation/FORMULAS-TO-PASTE.txt`
3. Confirm Hub Test Allowlist row for `schmidt@fairfieldbasketballclub.com`
4. Confirm Production transactional tables empty (post OPS-PURGE)
5. Verify automations **010 v10.14**, **066 v4.1**, **114 v6.2** Live (do not paste **122**)
6. After execute: cascade review → cleanup → formula restore → purge verification

---

## 6. Related documents

- Operator checklist: [`SC-SEASON-SIM-001-operator-checklist.md`](./SC-SEASON-SIM-001-operator-checklist.md)
- Scenario matrix: [`SC-SEASON-SIM-001-SCENARIO-MATRIX.md`](./SC-SEASON-SIM-001-SCENARIO-MATRIX.md)
- SC-002 historical closeout: [`../audits/SC-SEASON-SIM-002-T122531Z-CLOSEOUT-20260905.md`](../audits/SC-SEASON-SIM-002-T122531Z-CLOSEOUT-20260905.md)
- Cleanup manifest: reuse SC-002 cleanup gates with SC-001 run ID

**Status:** **READY (preparation completing)** — simulation **NOT executed** during prep wave. Five-enrollment design **superseded** (2026-09-06).
