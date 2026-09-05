# Version-audit correction — Automations 021 / 013 / 067

**Date:** 2026-09-05  
**Scope:** Documentation + read-only live verification  
**Production mutation:** None  
**Airtable writes:** None  

---

## Corrected Automation 021 truth

| Source | Version | Evidence |
|--------|---------|----------|
| Live Production script body | **v2.0** | MCP `get_automation` `wflPcB9g4WptRgBhA` (twice, 2026-09-05) |
| GitHub `origin/master` | **v2.0** | `021-submission-intake-and-asset-creation-set-attachment-upload-status.js` |
| Automations inventory AI Agent + Code | **v2.0** | Field match; Code SHA-256 = GitHub |
| Three-way result | **ALIGNED** | Exact byte match live ↔ GitHub ↔ inventory Code |

**Live name:** `021 - Submission Intake and Asset Creation - Set Attachment Upload Status`  
**Deployment:** `deployed` · `configurationStatus: valid` · no draft/deployed diff  
**Trigger:** Submissions · `recordMatchesConditions` · Attachment Upload Status is empty **OR** = No Files  
**Input:** `recordId` ← `trigger.id`  
**Behavior:** Attachment Upload Status only (`No Files` / `Processing`). Does **not** write `Video Count`.

### Retracted false findings

The 2026-09-05 morning version audit incorrectly classified 021 as:

- live = Phase A combined **v1.0.0**
- THREE-WAY MISMATCH
- “sync live combined script into GitHub; do not paste GitHub over live”

**Root cause:** a bulk live-version pass stubbed 021 as `v1.0.0` / `SCRIPT.version` without parsing the live body. Inventory Code, MCP script body, and SF-07 (`zero` live `Video Count` writers) contradict that stub.

### Phase A combined 006+021

| Artifact | Status |
|----------|--------|
| `docs/archive/phase-a-021-combined/PHASE-A-021-combined-v1.0.0-PASTE.txt` | **Historical / proposed only** — never installed on Production 021 |
| Git commit `8bc69f17` (original deploy-checklist path) | Archaeology only |
| Automation **006** | Remains **retired / absent** (SF-07 / SC-158). Do not restore. |

Orphaned Phase A **outputSchema** names on live 021 (`videoCountOut`, etc.) are harmless residue and **deferred**.

**Do not** paste Phase A. **Do not** “recover” combined v1.0.0 into GitHub as live. **Do not** paste GitHub 021 (already matches live).

---

## Corrected version-audit classification counts

Prior morning report totals (69 inventory/script rows) with **021 corrected**:

| Classification | Prior count | Corrected count | Notes |
|----------------|------------:|----------------:|-------|
| MATCH — all three agree | 43 | **44** | +021 |
| LIVE PASTE PENDING — inventory + GitHub agree, live older | 2 | **2** | 013, 067 (confirmed) |
| THREE-WAY MISMATCH | 1 | **0** | 021 retracted |
| INVENTORY STALE — live + GitHub agree | 3 | 3 | unchanged this pass |
| NO-CODE — version N/A | 1 | 1 | unchanged |
| REPO-ONLY — no live automation | 5 | 5 | unchanged |
| LEGACY/SUPERSEDED — excluded | 14 | 14 | unchanged |
| **Total** | **69** | **69** | categories mutually exclusive |

Categories are exclusive: a row is MATCH **or** LIVE PASTE PENDING **or** another single bucket — never both MATCH and THREE-WAY.

---

## Independent live verification — Automation 013

| | Live | Inventory | GitHub `origin/master` |
|--|------|-----------|------------------------|
| Version | **v3.1.0** | v3.2.0 (Code + AI Agent) | **v3.2.0** |
| SHA-256 (script body) | `949c51ea…e065f294` | Code is GitHub-shaped v3.2.0 | GitHub file |
| Length | 16770 (CRLF) | — | larger (V2 structure) |

**Name:** `013 - Submission Intake - Create or Link Video Feedback`  
**Deployment:** deployed / valid / no draft diff  
**Trigger:** Submission Assets · `recordMatchesConditions` · `Ready for Video Feedback Script?` = 1  
**Input:** `recordId` ← `trigger.id`  
**Outputs (live schema):** statusOut, actionOut, gradeBandActionOut, errorOut, debugStep, submissionAssetId, videoFeedbackId, submissionId, enrollmentId, gradeBandId, readyToSendToMake, whyNotReadyForMake  

**Difference class:** **Structural / V2 standard only.** GitHub changelog: *“Business logic unchanged from v3.1.0.”* Core helpers (`decideGradeBandRepair`, `findCandidates`, `assertOwnership`, `videoKey`) are **byte-identical** after extraction. GitHub adds SCRIPT metadata, numbered `step()` debug labels, and formatting — not provenance/ownership rule changes.

