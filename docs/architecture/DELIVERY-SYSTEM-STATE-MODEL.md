# Delivery System — State Model

**Status:** Binding companion to Delivery System v2.0  
**Date:** 2026-07-15 (revised — lagging-pointer SHA; workers cannot write state)  
**Goal:** One authoritative ops tip; HEAD is tip SoT; CONTROL SHA is lagging.  
**OS binding:** v2.0 governs the entire remaining V2 rebuild; pilot validates process health only (not a scope limit). Lead alone owns state. Workers are path-disjoint only; max Lead+2. No tip-sync-only commits. After G6, use per-feature PRs to `master`.

---

## 1. Principles

1. **Ops tip** — CONTROL queue / next_action / tests / blockers  
2. **Actual tip SHA** — `git rev-parse HEAD` (and origin after fetch)  
3. **CONTROL SHA is a lagging pointer** — previous verified/package commit (D4). A versioned file cannot honestly contain the SHA of the commit that adds it  
4. **PROJECT_STATE** — infrastructure / IDs only (D6)  
5. **DEPLOYMENT-REGISTRY.json** — deployed script claims (D5 json-only)  
6. **Workers never write** CONTROL, capacity tip numbers, registry, Mike sheets, or G6 closeout  
7. **No tip-sync-only commits**  

---

## 2. Canonical ownership

| Concern | Canonical | Writer |
|---------|-----------|--------|
| Phase / queue / next action / tests / blockers | CONTROL.json | Lead only |
| Actual tip SHA | `git rev-parse HEAD` | git |
| Previous package SHA | CONTROL.`canonical.sha` | Lead (lagging) |
| Capacity numbers | CONTROL.`capacity` + ledger narrative | Lead only |
| Deployed script claims | `docs/delivery/DEPLOYMENT-REGISTRY.json` | Lead only |
| Mike gate detail | One nine-field sheet | Lead only |
| Infrastructure IDs | PROJECT_STATE.md | Lead (rare) |
| Backlog | v2-change-backlog.md | Lead / Mike process |
| Worker assignments / results | assignments/ + results/ | Lead assigns; worker writes result only |
| Migration / evidence | results/ + docs/audits/ | Lead |

---

## 3. CONTROL shape (additive)

```json
{
  "schema_version": 2,
  "updated_at": "ISO-8601",
  "canonical": {
    "branch": "overnight/lead-integration",
    "sha": "<previous verified/package commit — LAGGING>",
    "remote_sha": "<optional last-seen origin at closeout>",
    "match": false,
    "sha_semantics": "lagging_pointer",
    "tip_authority": "git rev-parse HEAD"
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
      "last_paste_package": null,
      "known_drift": []
    }
  },
  "mike_gate": {
    "sheet": "docs/deploy-checklists/AUTOMATION-117-v2-pilot-mike-handoff.md",
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

| File | Write when | Who |
|------|------------|-----|
| CONTROL | Close / gate change | Lead |
| Registry | After paste claim / G5/G6 | Lead |
| Mike sheet | Gate ready | Lead |
| Worker assignment | Before spawn | Lead |
| Worker result | Worker finish | Worker |
| PROJECT_STATE | Base/URL/env name change | Lead |
| Migration / audits | Package close | Lead |

---

## 5. Stale-state prevention

| Check | On fail |
|-------|---------|
| Claiming CONTROL.sha == tip | Forbidden — use HEAD |
| Tip-sync-only commit | Forbidden |
| Worker edits state files | Reject assignment |
| PROJECT_STATE gains next_action | Revert |
| Registry hash drift after paste claim | Mark `known_drift` |
| Worker branch &gt;10 commits behind tip | Reset or abandon |

---

## 6. Session start

1. `git rev-parse HEAD` + fetch → actual tip  
2. Read CONTROL for queue / next_action (lagging SHA)  
3. Sheet if Mike gate pending  
4. Ignore PROJECT_STATE for next_action  
5. If spawning workers → assignment contracts first  
6. ChatGPT → session pack with **HEAD** SHA  

---

*End of state model.*
