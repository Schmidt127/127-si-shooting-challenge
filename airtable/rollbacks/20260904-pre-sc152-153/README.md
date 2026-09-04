# Rollback snapshot — pre SC-152 / SC-153 (2026-09-04)

Captured by Agent 1 (truth/analysis) before Agent 2 remediates Perfect Week lifecycle triggers.

| File | Contents |
|------|----------|
| `057-trigger.json` | Live Production trigger for automation `wflVRPhgunsosFjWS` |
| `058-trigger.json` | Live Production trigger for automation `wflDinFz6FBIGEOMg` |
| `057-live-script-body.js` | GitHub/live script body **v2.3** (matches live paste) |
| `058-live-script-body.js` | GitHub/live script body **v1.5** (matches live paste) |
| `was-formula-snapshot.json` | Live formulas for Queue? and Eligible? |

**Base:** Production `appn84sqPw03zEbTT`  
**Evidence:** Airtable MCP `get_automation` (`includeDeployedVersion: true`; `deployedVersion` null ⇒ draft == deployed)

Restore = re-paste script body + restore trigger conditions from these JSON dumps. Do not use this folder for secrets.
