# 067 Option B — PROD install + Schmidt live test

**SC items:** SC-013, SC-014  
**Decision:** Option B attachment-less (locked in `QUIZ-PATH-DECISION.md`)  
**Script:** `airtable/automations/shooting-challenge/067-homework-link-or-create-completion-from-reflection-quiz.js` **v2.0**  
**Base:** PROD `appn84sqPw03zEbTT`  
**Date:** 2026-07-25

## Package definition

| Item | Value |
|------|-------|
| Problem | HW17 Final Reflection quiz must create a reviewable Homework Completion without inventing PDF/assets |
| Tables | Final Reflection Quiz Submissions, Homework Completions, FBC Curriculum - SYNC, Enrollments, Submissions, Submission Assets |
| Automations | **067** (bridge), **068** (automatic deferred-summary reconciliation), **064→065** (XP after coach review), **071** (parent email Fillout-aware) |
| External | Fillout quiz form (or manual quiz row for Schmidt test) |
| Expected final behavior | Quiz row → one HC (Enrollment+Week+HW17), 0 assets, Ready for Review → coach Satisfactory → exactly one Homework XP → optional 071 |
| Completion criteria | PROD 067 paste confirmed + Schmidt live proof of HC/0 assets/one XP/no fake assets |

## Dependency map

| Dependency | Risk / rule |
|------------|-------------|
| Enrollment link on quiz | Required — 067 never guesses athlete |
| Active HW 17 curriculum row | Exactly one Active `Homework Number=HW 17` with Week |
| HC identity | Enrollment + Week + Homework (067 key) — distinct from 020 asset key |
| XP writers | **064/065 only** — 067 and 068 must never create XP Events |
| Deferred summary retry | Scheduled **068** scans HW17 completions with an empty summary link; it links only an exact-one Enrollment + Week summary |
| Assets / 070a | Optional; Option B expects **no** Quiz Result PDF field and **no** fake assets |
| 071 | Must stay Fillout-aware without requiring assets |
| Make | Not required for Option B bridge |
| Dedupe | Re-run quiz must link existing HC (`linked_existing` / `skipped_already_linked`), not mint duplicates |

## Do not

1. Create field **`Quiz Result PDF`** (Option A rejected).  
2. Mint placeholder Submission Assets.  
3. Paste a second quiz→XP automation.  
4. Mark Satisfactory from 067.  
5. Enable 070a solely for quiz Option B.

## PROD paste steps (Mike / OMNI)

1. Open Automations → locate **067 – Homework – Link or Create Completion from Reflection Quiz** (create only if missing — do not duplicate).  
2. Confirm trigger: Final Reflection Quiz Submissions created **or** Processing Status = Pending; Enrollment not empty.  
3. Input variable: `recordId` from triggering quiz record.  
4. Paste repo script **from production docblock through end** (skip GitHub header comments above the Airtable docblock).  
5. Confirm version header shows **v2.0** and Option B / `no_attachment_*` path.  
6. Leave automation **ON** for Schmidt testing.  
7. Install **068 - Homework - Reconcile Deferred Weekly Summary Links** as a separate scheduled automation. It requires no record input and must run on the committed 068 script.
8. Keep 068 scoped to HW17 completions with an empty `Weekly Athlete Summary Link`; it must fail closed on zero or multiple matching summaries and must never create summaries or XP Events.
7. Confirm **064**, **065**, **071** remain the only XP/email writers for this path.

## Schmidt live test protocol

Use Enrollment `recgP9qZYjAhE7NXm` only.

### T1 — Normal Option B path

1. Create Final Reflection Quiz Submissions row:
   - Enrollment = Schmidt
   - Score / Target Score Met? populated (any valid score)
   - **No** attachment field / files
   - Processing Status = Pending (if used)
2. Expect 067 outputs: `statusOut=success`, `actionOut` includes `created_new` or `linked_existing` plus `no_attachment_field` or `no_attachment_yet`.
3. Expect exactly **one** Homework Completion linked; Item Slot/Asset Slot HW1; Source System Fillout; Review Status Ready for Review; **0** Submission Assets.
4. Coach: mark Satisfactory? + Review Complete (do not invent assets).
5. Expect **one** Homework XP Event via 064→065; Source Key pattern per homework XP registry.
6. Optional: confirm 071 can send Schmidt-only parent email without assets.

### T2 — Duplicate / rerun

1. Re-trigger 067 on the same quiz row (or create second quiz pointing at same Enrollment+Week+HW17).  
2. Expect link to **same** HC; no second HC; no second XP after review already awarded.

### T2b — Automatic deferred-summary retry

1. Run 067 while no canonical Weekly Athlete Summary exists; expect `weeklySummaryLinkStatus=deferred_no_canonical_summary`.
2. Allow the applicable upstream flow to establish the one canonical summary.
3. Wait for the next scheduled 068 run; no operator re-entry is required.
4. Expect 068 to link the existing HW17 completion exactly once.
5. With zero or multiple matching summaries, expect no link. A replay after a successful link must produce no write.

### T3 — Blank enrollment

1. Quiz row with empty Enrollment.  
2. Expect skipped/needs_review/error with useful `errorOut` — no orphan HC.

### T4 — Inactive enrollment (if Active? guard present)

1. Temporarily uncheck Schmidt Active? only if safe for other tests; otherwise skip.  
2. Document actual behavior; restore Active?=true immediately.

## Evidence to record

| Field | Value |
|-------|-------|
| Quiz record ID | |
| Homework Completion ID | |
| Asset count | must be **0** |
| XP Event ID | |
| XP Source Key | |
| 067 actionOut | |
| Date | |

## Status after this packet

| SC | After repo packet | After PROD paste | After Schmidt proof (2026-08-04) |
|----|-------------------|------------------|----------------------------------|
| SC-014 | Built (decision locked) | Install confirmed | **Live Tested in PROD** |
| SC-013 | Built + install packet ready | Installed in PROD | **Live Tested in PROD** |

**PROD proof filed:** `docs/testing/evidence/2026-08-04-package-02-critical-pastes/` (quizzes `recxtTv0AD7G3XpGv` / `recFsN2KruSnerfns`; HC `recrBnHbLvDpFyIeO`; XP `rec6xE4V1t0atiTIP`).

## Offline verification already green

```bash
node tests/homework-contracts/run-all.js
```

Includes Option B recommendation, no-fake-attachment rules, and 067 identity key contracts.
