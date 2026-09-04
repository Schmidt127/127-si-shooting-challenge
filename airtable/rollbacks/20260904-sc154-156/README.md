# Rollback snapshots — SC-154/155/156 wave 2026-09-04

Base: Production `appn84sqPw03zEbTT`  
Branch base SHA: `ec8070a7`  
Captured: 2026-09-04 (Agent 3)

| File | Live automationId | Live status | Live version (MCP) |
|------|-------------------|-------------|---------------------|
| `031-v4.1-pre-wave.js` | `wflKviSzqoWMnKNrE` | deployed | v4.1 |
| `032-pre-wave.js` | companion snapshot | — | repo |
| `041-v5.1-pre-wave.js` | `wflCRvaopntNPsc64` | deployed | v5.1 (cron 15m) |
| `042-4.1.2-pre-wave.js` | `wfl3aiiK8vI2tz0HA` | deployed | 4.1.2 |
| `070a-v4.7-pre-wave.js` | `wflIYVOmRRaHu9cl2` | deployed | v4.7 |

Restore: paste matching file body into Airtable (skip GitHub header) only if a live paste was applied and must be reverted.

070a graph note: live had Update-record clearing `Send to Make Trigger` after script — remove per `docs/deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md` (do not restore that step).
