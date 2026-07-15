# Mike decision sheet — Delivery System v2.0

**Status:** **LOCKED** (Mike · 2026-07-15) + **clarification** (full V2 governance; pilot = validation only; worker-agent first-class)  
**Type:** Process / architecture  

---

## Locked choices (D1–D10)

| ID | Choice | Binding interpretation |
|----|--------|-------------------------|
| **D1** | **pilot** | Two-package **validation period** for the permanent-adopted label. **Not** a scope limit. v2.0 **governs all remaining V2 rebuild work now**, and is the reusable OS for future Airtable/Vercel apps. |
| **D2** | **hybrid** | Short Mike status + one nine-field sheet. Do not duplicate sheet in chat. |
| **D3** | **lead2** | Lead-direct default; max Lead+2; workers only for parallel path-disjoint independently testable work. See [WORKER-AGENT-MODEL](../architecture/DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md). |
| **D4** | **lagging-pointer** | CONTROL stores previous verified/package SHA. `git rev-parse HEAD` = tip. No tip-sync-only commits. |
| **D5** | **json-only** | Repo `DEPLOYMENT-REGISTRY.json` only during validation; no Airtable registry table. |
| **D6** | **yes** | PROJECT_STATE = infrastructure/IDs only. |
| **D7** | **per-feature** | After each G6 functional close, PR integration → `master`. Workers → integration only. |
| **D8** | **mock-default** | Separate mock / DEV / protected PROD adapters. |
| **D9** | **yes** | Mandatory ChatGPT session pack. |
| **D10** | **research** | Research browser paste only; no paste bot build. |

---

## Clarifications (binding)

1. Pilot packages score process + worker-efficiency metrics; **all other V2 work still runs under v2.0 rules**.  
2. Worker-agent efficiency is **first-class** (assignment contracts, exclusive paths, Lead review+retest, stall/takeover, metrics).  
3. Lead alone owns CONTROL, capacity, registry, Mike sheets, closeout, promotion readiness.  
4. Intended reuse across Mike’s other Airtable/Vercel applications.  

---

## Validation tracker

| Package | Role | Status |
|---------|------|--------|
| Automation **117** | Validation package 1 | **NEXT** — nine-field handoff |
| Next Airtable consolidation | Validation package 2 | Not started |
| Permanent-adopted label | After review PASS | Blocked on validation |
| Full V2 governance under v2.0 | — | **ACTIVE now** |

---

## Key docs

| Doc | Purpose |
|-----|---------|
| [DELIVERY-SYSTEM-V2-PROPOSAL.md](../architecture/DELIVERY-SYSTEM-V2-PROPOSAL.md) | Operating model |
| [DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md](../architecture/DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md) | Lead/worker, templates, metrics |
| [DELIVERY-SYSTEM-V2-PILOT.md](../architecture/DELIVERY-SYSTEM-V2-PILOT.md) | Validation charter |
| [AUTOMATION-117-v2-pilot-mike-handoff.md](./AUTOMATION-117-v2-pilot-mike-handoff.md) | First Mike gate |
| [CHATGPT-SESSION-PACK.md](../delivery/CHATGPT-SESSION-PACK.md) | Session pack |
| [DEPLOYMENT-REGISTRY.json](../delivery/DEPLOYMENT-REGISTRY.json) | JSON registry |

---

## Reply phrases

| Event | Phrase |
|-------|--------|
| Decisions | `Delivery System v2.0 decisions: …` — **DONE** |
| Clarification ack (optional) | `Delivery System v2.0 clarification: full V2 governance + worker model ack` |
| 117 paste | `117 paste UI complete` |
| Validation review | `Delivery System v2.0 pilot review: PASS` or `FAIL` |

---

*End of locked decision sheet.*
