# SC-SEASON-SIM-001 — Operator Checklist

**Backlog:** SC-SEASON-SIM-001  
**Status:** READY (preparation completing) — **NOT authorized for live execute**  
**Environment:** Production `appn84sqPw03zEbTT` only — **no DEV environment**

---

## A. Before any live work

- [ ] Read [`SC-SEASON-SIM-001-EXECUTION-MANIFEST.md`](./SC-SEASON-SIM-001-EXECUTION-MANIFEST.md)
- [ ] Confirm SC-SEASON-SIM-002 T122531Z remains **COMPLETE** — do not rerun
- [ ] Confirm SC-160–169, SC-167 010 v10.14, SC-168, SC-169 remain **COMPLETE**
- [ ] Confirm Production formulas use normal **`NOW()` / `TODAY()`** until temporary paste
- [ ] Confirm transactional athlete tables empty (post OPS-PURGE-20260905)
- [ ] Run offline tests: `python3 -m unittest season_simulation.tests.test_sc001_three_athlete -v`

---

## B. Preflight (read-only)

```powershell
cd tools
python3 -m season_simulation preflight
python3 -m season_simulation dry-run-three
python3 -m season_simulation dry-run-three --offline-fixture
```

- [ ] Review `tools/season_simulation/reports/sc001-dry-run-latest.md`
- [ ] Verify three profiles: Perfect / Recovery / Edge with distinct shot totals
- [ ] Verify expectation matrices numerically defined before execute

---

## C. Temporary formula paste (Mike OMNI — authorized only)

Same reversible gates as SC-SEASON-SIM-002:

1. `Activity Date Is Future?` — Season Sim branch when Test Record + marker
2. `Submitted Same Day?` — Season Sim Test Submitted At branch
3. `Perfect Week Grace Eligible?` — sim submitted-at + Clock Now branch

Source: `tools/season_simulation/FORMULAS-TO-PASTE.txt` + [`SC-SEASON-SIM-002-operator-checklist.md`](./SC-SEASON-SIM-002-operator-checklist.md)

- [ ] Record exact Production formulas before paste (restore manifest)
- [ ] Paste temporary formulas
- [ ] Re-run preflight with `--acknowledge-clock-override` intent confirmed

---

## D. Authorization gates (all required)

| Gate | Value |
|------|-------|
| Mike phrase | **`RUN 3-ATHLETE SEASON SIMULATION`** |
| `--confirm` | `SEASON-SIMULATION-2027` |
| `--confirm-disposable` | `CONFIRM-DISPOSABLE-SEASON-SIM` |
| `--confirm-three-athlete` | `THREE-ATHLETE-SEASON-SIM-2027` |
| `--authorization-phrase` | `RUN 3-ATHLETE SEASON SIMULATION` |
| `--simulation-id` | `SEASON-SIM-2027-<utc>-threeathlete` (new ID) |

Execute **must fail closed** if any gate missing.

---

## E. Live execute sequence (when authorized)

1. Generate new `$RUN` with `threeathlete` suffix
2. Execute Athlete 1 Perfect → poll cascade → verify expectations
3. Execute Athlete 2 Recovery → poll → verify mixed outcomes
4. Execute Athlete 3 Edge → poll → verify idempotency / PW failures
5. Optional: `--enable-email-delivery` + `weekly-email-stage` (SC-168, limit 1 WAS per athlete)
6. Document discrepancies; stop on material unexpected failure

---

## F. Cleanup

```powershell
# Cleanup preview (default — lists targets, no deletes)
python3 -m season_simulation cleanup --run-id $RUN

# Cleanup execute
python3 -m season_simulation cleanup `
  --run-id $RUN `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

- [ ] Registry cleanup complete
- [ ] Extras pass for XP / Email Handoff / Streaks tied to run marker
- [ ] Verify Athletes/Enrollments/Submissions = 0 for sim names
- [ ] Restore Production formulas (Stage Z)
- [ ] **Restore verification:** MCP confirm `Activity Date Is Future?` has no Season Sim branch (NOW()-only)

---

## G. Prohibited

- Do **not** create DEV Airtable base or DEV Vercel project
- Do **not** send family emails (allowlist only)
- Do **not** install automation **122**
- Do **not** implement FUT-029
- Do **not** modify working automations because expectations were wrong — fix expectations first

---

## H. Formula restore manifest

See SC-SEASON-SIM-002 closeout — restore to:

```text
IF({Activity Date}, IF({Activity Date} > NOW(), 1, 0), BLANK())
```

Record paste timestamps in cleanup closeout evidence.
