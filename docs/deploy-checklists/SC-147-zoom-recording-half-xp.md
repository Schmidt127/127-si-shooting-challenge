# SC-147 — Recorded Zoom half-XP (design closeout)

**Status:** **Design confirmed — slot 121 assigned — DEV install ready — NOT Live in Production**  
**Date:** 2026-09-02  
**Backlog:** SC-147 / MRW-H10  
**Automation slot:** **121**  
**Operator packet:** [`121-v1.0-sc-147-operator-packet.md`](./121-v1.0-sc-147-operator-packet.md)  
**Production base:** `appn84sqPw03zEbTT`  
**Design brief:** [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md)

> **Do not paste to Production** until DEV disposable proof passes. Backlog ID remains **SC-147**; Production automation number is **121**.

---

## Current state

| Item | Status |
|------|--------|
| Product/design decision | **Confirmed** (Mike 2026-08-27) — half live XP; no Perfect Week; level gates yes |
| Automation slot | **121** assigned 2026-09-02 |
| XP Reward Rules row | **`ZOOM_RECORDING`** — Mike adds in Airtable UI before DEV install (optional; fallback floor(live/2)) |
| GitHub script | `airtable/automations/shooting-challenge/121-zoom-recording-credit-award-half-xp.js` v1.0 |
| Offline tests | **17/17 pass** — `lib/sc-147-zoom-recording-credit.test.js` |
| Production paste | **Do not paste** — use operator packet after DEV proof |

---

## Architecture (unchanged)

| Automation | Role | Must stay separate |
|------------|------|-------------------|
| **101** | Live Zoom attendance XP (`ZOOM_ATTEND_*` / `ZOOM_LIVE`) | Yes |
| **117 v2.1** | Recording approval **email** (Email Handoff Queue) | Yes — **no XP writes** |
| **121 v1.0** | Recording half-XP (`ZOOM_RECORDING_CREDIT\|{enrollmentId}\|{zoomMeetingId}`) | Future writer — DEV install next |

**Policy:** Recording credit counts toward level gates at **half live XP**; does **not** count toward Perfect Week; no duplicate with live 101 for same meeting+enrollment.

---

## Decisions closed (2026-09-02)

1. Half-XP = `floor(ZOOM_ATTEND_BASE / 2)` — **30 XP** when live base = **60**
2. Perfect Week exclusion confirmed — 057 reads live `Attendees` only
3. Slot **121** assigned (next after **120** FUT-009 rename)
4. `ZOOM_RECORDING` rule row — Mike UI before DEV install (recommended, not blocking fallback)
5. DEV disposable proof required before Production enable — see operator packet

---

## Repo artifacts

| Artifact | Path |
|----------|------|
| Production-ready script | `airtable/automations/shooting-challenge/121-zoom-recording-credit-award-half-xp.js` |
| Pure helpers + conflict matrix | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.js` |
| Offline contract tests | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js` |
| Post-FUT-030 live verify matrix | `tools/testing/post-fut030-verify-matrix.mjs` |
| Superseded draft (historical) | `airtable/automations/shooting-challenge/drafts/sc-147-zoom-recording-half-xp.js` |

Run offline tests:

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
node tools/testing/run-agent4-suite.js sc-147-zoom-recording-credit
```

---

## Historical note

Earlier versions used placeholder filename **147**. As of **2026-09-02**, official automation slot is **121**. Prior "pending design" status is superseded — Production paste remains blocked until DEV proof.
