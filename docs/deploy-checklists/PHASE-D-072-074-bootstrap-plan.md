# Phase D bootstrap plan — 072 ∪ 074 Weekly Summary Email

**Status:** **READY_FOR_AUTHORIZATION** (2026-07-14)  
**Not executed:** No Airtable paste, enable, webhook config, or email send.  
**Depends on:** Phase C2 UI complete preferred (111 deleted → 4 free) before counting Phase D to 5 free.  
**Backlog:** V2-014 capacity Path E; touches C-011 readiness only as future work.

---

## Objective

| Absorb | Into surviving slot | Slots freed |
|--------|---------------------|------------:|
| **074** Send Weekly Summary → Make | **072** Build (+ optional Send) Weekly Summary | +1 |

**After Phase D UI complete:** DEV **45 estimated / 5 free** (after C2’s 46/4).

---

## Number choice

| Choice | Decision |
|--------|----------|
| Survive | **072** |
| Library stub | **074** |
| Why | Build logic dominates (~2.4k LOC); send is ordered tail step; naming stays weekly-summary package automation |

---

## Repo deliverables (this package)

| Deliverable | Path |
|-------------|------|
| Analysis | `docs/deploy-checklists/PHASE-D-072-074-current-state-analysis.md` |
| Risks | `docs/deploy-checklists/PHASE-D-072-074-risk-dependency.md` |
| Combined SoT | `airtable/automations/shooting-challenge/072-…build-weekly-summary-email-package.js` **v4.0.0** |
| 074 stub | `074-…send-weekly-summary-email-package-to-make.js` (LIBRARY ONLY) |
| Rollback | `_rollback/phase-d-072-074-2026-07-14/` |
| Offline tests | `tools/airtable/tests/test_phase_d_072_074_combined.py` |
| Mike UI (future) | `docs/deploy-checklists/PHASE-D-072-074-mike-ui-actions.md` |
| Lead decision | `docs/overnight-runs/results/S26-phase-d-decision.md` |

---

## Execution shape (after Mike authorizes)

1. Paste combined **072** v4.0.0 into DEV (Folder 07) — leave **OFF**.
2. Inputs: `recordId`; `makeWebhookUrl` **blank** for first smokes; `sendMode=test`; optional `testRecipientEmail` only when webhook points to test Make.
3. Update trigger to OR (Build Now) OR (Send to Make && Ready); Sent unchecked; Enrollment/Week present.
4. Leave legacy **074** OFF until smoke PASS; then delete 074 UI slot.
5. Do **not** enable live parent sends in this phase.

Mike UI sheet: [`PHASE-D-072-074-mike-ui-actions.md`](./PHASE-D-072-074-mike-ui-actions.md)

---

## Acceptance (DEV DoD — post-authorization)

| Gate | Expect |
|------|--------|
| Offline contracts | `test_phase_d_072_074_combined.py` PASS |
| Build-only | Package written; Send left unchecked when not armed; blank webhook |
| Send-only | Existing package → Make when webhook present; skip when blank |
| Retry | Webhook fail keeps Send armed + Error |
| Already-sent | Skip send |
| Adjacent Folder 07 | Untouched / remain OFF |
| 117 / PROD | Untouched |

---

## Explicit non-goals

- C-011 scheduled auto-weekly
- Real Gmail / parent inbox
- PROD paste
- Enabling other Folder 07 automations
- EMC rewrite (V2-014b)

---

## Authorization needed from Mike

Reply **“Authorize Phase D UI”** (or equivalent) before any paste/trigger change. Until then package remains **READY_FOR_AUTHORIZATION** only.
