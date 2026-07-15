# Delivery System — Role Matrix

**Status:** Binding companion to Delivery System v2.0  
**Date:** 2026-07-15 (revised — full V2 governance + first-class workers)  
**Related:** [DELIVERY-SYSTEM-V2-PROPOSAL.md](./DELIVERY-SYSTEM-V2-PROPOSAL.md) · [DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md](./DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md)

---

## 1. Authority summary

| Role | Decides | Executes | Must not |
|------|---------|----------|----------|
| **Mike** | Product outcomes, AC, PROD, sends, archive, UI ON/OFF deletes | Airtable UI gates; external account approvals | Debug agent toolpaths; invent script versions |
| **ChatGPT** | Architecture options, plan quality, copy | Plans/reviews outside repo; consume session pack | Edit repo; invent paths/triggers; duplicate Mike sheets |
| **Cursor Lead** | Technical means inside AC; 0/1/2 concurrency; accept/reject workers; STOP/ROLLBACK | Integration, diff review, test re-run, CONTROL/registry, Mike sheets, G6, promotion readiness | Accept worker output without retest; tip-sync-only commits; skip hard stops |
| **Cursor workers** | Nothing product | Bounded exclusive-path deliverables per assignment | CONTROL, capacity, registry, Mike sheets, closeout, merge to integration/`master` |
| **GitHub** | SoT for shippable artifacts | History / PRs | Deploy Airtable |
| **Airtable DEV / PROD** | Runtime truth by env | DEV lab; PROD season SoR | Promote from memory |
| **Vercel** | Web runtime | Preview / prod | Client Airtable secrets |
| **Make/AWS/external** | Side effects | Webhooks/uploads/email | Real send without Mike |
| **OMNI** | — | Mike-led ad-hoc in-base | Replace GitHub SoT for production automations |

---

## 2. RACI by work type

Legend: **R** responsible · **A** accountable · **C** consulted · **I** informed

| Work | Mike | ChatGPT | Lead | Worker | GitHub |
|------|------|---------|------|--------|--------|
| Feature brief | A | R | C | — | I |
| Concurrency plan (0/1/2) | I | — | R/A | — | — |
| Worker assignment contract | I | — | R/A | I | I |
| Script / web slice impl | I | C | A | R (if assigned) | A (store) |
| Offline tests for slice | I | — | A (re-run) | R (initial) | A |
| Live DEV smoke | I | — | R/A | — | I |
| CONTROL / registry / capacity | I | — | R/A | **prohibited** | A |
| Mike nine-field sheet | I | — | R/A | **prohibited** | A |
| Paste / trigger / delete | **R/A** | — | C (sheet) | — | C |
| G6 closeout / promo readiness | I | C | R/A | **prohibited** | A |
| integration→master PR | A cadence | — | R | — | A |
| PROD promotion | **A** + R UI | C | R support | — | A |
| Season rollover | A | R draft | R execute plan | C docs/tests only | A |

---

## 3. Lead responsibilities (revised)

- Task Classification + Workspace Check for every remaining V2 item  
- Choose **Lead-direct** vs 1 vs 2 workers per concurrency rules  
- Author assignment templates with exclusive paths  
- Integrate worker branches; resolve conflicts  
- **Independently review diffs and rerun tests** before accept  
- Own CONTROL (lagging SHA), DEPLOYMENT-REGISTRY, capacity narrative updates  
- Own hybrid Mike status + nine-field sheets  
- Own G6 closeout and per-feature master PR  
- Stall takeover at 15 minutes  
- Record worker metrics classifications  

---

## 4. Worker responsibilities (revised)

- Execute only the assignment’s bounded deliverable  
- Write only writable paths; honor read-only and prohibited lists  
- Run required test commands; write result artifact  
- Stop on stop conditions; escalate to Lead  
- Never touch CONTROL, capacity, registry, Mike sheets, closeout  
- Never merge to integration or master  

Detail + templates: [DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md](./DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md)

---

## 5. Wrong-role corrections

| Observed | Correct |
|----------|---------|
| Workers update CONTROL after finish | Lead only |
| Lead accepts merge without retest | Forbidden |
| ChatGPT invents paths/triggers | Session pack + sheet only |
| 4 concurrent workers | Max Lead+2 |
| Pilot treated as “only two packages use v2.0” | Validation only; full V2 under governance now |
| Website uses PROD adapter by default | Mock-default |

---

## 6. Decision rights — quick reference

```
Product behavior changed?          → Mike
0/1/2 workers?                     → Lead
Exclusive path assigned?           → Lead (workers obey)
Worker output mergeable?           → Lead after diff+retest
Human must click Airtable?         → Mike (sheet)
CONTROL / registry / sheet / G6?   → Lead only
Touches PROD / send / $?           → Mike stop gate
Ops tip vs infrastructure?         → CONTROL vs PROJECT_STATE
```

---

*End of role matrix.*
