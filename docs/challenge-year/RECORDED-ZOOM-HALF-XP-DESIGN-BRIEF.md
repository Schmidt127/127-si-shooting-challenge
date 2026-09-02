# Recorded Zoom half-XP — design brief

**Status:** Implemented in Automation **101 v6.7** (GitHub merged PR #338) — **Production paste pending Mike**  
**Backlog ID:** SC-147 / MRW-H10  
**Environment:** **Production-only** — no DEV base (retired 2026-08-19)

## Policy (authoritative)

Mike 2026-08-27:

- Recorded Zoom **does not** count toward Perfect Week
- Recorded Zoom **does** count toward level-gate advancement
- Recorded earns **half** live XP
- Live and recorded must stay distinct (no duplicate credit per meeting)
- **117** email-only; **121** not created

## Architecture

| Component | Role |
|-----------|------|
| **101 v6.7** | Live + recording half-XP writer |
| **117 v2.1** | Email only |
| **121** | Design artifact only |

**Source Key:** `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}`

## Reconciliation trigger gap

OMNI must apply reconciliation trigger formula fix before paste. See [`SC-147-reconciliation-trigger-formula-fix.md`](../deploy-checklists/SC-147-reconciliation-trigger-formula-fix.md).

## Repo artifacts

| Artifact | Path |
|----------|------|
| Script | `101-zoom-attendance-xp-award-meeting-xp.js` v6.7 |
| Tests | `lib/sc-147-zoom-recording-credit.test.js` (24 pass) |
| Operator packet | `docs/deploy-checklists/101-v6.7-sc-147-operator-packet.md` |
| OMNI review | `docs/deploy-checklists/SC-147-omni-reconciliation-trigger-review.md` |

## Mike actions

1. OMNI reconciliation trigger review
2. Disposable Production proof
3. Optional `ZOOM_RECORDING` rule row
4. Paste 101 v6.7 to Production
5. Re-prove SC-087

**Not Production-complete until paste + proof pass.**
