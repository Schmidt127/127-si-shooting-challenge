# SC-152 / SC-153 — State model and acceptance criteria

**Date:** 2026-09-04  
**Agent:** A1 Perfect Week Truth (analysis only)  
**Backlog:** SC-152 (SF-01), SC-153 (SF-02) — P0 REQUIRED  
**Base:** Production `appn84sqPw03zEbTT`  
**Live automations:** 057 `wflVRPhgunsosFjWS` · 058 `wflDinFz6FBIGEOMg`  
**Companion root-cause docs:** [`SC-152-SF01-ROOT-CAUSE-20260904.md`](./SC-152-SF01-ROOT-CAUSE-20260904.md) · [`SC-153-SF02-ROOT-CAUSE-20260904.md`](./SC-153-SF02-ROOT-CAUSE-20260904.md)  
**Silent-miss table:** [`SC-152-153-SILENT-MISS-STATE-TABLE-20260904.md`](./SC-152-153-SILENT-MISS-STATE-TABLE-20260904.md)  
**Rollback snapshot:** [`airtable/rollbacks/20260904-pre-sc152-153/`](../../airtable/rollbacks/20260904-pre-sc152-153/)

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Workflow reliability — Perfect Week lifecycle truth |
| Priority | P0 |
| Difficulty | High |
| Owner | Agent 1 (analysis) → Agent 2 (implementation after gate) |
| Dependencies | Inventory + silent-failure docs; live MCP attestation |
| Backlog ID | SC-152, SC-153 |
| Estimated Scope | Analysis + acceptance + rollback dumps (no live trigger/script edit) |
| Phase | 3 / gate for 5 |
| Correct tool | Cursor + Airtable MCP |
| Repo | `127-si-shooting-challenge` |
| Mike's role | None for this analysis packet |

---

## Before state model (live Production 2026-09-04)

### Fields (WAS)

| Field | Type | Role |
|-------|------|------|
| Perfect Week Calculation Queue? | formula | 1 iff Enr+Week+Goal linked and Status ∈ {Pending, Ready} |
| Perfect Week Automation Status | singleSelect | Pending / Ready / Created / Skipped / Error |
| Perfect Week Eligible? | formula | 1 iff Ready + Daily Met + HW Met + Video Met + Zoom Met |
| Perfect Week Unlock | link | 0–1 Athlete Achievement Unlock |
| Perfect Week Automation Error | text | 057/058 skip/error writeback |

### 057 (v2.3)

```
[Enr+Week+Goal + Status Pending|Ready] → Queue?=1
         │
         ▼  recordMatchesConditions (Queue?=1)  ← only on match ENTER
      Script 057
         │
         ├─ success → Status Ready + helpers
         └─ fail    → Status Error + Automation Error
```

**Defect:** Queue remains 1 after Ready; later data changes do not create a new match edge → silent non-recalculation (SF-01).

### 058 (v1.5)

```
Eligible?=1 AND Unlock empty AND Status=Ready
         │
         ▼  recordMatchesConditions (positive-only)
      Script 058  (contains withdraw/restore/create)
```

**Defect:** Withdraw/restore code is unreachable whenever Unlock is linked or Eligible=0 → silent non-withdrawal (SF-02).

### Proven transitions (disposable Schmidt fixtures)

| Transition | Result |
|------------|--------|
| Status blank → Pending | Queue 0→1; 057 fired |
| Ready + sticky Queue; Video Count write | 057 did not re-fire |
| Ready → Skipped | Queue → 0 (stranded) |
| Eligible=1 with Unlock linked | 058 did not fire |
| Eligible → 0 with Unlock Active | Unlock stayed Active; no 058 skip writeback |

---

## After state model (proposed — Agent 2 implements)

Do **not** delete Queue or Eligible formulas. Prefer writable reconciliation edges that create reliable match enters, aligned with 010/065 patterns.

### SC-152 target (057)

| Change | Intent |
|--------|--------|
| Keep Queue? formula for visibility / operator views | Auditability |
| Add or use a **writable** re-arm / reconciliation flag (recommended) that 057 clears at end of successful/error handling | Guaranteed 0→1 edge when recalculation needed |
| Or: change trigger to watch writable Status (+ optional other writable inputs) such that every needed recalc forces a clear→Pending (or clear→flag) edge | Same reliability |
| Document operator view: stranded Queue?=1 OR flag=1 | Reconciliation |

