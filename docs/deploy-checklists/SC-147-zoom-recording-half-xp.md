# SC-147 — Recorded Zoom half-XP promotion checklist

**Status:** Ready for Mike review — **NOT Live**  
**Backlog:** SC-147 / MRW-H10  
**Production base:** `appn84sqPw03zEbTT` — **do not execute until Mike approves**  
**GitHub script:** `airtable/automations/shooting-challenge/147-zoom-recording-credit-award-half-xp.js` (v1.0)  
**Design brief:** [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md)

**Rule:** Production changes are not official until Mike completes DEV proof and this checklist. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## What this adds

A dedicated **recording-credit XP writer** distinct from:

| Automation | Role | Must stay separate |
|------------|------|-------------------|
| **101** | Live Zoom attendance XP (`ZOOM_ATTEND_*` / `ZOOM_LIVE`) | Yes — live keys only |
| **117 v2.1** | Recording approval **email** (Email Handoff Queue) | Yes — **no XP writes** |
| **147 (slot TBD)** | Recording half-XP (`ZOOM_RECORDING_CREDIT\|{enrollmentId}\|{zoomMeetingId}`) | New writer |

**Policy (Mike 2026-08-27):** Recording credit counts toward level gates at **half live XP**; does **not** count toward Perfect Week; no duplicate with live 101 for same meeting+enrollment.

---

## Mike decisions still open

| # | Decision | Options / notes | Done |
|---|----------|-----------------|------|
| 1 | **Automation slot number** | Placeholder **147** in GitHub filename; confirm or renumber before Airtable paste | [ ] |
| 2 | **XP Reward Rules row** | Rule Key `ZOOM_RECORDING` + half-XP amount (SC-022 alignment); fallback = `floor(ZOOM_ATTEND_BASE / 2)` | [ ] |
| 3 | **Source Key registry** | Enrollment-first `ZOOM_RECORDING_CREDIT\|*` vs legacy S16 `ZOOM_RECORDING\|*` — Agent 9 registry after slot | [ ] |
| 4 | **Config percent override** | Optional `Config.Zoom Recording XP Percent of Live` — confirm keep or ignore | [ ] |

---

## Pre-install gates (DEV first)

- [ ] Offline tests pass: `node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js`
- [ ] Confirm **117** remains email-only (no XP Event writes, no Attendees writes)
- [ ] Confirm active **ZOOM_ATTEND_BASE** rule row exists (required for amount resolution)
- [ ] Create or confirm **ZOOM_RECORDING** XP Reward Rules row (recommended; else floor(live/2))
- [ ] **Do not** overload automation **117** with XP logic
- [ ] **Do not** write `Zoom Meetings.Attendees` from this automation

---

## DEV install steps

Execute **in order** on DEV base first.

### 1. XP Reward Rules (if row missing)

| # | Action | Rule Key | XP Amount | Active? | Done |
|---|--------|----------|-----------|---------|------|
| 1 | Create or verify row | `ZOOM_RECORDING` | Mike confirms (e.g. 30 if live base = 60) | Yes | [ ] |
| 2 | Verify live base row | `ZOOM_ATTEND_BASE` | Existing live amount | Yes | [ ] |
| 3 | Confirm no duplicate active rows for either key | | | | [ ] |

### 2. Automation install

| # | Action | Automation name (placeholder) | GitHub script | Paste lines | Done |
|---|--------|------------------------------|---------------|-------------|------|
| 1 | Create automation in folder **17 - Zoom Recording Credit** | `147 - Zoom Recording Credit - Award Half XP (SC-147)` | `147-zoom-recording-credit-award-half-xp.js` | docblock → end (skip GitHub header) | [ ] |
| 2 | Trigger table | **Zoom Attendance** | | | [ ] |
| 3 | Trigger type | When record matches conditions (or updated — Mike chooses) | | | [ ] |
| 4 | Recommended conditions | Recording Quiz Satisfactory? checked; Zoom Credit Conflict? ≠ 1 | | | [ ] |
| 5 | Input `recordId` | Dynamic triggering Zoom Attendance record ID | | | [ ] |
| 6 | Map script outputs | `statusOut`, `actionOut`, `errorOut`, `debugStep`, `sourceKeyOut`, `xpEventIdOut`, `xpAmountOut` | | | [ ] |
| 7 | Leave automation **OFF** until disposable proof plan ready | | | | [ ] |

