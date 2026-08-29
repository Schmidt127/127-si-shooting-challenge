# RELEASE BASELINE

**Product:** 127 Sports Intensity Shooting Challenge  
**Public URL:** https://www.fairfieldbasketballclub.com/shoot  
**Authority companion:** [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md)  
**Baseline date:** 2026-08-29  

> Claims below are backed by command output or platform evidence from this Lead session unless marked `PENDING`.

---

## Git identity

| Item | Value | Evidence |
|------|--------|----------|
| Audit start branch | `lead/release-baseline-2026-08-29` | `git checkout -B … origin/master` |
| Audit start SHA | `5ae358d5ec7423c9baffb7f245053f85b3bf7481` | `origin/master` before PKG-044 |
| Production branch HEAD | `69ff04d69d37804c58591b3fb04ec144b4bfd924` | Merge PR **#271** 2026-08-29T21:26:34Z |
| Working tree (post-merge local) | Clean on `master` tracking `origin/master` | Stash `lead-audit-wip-2026-08-29` still holds unrelated WIP |

Re-verify:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## Open pull requests (live `gh pr list` 2026-08-29)

| PR | Title | State | Mergeable | Notes |
|----|-------|-------|-----------|-------|
| **#264** | FUT-001 homework assignment identity | **MERGED** (via #271) | — | Content in PKG-044 |
| **#269** | SC-PW-E2E production harness | **MERGED** (via #271) | — | Content in PKG-044 |
| **#268** | FUT-010 attachment cleanup | **MERGED** (via #271) | — | Dry-run default; live clear still Mike |
| **#271** | PKG-044 release baseline | **MERGED** | — | `69ff04d6` |
| **#266** | FUT-018/019/025 web public experience | DRAFT | **CONFLICTING** | Rebase after #270/#271 |
| **#262** | Next paste packages docs | DRAFT | — | Docs |
| **#244** | WAS XP reconciliation tooling | DRAFT | — | |
| **#240** | Athlete XP activity performance | DRAFT | — | Overlaps WIP-XP-ACT stash |
| **#238** | 010 v10.12 not-ready fix | DRAFT | — | Related to paste queue |
| **#237** | 057 v1.10 counted date key | DRAFT | — | Likely superseded by 057 v2.2 |
| **#234** | Perfect Week PROD audit docs | DRAFT | — | |

---

## Tests run and results

| Suite | Result | Evidence |
|-------|--------|----------|
| Agent4 suite | **31/31 PASS** | Local `node tools/testing/run-agent4-suite.js` |
| Homework + FUT-010 + SC-PW-E2E contracts | **PASS** | Local Node test runners |
| Python Airtable + Lambda | **166 + 139 PASS** | Local unittest |
| Web Vitest | **434/434 PASS** | `cd web && npm test` |
| Web typecheck / build | **PASS** | After clearing stale `.next` |
| Source-of-truth audit | **PASS** | After PKG-044 Completion Master entry |
| Repository QA on PR #271 | **PASS** | automation-contracts + python-contracts |
| `npm run test:smoke:prod` | **NOT re-run** this session | Last documented 50/50 on 2026-08-26 |
| SC-PW-E2E live `--apply` | **FAILED at 058** (2026-08-28) | Evidence JSON; root cause: 058 field mismatch (`Source Key`/`Notes` vs prod `Milestone Source Key`/`Coach Note`); repo **058 v1.5** / **059 v3.7** — paste + manual WAS proof required (**BLOCKED / NEEDS PRODUCTION VERIFICATION**) |

---

## Build result

| Target | Result |
|--------|--------|
| `web` Next.js production build | **PASS** locally this session |
| Vercel Production deploy for `69ff04d6` | **SUCCESS** — GitHub deployment `6160301376` (2026-08-29T21:27:08Z) |
| Public site | https://www.fairfieldbasketballclub.com/shoot → **HTTP 200** |
| Health | `GET /shoot/api/airtable` → **200** `ok:true` `tokenValid:true` |

---

## Deployment result

