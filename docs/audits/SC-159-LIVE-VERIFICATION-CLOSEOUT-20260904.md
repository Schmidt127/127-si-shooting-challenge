# SC-159 — Live verification closeout (2026-09-04)

**Status:** **COMPLETE / Live Tested**  
**Base:** `appn84sqPw03zEbTT`  
**Automation 059:** `wfltDo4HZxpYlbqn8` — deployed, enabled  
**Script:** **v3.8** (live paste matches GitHub)  
**Formula field:** `059 Lifecycle Trigger?` (`flduoz6oUJJ6SsFY6`) — valid  
**IDs:** redacted in narrative; disposable unlocks + XP Events deleted after soak.

---

## 1. Live formula attestation

| Check | Result |
|-------|--------|
| Field exists on Athlete Achievement Unlocks | **PASS** |
| Type / formatting | Formula → number, precision 0, `isValid: true` |
| Exact Boolean | Pending + Active **OR** (Awarded + inactive + Shot Milestone linked) → 1 else 0 |
| Live expression (field-ID form) | Matches approved checklist (XP Award Status / Active? / Shot Milestone) |
| Not `Ready for 059 XP?` | Confirmed — Ready formula still Pending + empty XP Events only |

## 2. Live 059 configuration

| Check | Result |
|-------|--------|
| Enabled / deployed | **PASS** (`deploymentStatus: deployed`, config valid) |
| Table | Athlete Achievement Unlocks |
| Trigger | `recordMatchesConditions` — **only** `059 Lifecycle Trigger?` = 1 |
| No Ready / XP-empty filter | **PASS** |
| `recordId` mapping | `$ref: trigger` → `path: ["id"]` |
| Script Version | **v3.8** (`CONFIG.version` + docblock) |
| Outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep` mapped; script also sets `lifecycleOut` (not listed in UI outputSchema — observable settle via Trigger Context + status) |

## 3. Disposable soak (Schmidt Athlete1 only)

| Case | Result |
|------|--------|
| Award (Pending+Active SM → XP) | **PASS** — one Shot Milestone XP; unlock Awarded; formula → 0 |
| Withdraw (clear Active?) | **PASS** — formula → 1; 059 runs; XP Active cleared; unlock Skipped; Trigger Context withdraw note; formula → 0 |
| Restore (Active? + Pending) | **PASS** — same XP reactivated; unlock Awarded; formula → 0 |
| Idempotency (re-arm Pending) | **PASS** — still one Source Key / one XP; formula → 0; no loop |
| Perfect Week (Pending+Active, SM empty) | **PASS** — 100 XP Perfect Week; Awarded; formula → 0 |
| Failure detectability | **PASS** — missing Enrollment → XP Award Status **Error** + Trigger Context error text; formula settles 0 |
| Reconcile filters | Formula=1 view empty after settle; Error status filter returns the probe row |

## 4. Cleanup

Deleted this run’s disposable Athlete Achievement Unlocks and XP Events (SM lifecycle, Perfect Week regression, Error probe). No stranded formula=1, Error unlock, duplicate Source Key, or orphan Active XP for SC-159 keys. Enrollments / Weeks / Achievements / Shot Milestone definitions untouched. 057 / 058 / 070a untouched. No Season Simulation. No email. No FUT-002 field trash.

## 5. Remaining gate (not SC-159)

FUT-002 Batch 2 quarantined field trash still requires the separate early/late asset-intake dependency review **in addition to** this SC-159 live close.

---

## Closure

| Gate | Status |
|------|--------|
| Formula live | **PASS** |
| 059 v3.8 + formula trigger | **PASS** |
| Withdraw / restore / idempotency / PW | **PASS** |
| Failure detectability | **PASS** |
| Cleanup | **PASS** |
| SC-159 | **COMPLETE / Live Tested** |
