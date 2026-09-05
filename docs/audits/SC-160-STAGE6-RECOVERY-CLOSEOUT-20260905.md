# SC-160 Stage 6 — Recovery Closeout (2026-09-05)

**Status: IN PROGRESS — Stage 6 recovery proven; 020 v4.1 paste pending**  
**Base:** Production `appn84sqPw03zEbTT`  
**Recovery branch:** `recover/sc-160-stage6-resume`  
**Prior tip:** `30db121c` (PR #427 pause) · prior Stage 6 merge `b93bc0cd` (PR #425)

## Verdict

Stage 6 matrix + late XP recovery evidence is complete. **SC-160 cannot be marked COMPLETE** until Mike pastes GitHub **020 v4.1** (WAS find-or-create for Enrollment + PHA.Week) and weekless HC→WAS→065 is live-tested. Paste packet: [`../deploy-checklists/SC-160-020-v4.1-was-pha-week.md`](../deploy-checklists/SC-160-020-v4.1-was-pha-week.md). FUT-002 trash remains **hold**.

## 1. Why the prior run stopped

1. Stage 6 matrix (2026-09-04) largely passed in `apply-2026-09-04T205330220Z.json` (**16 PASS / 2 FAIL**): late XP timed out; raw-API Source Attachment duplicate observed (soft).
2. Closeout PR **#425** merged as COMPLETE before the required chat final report could be reconciled with the live WAS storm.
3. Mike PAUSE (2026-09-05): six duplicate Athlete1+Early Bird Weekly Athlete Summaries blocked **065** at `Require canonical WAS`. Agent never returned the PAUSE report (session stalled at “are you working?”).
4. Independent cleanup later removed the six duplicates and the failed disposable HC. Recovery resumed from that cleaned state.

## 2. Tests already completed (not re-run)

From Stage 6 apply evidence + reported re-arm (preserved):

| Scenario | Evidence |
|----------|----------|
| Early homework | PASS |
| On-time homework | PASS |
| Exact deadline | PASS |
| Immediately after deadline (notes) | PASS |
| Coach reviews late / athlete on-time | PASS |
| Placeholder then late satisfactory | PASS |
| Video without Week | PASS |
| Multiple attachments (HW1/HW2 + 3 video) | PASS |
| Retry / no duplicate HC | PASS |
| Reconciliation (no Missing Week gate) | PASS |
| Reported submission 020 re-arm | PASS (5 assets; 2 HC; 3 VF) |

## 3. Tests resumed (this recovery)

| Scenario | Result |
|----------|--------|
| Late homework XP after WAS cleanup | **PASS** — 35 XP, Source Key `HOMEWORK_XP|{hcId}`, Week = Early Bird (PHA) |
| 065 idempotent retry | **PASS** — still exactly one XP Event after Reconcile 1→0→1 |
| 057 late PW exclusion | **PASS** (prior apply + this path) |
| Duplicate WAS cleanup / singleton | **PASS** — orphan harness WAS deleted; post-cleanup Athlete1+Early Bird count **0** |

## 4. Original-submission final status

- Still **Processing** with note: `009: Week not linked — assets created; week-dependent scoring on hold`.
- **Reason:** expected **Week hold** + intentional **009** parent writeback (same Processing write after successful asset create whether Week is present or not). **021** only toggles No Files vs Processing when files exist; it is not an “upload still running” fan-out to Sent.
- All five assets are **Uploaded** — not unfinished upload, not a downstream error, not a stale orphan of failed 020.
- Week Assignment Status remains Needs Assignment (Submission.Week empty by design for this evidence path).

## 5. Homework Completion results (reported)

| Slot | Week | Notes | Review | Award | XP |
|------|------|-------|--------|-------|----|
| HW1 | Week 1 (PHA) | Early Notes | Satisfactory + Complete | **Awarded** | **46** (`HOMEWORK_XP|{hcId}`, Active) |
| HW2 | Week 1 (PHA) | Early Notes | Not yet graded | Pending | 0 |

Both HCs link to one Week 1 Weekly Athlete Summary for the enrollment.

## 6. Video Feedback results (reported)

Three VF records remain **Uploaded**, enrollment-linked, reviewable without Submission.Week. No upload errors.

## 7. XP results

- Reported HW1: one Active Homework XP Event @ **46**.
- Disposable late recovery: one Active Homework XP Event @ **35**, then deleted with fixtures.
- No duplicate Source Keys observed after singleton WAS.

## 8. Early / on-time / late proof

- Prior matrix PASS for timing Notes + PHA Week ownership.
- Reported HW1 proves **early** live path (Early Notes + Week 1 + full XP).
- Recovery disposable proves **late** full XP + Perfect Week homework satisfactory exclusion.

## 9. Duplicate-summary root cause

**Primary: test-harness defect (not Automation 031).**

- `ensureCanonicalWas` used `FIND(ARRAYJOIN({Enrollment}))`, which **intermittently misses** linked WAS rows.
- Harness then created another WAS → 065 correctly fail-closed on `candidates.length !== 1`.
- PAT cannot DELETE → orphans accumulated across interrupted applies.

**Harness fix (this recovery):** list by Week, exact Enrollment+Week match in JS; post-create poll + direct verify; HARD STOP if duplicates remain.

**Production risk:** residual race without DB unique key remains (SC-154); **031/065 already fail-closed**. **No production 031/065 paste required.**

## 10. Retry / deduplication proof

- 020 Enrollment re-arm → no duplicate HC (prior matrix).
- 065 re-arm after award → still one `HOMEWORK_XP|{hcId}` (recovery).
- Raw API can still insert duplicate Source Attachment IDs (observed; 009 skip-by-ID path unchanged).

## 11. Reconciliation proof

- No-Week zero-asset Why Not Ready no longer gates on Missing Week (prior matrix).
- Reported path: assets exist; Ready for 009 = 0; week-hold note visible.

## 12. Cleanup result

Deleted only agent disposable recovery fixtures (XP, asset, HC, submission, harness WAS + orphan WAS).  
Mike reported registration / submission / five assets / two HCs / three VF **preserved**.  
Athlete1+Early Bird WAS count after cleanup: **0**.

## 13. SC-160 final status

**IN PROGRESS** — recovery PASS; **020 v4.1 paste + weekless WAS live proof** still required before COMPLETE / Live Tested.

## 14. Explicit non-actions

- Season Simulation not run  
- 058 / 059 / 070a not modified  
- FUT-002 fields not trashed by agent  
- Record IDs / PII omitted from public prose  

## 15. FUT-002 gate

**HOLD** until SC-160 is formally COMPLETE after 020 v4.1 live proof. Four-field trash checklist remains in [`FUT-002-batch2-quarantined-field-delete.md`](../deploy-checklists/FUT-002-batch2-quarantined-field-delete.md) (row #3 already gone).

## 16. Mike’s next action

1. Paste GitHub **020 v4.1** per [`../deploy-checklists/SC-160-020-v4.1-was-pha-week.md`](../deploy-checklists/SC-160-020-v4.1-was-pha-week.md).
2. Tell Cursor to run the weekless WAS→065 live proof.
3. Do **not** trash FUT-002 Batch 2 fields until SC-160 is formally COMPLETE.
