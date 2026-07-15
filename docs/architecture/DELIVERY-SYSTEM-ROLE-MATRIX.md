# Delivery System — Role Matrix

**Status:** Proposed companion to Delivery System v2.0  
**Date:** 2026-07-15  
**Related:** [DELIVERY-SYSTEM-V2-PROPOSAL.md](./DELIVERY-SYSTEM-V2-PROPOSAL.md) · [DELIVERY-SYSTEM-CURRENT-STATE-REVIEW.md](./DELIVERY-SYSTEM-CURRENT-STATE-REVIEW.md)

---

## 1. Authority summary

| Role | Decides | Executes | Must not |
|------|---------|----------|----------|
| **Mike** | Product outcomes, AC, PROD, sends, archive, UI ON/OFF deletes | Airtable UI gates; external account approvals | Debug agent toolpaths; invent script versions |
| **ChatGPT** | Architecture options, plan quality, copy | Plans and reviews outside repo | Edit repo; invent paths/triggers; assign routine DEV API work to Mike |
| **Cursor Lead** | Technical means inside AC; state tip; test PASS/FAIL | Code, Meta API in DEV, smokes, sheets, commits | PROD mutate; silent real sends; skip hard stops |
| **Cursor workers** | Nothing product | Bounded branch tasks | Merge to tip; author unverified Mike sheets |
| **GitHub** | SoT for shippable artifacts | Host history / PRs | Deploy Airtable |
| **Airtable DEV** | Runtime truth for DEV behavior | Schema/records (API); automations (UI) | Be promoted from memory |
| **Airtable PROD** | Season SoR | Mike-executed promo steps only | Experimental edits |
| **Vercel** | Web runtime | Preview/prod deploys | Own Airtable secrets in client |
| **Make/AWS/external** | Side effects | Webhooks, upload, email | Produce without blank/no-send first proof |
| **OMNI** | — | Mike-led ad-hoc in-base exploration | Replace GitHub SoT for production automations |

---

## 2. RACI by work type

Legend: **R** responsible · **A** accountable · **C** consulted · **I** informed

| Work | Mike | ChatGPT | Lead | Worker | GitHub | DEV | PROD | Vercel | External |
|------|------|---------|------|--------|--------|-----|------|--------|----------|
| Feature brief | A | R | C | — | I | — | — | — | — |
| Task Classification | I | C | R/A | — | — | — | — | — | — |
| Script implementation | I | C | R/A | R | A (store) | — | — | — | — |
| Offline tests | I | — | R/A | R | A | — | — | — | — |
| Live DEV API smoke | I | — | R/A | C | I | A (data) | — | — | C |
| Paste / trigger / delete automation | **R/A** | — | C (sheet) | — | C (source) | A (runtime) | — | — | — |
| Schema via Meta API (approved) | I | C | R/A | C | A | A | — | — | — |
| Capacity ledger update | C | — | R/A | — | A | C | — | — | — |
| PROD promotion | **A** + R UI | C review | R docs/support | — | A | I | A | C | C |
| Real family email | **A** | — | R prepare | — | A | C | C | — | R send |
| Website feature | I | C | R/A | R | A | C mock | — | A deploy | — |
| Incident rollback | A | C | R | — | A | R | R if needed | C | C |
| Season architecture | A | R draft | C | — | A | C | C | — | — |

---

## 3. Ideal responsibilities (detail)

### 3.1 Mike

- Approve feature outcome, scope, AC, external restrictions once  
- Authorize UI packages that mutate automations or risk sends (`Authorize Phase X`)  
- Perform **exactly** the sheet’s UI steps  
- Reply with the sheet’s **exact phrase**  
- Approve PROD promotion packages  
- Own credentials and billing platforms  
- Ad-hoc OMNI exploration when he wants to work in-base himself  

### 3.2 ChatGPT

- Translate Mike language ↔ engineering constraints  
- Draft briefs, ADRs, parent/ops copy  
- Review Cursor plans against AC and Constitution  
- Hold cross-app refactor memory between sessions  
- Challenge unsafe proposals (OFF=delete, PROD shortcuts)  
- Produce Mike summaries from CONTROL — without re-authoring triggers  

### 3.3 Cursor Lead

- Task Classification + Workspace Check  
- Maintain CONTROL tip honesty  
- Implement to DoD in DEV  
- Write **one** Mike sheet per gate; path-verify before publish  
- Run test gates; decide STOP/ROLLBACK  
- Integration commits; prepare promo packages  
- May finish stalled workers with audit note  

### 3.4 Cursor worker agents

- Execute assignment file; commit on feat branch only  
- Return result artifact with SHA + paths used  
- Escalate product questions to Lead (not Mike)  
- Stop at blocked approvals listed in CONTROL  

### 3.5 GitHub

- Canonical script/docs store  
- History / rollback archaeology  
- PR gate to `master` for Vercel prod and human review  

### 3.6 Airtable DEV

- Construction and proof environment  
- Disposable fixtures under labeled enrollments  
- Automation runtime Mike configures  

### 3.7 Airtable PROD

- Live system of record  
- Receives only promotion-doc steps after DEV proof  

### 3.8 Vercel

- Host `web/`  
- Preview per branch when enabled  
- Production deploy from protected default branch  

### 3.9 Make / AWS / external

- Isolated DEV/test scenarios first  
- Blank webhook / no-send until Mike authorize  
- Blueprints versioned in repo when shippable  

### 3.10 OMNI

- Mike’s preferred **ad-hoc** in-base tool  
- Prototype formulas/views Mike may later ask Cursor to formalize  
- Never the SoT for production automation bodies  

---

## 4. Work currently performed by the wrong role (corrective mapping)

| Observed | Wrong role | Correct role |
|----------|------------|--------------|
| Inventing absolute paths / trigger text in chat | ChatGPT | Lead via verified sheet |
| Routine DEV formula/field repairs waiting on Mike | Mike | Lead (approved feature) |
| Workers assigned then Lead rewrites package | Workers (theater) | Lead-direct, or wait for worker |
| ChatGPT re-issuing full paste runbook | ChatGPT | Cite existing sheet |
| Using PROJECT_STATE as live next_action | Docs confusion | CONTROL |
| Agents recommending deletes from OFF status | Lead/workers | Capacity rules + UI confirm |
| Asking Mike to “check if file exists” | Mike | Lead `Test-Path` |
| Parallel website blocked on Airtable capacity narrative | Process noise | Decouple; website uses mock |

---

## 5. ChatGPT stop-list (binding for v2.0)

1. Do not guess repository file paths — ask Cursor or cite CONTROL deliverables.  
2. Do not invent Airtable UI behavior (views API, slot counters, trigger editors).  
3. Do not duplicate Cursor Mike handoffs — link/summarize only.  
4. Do not issue alternate trigger conditions that conflict with the sheet.  
5. Do not assign Mike schema/API work that Lead can do under approved feature briefs.  
6. Do not authorize PROD, real sends, or archive writes.  

---

## 6. Decision rights — quick reference

```
Product behavior changed?     → Mike
Technical means inside AC?    → Lead
Human must click Airtable?    → Mike (sheet)
Can Meta API do it in DEV?    → Lead (don’t ask Mike)
Touches PROD / send / $ ?     → Mike stop gate
Website mock vs live DEV?     → Lead (default mock until backlog)
Conflicting docs?             → CONTROL wins for ops tip
```

---

*End of role matrix.*
