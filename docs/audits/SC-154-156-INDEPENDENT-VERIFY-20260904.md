# SC-154 / SC-155 / SC-156 — Independent P1 verification (2026-09-04)

**Agent:** A4 Independent Verification (`verify/sc-152-157-pw-verify-a4`)  
**Base:** Production `appn84sqPw03zEbTT`  
**Sibling artifacts reviewed (read-only):** A3 `docs/audits/SC-154-*`, `SC-155-*`, `SC-156-*`  
**Evidence:** [`docs/testing/evidence/sc-154-156/`](../testing/evidence/sc-154-156/)

---

## Executive verdict

| Backlog | A3 claim | A4 independent finding |
|---------|----------|------------------------|
| **SC-154** (SF-03 WAS dup) | 0 valid Enrollment+Week duplicate groups; disposable pair created then deleted | **AGREE (partial)** — VERIFY Enrollment-Test has **one** WAS for Week 1; no second valid Week-1 pair. Did not re-scan all 8 WAS rows; residual orphan/multi-Enrollment risks accepted |
| **SC-155** (SF-04 level lag) | Expected ≤15m cron delay; 0 stuck Needed?=1 | **AGREE (baseline)** — live **041** is cron **every 15 minutes**, script **v5.1**. Enrollment-Test Level Recalc Needed? unchecked at sample. Did **not** independently re-run A3’s Manual Adjustments bump+poll |
| **SC-156** (SF-06 070a) | LIVE/deployed; post-script Update clears trigger (retry defect) | **AGREE** — 070a **deployed**, script **v4.7**; second node `updateRecord` sets `Send to Make Trigger` → **null**. Publish checklist required; defect **not** fixed live yet |

---

## SC-154 — WAS uniqueness

### Independent checks

1. Listed WAS linked to Enrollment-Test (Schmidt Athlete1 VERIFY).  
2. Observed **two** WAS rows: Week 1 (single Enrollment) + Early Bird (multi-Enrollment link — polluted historical row, not a Week-1 duplicate pair).  
3. Week 1 valid Enrollment+Week pair count = **1** after A3 disposable cleanup (matches A3 pairCountAfterDelete=1).

### Agreement / disagreement

| Claim | A4 |
|-------|----|
| No live valid Enrollment+Week duplicate groups at scan | Plausible; A4 spot-check supports for Enrollment-Test Week 1 |
| Airtable has no unique index; manual dup possible | **Confirmed** by A3 create→delete proof design |
| 031 sole create owner / fail-closed | Not re-pasted; A4 did not re-run offline 031 suite this pass |
| Orphan / multi-Enrollment residual | **Confirmed observable** (Early Bird multi-link on Enrollment-Test set) |

**SC-154 DoD from A4:** Uniqueness defect **not reproduced** as a live valid-pair problem. Residual operator cleanup remains. No 031 paste required on A4 evidence.

---

## SC-155 — Level recalc lag

### Independent checks

| Check | Result |
|-------|--------|
| 041 automationId `wflCRvaopntNPsc64` | `deployed` |
| Trigger | `cron` minutely width **15** |
| Script version | **v5.1** |
| Enrollment-Test `Level Recalc Needed?` | Unchecked / empty at sample |

### Agreement / disagreement

| Claim | A4 |
|-------|----|
| Lag up to 15m is design, not stuck queue | **Supported** by live cron config |
| 0 aged Needed?=1 at measurement | A4 did not full-table filter; sample Enrollment-Test clean |
| Forced bump cleared within SLA | **Not independently re-proven** — accept as A3-owned until A4 retest |

**SC-155 DoD from A4:** No stuck-queue defect proven. Optional monitoring view remains ops advice. No 041/042 paste required on A4 baseline.

---

## SC-156 — 070a enabled + observability

### Independent checks

| Check | Result |
|-------|--------|
| 070a `wflIYVOmRRaHu9cl2` | `deployed` (ON) |
| Script | **v4.7** |
| Nodes | (1) `customScript` (2) `updateRecord` `wacpcvzcDB1KKjaKI` |
| Update fields | `fld8C43NVQQ1NeQ7Z` (`Send to Make Trigger`) → **null** |

This independently confirms A3’s graph defect: soft script failures that return (not throw) still hit the companion clear step → **retryability broken until publish removes that node**.

Checklist present in A3: `docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md`.

### Agreement / disagreement

| Claim | A4 |
|-------|----|
| Docs claiming 070a OFF are stale | **Agree** — live is deployed |
| Observability defect | **Agree** — live graph evidence |
| Live remediated | **Disagree / incomplete** — Update node still present; Mike publish pending |

**SC-156 DoD from A4:** Attestation **PASS**. Remediation **NOT LIVE**. Do not close SF-06 until publish verified by re-MCP (node count = 1 script only) + disposable failure retains Trigger.

Evidence: [`docs/testing/evidence/sc-154-156/live-070a-nodes-20260904.json`](../testing/evidence/sc-154-156/live-070a-nodes-20260904.json).

---

## Constraints

- No Season Simulation. No broad email. No secrets/webhook URLs. Record IDs redacted.  
- Did not implement A3 remediations beyond read/verify.  
- Closed items (SC-109/112/147/148/149/151/FUT-025/SEO) untouched.
