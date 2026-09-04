# Rollback snapshots — SC-154/155/156 wave 2026-09-04

Base: Production `appn84sqPw03zEbTT`  
Branch base SHA: `c3eab438` (A1 live-truth refresh 2026-09-04)  
Captured: 2026-09-04

| File | Live automationId | Live status | Live version (MCP) |
|------|-------------------|-------------|---------------------|
| `031-v4.1-pre-wave.js` | `wflKviSzqoWMnKNrE` | deployed | v4.1 |
| `032-pre-wave.js` | companion snapshot | — | repo |
| `041-v5.1-pre-wave.js` | `wflCRvaopntNPsc64` | deployed | v5.1 (cron 15m) |
| `042-4.1.2-pre-wave.js` | `wfl3aiiK8vI2tz0HA` | deployed | 4.1.2 |
| `070a-v4.7-pre-wave.js` | `wflIYVOmRRaHu9cl2` | deployed | v4.7 |
| `070a-get-automation-live-snapshot-20260904.json` | `wflIYVOmRRaHu9cl2` | deployed | Full MCP graph (webhook redacted) |
| `070a-graph-action-order-20260904.json` | `wflIYVOmRRaHu9cl2` | deployed | Trigger + action order lean map |

## 070a / SC-156

Live truth + change contract: `docs/audits/SC-156-070A-LIVE-TRUTH-AND-CHANGE-CONTRACT-20260904.md`  
Publish checklist: `docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md`

**Live defect (pre-fix):** Update-record node `wacpcvzcDB1KKjaKI` clears `Send to Make Trigger` (`fld8C43NVQQ1NeQ7Z`) after script → soft failures not retryable.

**SC-156 fix:** Remove that Update node; keep script `wacZVMXuabTetYmQ7` v4.7 + inputs unchanged. Do **not** restore the Update step after publish.

**Script restore:** paste `070a-v4.7-pre-wave.js` into Airtable (skip GitHub header) only if a live paste was applied and must be reverted.

**Graph restore:** use lean/full JSON snapshots only if intentionally reverting SC-156 (not recommended).

Webhook URLs are redacted as `[REDACTED_MAKE_WEBHOOK_URL]` — re-bind from Airtable UI / password manager if rebuilding from JSON.
