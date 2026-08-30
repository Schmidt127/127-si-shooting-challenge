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
| Season-sim preflight | PR **#302** MERGED `eca40509` | SC-SEASON-SIM-002 + 057 no-repaste |
| This package | Core workflow reliability (MRW-F11 / MRW-I13) | PR **#305** |
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

---

## Core workflow reliability (MRW-F11)

| Item | Result |
|------|--------|
| Offline season contracts | **PASS** `tests/workflow-contracts/season-calendar.test.js` |
| ATHWF contracts (MRW-I13 closed) | **PASS** |
| Live Weeks + PHA audit | **PASS** — Early Bird countable; 18 active PHA; Due Date 2027-06-29; Week 9 no homework |
| Live disposable apply | **PASS** — [`docs/testing/core-workflow/RESULTS.md`](docs/testing/core-workflow/RESULTS.md) |
| Multi-asset → one HC (live 020) | **PASS** — [`docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md`](docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md) |
| Live 065 Homework XP (multi-asset close) | **BLOCKED** — 065 input `recordId` hardcoded to deleted `reccYReUfSId2MH1S`; remap [`docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md`](docs/deploy-checklists/065-recordId-dynamic-remap-operator-packet.md) (**no script paste**) |
| Orphan inactive PHA | Deleted `recpHX3stQ8YBVtLi` |
| Email send | **Not invoked** |
| Automation paste | **None** |

### Confirmed season policy (2026-08-30)

| Rule | Value |
|------|--------|
| Early Bird | 2027-04-25 … 2027-05-01, countable |
| Week 1 | Starts 2027-05-02 |
| Week 9 homework | None |
| Active PHA | Exactly 18; Due Date 2027-06-29 |
| Submission XP | Once per Count It submission (**MRW-I13 COMPLETE**) |
| Homework identity | Enrollment + PHA; ownership = linked Week |
| Homework XP | Once per Homework Completion |
| Automation 075 | Remains retired |

---

## Validation

| Suite | Result |
|-------|--------|
| Web Vitest | **487/487 PASS** (PR #301) |
| Web typecheck / lint / build | **PASS** (PR #301) |
| Vercel Production for `f3be964f` | **Ready** |
| HTTP + Playwright prod smoke | **PASS** / **50/50** |
| `/shoot` + `/shoot/api/airtable` | **200** / `tokenValid:true` |
| Homework + weekly settlement contracts | **PASS** |
| FUT-010 offline | **PASS** |
| SC-SEASON-SIM-002 offline unittest | **PASS** (21) |
| Agent 4 suite | **PASS** (36) |
| FUT-002 inventory pytest | **PASS** (6) |
| SC-CORE-WF contracts + live audit/apply | **PASS** |
| SC-PW-E2E award (WAS `recl3DmBh22ADPWWe`) | **PASS** |

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

---

## Weeks / Homework / FUT-002 / FUT-010

| Item | Result |
|------|--------|
| Weeks 2026–27 | Early Bird Apr 25–May 1; Week 1 May 2; **no import needed** |
| Active PHA | **18**; due **2027-06-29**; Week 9 / Post-Challenge no HW |
| FUT-002 | 1355 fields; 5 `ZZZ DELETE` awaiting Mike UI |
| FUT-010 R3 | **0 eligible** |

---

## Production changes still awaiting Mike

1. **FUT-002 UI field deletes** — trash all `ZZZ DELETE — *` fields (5)  
2. **Before season simulation:** archive overlapping WSTEST/PWTEST Weeks (OMNI)  
3. Optional Automations Code refresh for 057 tracker text (docs hygiene only)  
4. Optional FUT-010 sign-off when eligible rows exist (currently zero)  
5. **RCC** views / Interface install  
6. **FUT-003** Make ON when registration opens  

---

## Known risks

1. Automations Code tracker lag for 057 (live script already correct).  
2. Disposable WSTEST/PWTEST Weeks can collide with 005 date matching.  
3. Season simulation execute still FUTURE until WSTEST cleanup.  
4. Airtable Meta API cannot DELETE fields — Mike UI required for FUT-002.

---

## Exact recommended next task

**Mike:** Delete 5 `ZZZ DELETE — *` fields (FUT-002). Before season sim: archive overlapping WSTEST/PWTEST Weeks (OMNI).

**Do not:** re-paste 010/020/022/057/058/059/065/072/073; restore 075; re-`--apply` Perfect Week for WAS `recl3DmBh22ADPWWe`; run full season-simulation execute yet.

**Engineering:** SC-SEASON-SIM-002 in `tools/season_simulation/` — read-only `preflight` / default `dry-run` only until WSTEST cleanup.

---

## Session update log

| When | Change |
|------|--------|
| 2026-08-30 (Phase 4 copy) | PR **#298** |
| 2026-08-30 (public UX chrome) | PR **#301** / **#304**; CR-12 closed |
| 2026-08-30 (FUT-002) | PR **#303** |
| 2026-08-30 (Agent 4) | PR **#302**; SC-SEASON-SIM-002; 057 no-repaste |
| 2026-08-30 (core workflow) | PR **#305**; MRW-F11 / MRW-I13 complete |
| 2026-08-30 (release closeout) | Merged Agent packages; reconciled baseline |
