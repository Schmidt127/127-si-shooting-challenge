# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Operator queue:** [`docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md)  
**Baseline date:** 2026-08-29  

> Claims below are backed by command output or platform evidence from this Lead session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Audit start SHA | `5ae358d5` | `origin/master` before PKG-044 |
| Docs tip after #274 | `907c29a9` | FUT-WELCOME-LEGACY COMPLETE (6/6 fields) |
| Feature merge | `1b15d37f` | PR **#274** |
| Working tree note | Unrelated local WIP: `tools/testing/lib/sc-pw-e2e-lib.mjs` — **do not commit** | `git status` |

Re-verify:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## Open pull requests (live `gh pr list` 2026-08-29)

| PR | Title | State | Notes |
|----|-------|-------|-------|
| **#274** | Legacy welcome fields | **MERGED** | Airtable 6/6 deleted |
| **#273** | 058/059 Milestone Source Key | **MERGED** | Pasted Live (Automations 1.5 / v3.7) |
| **#271** | PKG-044 baseline | **MERGED** | FUT-001 / FUT-010 / SC-PW-E2E harness |
| **#269** / **#268** / **#264** | Harness / FUT-010 / FUT-001 | **MERGED** | Via #271 |
| **#266** | FUT-018/019/025 web | DRAFT | CONFLICTING — product WIP |
| **#262** / **#244** / **#240** / **#238** / **#237** / **#234** | Drafts | DRAFT | Review/supersede carefully |

---

## Tests / build / deploy (prior closeouts + this reconcile)

| Suite | Result |
|-------|--------|
| Legacy welcome + automation contracts | **PASS** (PR #274 closeout) |
| Web Vitest | **437/437 PASS** (#274) |
| Web typecheck / lint / build | **PASS** (#274) |
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
5. Optional disposable cleanup of later Pending PWTEST unlock (not required)

---

## Known risks

1. Doc lag in Completion Master §0 dashboard (2026-08-24) — overlays preferred.  
2. Draft PR sprawl (#266 etc.).  
3. Local `sc-pw-e2e-lib.mjs` WIP must stay uncommitted until intentional.  
4. Weeks table protected — no autonomous mutation.  
5. App not “fully complete” while Weeks / FUT-010 / product decisions remain.

---

## Exact recommended next task

**Cursor / Lead:** Close **SC-ATHLETE-WF-001** open defects (PHA-linked homework XP path; disposition SC-005 B3) before expanding season simulation.

**Mike (P0 remaining):** FUT-010 supervised dry-run → apply per operator queue. Then Weeks import when calendar ready.

**Do not:** re-paste 010/020/022/058/059/065/072/073; re-`--apply` Perfect Week for WAS `recl3DmBh22ADPWWe`; restore 075; start multi-enrollment season sim until ATHWF defects dispositioned.

---

## Session update log

| When | Change |
|------|--------|
| 2026-08-29 (start→#274) | PKG-044 + welcome retirement + 058 field fix |
| 2026-08-29 (release-completion) | MCP reconcile: Perfect Week award COMPLETE; paste queue COMPLETE; operator queue added; docs corrected |
