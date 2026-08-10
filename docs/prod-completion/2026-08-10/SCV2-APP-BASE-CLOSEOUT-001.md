# SCV2 App/Base Closeout — Reconciliation and PROD Test Cards

**Backlog:** `SCV2-APP-BASE-CLOSEOUT-001`  
**Phase 2 approval:** Mike, 2026-08-10  
**Repository baseline:** `origin/master` `ecf2fff7b5c34b045bc9a2f05f882c4c512c122a`  
**Environment:** PROD Airtable `appn84sqPw03zEbTT`  
**Scope:** Airtable app/base closeout only. No web, schema, production-data, automation-activation, or deployment changes were made by Cursor.

## Current reconciliation

The current baseline below supersedes stale historical wording, but it does not delete or reopen prior evidence.

| Area | Current status | Evidence / boundary |
|---|---|---|
| Automation 005 | Installed in PROD, path proven | `005 → 009 → 020` path passed on the initial and replay submissions |
| Automation 009 | Installed in PROD, path proven | Initial and replay submissions reused the same Homework Completion |
| Automation 020 | Installed in PROD, path proven | Exact Homework Completion reuse confirmed; no duplicate created |
| Automation 067 v3.4 | Installed in PROD; focused proof pending | Do not redesign; Mike must run the reflection-quiz card below |
| Automation 115 v2.0 | Installed in PROD; focused proof pending | PHA-first logic is installed; Mike must run the focused Testing Scenarios card below |
| Homework Completion reuse | Proven | Initial `rectWmGA1K2RSN4bp` and replay `recPPrwds0oz0EB4C` both reused `recyU1G9mWC1rQSst` |
| Homework Library relationship | Proven | Canonical library record `rechVLOeyEVIqmy2v` |
| PHA relationship | Proven for the current package | PHA `recgj8dPk4ouTwCOj` is the schedule-side record; HC must link PHA and library separately |
| Package 10 | Closed / preserved | PR #133 merged and deployed; PR #134 corrected Automation 115's stale header; do not reopen |
| Production writes | Mike-only | Cursor did not modify PROD Airtable data or simulate either test |

## High-priority incomplete items

These remain open because repository evidence cannot prove Airtable UI state or a fresh PROD run:

1. Focused PROD proof for Automation 067 v3.4.
2. Focused PROD proof for Automation 115 v2.0.
3. Native Airtable automation UI/version/status attestation, including 057 v1.4 status and the actual 035 OFF/ON state.
4. Required Testing views and their exact enrollment filters.
5. Fresh Schmidt athlete-path proof after the base reset, including the current 2026–2027 enrollment.
6. Season-launch readiness: Weeks/config import and validation, Fillout activation, season-sensitive automation review, Make/email safety, and final Mike approval.

No item above is marked complete from a governance-table row, old install packet, or repository-only script header.

## Mike-only PROD test card: Automation 067 v3.4

**Purpose:** Prove the HW17 reflection-quiz bridge creates or reuses the canonical Homework Completion without creating fake assets or XP.

### Setup

- Base: PROD `appn84sqPw03zEbTT`.
- Table: **Final Reflection Quiz Submissions**.
- Trigger: create a quiz record or make it match the installed 067 trigger: **Processing Status = Pending** with **Enrollment** populated. Do not create a second 067 automation.
- Enrollment: select the current Schmidt testing enrollment used by the current 2026–2027 PHA. The known closeout fixture is `recCyFEPeATOVNlr9`; if the post-reset record differs, return the actual ID instead of substituting an old fixture.
- Existing canonical records to verify, not recreate:
  - PHA: `recgj8dPk4ouTwCOj`
  - Homework Library: `rechVLOeyEVIqmy2v`
  - Homework Completion: `recyU1G9mWC1rQSst`
- Create one fresh quiz row with a new quiz record ID, Enrollment selected, Processing Status pending, and no Homework Completion link. Do not attach a PDF for the attachment-less Option B proof.

### Run order

1. Confirm 067 is the installed **v3.4** automation and is ON.
2. Save the fresh quiz row so the trigger fires.
3. Wait for 067 to finish; do not manually run 020, 009, 064, or 065 during this card.
4. Replay the same quiz row once only after recording the first result.
5. Leave the resulting records in place unless Mike explicitly authorizes cleanup.

### Expected result

