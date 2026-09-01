# SC-147 — Recorded Zoom half-XP (design / repo prep)

**Status:** **Pending confirmation/design** — **NOT Live in Production**  
**Date:** 2026-09-01  
**Backlog:** SC-147 / MRW-H10  
**Production base:** `appn84sqPw03zEbTT`  
**Design brief:** [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md)

> **Important:** There is **no Production automation** for recorded Zoom half-XP today. The GitHub file `147-zoom-recording-credit-award-half-xp.js` uses **147** as a **placeholder filename only** — the correct Airtable automation number has **not** been established. **Do not paste, create, or enable an automation from this packet until Mike completes product/design sign-off and assigns a slot.**

---

## Current state

| Item | Status |
|------|--------|
| Product/design decision | **Pending** — half-XP amounts, exclusivity vs live **101**, Perfect Week interaction |
| Automation slot | **Not assigned** — placeholder repo path uses **147**; Mike must confirm or renumber before any paste |
| XP Reward Rules row | **`ZOOM_RECORDING`** rule row — confirm before implementation |
| GitHub script | Repo prep only — `airtable/automations/shooting-challenge/147-zoom-recording-credit-award-half-xp.js` (placeholder) |
| Offline tests | `lib/sc-147-zoom-recording-credit.test.js` — contract/helpers only |
| Production paste | **Do not paste** — no operator steps until slot + design approved |

---

## What SC-147 will add (when approved)

A dedicated **recording-credit XP writer** distinct from:

| Automation | Role | Must stay separate |
|------------|------|-------------------|
| **101** | Live Zoom attendance XP (`ZOOM_ATTEND_*` / `ZOOM_LIVE`) | Yes — live keys only |
| **117 v2.1** | Recording approval **email** (Email Handoff Queue) | Yes — **no XP writes** |
| **TBD slot** | Recording half-XP (`ZOOM_RECORDING_CREDIT\|{enrollmentId}\|{zoomMeetingId}`) | Future writer — slot not assigned |

**Policy (Mike 2026-08-27):** Recording credit counts toward level gates at **half live XP**; does **not** count toward Perfect Week; no duplicate with live 101 for same meeting+enrollment.

### Why not slot 117

| Slot | Role | Use for SC-147? |
|------|------|-----------------|
| **117 v2.1** | Recording approval **email** only | **No** — do not add XP logic |
| **118 / 119** | Weekly summary schedulers | **No** |
| **101** | Live attendance XP | **No** — separate writer |
| **TBD** | New recording-credit writer | **Future** — assign at implementation time |

See [`automation-index.md`](../automation-index.md) Zoom section.

---

## Mike decisions still open

1. Confirm half-XP amounts and gate behavior vs live **101**.
2. Confirm Perfect Week / recorded-only exclusion rules.
3. **Assign automation slot** (placeholder **147** in repo is not Production authority).
4. Add or confirm **XP Reward Rules** row **`Rule Key = ZOOM_RECORDING`**.
5. DEV disposable proof on Schmidt enrollment before Production enable.

**Do not** create or paste an automation until decisions 1–5 are recorded in an approved Phase 2 brief update.

---

## Repo artifacts (reference only — not Production)

| Artifact | Path |
|----------|------|
| Placeholder script (slot TBD) | `airtable/automations/shooting-challenge/147-zoom-recording-credit-award-half-xp.js` |
| Pure helpers + conflict matrix | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.js` |
| Offline contract tests | `airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js` |
| Superseded draft (historical) | `airtable/automations/shooting-challenge/drafts/sc-147-zoom-recording-half-xp.js` |
| Design brief | [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md) |

Run offline tests only:

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
node tools/testing/run-agent4-suite.js sc-147-zoom-recording-credit
```

---

## Historical note

Earlier versions of this packet described **Automation 147 v1.0** as paste-ready. That was **repo prep only**. As of **2026-09-01**, Mike has **not** assigned a Production automation slot and **has not** pasted a recorded Zoom half-XP writer. Treat prior "paste 147" instructions as **superseded**.

---

## Related (complete — do not confuse with SC-147)

| Item | Status |
|------|--------|
| **071 v4.3** Homework Feedback Hub handoff | **Production complete** (2026-09-01) — [`071-v4.3-homework-feedback-paste-packet.md`](./071-v4.3-homework-feedback-paste-packet.md) |
| **076 v8.12** Daily Submission Hub handoff | **Production complete** (2026-09-01) — [`076-v8.12-daily-submission-paste-packet.md`](./076-v8.12-daily-submission-paste-packet.md) |
| Paste queue index | [`EMAIL-PASTE-QUEUE-2026-09.md`](./EMAIL-PASTE-QUEUE-2026-09.md) — **071/076 empty** |
