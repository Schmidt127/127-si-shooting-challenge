# Season Sim Readiness — 2026-09-12

**Backlog:** SC-SEASON-SIM-001  
**Branch context:** `chore/sim-window-apr25-jun30-67day`  
**Base:** Production `appn84sqPw03zEbTT`

---

## Verdict

| Item | Status |
|------|--------|
| Calendar / window | **READY** — Apr 25–Jun 30 2027, **67** days, **10** challenge weeks |
| Active PHA | **READY** — **18** live (not the stale PHA=4 blocker) |
| Oracle | **READY** — perfect-season XP **5340** → Level **G.O.A.T.**; matches dry-run |
| Season Sim formula gates | **ACTIVE** on Production — restore after run / if deferred |
| Simulation executed? | **No** |
| **Execute** | **NOT READY** until (a) Mike phrase + (b) Production **057 v2.7** |

**Overall:** Code + calendar + oracle ready. **Blocked** on human authorization and Production 057 paste.

---

## Calendar (Early Bird … Week 9)

| Ordinal | Week | Start | End (Week End cutoff) | Days | Notes |
|--------:|------|-------|------------------------|-----:|-------|
| 1 | Early Bird | 2027-04-25 | Sat 2027-05-01 | 7 | Full Sun–Sat |
| 2 | Week 1 | 2027-05-02 | Sat 2027-05-08 | 7 | |
| 3 | Week 2 | 2027-05-09 | Sat 2027-05-15 | 7 | |
| 4 | Week 3 | 2027-05-16 | Sat 2027-05-22 | 7 | |
| 5 | Week 4 | 2027-05-23 | Sat 2027-05-29 | 7 | |
| 6 | Week 5 | 2027-05-30 | Sat 2027-06-05 | 7 | |
| 7 | Week 6 | 2027-06-06 | Sat 2027-06-12 | 7 | |
| 8 | Week 7 | 2027-06-13 | Sat 2027-06-19 | 7 | |
| 9 | Week 8 | 2027-06-20 | Sat 2027-06-26 | 7 | |
| 10 | Week 9 | 2027-06-27 | **Wed 2027-06-30** | **4** | Partial **4/7** shot target; PW homework vacuously OK |

Cutoffs: Sat 11:59 PM America/Denver (Week 9 = Wed Jun 30).

---

## PHA distribution

| Scope | Active PHA |
|-------|------------|
| Early Bird | 2 |
| Weeks 1–8 | 2 each (16) |
| Week 9 | **0** |
| **Total** | **18** |

Late homework: normal XP if Satisfactory; Perfect Week requires Week End cutoff (above).

---

## Oracle

| Metric | Value |
|--------|------:|
| `EXPECTED PERFECT-SEASON XP` | **5340** |
| Final level | **G.O.A.T.** |
| Window days | 67 |
| Source | `tools/season_simulation/expected_perfect_season_xp.json` |
| Dry-run match | **Yes** (`dry-run-three` / `sc001-dry-run-latest`) |

---

## Production 057 paste blocker

| | |
|---|---|
| GitHub | **057 v2.7** (`airtable/automations/shooting-challenge/057-…js`) |
| Production live (2026-09-12 audit) | **v2.6** |
| Paste doc | [`docs/deploy-checklists/057-v2.7-perfect-week-homework-week-end-PASTE.md`](../deploy-checklists/057-v2.7-perfect-week-homework-week-end-PASTE.md) |
| Why it blocks | Week End–only Perfect Week homework gate (no PHA Due Date catch-up) must match sim / oracle |

Also required: Mike says exactly **`RUN 3-ATHLETE SEASON SIMULATION`**.

---

## Exact execute command

Verified against `tools/season_simulation/cli.py` (`execute-three` + confirm gates).  
`--simulation-id` is **optional** (auto-generated with `threeathlete` suffix).

```powershell
cd tools
python -m season_simulation execute-three --execute --confirm SEASON-SIMULATION-2027 --confirm-disposable CONFIRM-DISPOSABLE-SEASON-SIM --confirm-three-athlete THREE-ATHLETE-SEASON-SIM-2027 --authorization-phrase "RUN 3-ATHLETE SEASON SIMULATION" --acknowledge-clock-override
```

Do **not** use SC-002 `execute` for the three-athlete package.

---

## Related

- Manifest: [`../deploy-checklists/SC-SEASON-SIM-001-EXECUTION-MANIFEST.md`](../deploy-checklists/SC-SEASON-SIM-001-EXECUTION-MANIFEST.md)
- Tool README: [`../../tools/season_simulation/README.md`](../../tools/season_simulation/README.md)
