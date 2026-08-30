# SC-CORE-WF Results — 2026-08-30

| Item | Result |
|------|--------|
| Offline contracts | **PASS** `tests/workflow-contracts/season-calendar.test.js` |
| ATHWF contracts (MRW-I13 closed) | **PASS** |
| Live Weeks + PHA audit | **PASS** — Early Bird 2027-04-25…05-01 countable; Week 1 starts 2027-05-02; 18 active PHA; Due Date 2027-06-29; Week 9 has 0 homework |
| Live disposable apply | **PASS** — evidence `apply-2026-08-30T185627590Z.json` |
| Email send | **Not invoked** |
| Automation paste | **None** (010/020/022/057/065/072/073 left aligned) |
| Orphan PHA deleted | Inactive Final Reflection on Week 1 (`recpHX3stQ8YBVtLi`) — safe config cleanup |

## Apply notes

- Operational 2027 Early Bird Activity Dates yield `Count This Submission? = 0` until season (formula). XP path uses disposable past countable `COREWF|` week.
- Same-day dual Count It → two `SUBMISSION_XP` events — **expected** (MRW-I13 closed).
- PHA-linked HC without Reconciliation Needed → 065 skip — **expected**.
- Coach/weekly queue: verified Build/Send triggers unset.

## Remaining (not defects in this pass)

| Item | Owner |
|------|--------|
| PAT cannot DELETE XP Events / HC / Submissions (403) — MCP cleanup works | airtable |
| Inactive enrollment create works; Enrollment Notes field does not exist | documentation |
| Full season simulation | FUTURE (do not run) |
| Multi-asset → one HC via live 020 asset path | **PASS** 2026-08-30 — see [`MULTI-ASSET-HW-RESULTS.md`](./MULTI-ASSET-HW-RESULTS.md) |
| Live 065 Homework XP after multi-asset | **PENDING** — 065 dynamic `recordId` remapped (2026-08-30); Mike desktop `--apply` — [`MULTI-ASSET-HW-RESULTS.md`](./MULTI-ASSET-HW-RESULTS.md) |
