# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Operator queue:** [`docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md) · paste audit historical [`docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md`](./docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md)  
**Baseline date:** 2026-08-30 (release closeout — Agents 1–4)

> Claims below are backed by command output or platform evidence from this session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Production tip (web) | `f3be964f` | PR **#301** public UX chrome + Vercel Production Ready |
| Docs closeout | PR **#304** MERGED | MRW-G11 / CR-12 shipped |
| FUT-002 cleanup | PR **#303** MERGED `dc0751ec` | Quarantine + inventory; Mike UI deletes remain |
| This package (Agent 4) | SC-SEASON-SIM-002 + release-readiness | PR **#302** |
| Working tree note | Parallel agent WIP may remain in other worktrees | `git status` |

Re-verify:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## Public copy + chrome

| Item | Result |
|------|--------|
| Phase 4 safe copy (CR-01–CR-11) | **SHIPPED** — PR **#298** merge `082edc7d` |
| Public chrome cleanup (CR-12) | **SHIPPED** — PR **#301** / **#304**; Dashboard/Display hidden from nav/hub |
| Live copy | `/shoot` registration pricing + FAQ homework/coach feedback live |
| Env | `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` = fairfieldbasketballclub.com; `NEXT_PUBLIC_BASE_PATH=/shoot`; `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` |
| Explicitly not shipped | Dashboard relabel; homepage “For parents”; FUT-016/017 redesigns; coach SLA; adjacent-school FAQ |

---

## Validation

| Suite | Result |
|-------|--------|
| Web Vitest | **487/487 PASS** (PR #301) |
| Web typecheck / lint / build | **PASS** (PR #301) |
| Vercel Production for `f3be964f` | **Ready** — deployment `DvGMmEx3FM2hmamguaRDYimhAyfy` |
| HTTP prod smoke | **PASS** |
| Playwright prod smoke | **50/50 PASS** |
| `/shoot` + landing | **HTTP 200** |
| `/shoot/api/airtable` | **200** `ok:true` `tokenValid:true` |
| Homework + weekly settlement contracts | **PASS** |
| FUT-010 offline (node + python) | **PASS** 15 + 19 |
| SC-SEASON-SIM-002 offline unittest | **PASS** (21) |
| 057 live-schema field assert | **PASS** (repo); optional Meta when `ASSERT_057_LIVE=1` |
| 057 runtime offline | **PASS** (Agent 4 suite) |
| SC-PW-E2E award (WAS `recl3DmBh22ADPWWe`) | **PASS** |
| SC-ATHLETE-WF-001 offline / dry-run / readonly | **PASS** |
| FUT-002 inventory pytest | **PASS** (6) |

---

## Production automation baseline (verify only — no paste)

| # | Target | Live evidence | Action |
|---|--------|---------------|--------|
| **057** | v2.2 + `Perfect Week Video Minimum` | Live script correct | **No further paste** |
| **010** | v10.12 | Automations Code aligned | Do not re-paste |
| **020** | v3.8 | Automations Code aligned | Do not re-paste |
| **022** | v2.2 | Automations Code aligned | Do not re-paste |
| **065** | v10.4 | Automations Code aligned | Do not re-paste |
| **072** | v4.8 | Automations Code aligned | Do not re-paste |
| **073** | v4.4 | Automations Code aligned | Do not re-paste |
| **075** | Retired / absent | Not in live automations list | Do not restore |

Submission XP: **one XP per Count It submission** (finalized). Perfect Week 057→058→059 E2E already proven — do not re-apply.

---

## Weeks 2026–27

| Item | Result |
|------|--------|
| Official rows | Early Bird + Weeks 1–9 + Post-Challenge present |
| Early Bird | **Apr 25–May 1, 2027** (countable) — **finalized** |
| May 1 | ∈ Early Bird; Week 1 starts May 2 |
| Config / PI | All official rows link Config `2026-2027` + PI `Shooting Challenge \| 2026-2027` |
| Import needed? | **No** |
| Evidence | [`docs/testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md`](./docs/testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md) |

---

## Homework (18-assignment design)

| Item | Result |
|------|--------|
| Active PHA count | **18** (EB HW1/HW2 + Weeks 1–8 HW1/HW2) |
| Week 9 / Post-Challenge homework | **None** (intentional) |
| Common due date | **2027-06-29** on all 18 |
| Inactive orphan | `recpHX3stQ8YBVtLi` Week 1 HW1 Final Reflection Quiz — optional OMNI archive |
| Identity / 020 / 033 / 065 | Pass audit — no paste |
| Evidence | [`docs/testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md`](./docs/testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md) |

---

## FUT-002 / FUT-010

| Item | Result |
|------|--------|
| FUT-002 live inventory | **1355 fields / 33 tables** — [`docs/audits/field-inventory/`](./docs/audits/field-inventory/) |
| FUT-002 quarantine | **5** `ZZZ DELETE — *` fields awaiting Mike UI trash |
| FUT-010 dry-run R3 | **0 eligible** — [`docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md`](./docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md) |

---

## Production changes still awaiting Mike

1. **FUT-002 UI field deletes** — trash all `ZZZ DELETE — *` fields (5): HC `fldHchlovIaPlGKLk`, Levels `fldTzIGODB2e03rvE`, Streak Occurrences `fldltgFPGVXHwRj4X` + `fldBFDl629arXFcnp`, Achievements `fldkIzG5emvUBQ0Tw`  
2. **Before season simulation:** archive overlapping WSTEST/PWTEST Weeks (OMNI)  
3. Optional: archive inactive PHA `recpHX3stQ8YBVtLi`  
4. Optional Automations Code refresh for 057 tracker text (docs hygiene only — **do not repaste live script**)  
5. Optional FUT-010 sign-off when eligible rows exist (currently zero)  
6. **RCC** views / Interface install  
7. **FUT-003** Make ON when registration opens  

---

## Known risks

1. Automations Code tracker lag for 057 (live script already correct).  
2. Post-Challenge `Counts Toward Challenge?` unchecked, but week-assignment automations do not yet read that flag.  
3. Disposable WSTEST/PWTEST Weeks in same PI can collide with 005 date matching.  
4. Draft PR sprawl / local WIP must stay uncommitted until intentional.  
5. Weeks table protected.  
6. Season simulation execute still FUTURE until WSTEST cleanup.  
7. Airtable Meta API cannot DELETE fields — Mike UI required for FUT-002 quarantine trash.

---

## Exact recommended next task

**Mike:** Delete 5 `ZZZ DELETE — *` fields (FUT-002). Before season sim: archive overlapping WSTEST/PWTEST Weeks (OMNI).

**Do not:** re-paste 010/020/022/057/058/059/065/072/073; restore 075; re-`--apply` Perfect Week for WAS `recl3DmBh22ADPWWe`; run full season-simulation execute yet.

**Engineering:** SC-SEASON-SIM-002 is in `tools/season_simulation/` — read-only `preflight` / default `dry-run` only until WSTEST cleanup.

---

## Session update log

| When | Change |
|------|--------|
| 2026-08-30 (Phase 4 copy) | PR **#298** merge `082edc7d`; Production Ready |
| 2026-08-30 (public UX chrome) | PR **#301** / **#304**; hide Dashboard/Display; prod smoke **50/50**; CR-12 closed |
| 2026-08-30 (FUT-002) | PR **#303**; live inventory + quarantine; Asset Key fixed |
| 2026-08-30 (Agent 4) | PR **#302**; SC-SEASON-SIM-002; 057 no-repaste; Weeks + 18-PHA + FUT-010 R3 |
| 2026-08-30 (release closeout) | Merged Agent packages; reconciled baseline |
