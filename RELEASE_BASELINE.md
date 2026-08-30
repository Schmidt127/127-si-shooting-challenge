# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Operator queue:** [`docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md`](./docs/deploy-checklists/2026-08-29-PRODUCTION-OPERATOR-QUEUE.md) · paste audit historical [`docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md`](./docs/deploy-checklists/2026-08-30-OUTSTANDING-PRODUCTION-PASTE-AUDIT.md)  
**Baseline date:** 2026-08-30 (release/QA closeout after PR #298)

> Claims below are backed by command output or platform evidence from this session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Tip | `082edc7d` | Merge PR **#298** public copy |
| Copy commit | `8c574108` | Safe Phase 4 jargon/FAQ/SEO only |
| Working tree note | Unrelated WIP left untouched (`tools/season_simulation/`, `sc-pw-e2e-lib.mjs`) | `git status` |

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
| Explicitly not shipped | Dashboard relabel; homepage “For parents”; FUT-016/017 redesigns; coach SLA; adjacent-school FAQ |

---

## Validation (this package)

| Suite | Result |
|-------|--------|
| Web Vitest | **483/483 PASS** |
| Web typecheck | **PASS** |
| Web lint | **PASS** (4 pre-existing unused-var warnings) |
| Web build | **PASS** |
| FUT-010 offline (node + python) | **PASS** 15 + 19 |
| Weekly settlement contracts | **PASS** |
| `/` + `/shoot` + `/shoot/faq` | **HTTP 200** |
| `/shoot/api/airtable` | **200** `ok:true` `tokenValid:true` |

---

## Production automation baseline (verify only — no paste)

| # | Target | Live evidence | Action |
|---|--------|---------------|--------|
| **057** | v2.2 + `Perfect Week Video Minimum` | `get_automation` script correct; schema field correct | **No further paste** |
| **010** | v10.12 | Automations Code aligned | Do not re-paste |
| **020** | v3.8 | Automations Code aligned | Do not re-paste |
| **022** | v2.2 | Automations Code aligned | Do not re-paste |
| **065** | v10.4 | Automations Code aligned | Do not re-paste |
| **072** | v4.8 | Automations Code aligned | Do not re-paste |
| **073** | v4.4 | Automations Code aligned | Do not re-paste |
| **075** | Retired / absent | Not in live automations list | Do not restore |

**Note:** Automations **Code tracker column** for 057 still shows stale typo string — documentation lag only. Live automation script is authority.

Submission XP: **one XP per Count It submission** (finalized). Perfect Week 057→058→059 E2E already proven — do not re-apply.

---

## FUT-010

| Item | Result |
|------|--------|
| Dry-run R2 | **0 eligible** (homework scope 0) |
| Deletion proposed? | **No** |
| Evidence | [`docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R2.md`](./docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R2.md) |

---

## Weeks 2026–27

| Item | Result |
|------|--------|
| Official rows | Early Bird + Weeks 1–9 + Post-Challenge present |
| Early Bird live | **Apr 25–May 1, 2027** (countable); May 1 ∈ Early Bird; Week 1 starts May 2 |
| Aug 23 Early Bird | **Not live** |
| Import ready? | **No import needed** for Apr 25 structure; Aug 23 requires Mike date-change approval |
| Evidence | [`docs/testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md`](./docs/testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md) |

---

## Production changes still awaiting Mike

1. **Confirm Early Bird window** (keep Apr 25 vs authorize Aug 23)  
2. Optional Automations Code refresh for 057 tracker text  
3. Optional FUT-010 sign-off when eligible rows exist (currently zero)  
4. **RCC** views / Interface install  
5. **FUT-003** Make ON when registration opens  

---

## Known risks

1. Automations Code tracker lag for 057.  
2. Post-Challenge `Counts Toward Challenge?` unchecked, but week-assignment automations do not yet read that flag.  
3. Draft PR sprawl / local WIP must stay uncommitted until intentional.  
4. Weeks table protected.  
5. Season simulation still FUTURE until Early Bird attested.
