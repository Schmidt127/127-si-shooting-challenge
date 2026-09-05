# SC-167 / SC-168 / SC-169 — Season Sim T122531Z discrepancy wave closeout

**Date:** 2026-09-05  
**Coordinator:** Cursor autonomous wave  
**Starting `origin/master`:** `d0959581b1769f49e9699b3202da5102c647e732`  
**GitHub wave tip:** `33e636ec` (#454)  
**Production base:** `appn84sqPw03zEbTT`  
**Source run:** `SEASON-SIM-2027-20260905T122531Z-athlete1`  
**Full Season Simulation rerun:** **not executed**

Live verification addendum: [`SC-167-168-169-LIVE-VERIFICATION-20260905.md`](./SC-167-168-169-LIVE-VERIFICATION-20260905.md)

---

## Classifications (coordinator-verified)

| ID | Discrepancy | Classification | Verdict |
|---|---|---|---|
| **SC-167** | SUBMISSION_XP 59 rows / 58 unique | **Confirmed Production defect** (010 TOCTOU) | GitHub **010 v10.14** merged (#453); **Live pasted + verified v10.14**; **COMPLETE / Live Tested** (Option A 2026-09-05) |
| **SC-168** | 0 WEEKLY Hub handoffs | **Expected harness gap** | Execute arms Build only; 118/119 cron not sim-driven (#451) — **COMPLETE** |
| **SC-169** | Unlocks = 0 | **False-negative count + cleanup gap** | Expected **4** shot-milestone unlocks; 066→059 worked; orphans deleted (#452) — **COMPLETE** |

---

## Merges

| PR | Topic | Merge SHA |
|---|---|---|
| [#450](https://github.com/Schmidt127/127-si-shooting-challenge/pull/450) | Backlog intake SC-167/168/169 | `6a29d13d` |
| [#451](https://github.com/Schmidt127/127-si-shooting-challenge/pull/451) | SC-168 weekly email expectations + stage | `fba62be0` |
| [#453](https://github.com/Schmidt127/127-si-shooting-challenge/pull/453) | SC-167 010 v10.14 duplicate consolidate | `08da8b03` |
| [#452](https://github.com/Schmidt127/127-si-shooting-challenge/pull/452) | SC-169 unlock expectations + cleanup | `caad5ba9` |
| [#454](https://github.com/Schmidt127/127-si-shooting-challenge/pull/454) | Wave docs closeout | `33e636ec` |

Worktrees: `…/sc-sim-disc-20260905/a1-dup-xp`, `a2-weekly-email`, `a3-achievements`.

---

## Production verification (2026-09-05 live)

- Duplicate Active? `SUBMISSION_XP` keys: **0** (69/69 unique).
- T122531Z unlock orphans: **0 remaining**.
- Live Automation **010** `wflJUkUJYTtRWJCyH`: **v10.14 deployed** (Mike paste confirmed; MCP verified).
- Disposable Athlete1 create attempted without Season Sim formulas → correct `skipped_ineligible` (Activity Date outside Week window); **eligible XP create+retry still outstanding**.
- No real-family email; Hub allowlist-only throughout.

---

## Remaining Mike action`n`n**None** for SC-167/168/169. Optional later: `weekly-email-stage apply --weekly-email-limit 1` ([`SC-168-weekly-email-stage.md`](../deploy-checklists/SC-168-weekly-email-stage.md)).

---

## Safeguards confirmed

- Full Season Simulation **not** rerun  
- Temporary Season Sim formulas **not** enabled for this verification  
- Automations **013 / 067 / 122** not pasted; **021** unchanged  
- FUT-029 not implemented  
- No real-family communication  

