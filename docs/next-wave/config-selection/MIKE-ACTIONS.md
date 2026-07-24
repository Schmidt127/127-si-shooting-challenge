# Mike Actions — Year-Aware Config Selection (Agent 10)

2026-07-24 · No Config records were deleted or modified by this agent.

## Do now

1. **Do not collapse Config rows.** Keep all four year records (2025–2026 … 2028–2029).
2. **Ignore** overnight guidance that says to archive/delete three Config rows to fix ambiguity — that advice is superseded for this topic (`MASTER-UPDATE-PROPOSAL.md`).
3. Confirm Enrollment `School Year` and Program Instance `School Year - Linked` use the same `YYYY-YYYY` (or en-dash) forms as Config `Active School Year`.

## Do before any PROD automation paste

4. Review `CONFIG-SELECTION-CONTRACT.md` and `CONFIG-ROLLOUT-RUNBOOK.md`.
5. Authorize Phase 1 dry-run logging on one DEV automation (prefer tools first — no paste).
6. For Zoom: spot-check that meetings’ **Global Config** / **Program Config** links point at the Config row whose `Active School Year` matches the meeting’s season (OMNI).

## Optional later

7. Authorize DEV test of proposed 042 guard (`proposals/042-year-aware-zoom-gate-guard.PROPOSED.js`) — **no PROD paste until dry-run passes**.
8. Decide whether Perfect Week video minimum stays hardcoded `3` or moves to a new Config field (still year-resolved).
9. When opening 2026–2027+ seasons for recording credit, **copy Stage 17 flags onto that year’s Config row** deliberately — do not rely on the 2025–2026-only populated row.

## Do not

- Paste PROD automations from this wave (none shipped for paste).
- Delete Config records.
- Re-enable superseded 117a/117b first-record Config reads.
