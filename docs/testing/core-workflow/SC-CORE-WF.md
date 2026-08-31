# SC-CORE-WF — Core workflow reliability

| Field | Value |
|-------|--------|
| Backlog | **MRW-F11** · Core workflow reliability workstream |
| Harness | `tools/testing/sc-core-workflow.mjs` |
| Contracts | `lib/workflow-contracts/season-calendar.js` |
| Offline tests | `tests/workflow-contracts/season-calendar.test.js` |
| Evidence | `docs/testing/evidence/sc-core-workflow/` |

## Confirmed product rules (2026-08-30)

| Rule | Value |
|------|--------|
| Early Bird | 2027-04-25 … 2027-05-01, **countable** |
| Week 1 start | 2027-05-02 |
| Week 9 homework | **None** |
| Active PHA count | **Exactly 18** (Early Bird ×2 + Weeks 1–8 ×2) |
| Common due date | **2027-06-29** on every active PHA |
| Assignment identity | Enrollment + Program Homework Assignment |
| Homework ownership | Linked Week |
| Submission XP | Once per **Count It** submission (`SUBMISSION_XP\|{id}`) — same-day multi OK |
| Homework Completion | Multiple assets for one slot → one HC |
| Homework XP | Once per Homework Completion |
| Perfect Week | 057→058→059 proven — do not re-`--apply` closed fixtures |
| Aligned automations | Do **not** repaste 010, 020, 022, 057, 065, 072, 073 |
| Automation 075 | Remains **retired** |

## Commands

```bash
# Offline contracts
node tests/workflow-contracts/season-calendar.test.js
node tools/testing/tests/test_sc_athlete_wf_contract.mjs

# Live readonly audit (Weeks + PHA)
node tools/testing/sc-core-workflow.mjs

# Disposable Testing3 apply (no email)
node tools/testing/sc-core-workflow.mjs --apply

# Cleanup manifest records
node tools/testing/sc-core-workflow.mjs --cleanup

# Multi-asset → one HC + Homework XP via live 020/064/065 (COMPLETE 2026-08-31; no email)
node tools/testing/sc-multi-asset-homework.mjs --apply
node tools/testing/sc-multi-asset-homework.mjs --cleanup

# Operator runbook (final 065 XP proof): docs/testing/core-workflow/MULTI-ASSET-HW-OPERATOR-RUNBOOK.md
```

See [`MULTI-ASSET-HW-RESULTS.md`](./MULTI-ASSET-HW-RESULTS.md) — 065 required dynamic `recordId` remap **and** trigger re-entry after remap; exactly one XP, no duplicate.
## Apply coverage

- Live audit: Early Bird / Week 1 dates, countable flag, 18 PHA, June 29 due dates, no Week 9 homework
- Disposable past countable week for Submission XP (future 2027 Early Bird Activity Dates keep `Count This Submission?=0` until season)
- Multi same-day + backdate + week-mismatch
- PHA-linked Early Bird homework + duplicate Enrollment+PHA row
- Missing PHA identity skip probe
- After linked Week / before June 29 deadline contract
- Inactive enrollment create attempt
- WAS prep without Build/Send email triggers

## Out of scope

- Full season simulation
- Live email / Resend / Make notification arms
- Automation paste
- Perfect Week re-`--apply`
