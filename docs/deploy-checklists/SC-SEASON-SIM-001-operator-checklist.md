# SC-SEASON-SIM-001 — Operator Checklist

**Backlog:** SC-SEASON-SIM-001  
**Status:** READY (preparation) — **NOT authorized for live execute**  
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
```

- [ ] Review `tools/season_simulation/reports/sc001-dry-run-latest.md`
- [ ] Verify three profiles: Perfect / Recovery / Edge with distinct shot totals
- [ ] Verify expectation matrices numerically defined before execute

---

## C. Temporary formula paste (Mike — authorized only)

**Do NOT use OMNI / in-base AI to generate formulas.** OMNI has returned
``Unable to generate formula`` and left fields invalid. Paste **exact** text from
repo docs only, or future Meta API / MCP ``update_field`` with snapshot text.

Same reversible gates as SC-SEASON-SIM-002:

1. `Activity Date Is Future?` — Season Sim branch when Test Record + marker
2. `Submitted Same Day?` — Season Sim Test Submitted At branch
3. `Perfect Week Grace Eligible?` — sim submitted-at + Clock Now branch

Source: `tools/season_simulation/FORMULAS-TO-PASTE.txt` + [`SC-SEASON-SIM-002-operator-checklist.md`](./SC-SEASON-SIM-002-operator-checklist.md)

Lifecycle (repo — `tools/season_simulation/formula_lifecycle.py`):

- [ ] **Snapshot** Production formulas before paste (`snapshot_formulas_from_meta`)
- [ ] Paste temporary formulas from repo (not OMNI)
- [ ] **Verify** gated state (`verify_formula_state(expect_gated=True)`)
- [ ] **Stage Z** restore on success, failure, or interrupt (`restore_stage_z` / context manager)

---

## C2. Pre-execution safety gates (read-only)

Run before live execute (`tools/season_simulation/safety_gates.py`):

| Check | Stop if |
|-------|---------|
| Base ID | Not Production `appn84sqPw03zEbTT` |
| Git SHA | Pinned SHA mismatch (when manifest pins) |
| Automations | Not **010 v10.14**, **066 v4.1**, **114 v6.2** |
| Formula | OMNI failure text, verify fail, wrong mode |
| Email | Any enrollment/parent email ≠ allowlist |
| Transactional | Non-zero Athletes/Enrollments/Submissions pre-run |
| Weeks / PHA | Weeks missing; PHA ≠ 18 |
| Competing run | Another registry `status=running` |
| Profiles | Three-athlete run ≠ 3 profiles |
| Descendants | Unresolved automation orphans flagged pre-cleanup |
| Real athletes | Unexpected `Athlete 1` / `2` / `3` names |
| Payment | Registration/payment rows in sim scope |

Email **OFF** by default. Allowlist only: `schmidt@fairfieldbasketballclub.com`.

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

Preview (read-only — default):

```powershell
python3 -m season_simulation cleanup-preview-three --run-id $RUN
```

Execute delete (requires gates):

```powershell
python3 -m season_simulation cleanup-three --run-id $RUN
python3 -m season_simulation cleanup-three `
  --run-id $RUN `
  --execute `
  --confirm "SEASON-SIMULATION-2027" `
  --confirm-cleanup "CONFIRM-CLEANUP-SEASON-SIM"
```

Legacy single-athlete cleanup still available via `cleanup` command.

- [ ] Registry cleanup complete (per-athlete enrollment IDs in `meta.profiles`)
- [ ] Automation descendants merged (XP / unlocks / streaks / Email Handoff via Source Key + marker)
- [ ] **Never delete** Weeks, PHA, Homework Library, curriculum, Countries/States, reusable Zoom catalog
- [ ] Post-cleanup zero-remnant audit (`zero_remnant_audit.py`) — Sim Perfect/Recovery/Edge names = 0
- [ ] Restore Production formulas (**Stage Z**)
- [ ] MCP verify `Activity Date Is Future?` has no Season Sim branch

Offline safety tests:

```powershell
cd tools
python -m unittest season_simulation.tests.test_sc001_safety_cleanup -v
```

---

## G. Prohibited

- Do **not** use OMNI to generate or paste formulas
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

## Future live execute (NOT authorized in prep)

```powershell
cd tools
$RUN = "SEASON-SIM-2027-$(Get-Date -Format 'yyyyMMddTHHmmssZ')-threeathlete"
python -m season_simulation execute-three --execute --simulation-id $RUN --confirm "SEASON-SIMULATION-2027" --confirm-disposable "CONFIRM-DISPOSABLE-SEASON-SIM" --confirm-three-athlete "THREE-ATHLETE-SEASON-SIM-2027" --authorization-phrase "RUN 3-ATHLETE SEASON SIMULATION" --acknowledge-clock-override
```
