# SC-167 / SC-168 / SC-169 — Season Sim T122531Z discrepancy wave closeout

**Date:** 2026-09-05  
**Coordinator:** Cursor autonomous wave  
**Starting `origin/master`:** `d0959581b1769f49e9699b3202da5102c647e732`  
**Ending `origin/master` (pre-this-docs PR):** `caad5ba9859785ac54e7cfc796219151b411a0ac`  
**Production base:** `appn84sqPw03zEbTT`  
**Source run:** `SEASON-SIM-2027-20260905T122531Z-athlete1`  
**Full Season Simulation rerun:** **not executed**

---

## Classifications (coordinator-verified)

| ID | Discrepancy | Classification | Verdict |
|---|---|---|---|
| **SC-167** | SUBMISSION_XP 59 rows / 58 unique | **Confirmed Production defect** (010 TOCTOU) | GitHub **010 v10.14** merged (#453); **Live paste pending** |
| **SC-168** | 0 WEEKLY Hub handoffs | **Expected harness gap** | Execute arms Build only; 118/119 cron not sim-driven (#451) |
| **SC-169** | Unlocks = 0 | **False-negative count + cleanup gap** | Expected **4** shot-milestone unlocks; 066→059 worked; orphans deleted (#452) |

---

## Merges

| PR | Topic | Merge SHA |
|---|---|---|
| [#450](https://github.com/Schmidt127/127-si-shooting-challenge/pull/450) | Backlog intake SC-167/168/169 | `6a29d13d` |
| [#451](https://github.com/Schmidt127/127-si-shooting-challenge/pull/451) | SC-168 weekly email expectations + stage | `fba62be0` |
| [#453](https://github.com/Schmidt127/127-si-shooting-challenge/pull/453) | SC-167 010 v10.14 duplicate consolidate | `08da8b03` |
| [#452](https://github.com/Schmidt127/127-si-shooting-challenge/pull/452) | SC-169 unlock expectations + cleanup | `caad5ba9` |

Worktrees: `…/sc-sim-disc-20260905/a1-dup-xp`, `a2-weekly-email`, `a3-achievements`.

---

## Production verification

- Duplicate `SUBMISSION_XP` keys now: **0** (69/69 unique) — latent race until 010 v10.14 pasted.
- T122531Z unlock orphans: **0 remaining** (Source Key query).
- Live Automation **010** still **v10.13** until Mike publishes paste (checklist below).
- No real-family email; Hub allowlist-only throughout.

---

## Remaining UI-only action

Paste Automation **010** → **v10.14** then publish:

[`deploy-checklists/SC-167-010-v10.14-duplicate-consolidate.md`](../deploy-checklists/SC-167-010-v10.14-duplicate-consolidate.md)

Automation owner: `wflJUkUJYTtRWJCyH` — **010 - Submission Intake and Asset Creation - Create XP Event from Submission**.

After paste: disposable latch replay → exactly one Active? `SUBMISSION_XP|{id}`.

Optional later: `weekly-email-stage apply --weekly-email-limit 1` on disposable Ready WAS ([`SC-168-weekly-email-stage.md`](../deploy-checklists/SC-168-weekly-email-stage.md)).

---

## Safeguards confirmed

- Full Season Simulation **not** rerun  
- Temporary Season Sim formulas **not** enabled  
- Automations **013 / 067 / 122** not pasted; **021** unchanged  
- FUT-029 not implemented  
- No real-family communication  
