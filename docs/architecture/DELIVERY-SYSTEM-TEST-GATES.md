# Delivery System — Test Gates

**Status:** Proposed companion to Delivery System v2.0  
**Date:** 2026-07-15  
**Evidence basis:** Phase A–D offline + live smoke patterns (`tools/airtable/phase_*`, `docs/audits/*`)

---

## 1. Test hierarchy (reusable)

| Level | Name | What it proves | Typical tool |
|------:|------|----------------|--------------|
| L0 | **Static checks** | Paths exist; paste boundary; no secrets committed; JSON valid | `Test-Path`, ripgrep secrets, prettier/eslint |
| L1 | **Unit tests** | Pure functions / decision tables | Python unittest / vitest |
| L2 | **Contract tests** | Inputs/outputs/statusOut/actionOut; XP Source Key shapes | Offline script harnesses |
| L3 | **Schema tests** | Required fields/types/options present in DEV | Meta API asserts |
| L4 | **Live DEV API tests** | Records behave under API writes (no automation fire required) | Python suites + fixtures |
| L5 | **Airtable trigger tests** | Matching conditions fire automation when ON | Mike UI + run history + API observe |
| L6 | **Timing / concurrency** | Recheck-before-create; duplicate prevention under retry | Double-trigger scripts |
| L7 | **No-send integration** | Build + webhook path with blank/test webhook; never real family | Blank webhook smoke |
| L8 | **Vercel route tests** | Pages/API routes typecheck, unit, build; optional preview | vitest, `next build` |
| L9 | **Production smoke** | Minimal post-promote checks on PROD | Checklist + constrained fixtures |

Higher levels include lower levels unless explicitly waived for docs-only.

---

## 2. Mandatory gates by work type

| Work type | Mandatory | Recommended | Waivable only if |
|-----------|-----------|-------------|------------------|
| **Documentation-only** | L0 (links/paths) | Spell/structure | n/a |
| **Website-only** | L0, L1 (touched), L8 build | a11y on interactive; visual checklist | No deploy |
| **Airtable script change** | L0–L2; L3 if fields touched; L4 pre; L5 if trigger change; L7 if send path | L6 for XP/create | — |
| **Automation consolidation** | All script gates + rollback package exists + capacity note + post-paste L4/L7 | Interaction map | — |
| **Schema migration** | L0, L3, L4 fixture; promotion doc | Snapshot export | — |
| **External webhook/email** | L2, L7 mandatory; real send only Mike-gated | Make blueprint dry-run | — |
| **PROD promotion** | Full package: L1–L7 evidence from DEV + L9 | Diff schema snapshots | Never waive L9 for automations |

---

## 3. Gate definitions (acceptance)

### L0 Static

- Absolute path for every Mike paste target exists on Lead tip  
- Commit SHA presented equals `git rev-parse HEAD` and `origin/<integration>` when claiming pushed  
- No `.env` or webhook secrets in diff  

### L1 Unit

- Suite green; failures blocking  

### L2 Contract

- `statusOut` ∈ {success, skipped, error} patterns covered  
- Idempotent create paths covered (XP / VF / HC)  
- Skip vs error distinction covered  

### L3 Schema

- `requireField` equivalents pass against live DEV schema  
- Single-select options used by script exist  

### L4 Live DEV API

- Named fixture enrollment(s) only  
- Pre-state snapshot; post-state assert; restore or label retain  
- Result JSON saved under `docs/audits/`  

### L5 Trigger

- Automation ON only during window Mike authorized  
- Expected run appears; unexpected runs = FAIL  
- OFF restored if sheet requires  

### L6 Timing / concurrency

- Double invoke within short window → no duplicate XP/asset  
- Formula lag cases documented (wait/retry policy)  

### L7 No-send integration

- Webhook blank → `skipped_no_webhook` (or equivalent)  
- `action*Out` never `sent` unless Mike authorized test scenario  
- Folder 07 / parent notification controls unchanged unless in scope  

### L8 Vercel / web

- `npm test` (or vitest) and `npm run build` green on tip  
- Preview env uses non-PROD Airtable or mocks  

### L9 PROD smoke

- Short checklist only; stop on first anomaly  
- CHANGELOG entry  

---

## 4. Automation consolidation gate pack (standard)

1. Offline combined suite PASS  
2. Rollback folder + README restore steps  
3. Pre-paste live smoke PASS (or N/A with reason)  
4. Mike UI sheet L0-verified  
5. Post-paste live smoke CRITICAL PASS  
6. Retire absorbed automation (Mike delete)  
7. Capacity ledger + CONTROL update  
8. Migration record closed  

Evidence example: Phase D (`S28-phase-d-closeout.md`, `phase-d-072-live-smoke-2026-07-15.json`).

---

## 5. Automatic rollback and stop conditions

### Automatic rollback (Lead directs Mike sheet “Rollback action”)

| Condition | Action |
|-----------|--------|
| Critical post-paste smoke FAIL | Paste rollback scripts; leave OFF; stop phase |
| Duplicate XP / duplicate send detected | Disable offending automation; reverse fixture; stop |
| Unexpected real send | Disable webhook inputs; disable automation; incident |
| Schema write corrupted DEV proof path | Restore from snapshot if available; stop |

### Stop (no further packages) until Mike “Resume”

- Any PROD touch without authorize  
- Credentials missing  
- Capacity math disagrees with Mike UI count by >1 after phase  
- Rollback package missing when consolidation requires it  
- CONTROL SHA mismatch unresolved  

---

## 6. Ownership

| Level | Runs | Interprets FAIL |
|-------|------|-----------------|
| L0–L4, L6–L8 | Lead (or worker under Lead) | Lead |
| L5 | Mike enables; Lead observes | Lead |
| L7 real test webhook | Mike must authorize test scenario | Lead |
| L9 | Mike + Lead support | Mike decide continue/rollback |

Mike is **not** responsible for inventing test scripts. Mike’s test role is: perform UI gate → send reply phrase → optionally toggle ON during authorized window.

---

## 7. Minimal commands (this repo examples)

```text
# Offline examples
python -m unittest tools.airtable.tests.test_phase_d_072_074_combined
python tools/airtable/phase_117_activation_smoke_plan.py

# Web
cd web && npm test && npm run build

# Path verify before Mike sheet
Test-Path "C:\Users\...\117-zoom-recording-credit-orchestrator.js"
git rev-parse HEAD
git ls-remote origin refs/heads/overnight/lead-integration
```

---

## 8. Mapping to Definition of Done (DEV)

Aligns with `docs/development/DEV-EXECUTION-AND-PROMOTION-MODEL.md` §4:

| DoD item | Gate |
|----------|------|
| Workflow E2E | L4–L7 as applicable |
| Failure/conflict case | L2 + L4 |
| Duplicate prevention | L2 + L6 |
| GitHub final + local=remote | L0 |
| Promotion package | Artifact check at G6 |

---

*End of test gates.*
