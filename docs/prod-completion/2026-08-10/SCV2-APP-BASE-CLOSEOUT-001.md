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
| Automation 115 v2.1 | Repository corrected; PROD paste/install pending | Approved allowlist now includes both `recgP9qZYjAhE7NXm` and `recCyFEPeATOVNlr9`; Mike must paste v2.1 before proof |
| Homework Completion reuse | Proven | Initial `rectWmGA1K2RSN4bp` and replay `recPPrwds0oz0EB4C` both reused `recyU1G9mWC1rQSst` |
| Homework Library relationship | Proven in prior closeout evidence | Historical library record `rechVLOeyEVIqmy2v`; resolve the current live record before 067 proof |
| PHA relationship | Proven in prior closeout evidence | Historical PHA `recgj8dPk4ouTwCOj`; resolve the current active PHA and its Week/Library links before 067 proof |
| Package 10 | Closed / preserved | PR #133 merged and deployed; PR #134 corrected Automation 115's stale header; do not reopen |
| Production writes | Mike-only | Cursor did not modify PROD Airtable data or simulate either test |

## Corrected status matrix

| Item | Status | Evidence / correction |
|---|---|---|
| Testing Views | **Complete** | Completion Master evidence: 10/10 required views, zero sanity failures, Schmidt rows visible |
| Automation 057 | **Controlled PROD proof exists** | Denver-boundary behavior was proven; current operational/version attestation remains a separate UI check |
| Automation 035 v1.2 | **Creation/idempotency proof exists; OFF** | Creation and rerun/idempotency passed; operational posture remains OFF pending Mike approval |
| Automation 067 v3.4 | Installed in PROD; focused proof pending | Current enrollment and active PHA identity must be resolved from PROD at test time |
| Automation 115 v2.1 | **PROD paste/install pending** | Repository allowlist includes `recgP9qZYjAhE7NXm` and `recCyFEPeATOVNlr9`; focused proof follows paste |

The first three rows are not lacking repository evidence and must not be reported as open for lack of proof.

## High-priority incomplete items

These remain open because they require a new PROD decision, current-record lookup, or launch approval:

1. Focused PROD proof for Automation 067 v3.4.
2. PROD paste/install and focused proof for Automation 115 v2.1.
3. Fresh Schmidt athlete-path proof after the base reset, using current enrollment `recCyFEPeATOVNlr9`.
4. Season-launch readiness: Weeks/config import and validation, Fillout activation, season-sensitive automation review, Make/email safety, and final Mike approval.

No item above is marked complete from a governance-table row, old install packet, or repository-only script header.

## Duplicate PR reconciliation

