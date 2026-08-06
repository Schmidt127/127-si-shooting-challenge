# Automation inventory audit — 2026-08-05 Agent 4

Base: `appn84sqPw03zEbTT` · Operator table: `tblfpqKqPEbkPnN8E` · Rows: **48**

## Finding counts

- P0: 1
- P1: 34
- INFO: 0

## P0 findings

- **112_OPERATOR_TABLE_SHOWS_LIVE** (112): 112 must remain OFF (OW-D1). Operator table shows Live — Mike must confirm Automations UI is OFF (operator table may lag)

## Email / weekly chain (operator table)

| Slot | In table | Status | Live ver | Repo ver | Match |
|------|----------|--------|----------|----------|-------|
| 071 | yes | Live | v2.0 | v3.5 | false |
| 072 | yes | Live | v3.6 | v4.0 | false |
| 073 | yes | Live | v3.0 | v3.2 | false |
| 074 | yes | Live | v2.0 | v2.1 | false |
| 075 | yes | Live | v3.0 | v3.0 | true |
| 117 | NO | — | — | v1.1 | — |
| 118 | NO | — | — | v1.6 | — |
| 119 | NO | — | — | v1.6 | — |

## Caveat

The Automations operator table stores a documentation copy of script bodies/status. It is NOT the live Airtable Automations UI and may lag pastes/deletes (e.g. 071 operator header v2.0 vs attested PROD paste v3.5). Use it for drift triage only. UI attestation remains mandatory before Complete on SC-058/SC-059. Version-match against this table is a weak signal.
