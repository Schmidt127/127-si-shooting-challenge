# Recorded Zoom half-XP — design brief (proposed)

**Status:** Decision recorded (Mike 2026-08-27) — **implementation ID pending**  
**Proposed backlog ID:** **SC-147** (Recorded Zoom half-XP writer)  
**Do not paste live automation until this brief is approved and SC-147 is on the Master Future Work List.

## Policy (authoritative)

From [`127-SI-MASTER-FUTURE-WORK-LIST.md`](../127-SI-MASTER-FUTURE-WORK-LIST.md) § Mike-approved decisions 2026-08-27:

- Recorded Zoom meetings **do not** count toward Perfect Week.
- They **do** count toward level-gate advancement.
- They earn **one-half** of normal live-attendance XP.
- Live attendance and recorded-meeting credit must stay distinct (no duplicate credit for the same meeting).

## Current production state

| Component | Role today |
|-----------|------------|
| **101** | Live Zoom attendance XP (`ZOOM_ATTEND_*` / live path) |
| **117 v2.1** | Recording **approval email** only (Hub handoff) — **not XP** |
| **057 / WAS formulas** | Perfect Week Zoom requirement — live attendance semantics |
| Stage 17 orchestrator / 117c | **Design alternatives only** — not live |

**Gap:** No live automation awards half-XP for approved recording credit distinct from live 101.

## Proposed contract

| Item | Proposal |
|------|----------|
| **Writer** | New automation slot **or** extend approved recording-credit path (not email 117) |
| **Source Key** | `ZOOM_RECORDING_CREDIT\|{enrollmentId}\|{zoomMeetingId}` (registry alignment TBD with Agent 9) |
| **XP amount** | `floor(liveRuleAmount / 2)` from XP Reward Rules row `ZOOM_RECORDING` (or config-driven half multiplier) |
| **Trigger** | Zoom Attendance / Recording approval satisfied + Conflict rollup = 0 + not already live-credited |
| **Exclusions** | Never write `Zoom Meetings.Attendees`; never double with 101 for same meeting |
| **Perfect Week** | Recording credit must **not** increment PW Zoom attendance counts |

## Dependencies

- SC-022: XP Reward Rules row for recording half-XP amount
- SC-087: Live-vs-recording exclusivity re-proof after writer exists
- SC-074 / SC-086: Resolve dedicated recording-credit automation vs email-only 117

## Acceptance criteria (future implementation)

1. Approved recording on disposable enrollment creates exactly one half-XP event with canonical Source Key.
2. Same meeting with live 101 credit does not allow recording credit (Conflict=1).
3. Perfect Week WAS formulas unchanged for recording-only weeks.
4. Replay idempotent — no duplicate XP on automation re-run.

## Mike actions before implementation

1. Approve **SC-147** on Master Future Work List.
2. Confirm XP Reward Rules row for recorded credit (amount + Rule Key).
3. Choose automation slot (new number vs resurrect Stage 17 writer) — **do not** overload 117 email.

## Recommended next agent

**Implementation worker** — bounded slice: XP Reward Rules contract test + automation script draft + offline 101/117 conflict matrix — after SC-147 is listed and Mike picks the automation slot.
