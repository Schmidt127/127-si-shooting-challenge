# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Operator queue:** [`docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md)  
**Baseline date:** 2026-08-30  

> Claims below are backed by command output or platform evidence from this Lead session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Prior tip | `17323fe2` | Merge PR #275 docs reconcile |
| This package | `cursor/weekly-settlement-qa-2026-08-29` | SC-WEEKLY-SETTLEMENT-E2E |
| Working tree note | Unrelated WIP left untouched: `tools/testing/lib/sc-pw-e2e-lib.mjs`, `tools/season_simulation/` | `git status` |

Re-verify:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## Weekly settlement QA (this baseline)

| Item | Result |
|------|--------|
| Offline contracts | **PASS** `test_sc_weekly_settlement_contract.mjs` |
| Dry-run matrix | **PASS** |
| Live WS-01…WS-10 | **PASS** — see [`docs/testing/weekly-settlement/RESULTS.md`](docs/testing/weekly-settlement/RESULTS.md) |
| Defect report | [`docs/testing/weekly-settlement/DEFECT-REPORT.md`](docs/testing/weekly-settlement/DEFECT-REPORT.md) |
| Perfect Week award | Still **COMPLETE** via cite WAS `recl3DmBh22ADPWWe` (do not re-apply) |
| Email send | **Not invoked** |

---

## Open pull requests

Re-check with `gh pr list`. Prior drafts (#266 etc.) remain product WIP — do not merge blindly.

### Prior closeout suites (still valid)

| Suite | Result |
|-------|--------|
| Legacy welcome + automation contracts | **PASS** (PR #274 closeout) |
| Web Vitest | **437/437 PASS** (#274) |
| Web typecheck / lint / build | **PASS** (#274 + this package) |
| Vercel Production for `1b15d37f` | **SUCCESS** — deployment `6160903963` |
| `/shoot` | **HTTP 200** |
| `/shoot/api/airtable` | **200** `ok:true` `tokenValid:true` |
| SC-PW-E2E award (WAS `recl3DmBh22ADPWWe`) | **PASS** — MCP evidence JSON |
| SC-ATHLETE-WF-001 offline contracts | **PASS** (2026-08-30) |
| SC-ATHLETE-WF-001 dry-run + readonly | **PASS** |
| SC-ATHLETE-WF-001 disposable apply | **PARTIAL PASS** — submission XP + WAS verified; homework 065 not fired without PHA; cleanup via MCP |

---

## Production changes applied (do not re-apply)

| Change | Evidence |
|--------|----------|
| 010 v10.12 | Automations Code Live |
| 020 v3.8 / 065 v10.4 (FUT-001) | Automations Code Live |
| 022 v2.2 / 072 v4.8 / 073 v4.4 | Automations Code Live |
| 058 1.5 / 059 v3.7 | Automations Code Live + Perfect Week award |
| 057 v2.2 + PW video minimum Config | 2026-08-27 |
| Legacy welcome Enrollment fields 6/6 | 2026-08-29 |
| Perfect Week award WAS `recl3DmBh22ADPWWe` | Unlock `recJ5umer4J4FHTOz`; XP `reczehlzkA8fjiQh0`; Awarded; 100 XP |
| SEO indexing cutover | 2026-08-25 |
| Homepage redesign | PR #270 |

---

## Production changes still awaiting Mike

1. **FUT-010** live attachment clear (dry-run first)  
2. **Weeks 2026–27** import (protected)  
3. **RCC** views / Interface install  
4. **FUT-003** Make ON when registration opens  
5. Optional WSTEST Week archive cleanup after settlement QA  

---

## Known risks

1. Doc lag in Completion Master §0 dashboard (2026-08-24) — overlays preferred.  
2. Draft PR sprawl (#266 etc.).  
3. Local `sc-pw-e2e-lib.mjs` / `tools/season_simulation/` WIP must stay uncommitted until intentional.  
4. Weeks table protected — PAT often cannot DELETE Weeks (archive instead).  
5. Coach Summary Queue / Grade Submitted wording is documentation drift (DEF-WS-001…003).  
6. App not “fully complete” while Weeks / FUT-010 / product decisions remain.

---

## Exact recommended next task

**Cursor / Lead:** SC-ATHLETE-WF-001 harness complete (MRW-F09). Remaining product decision: SC-005 B3 (MRW-I13).

**Mike (P0 remaining):** FUT-010 supervised dry-run → apply per operator queue. Then Weeks import when calendar ready.

**Product (when ready):** Disposition SC-005 B3 same-day XP (MRW-I13).

**Do not:** re-paste 010/020/022/058/059/065/072/073; re-`--apply` Perfect Week for WAS `recl3DmBh22ADPWWe`; restore 075; start SC-SEASON-SIM-001 yet.

**Engineering:** Weekly settlement QA (MRW-F10) is complete. Best next pre-season-sim task is FUT-010 + Weeks readiness — not season simulation execute.
