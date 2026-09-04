# COORD Wave A3 — Independent Functional-Risk Verification

**Date:** 2026-09-04  
**Agent:** Agent 3 (Independent Functional-Risk Verification)  
**Branch:** `coord/a3-functional-risk-20260904`  
**Worktree:** isolated (`WORKTREE_ID=coord-a3-6b0a83c1`)  
**Base:** Production `appn84sqPw03zEbTT`  
**SHA verified:** `5dcb8449ffce9c11a1a136f46c817f029dd72a10` (`origin/master` tip matches expected `5dcb8449`)  
**Method:** GitHub inventory + live Airtable MCP (`list_automations`, `get_automation`, `list_records_for_table`, `analyze_table`, `list_views_for_table`)  
**Mutations this pass:** none (read-only)

---

## Task Classification

| Field | Value |
|-------|-------|
| Type | Independent functional-risk re-verification |
| Priority | P1 (SC-154 / SC-155 close confirmation) |
| Difficulty | Medium |
| Owner | Agent 3 / Cursor |
| Dependencies | Live Production MCP access |
| Backlog ID | SC-154 (SF-03), SC-155 (SF-04) |
| Estimated Scope | Audit doc only |
| Phase | 5 Close / independent verify |
| Correct tool | Cursor + Airtable MCP |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Optional operator cleanup checklist only |

---

## Executive verdicts

| Item | Verdict | Remain closed? |
|------|---------|----------------|
| **A) SC-154 / SF-03** Duplicate valid Enrollment+Week WAS | **No genuine reproducible defect remaining** | **Yes — remain closed** |
| **B) SC-155 / SF-04** Level recalc lag / stranded Needed? | **No stranded-queue defect; ≤15m cron delay expected** | **Yes — remain closed** |
| **Other open P0/P1 functional defect (live evidence)** | **NONE** | — |

Prior closeout docs (`SC-154-WAS-DUPLICATE-RESULT-20260904.md`, `SC-155-LEVEL-LAG-RESULT-20260904.md`) are consistent with **fresh** live evidence from this pass. This report does not reopen from stale narrative alone.

---

## A) Duplicate Weekly Athlete Summaries (SC-154 / SF-03)

### A1. Writers inventory (GitHub + live)

| Writer | Creates WAS? | Live automation | Live status | Evidence |
|--------|--------------|-----------------|-------------|----------|
| **031** | **Yes** (sole create) | `wflKviSzqoWMnKNrE` | deployed · `recordEntersView` | Live script **v4.1**; `createRecordAsync` on summaries table; post-create race fail-closed |
| **030** | No (update Grade Band) | `wflieZd3s3o8SB0xD` | deployed | Update-only |
| **032** | No | `wflOHqpcDF2F8oItI` | deployed | GitHub v3.4; no `createRecordAsync` |
| **033** | No | `wfl1trFEUOV3yIMHM` | deployed | GitHub v4.4; no WAS create |
| **034** | No | `wflkSZX2nWn8ZK9L5` | deployed | GitHub v3.4; no WAS create |
| **035** | No (creates XP Events only) | `wflQDjG1OphlQ03S5` | deployed | GitHub v1.3; XP create only |
| **101** | **No** | `wfllWsq7qikhOujGl` | deployed | GitHub **v6.8**; docblock sole-031; XP creates only |
| **118** | **No** | `wflaSFRTHs6rNzs5L` | deployed · cron | GitHub v2.0; **zero** `createRecordAsync`; resolve existing WAS only |

**Logical unique key:** Enrollment + Week (formula `Summary Key`). Scripts must not write `Summary Key`.

### A2. Live WAS duplicate scan (2026-09-04, this pass)

| Metric | Value |
|--------|-------|
| WAS rows scanned | **7** (`analyze_table` count) |
| Valid (exactly 1 Enrollment + 1 Week) | **1** |
| **Valid Enrollment+Week duplicate groups** | **0** |
| Orphan (Enrollment empty) | **5** |
| Multi-Enrollment link on one WAS | **1** |

