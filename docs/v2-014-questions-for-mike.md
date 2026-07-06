# V2-014 — Questions Requiring Mike Approval

**Date:** 2026-07-05  
**Context:** Phase 2A Engineering Sprint — classification complete; **no production changes until answered.**

---

## P0 — Retirements and duplicates

| # | Question | Recommendation | Default if silent |
|---|----------|----------------|-------------------|
| Q1 | **112** has been OFF — approve **delete** after monitor period ends? | **Yes** — single VF path via **013** | Wait — do not delete tonight |
| Q2 | Confirm **043** can retire — **042** fully assigns Level Gate Rule? | Verify in OMNI + one enrollment row | Hold **043** until verified |
| Q3 | **012** deletion recorded — any automation still referencing 012 in interfaces? | OMNI scan DEV + prod | Assume clean |

---

## P1 — Merge candidates (clarity before slots)

| # | Question | Recommendation |
|---|----------|----------------|
| Q4 | Approve **006 + 021** merge plan for a future wave? | Yes **only if** same Submission trigger confirmed in OMNI |
| Q5 | Approve **030 + 032 + 033** WAS bootstrap merge? | Yes **only if** atomic bootstrap is acceptable — timing review required |
| Q6 | Approve **063 → 020** and **111 → 013** grade-band-at-create merges? | Yes — low risk, clarity win |
| Q7 | Email Message Center (EMC) — prioritize **072+074** pilot before daily email (**076+077**)? | Yes — weekly path is C-011 focus |

---

## P1 — Deploy sequencing

| # | Question | Recommendation |
|---|----------|----------------|
| Q8 | **066 v3.1** — paste to DEV only next session, prod only after DEV audit pass? | Yes — per V2-015 |
| Q9 | Wave 2A complete in GitHub — mark V2-014 Wave 2A **done** after OMNI trigger confirm? | Yes |
| Q10 | **C-020** Test Intake — build on DEV immediately after 066 DEV pass, or parallel with OMNI table shell tonight? | Parallel OMNI schema + Cursor script **after** ChatGPT design lands |

---

## P2 — Testing and inactive enrollments

| # | Question | Recommendation |
|---|----------|----------------|
| Q11 | Schmidt + 5 DEV test enrollments — document record IDs in PROJECT_STATE or C-019 doc? | Yes — OMNI export IDs |
| Q12 | **056/066/101** skip inactive enrollments — accept for C-020 upload tests, or revisit Active? semantics for **standings-only** false? | Accept for now — upload path unaffected |
| Q13 | DEV Make webhooks — configure before C-020 multi-video test, or mock without upload? | Dev Make before full video test |

---

## P2 — Standards and tooling

| # | Question | Recommendation |
|---|----------|----------------|
| Q14 | Adopt **066 v3.1** as mandatory template for all Category B rewrites? | Yes |
| Q15 | Create `airtable/automations/_patterns/` snippet folder (copy-paste helpers, not runtime)? | Defer — doc-only patterns sufficient for now |
| Q16 | ChatGPT **Automation Standard v4** — review in next session before editing doc 06? | Yes |

---

## P3 — Deferred (acknowledge only)

| # | Topic | Decision |
|---|-------|----------|
| Q17 | Lambda for media processing | **Deferred** per V2-014 |
| Q18 | V2-013 Program Instance implementation | Separate wave — not Phase 2A |
| Q19 | 2026–27 gameplay numbers / XP tuning in DEV | Wait for launch wave — not structural promote |

---

## How to respond

Reply in backlog or to Cursor with: `Q1: yes`, `Q4: wait`, etc. Cursor will update [v2-change-backlog.md](./v2-change-backlog.md) and [v2-014-wave-2a-classification.md](./v2-014-wave-2a-classification.md) after decisions.
