# Delivery System — State Model

**Status:** Proposed companion to Delivery System v2.0  
**Date:** 2026-07-15  
**Problem:** Multiple “live” documents contradict (CONTROL tip vs PROJECT_STATE July 11 vs queue notes vs worker branches).  
**Goal:** One authoritative tip for ops; clear homes for slow vs fast state.

---

## 1. Principles

1. **One tip for “what now”** — machine-readable, SHA-bound  
2. **Human docs are views or history** — not competing tips  
3. **Static IDs ≠ live queue**  
4. **Deployed Airtable state is separate from GitHub tip** until registry proves otherwise  
5. **Contradictions are bugs** — auto-detect where possible  

---

## 2. Canonical ownership

| Concern | Canonical file | Retain / merge / replace |
|---------|----------------|--------------------------|
| **Current phase / package** | `docs/overnight-runs/CONTROL.json` → evolve to `docs/delivery/DELIVERY-STATE.json` (same schema) | **Retain** CONTROL; rename later |
| **Current branch / SHA** | CONTROL.`canonical` | **Retain**; update **in the same commit** as feature tip (end tip-sync-only commits) |
| **Queue** | CONTROL.`queue` | **Retain** |
| **Capacity** | CONTROL.`capacity` (proposed mirror) + `AIRTABLE-AUTOMATION-CAPACITY-LEDGER.md` | **Merge**: ledger is narrative; CONTROL holds numbers |
| **Deployment status (repo)** | CONTROL.`deployment` + manifests | **Add** |
| **Airtable deployed version** | Proposed `DEPLOYMENT-REGISTRY` (table or `docs/delivery/DEPLOYMENT-REGISTRY.json`) | **Add**; not GitHub SHA alone |
| **Tests last run** | CONTROL.`tests` | **Retain** |
| **Blockers** | CONTROL.`pending_approvals` + queue `BLOCKED_*` | **Retain** |
| **Next Mike action** | CONTROL.`next_action` + **one** sheet path | **Retain**; sheet is detail |
| **Static bases / URLs / env inventory** | `docs/PROJECT_STATE.md` | **Retain as slow**; strip live queue |
| **Backlog IDs / priority** | `docs/v2-change-backlog.md` | **Retain** |
| **Migration records** | `docs/overnight-runs/results/S*-*migration-record.md` | **Retain** as history |
| **Morning handoffs** | Optional 1-pager linking CONTROL | **Merge/compress**; not SoT |
| **Worker result files** | Optional audit | **Demote**; delete after squash merge age-out |
| **Mike action sheets** | `docs/deploy-checklists/*mike*` | **Retain** as human gate SoT |
| **Test evidence JSON** | `docs/audits/*.json` | **Retain** |
| **Master Plan Brief** | Generated planning view | **Replace as SoT** — generate from backlog+CONTROL |
| **agent-status.json / queue.json duplicates** | overnight extras | **Replace** — fold into CONTROL or delete |

---

## 3. Proposed CONTROL / DELIVERY-STATE shape (additive)

Keep schema_version; add optional blocks without breaking Desktop v1 readers:

```json
{
  "schema_version": 2,
  "updated_at": "ISO-8601",
  "canonical": {
    "branch": "overnight/lead-integration",
    "sha": "<full>",
    "remote_sha": "<full>",
    "match": true
  },
  "capacity": {
    "base_id": "appTetnuCZlCZdTCT",
    "occupied_estimated": 45,
    "free_estimated": 5,
    "as_of": "2026-07-15",
    "ui_confirmed": false
  },
  "deployment": {
    "airtable_dev": {
      "registry_path": "docs/delivery/DEPLOYMENT-REGISTRY.json",
      "last_paste_package": "phase-d-072-074",
      "known_drift": []
    },
    "vercel": {
      "production_branch": "master",
      "last_known_status": "unused-aggressive-ok"
    }
  },
  "mike_gate": {
    "sheet": "docs/deploy-checklists/AUTOMATION-117-mike-activation-sheet.md",
    "state": "READY_FOR_MIKE_ACTIVATION",
    "reply_phrase": "117 paste UI complete"
  },
  "next_action": "…",
  "queue": [],
  "tests": {},
  "pending_approvals": []
}
```

---

## 4. File lifecycle

| File type | Write when | Read when | Archive when |
|-----------|------------|-----------|--------------|
| CONTROL | Every close / gate change | Session start | Never delete; git history |
| Mike sheet | Gate ready | Mike acts | Mark COMPLETE banner |
| Migration record | Package close | Audit / promote | Keep forever |
| AUTHORIZED | Stage start | Agents | Keep |
| Morning handoff | Optional AM | Mike AM | Supersede next day |
| Worker results | Worker finish | Lead merge | 14-day keep optional |
| PROJECT_STATE | Base/URL/env change | Onboarding | Rare |
| Backlog | Scope change | Planning | Continuous |
| Registry | After paste proven | Drift checks | Continuous |

---

## 5. Preventing stale contradictions automatically

| Check | Mechanism | On fail |
|-------|-----------|---------|
| Local SHA ≠ CONTROL.canonical.sha | Pre-commit / Lead closeout script | Update CONTROL in **same** commit or block push claim |
| CONTROL.remote_sha ≠ origin | `git fetch` + compare session start (overnight rule) | Fetch/push before work |
| Mike sheet path missing | `verify_mike_sheet.py` | Do not present sheet |
| next_action cites COMPLETE package | Lint queue vs next_action | Block closeout |
| PROJECT_STATE “live progress” dates older than 7 days vs CONTROL | Doc lint warning | Strip live section from PROJECT_STATE |
| Capacity ledger ≠ CONTROL.capacity | Sync script | Prefer CONTROL numbers; update ledger narrative |
| Registry version ≠ GitHub version after paste claim | Hash compare when API/registry available | Mark `known_drift` |
| Worker branch behind tip >10 commits | Stage hygiene job | Reset or delete worker branch |

**Immediate (no new tools):** same-commit CONTROL updates; PROJECT_STATE loses live queue; Mike sees only sheet + CONTROL next_action in handoffs.

---

## 6. Session start algorithm (v2.0)

1. Read CONTROL (or DELIVERY-STATE)  
2. `git rev-parse HEAD` + fetch + compare `remote_sha`  
3. Read `mike_gate.sheet` if state needs Mike  
4. Read backlog item only if queue package requires  
5. Ignore PROJECT_STATE for next_action  
6. Ignore ChatGPT memory if CONTROL conflicts  

---

## 7. Disposition checklist (approval via Mike decision sheet)

| Artifact | Recommendation | Mike choose |
|----------|----------------|-------------|
| CONTROL.json | Keep as tip SoT | Confirm rename later? |
| PROJECT_STATE.md | Keep static only | Approve stripping live V2 table? |
| Backlog | Keep | — |
| Capacity ledger | Keep narrative + mirror numbers in CONTROL | Confirm |
| Migration records | Keep | — |
| Morning handoffs | Optional link-only | Prefer? |
| Worker results | Demote | Auto-delete after 14d? |
| Mike sheets | Keep | — |
| Test evidence | Keep | — |
| Tip-sync commits | Eliminate | Confirm same-commit policy |

---

*End of state model.*