**Paste recommendation:** **Declined by Mike (2026-09-05).** Keep live **v3.1.0**. Optional structure paste remains available later; not scheduled.

**Safe Automations inventory `Version Number - AI Agent` value:** `v3.1.0`  
(Current AI Agent / Code columns still show v3.2.0 — inventory lag; do not treat as live.)

---

## Independent live verification — Automation 067

| | Live | Inventory | GitHub `origin/master` |
|--|------|-----------|------------------------|
| Version | **v3.4** | v3.5 (Code + AI Agent) | **v3.5** |
| SHA-256 (script body) | `de090723…dc281da` | Code is GitHub-shaped v3.5 | GitHub file |
| Length | 27963 (LF) | — | larger (V2 structure) |

**Name:** `067 - Homework - Link Reflection Quiz to Homework Completion`  
**Deployment:** deployed / valid / no draft diff  
**Trigger:** Final Reflection Quiz Submissions · `recordMatchesConditions` · Enrollment **is not empty** AND Homework Completion **is empty** AND Processing Status **is empty**  
**Input:** `recordId` ← `trigger.id`  
**Outputs (live schema):** weeklySummaryId, weeklySummaryLinkStatus, phaId, libraryId, gradeBandSchedulingUsed, statusOut, actionOut, errorOut, debugStep, quizSubmissionId, homeworkCompletionId  

**Difference class:** **Structural / formatting only.** GitHub changelog + header: *“v3.5 is structure-only”* / *“Business logic unchanged from v3.4.”* Key scheduling/identity helpers differ only by whitespace/brace formatting (e.g. `isExactCompletionIdentity`, `resolveHw17PhaForEnrollment`).

**Retracted docs claim:** CURRENT-TRUTH / inventory “**Live v3.5 / DO-NOT-TOUCH**” overstated live version. Live script body is **v3.4**. Inventory Code text was refreshed to v3.5 without a live paste.

**Paste recommendation:** **Declined by Mike (2026-09-05).** Keep live **v3.4**. Optional structure paste remains available later; not scheduled.

**Safe Automations inventory `Version Number - AI Agent` value:** `v3.4`  
(Current AI Agent / Code columns still show v3.5 — inventory lag; do not treat as live.)

---

## Offline contract tests (GitHub versions)

Commands (repo root, branch tip at docs PR):

```text
node --test tests/homework/automation-067-pha-direct.test.js tests/homework-contracts/067-summary-link.test.js tests/automation-ownership/test-contract-harness.mjs
```

| Suite | Result |
|-------|--------|
| `tests/automation-ownership/test-contract-harness.mjs` | **PASS** (013 authoritative writer; 112 legacy_off) |
| `tests/homework-contracts/067-summary-link.test.js` | **PASS** |
| `tests/homework/automation-067-pha-direct.test.js` behavioral cases | **PASS** (22/23 overall file) |
| `067 v3.4 source contract` (asserts `version: "v3.4"` in GitHub file) | **FIXED** in follow-on hygiene — test now asserts repo **v3.5** + documents live **v3.4** |

Interpretation: GitHub **v3.5** behavioral contracts pass; one stale source-string assertion needs a follow-up test update (out of scope for this docs-only PR).

---

## Paste procedures (future — not executed here)

### 013 (optional)

1. Confirm live still v3.1.0 via Automations UI / MCP (do not trust Code column alone).  
2. Paste GitHub **v3.2.0** body only (skip GitHub header). Keep trigger + `recordId` mapping unchanged.  
3. Disposable proof: one VIDEO Submission Asset → Video Feedback create/link; provenance fail-closed on bad Source Attachment ID; no Focus/Question copy regression.  
4. Refresh inventory AI Agent → v3.2.0 after UI confirms live body.

### 067 (optional)

1. Confirm live still v3.4.  
2. Paste GitHub **v3.5** body only. Keep trigger + `recordId` unchanged.  
3. Disposable proof: Schmidt quiz → Homework Completion link/create; idempotent replay; PHA mismatch fail-closed.  
4. Refresh inventory AI Agent → v3.5 after UI confirms.  
5. Update offline source-contract test to accept v3.5 (and “business logic unchanged from v3.4”).

**Risk (both):** Low functional risk if paste is faithful; residual risk is paste error / accidental trigger edit.  
**Benefit:** Inventory ↔ live ↔ GitHub version strings align; V2 standard structure in Production.  
**Not recommended as urgent** while live business logic already matches the intended product rules.

---

## Production unchanged

This package is documentation-only. No automation paste, run, trigger/input/output edit, or Airtable record write.
