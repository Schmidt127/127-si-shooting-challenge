# SC-SEASON-SIM-001 — Execution Manifest (READY — NOT AUTHORIZED)

| | |
|---|---|
| **Backlog** | SC-SEASON-SIM-001 |
| **Package** | `tools/season_simulation/` (extends SC-SEASON-SIM-002) |
| **Base** | Production `appn84sqPw03zEbTT` only — **no DEV environment** |
| **Athletes** | 3 disposable VERIFY profiles (Perfect / Recovery / Edge) |
| **Window** | 2027-05-01 → 2027-06-30 inclusive (61 days) |
| **Authorize command** | Mike says exactly: **`RUN 3-ATHLETE SEASON SIMULATION`** |
| **This document does NOT authorize execute** | Preparation complete at **READY** |

---

## 0. Single entrypoint after authorization

From repo `tools/` (after Stage A temporary formula paste — same as SC-SEASON-SIM-002):

```powershell
cd tools

# 1) Read-only preflight (Production-normal formulas expected until paste)
python -m season_simulation preflight

# 2) Three-athlete dry-run (read-only planner + expectation matrices)
python -m season_simulation dry-run-three

# 3) EXECUTE — NEW run id required (never reuse T122531Z or other closed IDs)
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
| Submit days | 61 | 53 | 62 |
| Miss days | 0 | 8 | 0 |
| Planned shots | 16,630 | 8,274 | 13,200 |
| Perfect Weeks (expected) | 10 | **1** (Week 7) | 5 |
| Goal Met Date | **2027-06-14** @ 12,098 | Not reached | 2027-06-25 @ 12,190 |
| Shot milestones | 3000–14400 (5) | 3000, 6000 | 3000–12000 (4) |
| Streak gate days | 3–60 (8 tiers) | 3, 7, 10 | 3–30 (6 tiers) |
| Weekly threshold awards | 22 | 1 | 12 |

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

**Status:** **READY** — simulation **NOT executed** during preparation.
