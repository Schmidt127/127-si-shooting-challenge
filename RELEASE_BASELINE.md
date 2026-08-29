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
| Audit start SHA | `5ae358d5ec7423c9baffb7f245053f85b3bf7481` | `origin/master` = Merge PR #270 homepage redesign |
| Production branch | `master` | Repo convention |
| Working tree at audit start | Dirty on `fix/fut-001-homework-assignment-identity` | Stashed as `lead-audit-wip-2026-08-29` |
| Repository cleanliness (this baseline write) | Lead branch clean except new baseline docs until merges | Update after Phase 3/4 |

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
| **#264** | FUT-001 homework assignment identity | OPEN | MERGEABLE | CI green (automation-contracts, python-contracts, Vercel) |
| **#269** | SC-PW-E2E production harness | DRAFT | MERGEABLE | CI green; harness for Mike live run |
| **#268** | FUT-010 attachment cleanup | DRAFT | MERGEABLE | Destructive live apply needs Mike |
| **#266** | FUT-018/019/025 web public experience | DRAFT | **CONFLICTING** | Rebase after #270 |
| **#262** | Next paste packages docs | DRAFT | — | Docs |
| **#244** | WAS XP reconciliation tooling | DRAFT | — | |
| **#240** | Athlete XP activity performance | DRAFT | — | Overlaps WIP-XP-ACT |
| **#238** | 010 v10.12 not-ready fix | DRAFT | — | Related to paste queue |
| **#237** | 057 v1.10 counted date key | DRAFT | — | Likely superseded by 057 v2.2 |
| **#234** | Perfect Week PROD audit docs | DRAFT | — | |

Merged recently (on master at baseline): **#270** homepage, **#267** FUT-010 docs, **#265** SC-PW-E2E preflight, **#263** SC-034/PW config.

---

## Tests run and results

| Suite | Result | Evidence |
|-------|--------|----------|
| Repository QA (PR #264) | **PASS** | GitHub Actions run on PR head `3d497f4a` |
| Repository QA (PR #269) | **PASS** | Checks SUCCESS on draft PR |
| Local full web vitest / build (this session) | **PENDING** | Run after merges on lead branch |
| `npm run test:smoke:prod` | **PENDING** this session | Last documented 50/50 on 2026-08-26 (CURRENT-TRUTH) |
| SC-PW-E2E live `--apply` | **NOT RUN** | Requires Mike Enrollments-capable PAT |

---

## Build result

| Target | Result |
|--------|--------|
| `web` Next.js production build | **PENDING** this session (run after authorized merges) |
| Prior documented | Build pass cited for FUT-014/SEO packages on master |

---

## Deployment result

| Item | Result |
|------|--------|
| Production site | **Live** at https://www.fairfieldbasketballclub.com/shoot (pre-existing) |
| This-session deploy | **PENDING** until master merges + Vercel auto-deploy evidence |
| Health endpoint | `GET /shoot/api/airtable` — re-verify after deploy |
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
5. **SC-PW-E2E** live apply (verification, not paste)  
6. **FUT-010** live attachment clear (after supervised dry-run)  
7. RCC views install  

---

## Known risks

1. **Doc lag:** Completion Master §0 (2026-08-24) contradicts CURRENT-TRUTH on 057/SEO.  
2. **Paste debt:** GitHub ahead of Production on 010/022/072/073/FUT-001.  
3. **Perfect Week award unproven** at 7/7 despite config closeout.  
4. **Token scope:** Agent PATs often cannot write Enrollments → SC-PW-E2E preflight 403.  
5. **Draft PR sprawl:** Many drafts may be superseded; merge carefully.  
6. **Stash `lead-audit-wip-2026-08-29`:** Uncommitted PW/automation/web WIP — review before drop.  
7. **Weeks table:** Protected; no autonomous calendar mutation.  

---

## Exact recommended next task

**Mike (P0):** In Production Airtable, verify Automation **058** is Live and its trigger matches Perfect Week Eligible → Pending unlock creation. Re-run `node tools/testing/sc-pw-e2e.mjs --case qualifying --apply` with an Enrollments-capable PAT. Then paste **022 v2.2 / 072 v4.8 / 073 v4.4** and **010 v10.12**.

**Cursor/Lead:** Push `lead/release-baseline-2026-08-29`, open PR, merge after CI green, confirm Vercel deploy.

---

## Session update log

| When | Change |
|------|--------|
| 2026-08-29 (start) | Audit; created MASTER_REMAINING_WORK_LIST + this baseline at `5ae358d5` |
| 2026-08-29 (Phase 3) | Merged FUT-001 (#264), SC-PW-E2E (#269), FUT-010 (#268) onto `lead/release-baseline-2026-08-29`. Tests: Agent4 **31/31**, homework contracts pass, SC-PW-E2E contracts pass, FUT-010 Node tests pass, Python Airtable **166** + Lambda **139** OK, Vitest **434/434**, `next build` OK, typecheck OK after clearing stale `.next`. SC-PW-E2E live award remains **BLOCKED at 058**. |