| Item | Result |
|------|--------|
| Production site | **Live** https://www.fairfieldbasketballclub.com/shoot |
| This-session deploy | **SUCCESS** — SHA `69ff04d6` (PR #271) |
| Health endpoint | **200** `tokenValid:true` (verified 2026-08-29) |
| Last known SEO cutover | 2026-08-25 `NEXT_PUBLIC_ALLOW_SEARCH_INDEXING=true` |

---

## Production changes applied (already done — do not re-apply)

| Change | Evidence |
|--------|----------|
| 057 v2.2 + Perfect Week Video Minimum Config | Mike 2026-08-27; CURRENT-TRUTH / deploy checklist |
| 059 Pending-only unlock trigger | Mike 2026-08-27 |
| 065 v10.3 / 066 v3.9 dynamic `recordId` | 2026-08-24 closeout |
| 072 v4.7 weekly email E2E | 2026-08-24 |
| Public search indexing cutover | 2026-08-25 |
| Homepage content redesign | PR #270 merged `5ae358d5` |

---

## Production changes still awaiting manual application

See [`MASTER_REMAINING_WORK_LIST.md`](./MASTER_REMAINING_WORK_LIST.md) §C–D:

1. **010 v10.12** paste  
2. **022 v2.2 / 072 v4.8 / 073 v4.4** paste  
3. **020 v3.8 / 065 v10.4** paste (after FUT-001 merge)  
4. **FUT-003** Make scenario activation (when Mike chooses)  
5. **SC-PW-E2E** — paste **058 v1.5** (+ **059 v3.7**); manual proof on WAS `recl3DmBh22ADPWWe` before any new `--apply` (MRW-A01)  
6. **FUT-010** live attachment clear (after supervised dry-run)  
7. RCC views install  

---

## Known risks

1. **Doc lag:** Completion Master §0 (2026-08-24) contradicts CURRENT-TRUTH on 057/SEO.  
2. **Paste debt:** GitHub ahead of Production on 010/022/072/073/FUT-001/**058 v1.5**.  
3. **Perfect Week award unproven** — **BLOCKED / NEEDS PRODUCTION VERIFICATION** (058 field mismatch; Eligible=1 ≠ award).  
4. **Token scope:** Agent PATs often cannot write Enrollments → SC-PW-E2E preflight 403.  
5. **Draft PR sprawl:** Many drafts may be superseded; merge carefully.  
6. **Stash `lead-audit-wip-2026-08-29`:** Uncommitted PW/automation/web WIP — review before drop.  
7. **Weeks table:** Protected; no autonomous calendar mutation.  

---

## Exact recommended next task

**Mike (P0):** Paste **058 v1.5** (and **059 v3.7**) per [`docs/deploy-checklists/058-v1.5-milestone-source-key.md`](./docs/deploy-checklists/058-v1.5-milestone-source-key.md). Verify 058 Live + lifecycle trigger + dynamic `recordId`. Manually run 058 on WAS **`recl3DmBh22ADPWWe`**; confirm unlock `Milestone Source Key`, 059 **100 XP**, dedupe re-run. **Do not** run qualifying `--apply` and **do not** mark Perfect Week complete until evidence JSON shows unlock + XP + Awarded + 100 + no duplicates. Then paste **022 / 072 / 073** and **010 v10.12**.

**Cursor/Lead:** Ship 058/059 field-alignment PR; merge after CI; no Airtable paste from agents; no SC-PW-E2E `--apply`.

---

## Session update log

| When | Change |
|------|--------|
| 2026-08-29 (start) | Audit; created MASTER_REMAINING_WORK_LIST + this baseline at `5ae358d5` |
| 2026-08-29 (Phase 3) | Merged FUT-001 (#264), SC-PW-E2E (#269), FUT-010 (#268) onto lead branch; tests green; SC-PW-E2E live award **BLOCKED at 058** |
| 2026-08-29 (Phase 4) | PR **#271** merged → `69ff04d6`; Vercel Production deployment **success**; `/shoot` 200; `/shoot/api/airtable` ok |
| 2026-08-29 (058 fix) | Authoritative PW investigation → MRW-A01 **BLOCKED / NEEDS PRODUCTION VERIFICATION**; repo **058 v1.5** / **059 v3.7** (`Milestone Source Key` + `Coach Note`); no `--apply`; paste + WAS `recl3DmBh22ADPWWe` still required |