### 3. Disposable DEV proof

Use a disposable enrollment (Schmidt / Testing path). Record evidence under `docs/testing/evidence/sc-147/`.

| Test | Setup | Expected | Done |
|------|-------|----------|------|
| **Happy path** | ZA recording quiz satisfactory; Conflict=0; no live 101 XP for same meeting | `statusOut=success`, `actionOut=created`, one XP Event, Source Key `ZOOM_RECORDING_CREDIT\|{enrollment}\|{meeting}`, half XP amount | [ ] |
| **Idempotent rerun** | Re-trigger same ZA | `actionOut=skipped_already_awarded`, no duplicate XP Event | [ ] |
| **Live blocks recording** | Same meeting+enrollment already has active live 101 key | `actionOut=skipped_live_101_exists` | [ ] |
| **Conflict rollup** | Zoom Credit Conflict? = 1 | `actionOut=skipped_conflict_rollup` | [ ] |
| **Not satisfactory** | Recording Quiz Satisfactory? unchecked | `actionOut=skipped_not_approved` | [ ] |
| **117 boundary** | Satisfactory path still fires 117 email separately | Email Handoff created; **117 does not write XP** | [ ] |
| **Perfect Week** | Recording-only week (no live Attendees) | WAS / PW formulas unchanged — recording-only does not increment PW Zoom count | [ ] |

### 4. SC-087 re-proof (after writer exists)

SC-087 live-vs-recording exclusivity must be re-proven with the live writer:

| Check | Expected | Done |
|-------|----------|------|
| Conflict=1 on ZA when live + recording paths collide | Recording writer skips; no double credit | [ ] |
| Live 101 award after recording credit blocked or reconciled per SC-087 design | No duplicate active XP for same pair | [ ] |

Evidence file (create after DEV proof):

- `docs/testing/evidence/sc-147/dev-disposable-proof-YYYYMMDD.json`

---

## Production promotion (after DEV sign-off)

**Mike approval required.** Do not paste to Production until DEV proof + slot decision complete.

| # | Action | Done |
|---|--------|------|
| 1 | Repeat XP Reward Rules verification on Production | [ ] |
| 2 | Paste script to Production automation (confirmed slot number) | [ ] |
| 3 | Configure trigger identical to DEV (or documented delta) | [ ] |
| 4 | Run one disposable Production proof (Schmidt) | [ ] |
| 5 | Update `docs/automation-index.md` with live slot + version | [ ] |
| 6 | Update `CHANGELOG.md` ### Airtable with paste date | [ ] |
| 7 | Set this doc **Status** → `Promoted to Production` | [ ] |

---

## Rollback / risk notes

| Risk | Mitigation |
|------|------------|
| Double credit (live + recording) | Source Key idempotency + live 101 scan + Conflict rollup gate |
| Perfect Week inflation | Recording-only path excluded by policy; verify 057 still reads live Attendees only |
| Overloading 117 | Keep email and XP in separate automations |
| Wrong XP amount | Require `ZOOM_ATTEND_BASE`; prefer explicit `ZOOM_RECORDING` rule row |
| Attendees corruption | Script never writes `Zoom Meetings.Attendees` |

**Rollback:** Turn automation OFF; deactivate erroneous XP Events manually; do not delete Weeks or schema.

---

## Close-out checklist

- [ ] Mike confirmed automation slot number
- [ ] Mike confirmed `ZOOM_RECORDING` rule row amount
- [ ] DEV disposable proof JSON committed
- [ ] SC-087 re-proof documented
- [ ] `CHANGELOG.md` updated on Production paste
- [ ] Master Future Work List SC-147 row updated to paste-complete
