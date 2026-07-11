# Assignment T6 — Worker B

**Assigned by:** Cloud Lead (LEAD-005)  
**Time:** 2026-07-11T22:35Z  
**Agent:** Worker-B  
**Cloud agent:** https://cursor.com/agents/bc-29524ab2-f376-4153-83ba-920a12ffe8c2  
**Branch:** `overnight/worker-b-070a-backend` (continue on this branch)  
**Do not wait on:** Mike #8 / #9 / #11

---

## Task

**T6 — Offline Make dual-route blueprint validator + payload matrix**

Build **offline-only** tooling that validates the DEV dual-route Make blueprint and homework/video webhook payload shapes without calling Make, AWS, or Airtable.

### Deliverables

1. Offline validator script (Python) under `tools/airtable/` or `make/` that:
   - Loads `make/blueprints/upload-asset-engine-lambda-dev-v1.template.json`
   - Asserts Module 2 / router filters mention both `070a`/`homework_completion` and `070b`/`video_feedback` (or documents exact JSON paths if structure differs)
   - Asserts no operational secrets/URLs in the sanitized blueprint
2. Payload matrix unit tests covering:
   - Valid homework payload (`make/test-payloads/homework-completion-070a-dev.sample.json`)
   - Valid video payload shape (mirror existing C-013 sample if present)
   - Reject wrong routeKey / wrong automationNumber pairings
3. Worker result: `docs/overnight-runs/worker-results/worker-b-t6-make-blueprint-validator.md`
4. Update PR #12 (or follow-up commits on same branch)

### Locks

- May use: `L-070a-make-dev` (already held)
- Do **not** edit: `070a-*.js`, C-023 docs (`docs/**/C-023*`), lead shared overnight files (`queue.json`, overnight log, manual-actions, agent-status)
- Do **not** deploy Make/AWS or enable 070a

### Tests required

- New unit tests PASS offline
- Existing lambda suite still PASS (`38/38` or better)

### Explicit

**DEV-first. No PROD changes.** Never reset `recGQ8EjAMz3bEBiW`.
