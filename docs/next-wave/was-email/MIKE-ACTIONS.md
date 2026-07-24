# Agent 12 — Mike actions

1. **Decide empty-week email policy** (`send_normal` / `send_short` / `suppress`) — see `EMPTY-WEEK-EMAIL-DECISION.md`. Record on SC-035.
2. **Install 118/119 in PROD OFF** per `WEEKLY-EMAIL-PROD-INSTALL-RUNBOOK.md` (do not enable schedules yet).
3. **Schmidt-only Test-mode** dry-run → controlled write with `includeSchmidt=true`, `sendMode=Test`, never Live.
4. **Authorize Sunday schedules** only after Schmidt PASS + empty-week decision recorded.
5. **Stash cleanup:** after confirming v1.3 Summary Key note is correct, drop `agent5-118-wip-preserve`.
6. After two proven Sunday ensure runs, consider converting **101** WAS create to link-only (`WAS-CREATOR-OWNERSHIP.md`).