Classification (IDs redacted in narrative; counts only):

- **Valid unique:** one Schmidt Athlete1 + Week 1 row.
- **Malformed multi-link:** one Early Bird row linked to two Schmidt enrollments — operator repair candidate, **not** a concurrent same-pair create.
- **Orphans:** five Week/Early Bird rows with blank Enrollment / blank Summary Key — historical junk, not Enrollment+Week uniqueness failures.

### A3. Reconciliation visibility

| Surface | Present? | ID / name |
|---------|----------|-----------|
| Operator duplicate cleanup view | **Yes** | `ADMIN - DUPLICATE SUMMARY CLEANUP - OK TO DELTE` (`viwb3YN5G8Md20q2K`) |
| Status / formula exposure | **Yes** | `Summary Key` formula; Enrollment + Week links |

Grouping by `Summary Key` (or Enrollment then Week) on the ADMIN view remains the operator reconciliation path. No auto-merge recommended.

### A4. Genuine reproducible defect remaining?

**No.** Live scan shows **zero** valid Enrollment+Week duplicate groups. Sole create path is live **031 v4.1** with fail-closed duplicate handling. Residual risks (no Airtable unique index; orphan/malformed rows; manual/harness creates) are operational hygiene, not an open uniqueness defect.

---

## B) Level recalculation lag / stranded Needed? (SC-155 / SF-04)

### B1. Live 041 / 042 (MCP)

| Code | automationId | Status | Trigger | Live script version |
|------|--------------|--------|---------|---------------------|
| **041** | `wflCRvaopntNPsc64` | deployed | **cron every 15 minutes** (`minutely` width 15; start `2026-08-08T16:00:00.000Z`); blank `recordId` by design | **v5.1** |
| **042** | `wfl3aiiK8vI2tz0HA` | deployed | Enrollments **recordEntersView** `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`) | **4.1.2** |

**042 view:** exists live (`viwm9OgwkPKI2bii3`). MCP `list_views_for_table` does not return filter predicates; GitHub/script + prior attested filter remain: `Level Recalc Needed?` checked **AND** `Active?` checked. Independent confirmation this pass: trigger is view-entry on that view ID; Needed?=1 count is the queue signal.

**Design chain:** 041 signature diff → sets Needed? + queued signature → enrollment enters 042 view → 042 assigns / gate-blocks → clears Needed? + writes reconciled signature. On 042 error, Needed? preserved (retryable).

### B2. Needed? / stranded counts (live)

| Check | Result |
|-------|--------|
| Enrollments with `Level Recalc Needed?=1` | **0** |
| Enrollments with `Level Status=Error` | **0** |
| Active enrollments | **3** (2 Schmidt + 1 VERIFY fixture) |
| Schmidt queued == reconciled signatures | **Yes** (both Athlete1 and Athlete 2) |
| Aged stuck Needed? (>30m / 2× cron) | **None** (queue empty) |

VERIFY enrollment note (not a strand): `Progression Last Queued Signature` can lag `Progression Last Reconciled Signature` after 042 success because 041 does not rewrite queued on `skipped_unchanged`. Needed? remains unchecked; Level Status=`Assigned`. This is signature bookkeeping lag, not a stuck recalculation queue.

### B3. Reconciliation visibility

| Surface | Present? |
|---------|----------|
| `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`) | **Yes** — processing queue |
| `ENROLLMENTS - Needs Initial Level Assignment` (`viwbi08N7HxOKkbxc`) | **Yes** — separate initial path |
| Filter `Level Recalc Needed? = checked` | Sufficient operator monitor |
| `Level Status = Error` | Observable failure / retry signal (0 rows live) |

Suggested (optional) OMNI view: `OPS - Level Recalc Needed Aged` with Needed?=1 + activity columns — monitoring nicety, not a defect fix.

