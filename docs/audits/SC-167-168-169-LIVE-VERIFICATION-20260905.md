# SC-167 / SC-168 / SC-169 — Live verification status (2026-09-05)

**Coordinator:** Cursor  
**`origin/master` at verification:** `33e636ec`  
**Production base:** `appn84sqPw03zEbTT`  
**Full Season Simulation rerun:** **not executed**  
**Temporary Season Sim formulas:** **not enabled** (remain `NOW()` / `TODAY()`)

---

## Status table (plain language)

| ID | Sim observation | Root cause | Classification | What changed | PR / merge SHA | Live Airtable change needed? | Live testing done? | Mike action left? | Status |
|---|---|---|---|---|---|---|---|---|---|
| **SC-167** | 58 countable submissions → **59** `SUBMISSION_XP` rows / **58** unique keys | Automation **010** TOCTOU: last-chance recheck then create without post-create consolidate; Season Sim Enrollment clear/restore amplified concurrent runs | **Production defect** | GitHub **010 v10.14** deterministic owner + post-create consolidate | [#453](https://github.com/Schmidt127/127-si-shooting-challenge/pull/453) `08da8b03` (wave docs `#454` `33e636ec`) | **Paste done** — Live `wflJUkUJYTtRWJCyH` = **v10.14** deployed (`SC-167`, `consolidated_duplicate`) | Paste **verified**. Disposable create+retry **attempted** on Athlete1 (`recZEwkkXTJanDlG6`) → 010 correctly `skipped_ineligible` (Activity Date outside Week window). **Eligible XP create/retry still blocked** while Weeks are May–Jul 2027 and formulas use wall-clock `NOW()` | **Yes** — authorize one disposable Season Sim clock gate (or next Season Sim) to finish create+retry proof; then restore formulas | **LIVE TEST REQUIRED** |
| **SC-168** | `--enable-email-delivery` armed **6** Build Weekly; **0** `WEEKLY_ATHLETE_SUMMARY` Hub handoffs (69 other emails Accepted) | Execute arms **072 Build only**; keeps `Send to Make? = false`; **118/119** Sunday cron are not sim-driven | **Expected behavior / harness gap** (not a 072 Production defect) | Expectation module + opt-in `weekly-email-stage` CLI; **no** 072/118/119/074 Production logic change | [#451](https://github.com/Schmidt127/127-si-shooting-challenge/pull/451) `fba62be0` | **No** — Production weekly pipeline unchanged | Historical T213135Z proved 6 WEEKLY after Send-arm substitute. Live Ready allowlisted WAS with Enrollment: **0** now (graph cleaned). New allowlisted send not re-run | **None required** for this discrepancy. Optional later: `weekly-email-stage apply --limit 1` on next disposable Ready WAS | **COMPLETE** |
| **SC-169** | Cascade reported Unlocks **0** while `SHOT_MILESTONE` XP = **4**, streaks via 053→054, PW Eligible = 0 | Cascade queried non-existent Unlocks field `Enrollment Record ID` → false 0; cleanup missed automation-created unlocks | **Incorrect expectation / observability** (awards worked) | Expectations + Source Key unlock query + cleanup merge; deleted 4 orphans | [#452](https://github.com/Schmidt127/127-si-shooting-challenge/pull/452) `caad5ba9` | **No** — 053–066 / thresholds unchanged | Live proof: 4 Awarded unlocks with keys `SHOT_MILESTONE\|recmImoXTlKb5NWSY\|{milestoneId}` matched XP; deleted (`acth7dbsah2hyF6E4`). Re-check 2026-09-05: **0** orphans; **0** Active milestone XP for that enrollment | **None** | **COMPLETE** |

---

## SC-167 detail

### Live Automation 010
- Owner: `wflJUkUJYTtRWJCyH`
- `deploymentStatus`: **deployed**
- `SCRIPT.version`: **v10.14**
- Markers present: `SC-167`, `consolidated_duplicate`

### Disposable attempt (no Season Sim formulas)
- Created Submission `recrHPI0OSapqRhDW` on Athlete1 / Week 1 / existing WAS with Activity Date `2026-05-10`, Shot Total 25, Count It.
- Formulas: `Count This Submission?=1`, `Total Shots Counted=25`, `Activity Date Is Future?=0`.
- 010 latched `Last Reconciled Signature` with **0** XP Events → consistent with **`skipped_ineligible`** because eligibility requires Activity Date **inside** Week Start/End (Week 1 = 2027-05-02…2027-05-09).
- Cleared Last Signature; latch returned without XP (same ineligible path).
- Submission deleted; Athlete1 shots back to **0**. Leftover marker rows: **0**.
- Production Active? `SUBMISSION_XP` scan: **69/69 unique**, **0** duplicate keys.

### Why create+retry needs Mike authorization
All Production Weeks for this Program Instance are **2027**. With `Activity Date Is Future?` on wall-clock `NOW()`, an Activity Date cannot be both ≤ today (2026-09-05) and inside a 2027 week. Finishing the checklist therefore requires either:
1. Temporary Season Sim gate formulas (authorized, then restored), or  
2. The next authorized Season Sim execute (already uses that gate).

Do **not** change XP amounts or eligibility rules for this proof.

---

## SC-168 detail

- Production weekly pipeline **not** changed.
- Simulation expectation **corrected** (0 WEEKLY after execute alone is expected).
- Live allowlisted weekly send **not** re-proven today: no Ready WAS with Enrollment + allowlist recipient remains after T122531Z cleanup.
- No Airtable paste required.

---

## SC-169 detail

- Expected unlocks for that sim profile: **4** shot milestones (3000/6000/9000/12000 for band 9–12). Streaks do **not** create Unlock rows. PW unlocks **0** (Eligible=0).
- Production achievement award logic **not** changed.
- Live award proof is the pre-cleanup orphan evidence + matching XP; no additional disposable unlock required for this wave.

---

## Wave completeness

| Item | Wave-ready? |
|---|---|
| SC-168 | Yes — COMPLETE |
| SC-169 | Yes — COMPLETE |
| SC-167 | **No** — paste verified; **eligible disposable create+retry still required** |
| Claim “wave complete” | **Do not** until SC-167 live XP proof finishes |

---

## Mike’s exact remaining actions

1. **SC-167 only** — choose one path:
   - **A (preferred minimal):** Authorize temporary Season Sim `Activity Date Is Future?` gate for one Athlete1 disposable Submission (Week 1 Activity Date in-week under sim clock) → confirm one Active? `SUBMISSION_XP|{id}` → clear `Last Reconciled Signature` → still exactly one Active? (same id preferred) → delete disposable Submission + XP → **restore** formulas to Production `NOW()`.
   - **B:** Authorize a bounded Season Sim disposable run that includes at least one counted submission and the same retry latch check.
2. **SC-168 / SC-169:** No paste, no config change, no required Mike action.
3. Optional later (not blocking): `weekly-email-stage apply --weekly-email-limit 1` to `schmidt@fairfieldbasketballclub.com` on a Ready disposable WAS.
