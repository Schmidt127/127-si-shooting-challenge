# Delivery System v2.0 — Pilot charter (validation period)

**Status:** **ACTIVE VALIDATION**  
**Locked:** 2026-07-15 · Mike decisions D1–D10 + clarifications  
**Authority:** [DELIVERY-SYSTEM-V2-PROPOSAL.md](./DELIVERY-SYSTEM-V2-PROPOSAL.md) · [DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md](./DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md)

---

## Critical clarification

**The two-package pilot is a validation period only — not a scope limit.**

| | |
|--|--|
| **Governance now** | Delivery System v2.0 rules apply to the **entire remaining Shooting Challenge V2 rebuild** and are the intended reusable OS for Mike’s other Airtable/Vercel apps |
| **Pilot packages** | (1) Automation 117 · (2) next Airtable consolidation — score process health |
| **“Permanent adopted” label** | Requires pilot review PASS after both packages |
| **What does not wait for pilot PASS** | Operating under Lead/Worker rules, hybrid handoffs, lagging CONTROL SHA, JSON registry, mock-default web, ChatGPT session packs, per-feature master PRs |

---

## 1. Validation packages

| # | Package | Purpose |
|---|---------|---------|
| 1 | **Automation 117** DEV paste → registry → optional ON smoke → G6 → master PR | Validate handoff, registry, lagging SHA, Lead-owned closeout |
| 2 | **Next Airtable consolidation** (authorized later) | Validate consolidation gates + preferably exercise 0- or 1-worker path cleanly |

Out of validation scope unless separately authorized: PROD 117, Airtable registry table, paste bot build.

---

## 2. Entry criteria (validation scoring starts when)

1. Decisions locked ✓  
2. Nine-field hybrid handoff in use ✓  
3. Lead/Worker model published with assignment + result templates ✓  
4. CONTROL lagging-pointer rule ✓ · no tip-sync-only commits going forward  
5. JSON DEPLOYMENT-REGISTRY exists ✓  
6. PROJECT_STATE infrastructure-only ✓  
7. ChatGPT session pack published ✓  
8. Package has backlog ID + authorized DEV scope  
9. Offline tests PASS before Mike UI  
10. Hard stops unchanged  

---

## 3. Success metrics (validation)

Score after both packages. Prefer PASS on all before labeling “permanent adopted.”

### Process / Mike surface

| Metric | Pass bar |
|--------|----------|
| UI gates / package | ≤3 |
| Sheet duplication in chat | 0 |
| Tip-sync-only commits | 0 |
| CONTROL SHA honesty | Lagging pointer only; HEAD = tip |
| Path verification before sheets | 100% |
| Registry updates on G4/G5/G6 | 100% of touched automations |
| Critical live smoke | PASS or documented N/A |
| Master promotion after G6 | PR opened or Mike-deferred with reason |
| Website PROD adapter misuse | 0 |
| Safety | 0 PROD / real sends / paste-bot builds |
| PROJECT_STATE live tip creep | 0 |

### Worker-agent efficiency (first-class)

| Metric | Pass bar (when workers used) |
|--------|------------------------------|
| Accepted without rework | ≥60% |
| Lead takeover rate | ≤25% |
| Merge conflicts | ≤1 per two-worker stage |
| Post-integration defects | 0 critical |
| Assignments missing required fields | 0 |
| Worker edits to CONTROL/registry/sheets | 0 |

If a package uses **Lead-direct (0 workers)**, worker metrics are N/A for that package; process metrics still score.

---

## 4. Final operating rules (apply to full V2, not only pilot)

1. Lead-direct default for tightly coupled work.  
2. Workers only for genuinely parallel, path-disjoint, independently testable deliverables; max Lead+2.  
3. Every worker assignment uses the standard template (branch/worktree, path sets, deliverable, AC, tests, artifact, stops).  
4. Workers never update CONTROL, capacity, deployment registry, Mike sheets, or final closeout.  
5. Lead alone owns integration, final verification, state, Mike handoffs, promotion readiness.  
6. Lead independently reviews diffs and reruns tests before accepting worker output.  
7. Stall = 15 minutes without productive progress → Lead takeover.  
8. Exclusive path ownership prevents merge conflicts; overlap → stop and serialize.  
9. Hybrid Mike face; ChatGPT session pack mandatory; JSON registry; mock-default web.  
10. Same model for all remaining V2 workstreams and future apps.  

Full text: Worker Agent Model + V2 Proposal.

---

## 5. Exact first validation action — Automation 117

**Short status (Mike):**

> Delivery System v2.0 is governing remaining V2 work. Validation package 1: paste Automation 117 v1.0.1 into DEV, leave OFF, blank webhook. Instructions = nine-field sheet only.

**Sheet:** [`docs/deploy-checklists/AUTOMATION-117-v2-pilot-mike-handoff.md`](../deploy-checklists/AUTOMATION-117-v2-pilot-mike-handoff.md)

**Action:** Paste `117-zoom-recording-credit-orchestrator.js` v1.0.1 → leave **OFF** → `webhookUrl` blank.

**Path:** `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\117-zoom-recording-credit-orchestrator.js`  
SHA256 `D484327A9F4E13BCA3908F728B695F4C66705AD63776FC68D30247758B4AADAB`

**Reply:** `117 paste UI complete`

---

## 6. Exit

After package 2 G6: score §3 → Mike `Delivery System v2.0 pilot review: PASS|FAIL` → only PASS attaches permanent-adopted label. **v2.0 governance continues regardless.**

---

*End of pilot charter.*
