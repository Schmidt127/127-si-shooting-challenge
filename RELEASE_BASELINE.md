# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Operator queue:** [`docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md) · paste audit [`docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md`](./docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md)  
**Baseline date:** 2026-08-30  

> Claims below are backed by command output or platform evidence from this Lead session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Prior tip | `69d77134` | `origin/master` before Phase 4 copy PR #298 |
| This package | Phase 4 safe public copy + ship closeout | PR **#298** → merge `082edc7d` |
| Production tip | `082edc7d173ff3f7ded3df4a2e513532229690b3` | Merged + Vercel Production Ready |
| Working tree note | Unrelated WIP left untouched (`tools/season_simulation/`, local PW evidence) | `git status` |

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
| Web Vitest | **483/483 PASS** (PR #298 branch + master) |
| Web typecheck / lint / build | **PASS** (PR #298) |
| Vercel Production for `082edc7d` | **Ready** — deployment `dpl_2uQ1wPJferY189xkCFkg4D67JcFR` |
| `/shoot` | **HTTP 200** |
| Landing `fairfieldbasketballclub.com` | **HTTP 200** |
| `/shoot/api/airtable` | **200** `ok:true` `tokenValid:true` |
| HTTP prod smoke | **PASS** `npm run test:smoke:http:prod` |
| Phase 4 safe copy (CR-01–CR-11) | **SHIPPED** — [copy review](docs/copy-reviews/2026-08-30-phase4-public-pages.md) |
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
| 057 v2.2 + PW video minimum **Config schema** | 2026-08-27 (field rename + WAS formula) |
| 057 Automations Code CONFIG string | **NOT YET** — still typo `MInimum`; paste pending MRW-C05c |
| Legacy welcome Enrollment fields 6/6 | 2026-08-29 |
| Perfect Week award WAS `recl3DmBh22ADPWWe` | Unlock `recJ5umer4J4FHTOz`; XP `reczehlzkA8fjiQh0`; Awarded; 100 XP |
| SEO indexing cutover | 2026-08-25 |
| Homepage redesign | PR #270 |

---

## Production changes still awaiting Mike

1. **057 v2.2 typo-field repaste** (P0) — [`057-v2.2-perfect-week-video-minimum-paste.md`](docs/deploy-checklists/057-v2.2-perfect-week-video-minimum-paste.md)  
2. **FUT-002 UI field deletes** — trash all `ZZZ DELETE — *` fields (5): HC `fldHchlovIaPlGKLk`, Levels `fldTzIGODB2e03rvE`, Streak Occurrences `fldltgFPGVXHwRj4X` + `fldBFDl629arXFcnp`, Achievements `fldkIzG5emvUBQ0Tw`. Evidence: [`docs/audits/FUT-002-cleanup-session-2026-08-30.md`](docs/audits/FUT-002-cleanup-session-2026-08-30.md) · [`docs/audits/field-inventory/`](docs/audits/field-inventory/)  
3. **FUT-010** live attachment clear (dry-run complete; attestation + AWS creds)  
4. **Weeks 2026–27** import (protected)  
5. **RCC** views / Interface install  
6. **FUT-003** Make ON when registration opens  
7. Optional WSTEST Week archive cleanup after settlement QA  

---

## Known risks

1. Doc lag in Completion Master §0 dashboard (2026-08-24) — overlays preferred.  
2. Draft PR sprawl (#266 etc.).  
3. Local `sc-pw-e2e-lib.mjs` / `tools/season_simulation/` WIP must stay uncommitted until intentional.  
4. Weeks table protected — PAT often cannot DELETE Weeks (archive instead).  
5. Coach Summary Queue / Grade Submitted wording is documentation drift (DEF-WS-001…003).  
6. App not “fully complete” while Weeks / FUT-010 / 057 paste / product decisions remain.
7. **057** Automations Code still references renamed Config field typo — fail-closed risk on video minimum until paste.

---

## Exact recommended next task

**Cursor / Lead:** SC-ATHLETE-WF-001 harness complete (MRW-F09). Remaining product decision: SC-005 B3 (MRW-I13).

**Mike (P0):** Paste **057** from [docs/deploy-checklists/057-v2.2-PASTE.txt](docs/deploy-checklists/057-v2.2-PASTE.txt) per operator packet. Then FUT-010 supervised apply. Then Weeks import when calendar ready.

**Product (when ready):** Disposition SC-005 B3 same-day XP (MRW-I13).

**Do not:** re-paste 010/020/022/058/059/065/072/073; re-`--apply` Perfect Week for WAS `recl3DmBh22ADPWWe`; restore 075; start SC-SEASON-SIM-001 yet.

**Engineering:** Docs-only paste audit complete; no Airtable paste from agents.

---

## Session update log

| When | Change |
|------|--------|
| 2026-08-30 (Phase 4 copy) | PR **#298** merge `082edc7d`; Production Ready `dpl_2uQ1wPJferY189xkCFkg4D67JcFR`; restored documented public URL envs after bad `BASE_PATH`; deferred CR-12/13/17/18 + further FUT-016/017 redesign |
| 2026-08-30 (paste audit) | Outstanding Production paste audit; operator packets; **057** only remaining priority paste; CURRENT-TRUTH §8 corrected |
