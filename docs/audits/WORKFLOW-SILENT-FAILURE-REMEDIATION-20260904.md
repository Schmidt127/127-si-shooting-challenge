# Workflow silent-failure remediation — 2026-09-04

**Companion inventory:** [`WORKFLOW-RELIABILITY-INVENTORY-20260904.md`](./WORKFLOW-RELIABILITY-INVENTORY-20260904.md)  
**Live attestation:** [`SC-057-058-LIVE-ATTESTATION-20260904.md`](./SC-057-058-LIVE-ATTESTATION-20260904.md)  
**Scope:** Ranked defects needing **separate** implementation. This pass documents risks and safe operator reconciliation only — no broad redesign, no Automation 101 paste, no field deletion.

## Corrected in this pass (docs / attestation only)

| ID | Correction |
|----|------------|
| DOC-01 | Live UI trigger inventory for all **50** deployed automations (MCP) |
| DOC-02 | Confirmed **112 / 043 / 063 / 068 / 075 / 077 / 111 absent** — no duplicate VF/level/gate writers live |
| DOC-03 | Corrected stale **041** narrative: live trigger is **cron every 15 minutes**, not XP Events record trigger |
| DOC-04 | Attested live script versions for **010 / 041 / 057 / 058 / 059 / 065**; noted **101** live **v6.8** vs GitHub **v6.7** without touching 101 |
| DOC-05 | Documented operator reconciliation cheat-sheet in inventory |
| DOC-06 | Narrow offline contract test for retired-slot absence + 058 positive-only trigger warning |

## Ranked remaining risks (deferred implementation)

### SF-01 — P0 — Perfect Week 057 queues on a formula field — **CLOSED (SC-152 Live Tested 2026-09-04)**

Live 057 **v2.4** + Queue formula (Pending OR Recalc). Recalc re-entry attested. Evidence [`SC-152-153-LIVE-VERIFICATION-20260904.md`](./SC-152-153-LIVE-VERIFICATION-20260904.md).

### SF-02 — P0 — Perfect Week 058 positive-only trigger blocks withdrawal — **CLOSED (SC-153 Live Tested 2026-09-04)**

Lifecycle trigger + nine watched fields live. Live **058 v1.7** withdraw/restore/idempotency PASS. Evidence [`SC-153-058-V17-LIVE-VERIFICATION-20260904.md`](./SC-153-058-V17-LIVE-VERIFICATION-20260904.md).

### SF-03 — P1 — Duplicate Weekly Athlete Summary — **CLOSED / DISPROVEN (SC-154)**

See [`SC-154-WAS-DUPLICATE-RESULT-20260904.md`](./SC-154-WAS-DUPLICATE-RESULT-20260904.md).

### SF-04 — P1 — Levels lag — **CLOSED / EXPECTED ASYNC (SC-155)**

See [`SC-155-LEVEL-LAG-RESULT-20260904.md`](./SC-155-LEVEL-LAG-RESULT-20260904.md).

### SF-05 — P1 — 101 version drift — **CLOSED (SC-147)**

### SF-06 — P1 — 070a enabled-state — **CLOSED (SC-156 Live Tested 2026-09-04)**

Live **ON** v4.7; obsolete post-script Update removed + published; skip/idempotency PASS. Evidence [`SC-156-070A-LIVE-CLOSEOUT-20260904.md`](./SC-156-070A-LIVE-CLOSEOUT-20260904.md).

### SF-07 — P2 — Video count automation 006 not deployed — **CLOSED (SC-158 Live Tested 2026-09-04)**

| | |
|--|--|
| **Workflow** | 006 Set Video Count (repo only) |
| **Disposition** | **RETIRE 006** — do not deploy. `Video Count` is writable number (not formula); no live automation owns it. |
| **Authoritative owners** | `Has Video?` formula on `Video Upload` (presence); **057** → `Perfect Week Video Count` from Video Feedback (week gate) |
| **Observable** | `Video Count` ≠ attachment length (stranded/stale detectable) |
| **Evidence** | [`SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md`](./SF-07-VIDEO-COUNT-CLOSEOUT-20260904.md) |

### SF-08 — P2 — 059 positive Pending+Active trigger

| | |
|--|--|
| **Workflow** | 059 unlock→XP |
| **Silent miss** | Clearing Active? without returning XP Award Status to a watched state may leave orphan XP |
| **Observable** | Inactive unlock with active XP Event (or reverse) |
| **Safe near-term** | Stage B / Source Key audits |
| **Separate implementation** | Lifecycle trigger covering Active? and Award Status |
| **2026-09-04 Agent 3** | Silent miss **proven**; GitHub **059 v3.8** |
| **2026-09-04 live close** | **SC-159 COMPLETE / Live Tested** — formula `059 Lifecycle Trigger?` + v3.8; withdraw/restore/idempotency/PW PASS. Evidence [`SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](./SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md) · checklist [`../deploy-checklists/059-sc159-lifecycle-formula-trigger.md`](../deploy-checklists/059-sc159-lifecycle-formula-trigger.md) (nested OR checklist superseded) |

### SF-09 — P2 — Automations operator table Code empty

| | |
|--|--|
| **Workflow** | SC-058 operator hygiene |
| **Silent miss** | Mike/agents reading empty Code column think versions are unknown while UI is live |
| **Observable** | MCP Name/Status/Code empty 2026-09-04 |
| **Safe near-term** | Prefer MCP `get_automation` script Version / GitHub SCRIPT |
| **Separate implementation** | Optional refresh of operator table from live UI (Mike) — not required for SC-058 close if live MCP attestation accepted |

### SF-10 — P2 — Email Hub queue stuck Ready/Error

| | |
|--|--|
| **Workflow** | 079 + producers |
| **Silent miss** | Eligible handoffs never leave Ready; parents get no email |
| **Observable** | Email Handoff Queue Status Ready/Error older than N hours |
| **Safe near-term** | Hub allowlist + Status view; re-set Ready |
| **Separate implementation** | RCC / alerting (SC-147 related visibility) |

## Deferred (explicit non-goals this pass)

- Season Simulation execute
- Airtable field deletion
- Redesign of all workflows
- Automation **101** production paste (Agent 1)
- Web SEO / SC-148 UI

## Suggested next tickets (for Master Future Work List if not already covered)

1. **PW-LIFECYCLE** — Fix 057/058 triggers for formula queue + withdrawal (SF-01, SF-02)
2. **WAS-UNIQUENESS** — Duplicate WAS detection + merge SOP (SF-03)
3. **SC-147** — Resolve 101 v6.8/v6.7 + OMNI trigger (SF-05) — existing
4. **070a-LAUNCH** — Confirm ON/OFF (SF-06)
5. ~~**006-DISPOSITION** — Deploy or retire (SF-07)~~ **CLOSED SC-158** — retired 006; presence/`057` own gates