Required behavioral outcome: **any material change to countable inputs that should change Perfect Week helpers must cause 057 to run without manual Airtable “Run”**, or must leave an **observable** reconciliation flag ≠ done.

### SC-153 target (058)

| Change | Intent |
|--------|--------|
| Replace positive-only conditions with **lifecycle** trigger per script docblock: updates involving Eligible?, Status, Unlock, Enrollment, Week, Goal Record (exact UI shape Agent 2 chooses, Mike-pasteable) | Allow withdraw/restore |
| Keep script mayQualify / deactivateExactOwnedUnlock / restoreExactOwnedUnlock | Already correct |
| Keep Unlock empty **out** of the hard trigger filter (or use a broader update trigger) | Restore path |
| Still fail-closed on inactive enrollment / bad goal | PKG-039 |

Required behavioral outcome: eligibility loss or invalid goal **deactivates** the exact-owned unlock; eligibility return **restores** the same Milestone Source Key unlock without creating a duplicate.

### Proposed happy path (after)

```
inputs change → (writable re-arm / Status edge) → 057 → Ready + helpers
       → Eligible? formula settles
       → 058 lifecycle run → create OR restore OR deactivate
       → 059 awards only Active+Pending unlocks
```

---

## Acceptance criteria

### SC-152 (SF-01)

1. Live 057 trigger no longer depends **solely** on a formula field remaining true for re-entry (writable edge or equivalent attested).  
2. Disposable WAS-Test: after Ready, changing countable inputs (or flipping the new re-arm flag) causes **057 to run again** without manual Run.  
3. Status Skipped/Error still require explicit re-arm, but re-arm produces Queue/flag 0→1 reliably.  
4. Queue? formula retained (not deleted).  
5. Offline + disposable proof logged; no secrets/PII/record IDs in public reports.  
6. Rollback packet present under `airtable/rollbacks/20260904-pre-sc152-153/`.

### SC-153 (SF-02)

1. Live 058 trigger matches lifecycle contract (not Eligible=1 ∧ Unlock empty ∧ Ready only).  
2. Disposable: create Unlock-Test Active while Eligible=1; force Eligible=0 → Unlock **Active?=false** (or equivalent deactivate) via **058 automation run**, with Automation Error `058 skipped:…` or clear documented success path.  
3. Disposable: restore same Milestone Source Key unlock when Eligible returns to 1 — **no second unlock row**.  
4. Positive create path still works when Eligible=1, Unlock empty, Ready.  
5. Inactive Enrollment never creates/replays unlock.  
6. Offline lifecycle tests remain green; live disposable proof attached to verify agent evidence.

### Shared non-goals

- No Season Simulation.  
- No field deletion.  
- No Weeks deletion.  
- No Master Future Work List / CURRENT-TRUTH edits by A2 (coordinator).  
- Do not reopen SC-057/SC-058 attestation IDs.

---

## Rollback snapshot checklist (capture before Agent 2 change)

Already captured in [`airtable/rollbacks/20260904-pre-sc152-153/`](../../airtable/rollbacks/20260904-pre-sc152-153/):

- [x] 057 trigger JSON (`057-trigger.json`)
- [x] 058 trigger JSON (`058-trigger.json`)
- [x] 057 script body v2.3 (`057-live-script-body.js`)
- [x] 058 script body v1.5 (`058-live-script-body.js`)
- [x] WAS Queue/Eligible formula snapshot (`was-formula-snapshot.json`)

Before live paste, Agent 2 / Mike should also:

- [ ] Screenshot or MCP re-pull `get_automation` for both IDs (confirm still matches snapshot)
- [ ] Note automation deploymentStatus still `deployed`
- [ ] Identify one disposable Schmidt WAS for post-change proof (Enrollment-Test)
- [ ] Confirm 059 remains unchanged (out of scope unless unlock Active? churn requires it)

---

## Implementation gate

Analysis complete. Agent 2 may proceed with script/trigger remediation against this model.

```
COORDINATOR_IMPLEMENTATION_GATE: READY
```
