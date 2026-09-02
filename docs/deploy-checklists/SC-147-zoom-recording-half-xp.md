# SC-147 — Recorded Zoom half-XP (101 extension)

**Status:** **Design confirmed — implemented in Automation 101 v6.7 (GitHub) — NOT pasted to Production yet**  
**Date:** 2026-09-02  
**Backlog:** SC-147 / MRW-H10  
**Production automation:** **101** (extended) — **no new slot**  
**Operator packet:** [`101-v6.7-sc-147-operator-packet.md`](./101-v6.7-sc-147-operator-packet.md)  
**Production base:** `appn84sqPw03zEbTT`  
**Design brief:** [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md)

> **No DEV base.** DEV base retired **2026-08-19** — all work is **Production-only** with disposable test data. **Do not paste** until disposable Production proof passes. Automation capacity is full — slot **121 is not used**.

---

## Current state

| Item | Status |
|------|--------|
| Product/design decision | **Confirmed** (Mike 2026-08-27) — half live XP; no Perfect Week; level gates yes |
| Automation slot | **101 extended** (v6.7) — no slot 121 |
| XP Reward Rules row | **`ZOOM_RECORDING`** — Mike adds in Production Airtable UI before paste (optional; fallback floor(live/2)) |
| GitHub script | `airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.js` **v6.7** |
| Offline tests | **24/24 pass** — `lib/sc-147-zoom-recording-credit.test.js` |
| Production paste | **Pending** — use operator packet after disposable Production proof |
| PR | [#338](https://github.com/Schmidt127/127-si-shooting-challenge/pull/338) — CI green |

---

## Architecture

| Automation | Role | SC-147 |
|------------|------|--------|
| **101 v6.7** | Live Zoom XP + **recording half-XP phase** in same meeting reconciliation | **Canonical writer for both paths** |
| **117 v2.1** | Recording approval **email** (Email Handoff Queue) | **Email only — no XP writes** |
| **121** | ~~Standalone recording writer~~ | **Retired design artifact** — `drafts/sc-147-slot-121-design-artifact-not-production.js` |

**Policy:** Recording credit counts toward level gates at **half live XP**; does **not** count toward Perfect Week; no duplicate with live 101 for same meeting+enrollment.

**Source Key:** `ZOOM_RECORDING_CREDIT|{enrollmentId}|{zoomMeetingId}`

**Half XP:** `ZOOM_RECORDING` rule row when present; else `floor(ZOOM_ATTEND_BASE / 2)`.

---

## Trigger support (live + recorded)

| Path | How 101 runs |
|------|----------------|
| **Live** | Existing: `Zoom Meetings` when `Zoom XP Reconciliation Needed? = 1` |
| **Recorded** | Same meeting reconciliation pass scans linked `Zoom Attendance` rows after live awards |

**Mike / OMNI action:** Ensure `Zoom XP Reconciliation Needed?` flips to `1` when an approved recording credit is pending (e.g. formula includes recording-quiz-satisfied rows without live Attendees). Without this, recording awards wait until the next meeting-level reconciliation trigger.

---

## Exclusivity

| Guard | Mechanism |
|-------|-----------|
| Duplicate recording | Source Key idempotency + recheck before create |
| Live + recorded same meeting | Live Attendees roster skip; live XP blocks recording; live path deactivates prior recording credit |
| Conflict rollup | `Zoom Credit Conflict? = 1` skips recording award |
| Unapproved recording | `Recording Quiz Satisfactory?` must be checked |

---

## Repo artifacts

| Artifact | Path |
|----------|------|
| Production-ready script (101 extension) | `airtable/automations/shooting-challenge/101-zoom-attendance-xp-award-meeting-xp.js` v6.7 |
| Pure helpers + conflict matrix | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.js` |
| Offline contract tests | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js` |
| Superseded slot-121 design artifact | `airtable/automations/shooting-challenge/drafts/sc-147-slot-121-design-artifact-not-production.js` |

Run offline tests:

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
node tools/testing/run-agent4-suite.js sc-147-zoom-recording-credit
```

---

## Mike actions (Production-only)

1. Disposable **Production** proof per [`101-v6.7-sc-147-operator-packet.md`](./101-v6.7-sc-147-operator-packet.md)
2. Optional: add **`ZOOM_RECORDING`** XP Reward Rules row (recommended amount **30** when live base = **60**)
3. Confirm / update `Zoom XP Reconciliation Needed?` formula to include pending recording credits (OMNI)
4. Paste **101 v6.7** to **Production** Automation 101 after proof + approval
5. **Do not** create Automation 121 — capacity is full
