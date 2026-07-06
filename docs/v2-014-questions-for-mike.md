# V2-014 — Questions Requiring Mike Approval

**Date:** 2026-07-05  
**Decisions recorded:** 2026-07-05 (Mike)  
**Context:** Phase 2A Engineering Sprint — classification complete.

---

## Mike decisions (2026-07-05)

| # | Decision | Notes |
|---|----------|-------|
| **Q1** | **Yes — delete 112** | Single VF path via **013**. Execute at next approved production change window. |
| **Q2** | **Yes — delete/retire 043** | **042** owns gate assignment. Mike: legacy automations not worth preserving — build better replacements. |
| **Q3** | **Yes — assume clean** | No need to hunt old **012** references; focus forward. |
| **Q4** | **Yes** | Approve **006 + 021** merge plan (future wave; OMNI confirm same trigger). |
| **Q5** | **Yes** | Approve **030 + 032 + 033** WAS bootstrap merge (future wave). |
| **Q6** | **Yes** | Approve **063 → 020** and **111 → 013** grade-band-at-create merges. |
| **Q7** | **Yes** | EMC pilot **072+074** before daily **076+077**. |
| **Q8** | **Yes** — DEV test before prod | **066 v3.1 already pasted in DEV Airtable** — next step is audit/sandbox test, not re-paste unless GitHub version drift. Prod only after DEV pass. |
| **Q9** | **Yes** | Wave 2A **planning** complete — **implementation** (2b+) not started |
| **Q10** | **Yes — Cursor recommendation** | **Parallel:** OMNI **Testing Scenarios** table + Testing views in DEV now. **Cursor script blocked** until OMNI final field list. Full pipeline test after 066 DEV audit pass. |
| **Q11** | **Yes** | Document test enrollment/record scope in PROJECT_STATE. Test rows live in **registrant/pipeline tables** (Submissions, Submission Assets, Homework Completions, Video Feedback, XP Events, etc.) — **not** config tables (Milestones, Levels, Gates, XP Rules, …). |
| **Q12** | **Yes — accept for now** | See [Q12 explained](#q12-explained) below. |
| **Q13** | **Default: dev Make before full video test** | Mike did not specify — using recommendation. Configure dev Make webhooks before C-020 multi-video upload test. |
| **Q14** | **Yes** | **066 v3.1** mandatory template for all Category B rewrites. |
| **Q15** | **Yes** | Create `airtable/automations/_patterns/` snippet folder. |
| **Q16** | **Yes** | ChatGPT Automation Standard v4 review before editing doc 06. |
| **Q17** | **Yes — pursue Lambda for media** | Mike direction: move from **Google Drive** toward **Lambda** for upload/processing path. **Planning wave required** — supersedes “Lambda deferred” for long-term asset strategy; does not execute tonight. Link **C-013**. |
| **Q18** | **Cursor recommendation** | **V2-013 Program Instance** stays a **dedicated wave after Phase 2 stabilization** — do not mix with Wave 2b–2h automation work. |
| **Q19** | **Wait** | 2026–27 gameplay numbers / XP tuning — Mike reviewing separately. |

---

## Q12 explained

**Question:** Automations **056**, **066**, and **101** may **skip** enrollments where `Active?` = false (Schmidt + DEV test enrollments). Accept that for C-020 testing?

**Answer:** **Yes, accept for now.**

**What it means for you:** Test Intake upload/homework/video tests (**009 → 070 → 022**) still run normally on inactive test enrollments. **Streak refresh, shot-milestone checks, and Zoom XP** may not fire on those rows until you manually trigger or we narrow `Active?` semantics later. That is OK for pipeline testing; note it when testing milestones/streaks on Schmidt rows.

---

## Execution queue (from decisions — not tonight unless scheduled)

| Action | When |
|--------|------|
| Delete automation **112** | Next Mike-approved prod maintenance window |
| Retire automation **043** | Same window — verify **042** on one enrollment first |
| **066** DEV audit + sandbox test | Next DEV session (paste already done) |
| Merge waves **006+021**, **030+032+033**, **063/111** | Approved in principle — implement in named Wave 2f+ only |
| **Lambda** asset path design | New planning item — ChatGPT + C-013; not Google Drive long-term |

---

## Original questions (archive)

| # | Question | Recommendation | Default if silent |
|---|----------|----------------|-------------------|
| Q1 | **112** has been OFF — approve **delete** after monitor period ends? | **Yes** — single VF path via **013** | **Approved 2026-07-05** — delete at next prod window |
| Q2 | Confirm **043** can retire — **042** fully assigns Level Gate Rule? | Verify in OMNI + one enrollment row | **Approved 2026-07-05** — retire **043** |
| Q3 | **012** deletion recorded — any automation still referencing 012 in interfaces? | OMNI scan DEV + prod | **Approved 2026-07-05** — assume clean; focus forward |

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

Decisions recorded above (2026-07-05). For new questions, reply `Q#: yes/wait` to Cursor.
