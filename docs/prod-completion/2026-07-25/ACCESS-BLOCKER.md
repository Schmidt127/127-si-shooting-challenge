# PROD Airtable API access blocker — 2026-07-25

**Package impact:** Blocks live Schmidt record create/edit/delete, automation log inspection via API, schema export, and XP/Homework/Zoom/Level live proofs in this cloud agent environment.

## Facts

| Item | Value |
|------|-------|
| Local `AIRTABLE_API_TOKEN` | **Missing** |
| Local `AIRTABLE_BASE_ID` | **Missing** |
| `tools/airtable/.env` | **Missing** |
| `web/.env.local` | **Missing** |
| Vercel MCP | **needsAuth** (interactive auth not available in cloud agent) |
| Vercel CLI auth | **Not logged in** |
| Public `/shoot/api/airtable` | **PASS** — Vercel production token is valid for PROD base |

## Exact next actions (Mike)

1. Add a scoped PAT to the Cursor Cloud environment **Shooting Challenge - Current** (`e1ed945b-804d-11f1-ba66-0e7d0216e441`):
   - `AIRTABLE_API_TOKEN` — `data.records:read` + `data.records:write` on base `appn84sqPw03zEbTT` (and `schema.bases:read` if schema export needed)
   - `AIRTABLE_BASE_ID=appn84sqPw03zEbTT`
2. Optionally authenticate Vercel MCP in Cursor desktop so agents can `vercel env pull` for read-only verification.
3. Re-run this completion agent (or continue on a token-enabled environment) to execute Schmidt live packages:
   - SC-013 Option B quiz → HC → coach review → 064/065 XP
   - SC-027 / SC-076 milestone 066 v3.3 natural run
   - SC-029 / SC-075 streak 054 v5.6 supervised 3-day
   - SC-077 / SC-028 Perfect Week after 057 v1.4 paste
   - SC-079 / SC-080 level gate block/clear

## What this agent can still complete without the token

- Repository script/docs packages
- Offline contract tests
- Public `/shoot` smoke against live Vercel
- Exact install/paste/runbooks for Mike/OMNI
- Completion master honesty updates (do not claim Live Tested without record evidence)
