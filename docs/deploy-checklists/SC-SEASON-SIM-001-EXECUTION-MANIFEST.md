# SC-SEASON-SIM-001 — Execution Manifest (READY FOR EXECUTE — NOT AUTHORIZED)

| | |
|---|---|
| **Backlog** | SC-SEASON-SIM-001 |
| **Package** | `tools/season_simulation/` (extends SC-SEASON-SIM-002) |
| **Base** | Production `appn84sqPw03zEbTT` only — **no DEV environment** |
| **Athletes** | 3 disposable VERIFY profiles (Perfect / Recovery / Edge) |
| **Window** | 2027-04-25 → 2027-06-30 11:59 PM America/Denver inclusive (**67** days) |
| **Oracle** | Perfect-season XP **5340** → Level **G.O.A.T.** (matches dry-run) |
| **Authorize command** | Mike says exactly: **`RUN 3-ATHLETE SEASON SIMULATION`** |
| **This document does NOT authorize execute** | Pending gates in §0 |

---

## 0. READY FOR EXECUTE — pending

| Gate | Status (2026-09-12) |
|------|---------------------|
| **(a)** Mike authorization phrase `RUN 3-ATHLETE SEASON SIMULATION` | **Required** — not yet given |
| **(b)** Production automation **057** must be **v2.7** | **Blocked** — live **v2.6** as of 2026-09-12 audit; GitHub has v2.7 ([paste checklist](./057-v2.7-perfect-week-homework-week-end-PASTE.md)) |
| Oracle **5340** vs dry-run | **Match** |
| Active PHA | **18** (Early Bird + Weeks 1–8 × 2); Week 9 = 0 — **not** the old PHA=4 blocker |
| Simulation executed? | **No** |

### Rollback notes — Season Sim formula gates already ACTIVE

Season Sim gates on Production are **already ACTIVE** (Activity Date Is Future?, Submitted Same Day?, Perfect Week Grace Eligible?). They are not a pre-execute paste step.

| After run (or if execute deferred) | Action |
|------------------------------------|--------|
| `Activity Date Is Future?` | Restore NOW()-only (see README / operator checklist) |
| `Submitted Same Day?` / `Perfect Week Grace Eligible?` | Restore Production rollbacks per `same_day_contracts.py` / operator checklist |
| Disposable records | `cleanup-three` / `cleanup` with confirm gates |
| Do **not** leave gated formulas live indefinitely | Restore even if execute is postponed |

---

## 0b. Single entrypoint after authorization

From repo `tools/` (formulas already gated — use `--acknowledge-clock-override`):

```powershell
cd tools

# 1) Read-only preflight
python -m season_simulation preflight

# 2) Three-athlete dry-run (read-only planner + expectation matrices)
python -m season_simulation dry-run-three
python -m season_simulation dry-run-three --offline-fixture

# 3) Preflight with clock-override acknowledge
python -m season_simulation preflight --acknowledge-clock-override

# 4) EXECUTE — requires Mike phrase + Production 057 v2.7
#    (--simulation-id optional; auto-generated with threeathlete suffix)
python -m season_simulation execute-three `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" `
  --confirm-three-athlete "THREE-ATHLETE-SEASON-SIM-2027" `
  --authorization-phrase "RUN 3-ATHLETE SEASON SIMULATION" `
  --acknowledge-clock-override
```

**Note:** Use **`execute-three`**, not SC-002 `execute`. Execute without all three-athlete gates **must fail closed**.

Optional email (allowlist only): add `--enable-email-delivery`, then SC-168 `weekly-email-stage` per enrollment.

```powershell
# 5) Cleanup preview (default — no deletes)
$RUN = "<simulation-id from execute report>"
python -m season_simulation cleanup-three --simulation-id $RUN

# 6) Cleanup execute + formula restore verification (post-run)
python -m season_simulation cleanup-three `
  --simulation-id $RUN `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
# Then MCP-verify Activity Date Is Future? restored to NOW()-only (Stage Z)
```

---

## 1. Three-athlete profiles

| Athlete | Profile key | Path | Grade |
|---------|-------------|------|-------|
| Sim Perfect | `athlete1_perfect` | Maximum compliance / all positive outcomes | 12 |
| Sim Recovery | `athlete2_recovery` | Inconsistent participation + late recovery | 10 |
| Sim Edge | `athlete3_edge` | Timing, idempotency, PW failure modes | 8 |

Historical **SC-SEASON-SIM-002** (`athlete1_sc002` mixed path) remains **COMPLETE** — do not rerun `T122531Z`.

---

## 2. Offline / dry-run evidence

| Command | Result |
|---------|--------|
| Offline SC-001 + offline suites | PASS (see `tools/season_simulation/tests/`) |
| `python -m season_simulation dry-run-three` | **PASS** — oracle **5340** / G.O.A.T. |

Reports: `tools/season_simulation/reports/sc001-dry-run-latest.{json,md}`  
Readiness: [`../audits/SEASON-SIM-READINESS-20260912.md`](../audits/SEASON-SIM-READINESS-20260912.md)

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
| Perfect-season XP (oracle) | **5340** → **G.O.A.T.** | — | — |

Live numbers may shift slightly when weekly goals resolve from Airtable Goal Record + Weeks.

---

## 4. Safety controls (reuse SC-002 + strengthen)

- Dry-run default; writes blocked without full gate set
- **`--confirm-three-athlete`** + **`--authorization-phrase`** required for SC-001 execute
- Run ID must contain `threeathlete` suffix (auto if `--simulation-id` omitted)
- Recipient allowlist: `schmidt@fairfieldbasketballclub.com` only
- Cleanup scoped to run registry IDs only
- Stop on first material unexpected failure
- Restore Season Sim formula gates after run (already ACTIVE — see §0)
- **No DEV base** — do not create or instruct DEV testing

---

## 5. Mike-only actions before live execute

1. Say exactly **`RUN 3-ATHLETE SEASON SIMULATION`** in the agent/operator session
2. Paste Production **057 v2.7** (if still on v2.6) — see `057-v2.7-perfect-week-homework-week-end-PASTE.md`
3. Confirm Hub Test Allowlist row for `schmidt@fairfieldbasketballclub.com`
4. Confirm Production transactional tables empty (post OPS-PURGE) as needed
5. Verify automations **010 v10.14**, **066 v4.1**, **114 v6.2** Live (do not paste **122**)
6. After execute: cascade review → cleanup → formula restore → purge verification

---

## 6. Related documents

- Operator checklist: [`SC-SEASON-SIM-001-operator-checklist.md`](./SC-SEASON-SIM-001-operator-checklist.md)
- Scenario matrix: [`SC-SEASON-SIM-001-SCENARIO-MATRIX.md`](./SC-SEASON-SIM-001-SCENARIO-MATRIX.md)
- Readiness audit: [`../audits/SEASON-SIM-READINESS-20260912.md`](../audits/SEASON-SIM-READINESS-20260912.md)
- SC-002 historical closeout: [`../audits/SC-SEASON-SIM-002-T122531Z-CLOSEOUT-20260905.md`](../audits/SC-SEASON-SIM-002-T122531Z-CLOSEOUT-20260905.md)
- Cleanup manifest: reuse SC-002 cleanup gates with SC-001 run ID

**Status:** **READY FOR EXECUTE** pending Mike phrase + Production **057 v2.7**. Simulation **NOT executed**.
