# SC-160 Stage 6 — Duplicate / Missing WAS Incident (PAUSE)

**Status:** Duplicate Athlete1 condition **cleared**; Mike reported HW1 XP **restored**; SC-160 remains **PAUSED** for a production WAS gap below  
**Base:** Production `appn84sqPw03zEbTT`  
**Related:** Automation **065** v10.7 · Automation **031** · Stage 6 harness `tools/testing/sc-160-stage6-live-proof.mjs`

## Task Classification

| Field | Value |
|-------|-------|
| Type | Incident response / live repair |
| Priority | P0 |
| Backlog | SC-160 Stage 6 PAUSE |
| Phase | 5 Close (reopened) |
| Correct tool | Cursor + Airtable MCP |
| Mike's role | Review; no FUT-002 trash until SC-160 truly closed |

---

## What Mike observed (Stage 6 day)

Six Weekly Athlete Summary rows shared the same Enrollment + Week + Summary Key for the disposable **Athlete1 / Early Bird** path during Stage 6 harness runs (~38 minutes). Automation **065** correctly fail-closed at `5 - Require canonical WAS` (no XP Event).

## Live truth at pause re-check (2026-09-05)

| Check | Result |
|-------|--------|
| Athlete1 + Early Bird WAS count | **0** (duplicates already deleted in prior cleanup) |
| Global duplicate Summary Keys | **0** |
| Mike reported Rene enrollment + Week 1 WAS | **0** before repair (not six) |
| Mike HW1 Homework Completion | Satisfactory / Review Complete / Pending / Reconcile=1 / no XP |
| 065 failure mode on that HC | **No** canonical WAS for Enrollment+Week (same step 5), not “multiple” |

So: the **six-way duplicate** Mike inspected was the Stage 6 Athlete1 harness pile-up. Separately, Mike’s **reported Rene** homework stayed blocked because weekless Submission never got a WAS for the PHA Week that 020 wrote onto the HC.

---

## Duplicate source / root cause

| Source | Verdict |
|--------|---------|
| Stage 6 / FUT-001 harness `ensureCanonicalWas` | **Confirmed primary cause of the six duplicates** — FIND-based lookup missed existing rows / races; repeated `--apply` created orphans with zero Submission/HC links |
| Manual fixture creation | Not indicated for the five empty-link rows |
| Automation **031** | **Not the writer of the six** — 031 requires Submission.Week; fail-closes on Summary Key races (`throwOnDuplicateSummaryKey`); SC-154 already hardened |
| Race in production 031 | Possible in theory; not evidenced for this incident |
| Test-harness cleanup defect | **Yes** — incomplete delete (PAT 403) left orphans until MCP cleanup |

**Production-risk verdict (duplication):** Solely a **test-harness** defect for the six-row pile-up. Production **031** already fail-closes on post-create duplicate Summary Keys; **065** fail-closes when WAS count ≠ 1.

**Production-risk verdict (missing WAS after SC-160):** **Real product gap.** Weekless Submission → 009 creates assets → 020 creates HC with **PHA.Week** → **031 never runs** (no Submission.Week) → **065** cannot award until a WAS exists for Enrollment+PHA Week. This is not duplication, but it uses the same 065 step-5 gate.

---

## Canonical survivor rationale

**Athlete1 Early Bird (six-row incident):** Survived only the row linked to the disposable late-credit HC/submission; deleted confirmed orphan Stage 6 creates with zero Submission and zero Homework Completions Link. Later disposable proof rows were cleaned after XP proof.

**Mike reported Rene Week 1:** No WAS existed to “preserve.” Created **exactly one** new WAS with Enrollment = Rene enrollment, Week = Week 1 (from PHA), Submissions = Mike’s reported submission. Did **not** delete Mike’s registration, submission, assets, HCs, or Video Feedback.

---

## Records removed (no IDs)

| Removed | Why disposable |
|---------|----------------|
| Five Athlete1+Early Bird WAS with no Submission and no HC links, created during Stage 6 harness window | Stage 6 `ensureCanonicalWas` orphans |
| Later disposable FUT-001 / Stage 6 HC / XP / WAS proof rows after XP confirmation | Prefix-gated agent fixtures |

**Not removed:** Mike’s reported registration, no-Week submission, five Submission Assets, two Homework Completions, three Video Feedback records, or the single Rene Week 1 WAS created for repair.

---

## Post-cleanup counts

| Scope | Count |
|-------|------:|
| Exact Enrollment+Week WAS for Athlete1+Early Bird | 0 (fixtures cleaned) |
| Exact Enrollment+Week WAS for Rene+Week 1 after repair | **1** |
| Duplicate Summary Key groups base-wide | **0** |

---

## 065 retry result (Mike reported HW1)

| Check | Result |
|-------|--------|
| Re-arm | Cleared Last Reconciled Signature after WAS create |
| Award Status | **Awarded** |
| XP Events with `HOMEWORK_XP\|{hcId}` | **Exactly 1** |
| XP Points | **46** (matches Total Homework XP Awarded) |
| Active? | true |
| Reconcile Needed? | 0 |
| Idempotent coach-feedback pulse | Still **exactly 1** XP Event @ 46 |

---

## Harness / recon improvements already landed (PR #425)

- `ensureCanonicalWas` HARD STOP if duplicates cannot be deleted or post-create count ≠ 1  
- Stage 6 evidence + WAS incident note on master  
- Do **not** create further Stage 6 fixtures for Athlete1+Early Bird until SC-160 unpaused  

## Remaining production fix (blocks SC-160 close)

020 currently copies `Weekly Athlete Summary` **from the Submission only**. For weekless intake that field is empty, so HC with PHA Week has no WAS path.

**Required before SC-160 COMPLETE:** 020 (or a dedicated follow-on) must find-or-create the canonical WAS for `Enrollment + assigned PHA Week` when linking/creating HC, fail-closed if multiple exist, and never invent a Submission.Week.

---

## Remaining Stage 6 status

**PAUSED — not COMPLETE.**

- Duplicate six-row condition: **resolved**  
- Mike reported HW1 XP: **restored**  
- Matrix resume: **do not resume** until production WAS-for-PHA-Week path is implemented and live-tested  
- FUT-002 Batch 2 UI trash: **hold** until SC-160 truly closed again  

Evidence companion: prior Stage 6 closeout docs remain historical for paste/version attestation; this file is the pause authority for WAS.