### B4. Can 041/042 strand beyond expected ≤15m cron delay?

| Question | Answer | Evidence |
|----------|--------|----------|
| Expected delay before Needed? flips after input change | **Up to one 041 cron interval (≤15m)** | Live trigger is 15-minute cron, not XP-event-driven |
| After Needed? is set, 042 consume latency | View-entry (normally near-immediate) | Live 042 = `recordEntersView` |
| Spontaneous strand >15m with healthy 042 | **No live evidence** | Needed?=0; Error=0; Schmidt signatures settled |
| Can Needed? remain set beyond SLA? | **Yes, only on failure modes** (042 Error preserves Needed?; view/filter misconfig; inactive edge cases) | Documented in 041/042 design; **not observed live** |

**Verdict:** Lag is **expected async**, not a stuck-queue defect. No current strand. Residual risk is failure-mode retention of Needed?, which is correctly visible via Needed? + Level Status=Error.

---

## Other still-open P0/P1 functional defects (skim)

Sources: `WORKFLOW-SILENT-FAILURE-REMEDIATION-20260904.md`, `WORKFLOW-RELIABILITY-INVENTORY-20260904.md`, Master Future Work List SC-152…SC-157.

| ID | Priority | Status (authoritative list) | This-pass live spot-check |
|----|----------|-----------------------------|---------------------------|
| SF-01 / SC-152 | P0 | CLOSED Live Tested | Not reopened; 057 not modified |
| SF-02 / SC-153 | P0 | CLOSED Live Tested | Not reopened; 058 not modified |
| SF-03 / SC-154 | P1 | CLOSED / disproven | Re-verified above |
| SF-04 / SC-155 | P1 | CLOSED / expected async | Re-verified above |
| SF-05 / SC-147 | P1 | CLOSED | 101 live deployed |
| SF-06 / SC-156 | P1 | CLOSED Live Tested | 070a not modified this pass |
| SF-07…SF-10 | **P2** | Deferred | Not P0/P1 |

**Unresolved P0/P1 functional defect with live evidence this pass: NONE.**

Orphan/multi-link WAS rows are **P2+ operator hygiene**, not a reopen of SC-154 uniqueness.

---

## SC-154 / SC-155 remain closed?

| Item | Remain closed? | Rationale |
|------|----------------|-----------|
| **SC-154** | **Yes** | Fresh live scan: 0 valid Enrollment+Week duplicate groups; 031 sole create |
| **SC-155** | **Yes** | Fresh live: 0 Needed?; 0 Level Status Error; 041=15m cron v5.1; 042=4.1.2 view-entry |

---

## Mike checklist (optional)

1. **Orphan WAS cleanup (OMNI):** Open `ADMIN - DUPLICATE SUMMARY CLEANUP - OK TO DELTE`; filter Enrollment empty; archive/delete orphan junk after confirming no dependent links. Do **not** treat as SC-154 reopen.
2. **Multi-Enrollment WAS repair (OMNI):** Unlink extra Enrollment on the malformed Early Bird row; keep one Enrollment + one Week.
3. **Optional monitor view:** Create `OPS - Level Recalc Needed Aged` (Needed?=1 + last-modified). Alert mentally at >30 minutes with Level Status=Error.
4. **No paste required** for 031 / 041 / 042 based on this verification.

---

## Worktree / merge note

- Isolated worktree only; **do not merge** this branch without Mike approval.
- Merge-back: `/apply-worktree`  
- Cleanup: `/delete-worktree`

---

## Assumptions / limits

- View filter predicates for `042 - Needs Level Assignment` are not returned by MCP `list_views_for_table`; trigger view ID + empty Needed? queue are the live observables used here.
- No disposable mutation / forced 041 bump in this independent re-verify (read-only). Prior SC-155 disposable Manual Adjustments proof remains valid historical evidence of ≤15m async behavior.
- Automations 057, 058, and 070a were not modified (hard rule).