- 067 output: `statusOut=success`; `actionOut` is a successful create/link action; `debugStep=complete`; quiz Processing Status becomes `Processed`.
- Quiz row links to exactly one Homework Completion.
- Homework Completion is `recyU1G9mWC1rQSst` or a newly created canonical row if the current identity does not already exist.
- Homework Completion links separately to:
  - Homework Library `rechVLOeyEVIqmy2v`
  - PHA `recgj8dPk4ouTwCOj`
- No Submission Asset or placeholder PDF asset is created.
- 067 creates no XP Event. Homework XP is **not** part of this card; do not infer XP from a successful completion.
- Replay reuses the same Homework Completion, does not create a second completion, and does not overwrite a correct PHA/library link.

### Return to Cursor

Return the fresh quiz record ID, the linked Homework Completion ID, PHA ID, Homework Library ID, Submission Asset count, XP Event count, Processing Status, `statusOut`, `actionOut`, `debugStep`, and the final 067 console JSON.

### Cleanup

Do not delete the quiz or Homework Completion automatically. If the test created an unintended duplicate or malformed row, stop and return IDs for review. Cleanup is safe only after confirming no coach-review or XP record depends on the row.

## Mike-only PROD test card: Automation 115 v2.0

**Purpose:** Prove the PHA-first Homework branch creates a production-shaped Submission, carries the PHA ID into `Homework Name 1`, and lets the normal `005 → 009 → 020` path reuse the canonical Homework Completion.

### Setup

- Base: PROD `appn84sqPw03zEbTT`.
- Table: **Testing Scenarios**.
- Trigger: **Run Test? is checked** on the Testing Scenarios row.
- Create one fresh Testing Scenarios row:
  - Scenario Type: `Homework`
  - Related Enrollment: current Schmidt testing enrollment; known fixture `recCyFEPeATOVNlr9` if still current
  - Homework Assignment: PHA `recgj8dPk4ouTwCOj` — **not** Homework Library `rechVLOeyEVIqmy2v`
  - Submission Date: a date covered by the PHA's Week and current Program Instance
  - Intake Attachments: one harmless test file; use two only if explicitly testing fan-out
  - Dry Run?: unchecked
  - Run Test?: checked last
- Confirm 070a/Make sends are not part of this proof. Do not enable real sends.

### Run order

1. Confirm 115 is the installed **v2.0** automation and is ON.
2. Save the Testing Scenarios row with `Run Test?` checked.
3. Let 115 create the Submission. Do not manually chain 005, 009, or 020.
4. Allow the normal downstream order to settle: **005 → 009 → 020**.
5. Inspect the Testing Scenarios row and all linked pipeline records.
6. Repeat the same scenario once only if the first run passes, to verify idempotent Homework Completion reuse. A rerun may create a second Submission by design; it must not create a second Homework Completion.

### Expected result

- 115 output: `statusOut=success`; `actionOut=created`; `Run Test?` is cleared; `Created Submission` and `Linked Submission` contain the created Submission ID.
- Submission is linked to the Schmidt enrollment and carries PHA `recgj8dPk4ouTwCOj` in `Homework Name 1`.
- 005 assigns the correct Week from Activity Date and Program Instance.
- 009 creates one Submission Asset for one attachment, or N assets for N attachments.
- 020 links or reuses exactly one Homework Completion for the enrollment + Week + Homework + slot identity.
- The canonical Homework Completion is `recyU1G9mWC1rQSst` when the selected date/PHA identity matches the closeout fixture.
- Homework Completion links separately to PHA `recgj8dPk4ouTwCOj` and Homework Library `rechVLOeyEVIqmy2v`.
- No duplicate Homework Completion is created on replay.
- No XP Event is expected from intake alone. Coach review and 064/065 XP are outside this focused 115 card.
- 070a/Make/S3 is not tested, and no real email or upload send is authorized.

### Return to Cursor

Return the Testing Scenarios ID, Submission ID(s), Submission Asset ID(s), Homework Completion ID(s), PHA ID, Homework Library ID, Week ID, XP Event count, duplicate count, 115 outputs (`statusOut`, `actionOut`, `errorOut`, `debugStep`), downstream automation run order/results, and the final 115 console JSON.

### Cleanup

Do not delete the scenario or pipeline rows until all links and replay counts are captured. If cleanup is approved, remove only the fresh controlled test rows and never delete the canonical Homework Completion `recyU1G9mWC1rQSst` or its supporting PHA/library records.

## Closeout rule

This package can advance 067 and 115 from **Installed in PROD** to **Live Tested in PROD** only after Mike returns the requested IDs and console output and the evidence is reviewed. It cannot mark the overall season launch ready; that requires the separate launch checklist and Mike approval.
