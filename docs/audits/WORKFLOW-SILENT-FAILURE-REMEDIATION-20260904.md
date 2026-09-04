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

### SF-01 — P0 — Perfect Week 057 queues on a formula field

| | |
|--|--|
| **Workflow** | 057 Calculate Perfect Week Eligibility |
| **Silent miss** | Trigger is `Perfect Week Calculation Queue? = 1` (`fldNvOVO3WidABUXS`, **formula**). Eligible WAS rows can sit with Queue?=1 if Airtable does not re-fire on formula-only transitions, or if Status was left `Skipped` without a writable re-arm. |
| **Observable** | WAS with Queue?=1 and Automation Status not progressing; Automation Error blank |
| **Safe near-term** | Operator view: Queue?=1; Season Sim / disposable re-arm Status `Skipped`→`Pending` (already used in sim tooling) |
| **Separate implementation** | Prefer writable reconciliation checkbox (or ensure a watched writable field flips when queue becomes 1). Do **not** delete the formula. |
| **Owner** | Future PW reliability ticket (not this PR) |

### SF-02 — P0 — Perfect Week 058 positive-only trigger blocks withdrawal

| | |
|--|--|
| **Workflow** | 058 Create Perfect Week Unlock |
| **Silent miss** | Live UI requires `Perfect Week Eligible? = 1` **AND** Unlock empty **AND** Status = Ready. Script **v1.5** contains deactivation/restore logic for non-eligible cases, but those branches **cannot run** when eligibility drops or Unlock is already linked. |
| **Observable** | Unlock remains Active after eligibility loss; or Eligible=0 with Unlock still linked and no new 058 run |
| **Safe near-term** | Manual deactivate unlock + clear Automation Error; document in inventory |
| **Separate implementation** | Change trigger to lifecycle/update on Eligible?, Status, Unlock (per script RECOMMENDED TRIGGER) — **Mike UI change** or controlled paste packet. Aligns with existing 058 docblock warning. |
| **Owner** | Perfect Week lifecycle ticket |

### SF-03 — P1 — Duplicate Weekly Athlete Summary (Enrollment+Week)

| | |
|--|--|
| **Workflow** | 031 find/create WAS + downstream 032–035 / 057–059 / weekly email |
| **Silent miss** | Two WAS rows for same Enrollment+Week → homework/XP/PW/email attach to wrong row or fail closed |
| **Observable** | Group-by Enrollment+Week count > 1 |
| **Safe near-term** | Reconciliation view + Stage audits; do not auto-merge |
| **Separate implementation** | Hard uniqueness guard + operator merge playbook |

### SF-04 — P1 — Levels lag / stuck queue (041 cron)

| | |
|--|--|
| **Workflow** | 041 → 042 |
| **Silent miss** | Signature changes wait up to **15 minutes**; if 042 view filter excludes a row, Level Recalc Needed? stays checked forever |
| **Observable** | Needed?=1 older than 30 minutes |
| **Safe near-term** | Monitoring view; controlled 041 `recordId` proof |
| **Separate implementation** | Optional event-driven queue in addition to cron (capacity permitting) |

### SF-05 — P1 — 101 live version drift (Agent 1)

| | |
|--|--|
| **Workflow** | 101 Zoom Meeting XP |
| **Silent miss** | Live paste reads **v6.8**; GitHub tip **v6.7**. Operators may paste wrong body or assume SC-147 complete. |
| **Observable** | Script header Version mismatch |
| **Safe near-term** | **Do not paste from Agent 5.** Leave to Agent 1 / SC-147 |
| **Separate implementation** | SC-147 OMNI trigger review + intentional paste + disposable proof |

### SF-06 — P1 — 070a homework Make upload is Live/deployed

| | |
|--|--|
| **Workflow** | 070a |
| **Silent miss / risk** | Historical launch decision kept homework upload OFF; live UI shows **deployed**. Unintended Make traffic or missed uploads depending on operator expectation. |
| **Observable** | Automation 070a enabled; Send to Make Trigger on HW assets |
| **Safe near-term** | Mike confirm intentional ON/OFF in UI |
| **Separate implementation** | Align launch decision doc + UI |

### SF-07 — P2 — Video count automation 006 not deployed

| | |
|--|--|
| **Workflow** | 006 Set Video Count (repo only) |
| **Silent miss** | If Video Count is not formula-maintained, asset/video gates may use stale counts |
| **Observable** | Video Count ≠ attachment count |
| **Safe near-term** | Confirm whether Video Count is formula; if so, mark 006 retired in index |
| **Separate implementation** | Deploy 006 or document formula ownership |

### SF-08 — P2 — 059 positive Pending+Active trigger

| | |
|--|--|
| **Workflow** | 059 unlock→XP |
| **Silent miss** | Clearing Active? without returning XP Award Status to a watched state may leave orphan XP |
| **Observable** | Inactive unlock with active XP Event (or reverse) |
| **Safe near-term** | Stage B / Source Key audits |
| **Separate implementation** | Lifecycle trigger covering Active? and Award Status |

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
5. **006-DISPOSITION** — Deploy or retire (SF-07)
