# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Operator queue:** [`docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md) · paste audit historical [`docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md`](./docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md)  
**Baseline date:** 2026-08-30 (release/QA — Weeks + 18-PHA + FUT-010 R3 before season simulation)

> Claims below are backed by command output or platform evidence from this session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Production tip (deployed) | `082edc7d` | Merge PR **#298** public copy |
| `origin/master` tip | Re-verify `git rev-parse origin/master` | Docs may be ahead on release-QA branch |
| Working tree note | Unrelated WIP left untouched (`tools/season_simulation/`, `sc-pw-e2e-lib.mjs`, qualifying JSON) | `git status` |

Re-verify:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## Public copy release (Phase 4 safe set)

| Item | Result |
|------|--------|
| PR | **#298** MERGED |
| Merge SHA | `082edc7d` |
| CI | Web CI SUCCESS |
| Vercel Production | Ready — GitHub deployments API SHA `082edc7d` |
| Live copy | `/shoot` shows “Published registration pricing…”; FAQ homework + coach feedback prose live |
| Env | `NEXT_PUBLIC_LANDING_URL` / `NEXT_PUBLIC_SITE_URL` = fairfieldbasketballclub.com; `NEXT_PUBLIC_BASE_PATH=/shoot`; `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` |
| Explicitly not shipped | Dashboard relabel; homepage “For parents”; FUT-016/017 redesigns; coach SLA; adjacent-school FAQ |

---

## Validation (this package)

| Suite | Result |
|-------|--------|
| Web Vitest | **483/483 PASS** |
| Web typecheck | **PASS** |
| Web lint | **PASS** (4 pre-existing unused-var warnings) |
| Web build | **PASS** |
| Homework contracts (assignment-identity + 005/020/065) | **PASS** |
| Weekly settlement contracts | **PASS** |
| FUT-010 offline (node + python) | **PASS** 15 + 19 |
| `/` + `/shoot` + `/shoot/faq` | **HTTP 200** |
| `/shoot/api/airtable` | **200** `ok:true` `tokenValid:true` |

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

## FUT-010

| Item | Result |
|------|--------|
| Dry-run R3 | **0 eligible** (homework scope 0) |
| Deletion proposed? | **No** |
| Evidence | [`docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md`](./docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md) |

---

## Production changes still awaiting Mike

1. **Before season simulation:** archive overlapping WSTEST/PWTEST Weeks (OMNI)  
2. Optional: archive inactive PHA `recpHX3stQ8YBVtLi`  
3. Optional Automations Code refresh for 057 tracker text  
4. Optional FUT-010 sign-off when eligible rows exist (currently zero)  
5. **RCC** views / Interface install  
6. **FUT-003** Make ON when registration opens  

---

## Known risks

1. Automations Code tracker lag for 057.  
2. Post-Challenge `Counts Toward Challenge?` unchecked, but week-assignment automations do not yet read that flag.  
3. Disposable WSTEST/PWTEST Weeks in same PI can collide with 005 date matching.  
4. Draft PR sprawl / local WIP must stay uncommitted until intentional.  
5. Weeks table protected.  
6. Season simulation still FUTURE until WSTEST cleanup recommended.
