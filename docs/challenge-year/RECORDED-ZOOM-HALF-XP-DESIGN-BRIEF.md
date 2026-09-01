# Recorded Zoom half-XP — design brief (proposed)

**Status:** Decision recorded (Mike 2026-08-27) — **production-ready script shipped (2026-09-01)** — automation slot + XP Reward Rule row + DEV paste still Mike decisions  
**Backlog ID:** **SC-147** (Recorded Zoom half-XP writer) · **MRW-H10**  
**Do not paste live automation until Mike picks slot, confirms `ZOOM_RECORDING` rule row, and approves DEV install.

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

## Repo artifacts shipped

| Artifact | Path |
|----------|------|
| Pure helpers + conflict matrix | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.js` |
| Offline contract tests | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js` |
| **Production-ready automation script (placeholder filename 147 — slot TBD)** | `airtable/automations/shooting-challenge/147-zoom-recording-credit-award-half-xp.js` |
| Design checklist (not a paste packet) | `docs/deploy-checklists/SC-147-zoom-recording-half-xp.md` |
| Superseded draft (historical) | `airtable/automations/shooting-challenge/drafts/sc-147-zoom-recording-half-xp.js` |
| Agent 4 suite wiring | `tools/testing/run-agent4-suite.js` → `sc-147-zoom-recording-credit` |

**Test coverage (offline):**

- Live **101** credit (`ZOOM_ATTEND_BASE` / `ZOOM_LIVE`) blocks recording credit for same meeting+enrollment
- Source Key idempotency: `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}`
- Half-XP: `floor(live/2)` or explicit **XP Reward Rules** row `ZOOM_RECORDING` when present
- **117** email script scope boundary — no XP Event writes, no Attendees writes
- Perfect Week contract — recording-only credit must not increment PW Zoom counts (Mike 2026-08-27 policy)

**Run tests:**

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
# or
node tools/testing/run-agent4-suite.js
```

## Open Mike decisions

1. **Automation slot** — new number vs resurrect Stage 17 writer; placeholder `XXX` in draft; **do not** overload **117** email.
2. **XP Reward Rules row** — confirm Rule Key `ZOOM_RECORDING` and half-XP amount (SC-022 alignment); fallback is `floor(ZOOM_ATTEND_BASE / 2)`.
3. **Source Key registry** — enrollment-first `ZOOM_RECORDING_CREDIT|*` vs legacy S16 `ZOOM_RECORDING|*` (meeting-first); Agent 9 registry update after slot decision.
4. **DEV install + disposable proof** — after slot + rule row confirmed; re-prove SC-087 Conflict=1 with live writer.

## Recommended next agent

**Implementation worker (post-Mike)** — DEV install of chosen slot, disposable enrollment proof, SC-087 re-proof, registry update — after Mike confirms slot + `ZOOM_RECORDING` rule row.
