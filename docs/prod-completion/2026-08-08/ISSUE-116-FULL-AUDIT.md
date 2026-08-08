# GitHub Issue #116 — Full Production-Readiness Audit

**Date:** 2026-08-08  
**Authority:** GitHub Issue [#116](https://github.com/Schmidt127/127-si-shooting-challenge/issues/116)  
**Controlling source:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`  
**Scope:** Repository truth, current completion evidence, open issues, tests, web readiness, and Airtable/Make proof gaps.

## Executive result

The repository is substantially ready for controlled production operation, but the product is not fully production-complete. The highest-risk remaining work is not broad code construction; it is controlled Airtable/Make installation and replay proof for the canonical submission/summary/XP chain and the reconciliation paths that prevent stale or orphan awards.

**Estimated final-product readiness: 72%**  
This is an evidence-weighted estimate, not a release approval. Core daily submission, weekly summary, homework, video storage, public web, and weekly email paths have meaningful proof. The estimate remains below launch-complete because several current scripts are only Built/Merged, live editor versions are stale or unknown, and eligibility-loss/orphan reconciliation is not installed and live-tested.

## 1. Truth table

| Subsystem | Status | Current evidence / exact gap |
|---|---|---|
| Repository source and offline contracts | **Built-Merged** | Current branch work includes 023/031 repairs and current-version contract assertions. Focused suite passes: 17 automation tests; 51 runtime-compat tests; 16 data-model tests; 6 weekly-email ownership/schedule tests. |
| `023 → 005` submission intake | **Live Tested** | 005 v4.1 and 023 v3.1 have controlled PROD proof on `recElDBcFvuE6jWwc`; 023 assigned `recCyFEPeATOVNlr9` through `submission-week` PI resolution and replay made no write. |
| `031` canonical Weekly Athlete Summary | **Built-Merged / Needs UI Proof** | Current v3.5 malformed-candidate/stale-link repair and fail-closed tests pass. Airtable paste and controlled stale-link replay remain unconfirmed. |
| `010` Submission Base XP | **Built-Merged / Needs UI Proof** | Current repository replay validation and ownership tests pass; controlled PROD re-trigger and editor-version proof remain required. |
| `053/054` streaks | **Installed / Live Tested with residual scope** | Schmidt streak proof exists; PI-scoped 053 v5.3 still requires paste/replay proof for the current package. |
| `066 → 059` shot milestones | **Defect fixed in repo / Needs UI Proof** | v3.5 create-record contract regression passes. PROD natural path previously failed on raw `createRecordsAsync` payloads; paste v3.5 and rerun on `recCyFEPeATOVNlr9` are required. |
| Perfect Week | **Live Tested partial / Needs UI Proof** | CASE-01 057→058→059 award path is proven. 059 trigger coverage and remaining fixture cases are not complete. |
| Levels and gates (`041/042/043`) | **Installed partial / Needs UI Proof** | 042 gate behavior and 041 recalculation contracts exist. 043 stale-link/version state and gate-clear live proof remain unresolved. |
| Homework / quiz / reviewer links | **Live Tested / Complete for proven paths** | 067 Option B, 071 feedback, 070a photo path, and SC-150 private reviewer links have PROD evidence. Learning Activities/PHA schema and routing remain repository-built rather than season-complete. |
| Video XP (`113/114`) | **Defect / Needs implementation and UI proof** | Open Issue #101 remains valid: current scripts do not fully validate countability, future dates, Week, and Enrollment consistency before award/reactivation. |
| Orphan and eligibility-loss XP | **Defect** | Open Issues #100 and #102 remain valid. Manual cleanup evidence exists, but recurrence prevention and scheduled/admin reconciliation are not installed/live-tested. |
| Weekly summary build/send (`118/119/072/074`) | **Installed / Live Tested with pending PI paste** | Existing weekly email E2E and Make writeback proof is strong. PI-isolated v1.7 scripts still require the documented paste/test queue and current season inputs. |
| Daily/welcome/feedback communications | **Partial / Needs UI Proof** | 071 is live-proven; 073 and 075/076/077 require current-source and handoff verification. No uncontrolled send should be enabled. |
| Zoom | **Installed partial / Needs UI Proof** | 101 owns live attendance XP; 117 owns recording approval email. Recording-credit orchestrator remains a design alternative and must not replace PROD 117. |
| Public `/shoot` web app | **Live Tested** | Read-only production smoke and browser QA pass; server-side Airtable access and `/shoot` basePath are preserved. Dashboard/auth remains demo/decision-needed; noindex remains intentional. |
| Reliability Command Center | **Built / Needs UI Proof** | Repository CLI and sanitized export checks pass; Airtable views are designed but not installed. |

## 2. Top remaining blockers, ranked

1. **Airtable paste and controlled proof for 053 → 066 → 118 → 119** after the successful 023 gate.
2. **Install and rerun 066 v3.5** on `recCyFEPeATOVNlr9`; confirm existing unlock links and zero duplicate XP.
3. **Install and controlled replay-test 031 v3.5** on a stale-summary fixture; confirm safe repair and fail-closed ambiguity.
4. **Implement reconciliation for active orphan XP** from Issue #100, with dry-run, explicit write mode, and 041 recalculation.
5. **Implement eligibility-loss reconciliation** for threshold/Perfect Week awards from Issue #102.
6. **Harden 113/114 source validation** from Issue #101 before the next video XP award.
7. **Complete 071/073 source-chain and semantic Make response checks** from Issue #105.
8. **Repair 072/076 active-XP and Program Homework Assignment ownership** from Issue #104.
9. **Finish 041/042/043 controlled gate-clear proof** and reconcile 043's stale/retired editor state.
10. **Install RCC views and complete current Airtable automation/version/trigger inventory**; keep `112` OFF and never paste the Stage 17 orchestrator over 117.

## 3. Shortest execution path

### Package A — close the canonical submission chain

1. Paste and verify 053 v5.3.
2. Paste 066 v3.5 and rerun the controlled Schmidt milestone test.
3. Paste 118 v1.7 and 119 v1.7 with current Program Instance/season inputs.
4. Run 031 v3.5 and 010 current-editor replay tests.
5. Recheck no duplicate Submission Base XP, no duplicate WAS, and correct Enrollment/Week/PI links.

### Package B — make invalid awards self-healing

1. Build the read-only orphan/eligibility audit first.
2. Add explicit `CONFIRM_WRITE` retirement mode and 041 recalculation requests.
3. Add fixtures for valid, deleted, unlinked, moved, inactive, future, and below-threshold sources.
4. Install in Airtable only after dry-run counts are reviewed; replay on the controlled enrollment.

### Package C — harden downstream source contracts

1. Fix 113/114, then 071/073, then 072/076.
2. Preserve Source Keys and Make final-send ownership.
3. Run test-recipient handoffs before any Live send.

### Package D — finish operational proof

1. Install RCC views.
2. Re-export the current Automations inventory and attest triggers/versions.
3. Run the final Schmidt matrix and record all blocked/not-tested rows.
4. Decide athlete auth, indexing, and season intake separately; do not let optional web work delay data correctness.

## 4. Repository work completed during this audit

| Work | Result |
|---|---|
| Stale contract assertions | Updated tests from superseded 031 v3.2 and 118/119 v1.6 expectations to current 031 v3.5 and 118/119 v1.7. |
| Focused automation suite | PASS: `test_023_offline`, `test_031_offline`, 066 batch regression, 020 identity, and 117 email handoff. |
| Runtime compatibility suite | PASS: 51 checks, including active-tree no-bare-`unloadData` enforcement. |
| Weekly email/data-model contracts | PASS: ownership, schedule, and field-contract suites. |
| Audit evidence | This document records the current truth table, blockers, execution order, UI-only actions, and stale queue removals. |

## 5. Mike-only / UI-only action packet

These actions require Airtable Automation Editor, Airtable trigger/view controls, Make UI, or Vercel settings unavailable to repository execution:

1. **Automation 053 — Rebuild/Upsert Streak Occurrences**  
   - Table/trigger: `Submissions`, current documented trigger/input mapping.  
   - Paste: repository `053...js`, v5.3.  
   - Test: controlled Enrollment `recCyFEPeATOVNlr9`, current PI Week.  
   - Expected: PI-scoped streak occurrence/update; replay creates no duplicate occurrence or XP.
2. **Automation 066 — Create Shot Milestone Unlocks**  
   - Table/trigger: `Enrollments`, controlled `Run Check?`/configured trigger.  
   - Paste: repository `066...js`, v3.5.  
   - Test: `recCyFEPeATOVNlr9`.  
   - Expected: existing unlocks link/skip, no duplicate milestone XP, no `records[0] should have a 'fields' property`.
3. **Automation 031 — Find/Create Weekly Athlete Summary**  
   - Table/trigger: `Submissions`; input `recordId` from the triggering Submission.  
   - Paste: repository `031...js`, v3.5.
   - Test: stale-summary controlled fixture, then replay.  
   - Expected: exactly one canonical Enrollment+Week summary; safe stale repair; ambiguous/no replacement fails closed.
4. **Automation 118 / 119 — scheduled weekly build/send**  
   - Tables/triggers: `Weekly Athlete Summary` / season schedule; inputs from current Program Instance and season config.  
   - Paste: repository v1.7 files.  
   - Test: controlled Schmidt-only package; keep `includeSchmidt=false` for normal traffic and `sendMode=Live` only where approved.  
   - Expected: 118 arms Build, 072 builds, 119 arms Send to Make, 074 posts, Make owns final Sent/writeback.
5. **Automation 059 trigger coverage**  
   - Trigger table: `Achievement Unlocks`; remove the obsolete Shot Milestone-only filter while preserving Pending-only and source gates.  
   - Test: Perfect Week CASE-01 and remaining fixture cases.  
   - Expected: one Perfect Week XP Event, idempotent replay, no milestone-trigger regression.
6. **Make / communications**  
   - Use test recipient first for 071/073/074/117f.  
   - Confirm HTTP 200 semantic payload is success, not merely transport success; confirm Make owns final send writeback.
7. **RCC and inventory**  
   - Create the documented four Airtable health views; re-export Automation inventory and attest 112 OFF, 043 disposition, and 117 email-only ownership.

No Airtable schema changes, production deployments, credential changes, or uncontrolled sends were performed by this audit.

## 6. Removed from the active queue

- Do not reopen old DEV-first-only or “never install 115” instructions; current completion evidence supersedes them for this empty/controlled PROD operating model.
- Do not treat Stage 17 orchestrator/117a–e as the owner of PROD Automation 117; 117 is the recording-approval email handoff.
- Do not treat 023 as blocked: controlled primary and replay proof is recorded in the 2026-08-07 evidence.
- Do not reopen Softr cutover as a launch dependency; `/shoot` is the active web product.
- Do not pursue historical 2025–26 data preservation or optional athlete auth/indexing as a prerequisite for core pipeline correctness.
- Do not count repository tests, a commit, or a paste packet as Airtable installation/live proof.

## 7. Issue and evidence disposition

- Issues **#100, #101, #102, #104, and #105** remain active defects or proof gaps and should stay queued.
- Issue **#106** is implemented in the current repository/master history and should be closed as a code defect after this audit's commit; Airtable editor paste/replay remains tracked as UI proof, not as an unresolved repository fix.
- Issue **#96** is superseded by the merged 031 canonical-summary hardening and should be annotated/closed after verifying the final master tip.
- Issue **#116** remains open until this audit document and its repository changes are merged to `master`; the remaining UI packet is the final handoff, not a reason to block repository closeout.

## Evidence boundaries

Repository evidence proves source, tests, and documentation only. It does not prove Airtable editor installation, trigger configuration, Make scenario state, Vercel environment values, or live email delivery. Those states are deliberately marked **Needs UI Proof** above.