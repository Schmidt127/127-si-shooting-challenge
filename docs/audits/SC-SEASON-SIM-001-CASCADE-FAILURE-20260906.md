# SC-SEASON-SIM-001 — Cascade failure investigation (supersedes execute narrative)

| | |
|---|---|
| **Run investigated** | `SEASON-SIM-2027-20260906T144833Z-threeathlete` |
| **Correction date** | 2026-09-06 |
| **Backlog** | SC-SEASON-SIM-001 |
| **Prior narrative** | [`SC-SEASON-SIM-001-EXECUTE-20260906T144833Z.md`](./SC-SEASON-SIM-001-EXECUTE-20260906T144833Z.md) — **writer-complete narrative only; incomplete on cascade root cause** |

## Verdict

**ROOT CAUSE FIXED — TARGETED LIVE VERIFICATION PASSED**

## Root cause (evidence-backed)

**Primary defect class:** harness **eventual-consistency / ordering** defect, amplified by writer **053 Enrollment clear→restore** while Automation **010** is in flight, under three-athlete burst.

Not a Submission Base XP business-rule defect in 010 eligibility for correctly linked countable rows.

### Evidence

1. **Reconcile snapshot** (`tools/season_simulation/reports/reconcile-cascade-SEASON-SIM-2027-20260906T144833Z-threeathlete.json`):
   - Perfect: 61 countable, **72** active XP / 1765 pts (oldest profile — longest settle window)
   - Recovery: 53 countable, **5** active XP / 125 pts
   - Edge: 62 countable, **12** active XP / 250 pts
2. **Writer timing** (per-profile execute reports):
   - Perfect start `14:48:36Z` → Recovery `14:52:59Z` → Edge `14:56:15Z`
   - Reconcile `15:01:36Z` — only ~5 minutes after Edge writer finish; Perfect had ~13 minutes of background automation time while later profiles were still flooding creates.
3. **Writer arm sequence** (`writer.py` `_arm_submission_post_create`): after each create, wait formulas, then **clear Enrollment → restore Enrollment + Activity Date** to fire 053. SC-167 already documented this as a concurrent-010 amplifier.
4. **Stage D/E were stubs** in `execute_three.py` — profiles reported complete on **writer create counts alone**, then cleanup ran while Recovery/Edge Submission Base XP was still missing.
5. **Cleanup pass 1 failed closed** looking for a shared registry file; profiles use `__athleteN-…` registries (pass 2 deleted 598 after local merge fix).
6. **Targeted live mini verify** (`SEASON-SIM-2027-20260906T162614Z-cascade1`): 1 athlete, 2 Early Bird submissions, **no Enrollment clear**, links present at create → **2/2 Active `SUBMISSION_XP`** within ~20s; cleanup + Production `NOW()` restore confirmed.

Airtable automation-run history was **not** available to this investigation; conclusions use record snapshots, harness timings, 010 contract text, and reproducible live create.

### Why Perfect ≫ Recovery / Edge

Sequential profile writes + no inter-profile settlement gate. Perfect’s submissions had the longest queue drain time; Recovery/Edge were created into a saturated 010/053/076 backlog and cleaned up before settlement. Differential XP by profile **creation order** matches timing, not profile-plan content (all three matched countable shot plans).

### Distinguishing defect classes

| Class | Finding |
|---|---|
| Writer field defect | **No** — countable shots matched plan for all three |
| Record-ordering / settlement | **Yes** — primary |
| Automation trigger design | **Contributing** — 010 “starts matching” + Enrollment clear re-arms; not a Production logic bug for eligible rows |
| Dedup defect | **No** new award-bearing dups proven on this run |
| Cleanup/reporting | **Yes** — pass-1 registry merge; completion lied about cascade |
| Airtable run-limit | **Unproven** (no run history); timing evidence sufficient without it |

## Harness fixes shipped

- `cleanup.py` — merge per-profile registries; ignore missing shared registry; gated deletes
- `cascade_settlement.py` — observed-state XP poll + truthful Stage E reconcile
- `rearm_submission_xp.py` — dry-run default; exact-run ownership; clear `Last Reconciled Signature` only
- `execute_three.py` — Stage D/E real; stop before next profile on cascade failure; `cascade_complete` truth flag; Stage Z still guaranteed
- `writer.py` — wait for 010 XP (best-effort) before Enrollment clear on live clients
- `cli.py` — `rearm-submission-xp`; live `execute-three` `allow_writes=True` only with `--execute`
- Tests: `tests/test_sc001_cascade_settlement.py` (+ full suite 239 OK)

## Live verification

| Check | Result |
|---|---|
| Prior run remnants (Sim Perfect/Recovery/Edge) | **0** |
| Mini run XP | **2/2** Active SUBMISSION_XP |
| Mini cleanup | **deleted** athlete/enr/WAS/subs/XP |
| Production `Activity Date Is Future?` | **`NOW()`** restored |
| Simulation gates | **off** |

## Full three-athlete rerun

Technically **justified after merge** of these harness fixes. Still requires Mike phrase `RUN 3-ATHLETE SEASON SIMULATION` plus temporary formula paste / Stage Z restore. Do not rerun until this PR is on `main`.