**Recommendation:** keep PR [#135](https://github.com/Schmidt127/127-si-shooting-challenge/pull/135) (`scv2-app-base-closeout-001`) authoritative because it is the approved backlog branch and already contains the Completion Master reconciliation plus focused contract test. PR [#136](https://github.com/Schmidt127/127-si-shooting-challenge/pull/136) (`agent/app-base-closeout-001`) is the duplicate and should be closed only after Mike approves this recommendation. Neither PR is to be merged or closed by this session.

## Mike-only PROD test card: Automation 067 v3.4

**Purpose:** Prove the HW17 reflection-quiz bridge creates or reuses the canonical Homework Completion without creating fake assets or XP.

### Setup

- Base: PROD `appn84sqPw03zEbTT`.
- Table: **Final Reflection Quiz Submissions**.
- Trigger: create a quiz record or make it match the installed 067 trigger: **Processing Status = Pending** with **Enrollment** populated. Do not create a second 067 automation.
- Enrollment: select current Schmidt `recCyFEPeATOVNlr9`.
- Before creating the quiz row, resolve and record from current PROD:
  - the active HW17 PHA for this Enrollment's Program Instance and HW1 slot;
  - the PHA's linked Homework Library record;
  - the PHA's linked Week;
  - the one existing matching Homework Completion, if present.
- Do not assume `recgj8dPk4ouTwCOj`, `rechVLOeyEVIqmy2v`, or `recyU1G9mWC1rQSst` remain current. Those are historical evidence only unless the live lookup returns them.
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
- Homework Completion is the current PROD matching row resolved during setup, or a newly created canonical row if no exact match exists.
- Homework Completion links separately to:
  - the resolved current Homework Library record
  - the resolved current PHA record
- Homework Completion Week equals the resolved current PHA Week.
- No Submission Asset or placeholder PDF asset is created.
- 067 creates no XP Event. Homework XP is **not** part of this card; do not infer XP from a successful completion.
- Replay reuses the same Homework Completion, does not create a second completion, and does not overwrite a correct PHA/library link.

### Return to Cursor

Return the fresh quiz record ID, the linked Homework Completion ID, PHA ID, Homework Library ID, Submission Asset count, XP Event count, Processing Status, `statusOut`, `actionOut`, `debugStep`, and the final 067 console JSON.

### Cleanup

Do not delete the quiz or Homework Completion automatically. If the test created an unintended duplicate or malformed row, stop and return IDs for review. Cleanup is safe only after confirming no coach-review or XP record depends on the row.

## Mike-only PROD paste/install and test card: Automation 115 v2.1

**Purpose:** Install the approved allowlist correction, then prove the PHA-first Homework branch with the current controlled Schmidt enrollment.

### Setup

- Base: PROD `appn84sqPw03zEbTT`.
- Table: **Testing Scenarios**.
- Trigger table: **Testing Scenarios**.
- Trigger: **Run Test? is checked**.
- Current controlled Schmidt Enrollment: `recCyFEPeATOVNlr9`.
- Approved retained enrollment: `recgP9qZYjAhE7NXm`.
- Corrected v2.1 allowlist: **both** IDs above; all other enrollments must fail closed.

### Exact PROD paste/install instructions

1. Open PROD base `appn84sqPw03zEbTT` → Automations.
2. Open the existing automation named `115 - Engineering Test Framework - Run Testing Scenario Daily Submission`; do not create a second 115.
3. Confirm trigger table **Testing Scenarios**, condition **Run Test? is checked**, and input `recordId` is the triggering record ID.
4. Turn the automation OFF while replacing the script body.
5. Paste the committed v2.1 body from `airtable/automations/shooting-challenge/115-engineering-test-framework-run-testing-scenario-daily-submission.js`, excluding only the GitHub-only header if Airtable paste convention requires it.
6. Confirm the pasted header and `SCRIPT.version` both show **v2.1**.
7. Save, turn the automation ON, and do not enable any unrelated automation or send path.
8. Verify the editor is running v2.1 before creating the Testing Scenarios record.

Do not paste v2.0 after this package. Do not alter fields or schema.

### Run order

1. Resolve the active PHA, Library, Week, and matching Homework Completion from current PROD records; do not use fixed historical IDs.
2. Confirm 115 is the installed **v2.1** automation and is ON.
3. Save the Testing Scenarios row with `Run Test?` checked.
4. Let 115 create the Submission. Do not manually chain 005, 009, or 020.
5. Allow the normal downstream order to settle: **005 → 009 → 020**.
6. Inspect the Testing Scenarios row and all linked pipeline records.

### Expected result

- 115 output: `version=v2.1`, `statusOut=success`; `actionOut=created`; `Run Test?` is cleared; `Created Submission` and `Linked Submission` contain the created Submission ID.
- Submission is linked to the authorized enrollment and carries the resolved PHA RID in `Homework Name 1`.
- 005 assigns the correct Week from Activity Date and Program Instance.
- 009 creates one Submission Asset for one attachment, or N assets for N attachments.
- 020 links or reuses exactly one Homework Completion for the enrollment + Week + Homework + slot identity.
- The Homework Completion is the current matching row resolved during setup.
- Homework Completion links separately to the resolved PHA and Homework Library records.
- No duplicate Homework Completion is created on replay.
- No XP Event is expected from intake alone. Coach review and 064/065 XP are outside this focused 115 card.
- 070a/Make/S3 is not tested, and no real email or upload send is authorized.

### Return to Cursor

Return the Testing Scenarios ID, Submission ID(s), Submission Asset ID(s), Homework Completion ID(s), PHA ID, Homework Library ID, Week ID, XP Event count, duplicate count, 115 outputs (`statusOut`, `actionOut`, `errorOut`, `debugStep`), downstream automation run order/results, and the final 115 console JSON.

### Cleanup

Do not delete the scenario or pipeline rows until all links and replay counts are captured. If cleanup is approved, remove only fresh controlled test rows and never delete a shared Homework Completion, PHA, or Homework Library record.

## Closeout rule

This package can advance 067 and 115 from **Installed in PROD** to **Live Tested in PROD** only after Mike returns the requested IDs and console output and the evidence is reviewed. It cannot mark the overall season launch ready; that requires the separate launch checklist and Mike approval.
