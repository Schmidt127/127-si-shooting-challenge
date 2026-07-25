# Repository vs Production — Discrepancy Table

**Date:** 2026-07-24 · Agent 5 · Base PROD `appn84sqPw03zEbTT`

| Topic | Repository claim | Production evidence | Correct current state | Required repo update | Required prod update | Owner | Pri | Verify |
|-------|------------------|---------------------|-----------------------|----------------------|----------------------|-------|-----|--------|
| Weekly email flow | 118→072→119→074→Make Bulk Email May 18 | E2E + Live writeback | Matches | None | None | — | — | WAS + Make history |
| 074 sendMode | Must be Live | Was Test; corrected Live | **Live** | Done | Confirm still Live | Mike | P0 | 074 inputs |
| Make sender | Bulk Email May 18 | Same | Matches | None | Keep ON | Mike | P0 | Make UI |
| Live writeback | Make owns Sent?/status/timestamp | PASS | Matches | None | Keep Live branch | Mike | P0 | WAS row |
| 118/119 schedules | Go-live docs: **ON** | Assignment + go-live | **ON** | Agent 5 purged stale OFF | Keep ON | Mike | P0 | Schedule toggles |
| dryRun on 118/119 | Defaults true in scripts | Unknown live values | **needs_ui_attest** | — | Record values | Mike | P0 | Inputs |
| 072 empty-week | v4.0 send_short | Schmidt short Check-In | Matches | None | Keep policy input | — | — | actionOut |
| 020 version | v3.0.0 | Inventory 07-23 said v2.3 | Prefer v3.0.0 | Inventory stale | Attest header | Mike | P1 | UI header |
| 054/066 | Installed v5.6/v3.3 | Install claimed | Installed ≠ Live Tested | Keep honest | Schmidt proofs | Mike | P1 | Live unlocks |
| 063/111 | Deleted/OFF attest | Inventory Live | Prefer deleted/OFF | Banner exists | Attest | Mike | P1 | Automations list |
| 112 | Must OFF | Mixed history | Must OFF | Hard rule | Confirm OFF | Mike | P0 | UI |
| 117 vs 117c | XOR | Conflicting roles | needs_ui_attest | Keep XOR | Attest | Mike | P0 | UI + XP |
| Weekly Threshold XP | Writer missing | No mint script | Writer missing | Keep gap | Decide | Mike | P1 | OMNI + repo |
| Week Key | Agent 2: RECORD_ID() | Schema snapshot | RID is Week Key | Done in data-model | None | — | P1 | Schema |
| WAS dual timestamps | Agent 2 Unknown Summary* | Live Sent path verified | Make owns Live Sent path | Attest Make fields | Attest | Mike | P1 | Make modules |
| Agent 4 readiness | Was “schedules OFF” | Schedules ON | Superseded | Fixed in Agent 5 | None | Agent 5 | P2 | Doc |
| MIKE-ACTIONS-NEXT | Was “schedules OFF” | Schedules ON | Superseded | Rewritten | None | Agent 5 | P2 | Doc |
| Web “production commit” | bd2c2b4 label | Repo tip newer | Label is last web merge | Optional clarify | Confirm Vercel SHA | Mike | P3 | Vercel |
| Team Shot Tracker alerts | Out of scope | Must not exist | Excluded | Do not add | Do not add | All | — | Spot check |

## Resolved this session

- Schedule ON is current production truth (not OFF).  
- Agent 4 / MIKE-ACTIONS-NEXT stale OFF wording corrected.  
- Agent 4 QC suite integrated onto master line.  
- Week Key formula vs ops string documented (Agent 2).

## Unresolved

- 118/119 dryRun/includeSchmidt live values  
- 117 XOR 117c / Zoom XP writer identity  
- Full version attestation  
- Weekly Threshold XP product decision  
- Make writeback exact field list vs Summary* timestamps  
