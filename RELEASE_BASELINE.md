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
| Prior tip | `40175d76` / Phase 4 copy closeout | `origin/master` before MRW-F11 |
| This package | Core workflow reliability (MRW-F11 / MRW-I13 close) | Branch `qa/core-workflow-reliability-2026-08-30` |
| Working tree note | Unrelated WIP left untouched (`tools/season_simulation/`, web UX stash) | `git status` |

Re-verify:

```powershell
git fetch origin
git rev-parse HEAD origin/master
git status -sb
```

---

## Core workflow reliability (this baseline)

| Item | Result |
|------|--------|
| Offline season contracts | **PASS** `tests/workflow-contracts/season-calendar.test.js` |
| ATHWF contracts (MRW-I13 closed) | **PASS** |
| Live Weeks + PHA audit | **PASS** — Early Bird countable; 18 active PHA; Due Date 2027-06-29; Week 9 no homework |
| Live disposable apply | **PASS** — [`docs/testing/core-workflow/RESULTS.md`](docs/testing/core-workflow/RESULTS.md) |
| Orphan inactive PHA | Deleted `recpHX3stQ8YBVtLi` (Week 1 Final Reflection inactive junk) |
| Email send | **Not invoked** |
| Automation paste | **None** — do not repaste 010/020/022/057/065/072/073 |

### Confirmed season policy (2026-08-30)

| Rule | Value |
|------|--------|
| Early Bird | 2027-04-25 … 2027-05-01, countable |
| Week 1 | Starts 2027-05-02 |
| Week 9 homework | None |
| Active PHA | Exactly 18; Due Date 2027-06-29 |
| Submission XP | Once per Count It submission |
| Homework identity | Enrollment + PHA; ownership = linked Week |
| Homework XP | Once per Homework Completion |
| Automation 075 | Remains retired |

---

## Weekly settlement QA (prior baseline)

| Item | Result |
|------|--------|
| Offline contracts | **PASS** `test_sc_weekly_settlement_contract.mjs` |
| Live WS-01…WS-10 | **PASS** — see [`docs/testing/weekly-settlement/RESULTS.md`](docs/testing/weekly-settlement/RESULTS.md) |
| Perfect Week award | Still **COMPLETE** via cite WAS `recl3DmBh22ADPWWe` (do not re-apply) |

---

## Open pull requests

Re-check with `gh pr list`. Prior drafts remain product WIP — do not merge blindly.

### Prior closeout suites (still valid)

| Suite | Result |
|-------|--------|
| Web Vitest / typecheck / lint / build | **PASS** (PR #298) |
| Vercel Production for `082edc7d` | **Ready** |
| `/shoot/api/airtable` | **200** `tokenValid:true` |
| SC-PW-E2E award (WAS `recl3DmBh22ADPWWe`) | **PASS** |
| SC-ATHLETE-WF-001 offline contracts | **PASS** (MRW-I13 closed) |
| SC-CORE-WF live audit + apply | **PASS** (2026-08-30) |

---

## Production changes applied (do not re-apply)

| Change | Evidence |
|--------|----------|
| 010 / 020 / 022 / 065 / 072 / 073 | Live aligned — do not repaste |
| 057 / 058 / 059 | Live aligned / Perfect Week proven |
| Inactive orphan PHA `recpHX3stQ8YBVtLi` deleted | 2026-08-30 MRW-F11 |
| Perfect Week award WAS `recl3DmBh22ADPWWe` | Unlock + 100 XP — do not re-`--apply` |
