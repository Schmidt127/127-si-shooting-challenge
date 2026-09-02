# Recorded Zoom half-XP — design brief

**Status:** Decision recorded (Mike 2026-08-27) — **implemented in Automation 101 v6.7 (GitHub)** — **NOT Live until disposable proof**  
**Backlog ID:** **SC-147** (Recorded Zoom half-XP writer) · **MRW-H10**  
**Do not paste to Production until DEV disposable proof passes.**

## Policy (authoritative)

From [`127-SI-MASTER-FUTURE-WORK-LIST.md`](../127-SI-MASTER-FUTURE-WORK-LIST.md) § Mike-approved decisions 2026-08-27:

- Recorded Zoom meetings **do not** count toward Perfect Week.
- They **do** count toward level-gate advancement.
- They earn **one-half** of normal live-attendance XP.
- Live attendance and recorded-meeting credit must stay distinct (no duplicate credit for the same meeting).

## Production architecture (2026-09-02)

| Component | Role |
|-----------|------|
| **101 v6.7** | Live Zoom XP + SC-147 recording half-XP phase (same reconciliation pass) |
| **117 v2.1** | Recording **approval email** only (Email Handoff Queue) — **not XP** |
| **057 / WAS formulas** | Perfect Week Zoom requirement — live attendance semantics |
| Slot **121** | **Not used** — capacity full; design artifact in `drafts/` only |

## Contract

| Item | Value |
|------|-------|
| **Writer** | **Automation 101** (extended v6.7) |
| **Source Key** | `ZOOM_RECORDING_CREDIT\|{enrollmentId}\|{zoomMeetingId}` |
| **XP amount** | `ZOOM_RECORDING` rule row when present; else `floor(ZOOM_ATTEND_BASE / 2)` |
| **Trigger** | Meeting reconciliation (`Zoom XP Reconciliation Needed? = 1`); recording rows scanned in same pass |
| **Exclusions** | Never write `Zoom Meetings.Attendees`; never double with live 101 for same meeting |
| **Perfect Week** | Recording credit must **not** increment PW Zoom attendance counts |

## Repo artifacts

| Artifact | Path |
|----------|------|
| Production-ready script (101 extension) | `airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.js` v6.7 |
| Pure helpers + conflict matrix | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.js` |
| Offline contract tests | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js` |
| DEV operator packet | `docs/deploy-checklists/101-v6.7-sc-147-operator-packet.md` |
| Superseded slot-121 design artifact | `airtable/automations/shooting-challenge/drafts/sc-147-slot-121-design-artifact-not-production.js` |

**Run tests:**

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
```

## Decisions closed (2026-09-02)

1. **Automation slot** — extend **101** (no slot 121 — capacity full).
2. **XP Reward Rules row** — recommend Rule Key `ZOOM_RECORDING` amount **30**; fallback `floor(ZOOM_ATTEND_BASE / 2)`.
3. **Source Key** — enrollment-first `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}`.
4. **DEV install + disposable proof** — [`101-v6.7-sc-147-operator-packet.md`](../deploy-checklists/101-v6.7-sc-147-operator-packet.md); re-prove SC-087 after paste.

## Mike actions before Production paste

1. DEV disposable proof per operator packet
2. Optional **`ZOOM_RECORDING`** XP Reward Rules row
3. Confirm `Zoom XP Reconciliation Needed?` includes pending recording credits (OMNI)
4. Paste **101 v6.7** to DEV, then Production after approval
