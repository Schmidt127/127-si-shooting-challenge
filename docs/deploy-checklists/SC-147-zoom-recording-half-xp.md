# Operator packet — Automation 147 v1.0 (Recorded Zoom half-XP)

**Status:** **Paste pending** — GitHub source of truth; **NOT Live** until Mike approves slot + DEV proof  
**Date:** 2026-09-01  
**Backlog:** SC-147 / MRW-H10  
**Production base:** `appn84sqPw03zEbTT` — **do not execute until Mike approves**  
**Design brief:** [`docs/challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md`](../challenge-year/RECORDED-ZOOM-HALF-XP-DESIGN-BRIEF.md)  
**Queue index:** [`EMAIL-PASTE-QUEUE-2026-09.md`](./EMAIL-PASTE-QUEUE-2026-09.md) (priority **3** — independent of 071/076 email bundle)

| Item | Value |
|------|--------|
| **Recommended slot** | **147** — GitHub filename, SCRIPT block, and folder **17 - Zoom Recording Credit** already use **147**; Mike confirms or renumbers before Production paste |
| Automation | **147 - Zoom Recording Credit - Award Half XP (SC-147)** |
| Folder | **17 - Zoom Recording Credit** |
| Repo / intended | **v1.0** |
| Script | `airtable/automations/shooting-challenge/147-zoom-recording-credit-award-half-xp.js` |
| **Paste range** | Production docblock (`* 147 (slot TBD)…` / `Version: v1.0`) **through end of file** — **skip** GitHub-only header lines at top (`GitHub header`, `Automation:`, `System:`, `Source:`, `Status:`, `Purpose:` summary) |
| Schema dependency | **XP Reward Rules** row **Rule Key = `ZOOM_RECORDING`** (recommended; see checklist below) |
| Mike approval | Required before Production paste |

**Rule:** Production changes are not official until Mike completes DEV proof and this checklist. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## What this adds

A dedicated **recording-credit XP writer** distinct from:

| Automation | Role | Must stay separate |
|------------|------|-------------------|
| **101** | Live Zoom attendance XP (`ZOOM_ATTEND_*` / `ZOOM_LIVE`) | Yes — live keys only |
| **117 v2.1** | Recording approval **email** (Email Handoff Queue) | Yes — **no XP writes** |
| **147** (recommended slot) | Recording half-XP (`ZOOM_RECORDING_CREDIT\|{enrollmentId}\|{zoomMeetingId}`) | New writer |

**Policy (Mike 2026-08-27):** Recording credit counts toward level gates at **half live XP**; does **not** count toward Perfect Week; no duplicate with live 101 for same meeting+enrollment.

---

## Mike decisions still open

| # | Decision | Recommendation | Mike confirms | Done |
|---|----------|----------------|---------------|------|
| 1 | **Automation slot number** | **Use slot 147** — matches GitHub `147-*.js`, SCRIPT metadata, and queue index | Confirm or renumber before Production paste | [ ] |
| 2 | **XP Reward Rules row** | Create active **`ZOOM_RECORDING`** row (see checklist below); fallback = `floor(ZOOM_ATTEND_BASE / 2)` if row missing | Confirm XP amount (e.g. **30** when live base = **60**) | [ ] |
| 3 | **Source Key registry** | Enrollment-first `ZOOM_RECORDING_CREDIT\|*` (script v1.0) | Agent 9 registry after slot locked | [ ] |
| 4 | **Config percent override** | Keep optional `Config.Zoom Recording XP Percent of Live` — script reads when present | Confirm keep or ignore | [ ] |

---

## ZOOM_RECORDING rule row checklist

Complete **before** automation paste on DEV (repeat on Production before prod paste). Script resolves half-XP from the **`ZOOM_RECORDING`** row when present; otherwise `floor(ZOOM_ATTEND_BASE / 2)` with optional Config percent override.

| # | Check | Expected | Done |
|---|-------|----------|------|
| 1 | Open **XP Reward Rules** table | Base accessible on target environment | [ ] |
| 2 | Locate active row **Rule Key = `ZOOM_ATTEND_BASE`** | Exactly one active row; note **XP Amount** (live base) | [ ] |
| 3 | Create or verify active row **Rule Key = `ZOOM_RECORDING`** | **Active?** checked; **XP Amount** = Mike-approved half value (typically `floor(live/2)`) | [ ] |
| 4 | Confirm **no duplicate active rows** for either key | At most one active row per Rule Key | [ ] |
| 5 | Sanity: `ZOOM_RECORDING` amount ≤ `ZOOM_ATTEND_BASE` | Half-XP policy (SC-022 / design brief) | [ ] |
| 6 | Document chosen amount in DEV proof JSON | Evidence under `docs/testing/evidence/sc-147/` | [ ] |

**Example (illustrative only):** live base **60** → `ZOOM_RECORDING` **30**. Mike sets the Production amount.

**Do not** edit **101** live attendance rules or **117** email automations as part of this row setup.

---

## Paste packet (147 v1.0)

### Pre-paste checklist

- [ ] **Recommended slot 147** confirmed (or renumber GitHub + Airtable before paste).
- [ ] **ZOOM_RECORDING rule row checklist** complete on target base (above).
- [ ] Offline tests pass (repo — run before paste):

```bash
node airtable/automations/shooting-challenge/lib/sc-147-zoom-recording-credit.test.js
```

- [ ] Confirm **117** remains email-only (no XP Event writes, no Attendees writes).
- [ ] Confirm active **ZOOM_ATTEND_BASE** rule row exists.
- [ ] Open GitHub script; confirm docblock **Version: v1.0** and SCRIPT block `version: "v1.0"`.
- [ ] **DEV first** — do not paste Production until DEV disposable proof passes.
- [ ] Input **`recordId`** must remain **dynamic** (triggering Zoom Attendance ID) — never hardcode `rec…`.

### Paste steps

1. Open target base automation **147** (create in folder **17 - Zoom Recording Credit** if missing).
2. Open the **Run script** action.
3. Confirm input mapping: **`recordId`** = dynamic Zoom Attendance record ID from trigger.
4. Replace script body: copy from repo starting at `/************************************************************` (147 ZOOM RECORDING block) through EOF; **omit** GitHub header lines 1–25.
5. Save. Confirm SCRIPT metadata shows **v1.0** / **lastUpdated: 2026-09-01**.
6. Map script outputs: `statusOut`, `actionOut`, `errorOut`, `debugStep`, `sourceKeyOut`, `xpEventIdOut`, `xpAmountOut`.
7. Configure trigger on **Zoom Attendance** — recommended conditions: **Recording Quiz Satisfactory?** checked; **Zoom Credit Conflict?** ≠ 1.
8. Leave automation **OFF** until disposable DEV proof plan is ready.
9. Update Automations Code tracker (if used) to **147 v1.0**.

### Post-paste smoke (DEV — disposable)

See **§ Disposable DEV proof** below. Minimum gates before turning automation ON:

- [ ] Happy path → one XP Event, Source Key `ZOOM_RECORDING_CREDIT\|{enrollment}\|{meeting}`, half amount from **`ZOOM_RECORDING`** row
- [ ] Idempotent rerun → `skipped_already_awarded`
- [ ] Live 101 already awarded → `skipped_live_101_exists`
- [ ] **117** still sends email separately; **117 does not write XP**

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
